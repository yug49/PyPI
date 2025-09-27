const { ethers } = require("ethers");
const winston = require("winston");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { io } = require("socket.io-client");
require("dotenv").config();

// Configure logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || "info",
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: "resolver-bot" },
    transports: [
        new winston.transports.File({ filename: "error.log", level: "error" }),
        new winston.transports.File({ filename: "combined.log" }),
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            ),
        }),
    ],
});

class ResolverBot {
    constructor() {
        this.provider = null;
        this.wallet = null;
        this.contract = null;
        this.isListening = false;
        this.retryAttempts = 3;
        this.retryDelay = 2000; // 2 seconds
        this.callbackServer = null;
        this.callbackPort = process.env.RESOLVER_CALLBACK_PORT || 3001;

        // Event listener management
        this.eventListeners = new Map();
        this.filterReconnectInterval = null;
        this.filterCheckInterval = 60000; // Check filters every 60 seconds
        this.lastEventBlock = 0;
        this.isRecreatingListeners = false;

        // Polling-based event monitoring as fallback
        this.usePollingMode = true; // Enable polling mode by default to avoid filter issues
        this.pollingInterval = null;
        this.pollingIntervalTime = 15000; // Poll every 15 seconds (reduced frequency to avoid timeouts)

        // Order processing tracking to prevent duplicates
        this.processedOrders = new Set(); // Track order IDs that have been processed
        this.processingOrders = new Set(); // Track order IDs currently being processed

        // RazorpayX credentials
        this.razorpayKeyId = process.env.RAZORPAYX_KEY_ID;
        this.razorpayKeySecret = process.env.RAZORPAYX_KEY_SECRET;

        // Logger instance
        this.logger = logger;

        // Dutch auction support
        this.socketClient = null;
        this.activeAuctions = new Map();
        this.auctionTimeouts = new Map();
    }

    async initialize() {
        try {
            logger.info("Initializing Resolver Bot...");

            // Validate environment variables
            this.validateEnvironment();

            // Set up blockchain connection with improved timeout settings
            this.provider = new ethers.JsonRpcProvider(
                process.env.RPC_URL,
                null,
                {
                    timeout: 15000, // 15 second timeout instead of default 30s
                    throttleLimit: 1, // Limit concurrent requests
                    throttleSlotInterval: 100, // Space out requests
                }
            );
            this.wallet = new ethers.Wallet(
                process.env.PRIVATE_KEY,
                this.provider
            );

            // Load contract ABI
            const abiPath = path.join(__dirname, "abi", "OrderProtocol.json");
            const contractABI = JSON.parse(fs.readFileSync(abiPath, "utf8"));

            // Create contract instance
            this.contract = new ethers.Contract(
                process.env.CONTRACT_ADDRESS,
                contractABI,
                this.wallet
            );

            // Test connection
            await this.testConnection();

            // Setup callback server
            await this.setupCallbackServer();

            // Register callback with backend
            await this.registerCallback();

            // Setup Dutch auction socket connection
            await this.setupAuctionSocket();

            logger.info("Resolver Bot initialized successfully");
            logger.info(`Wallet Address: ${this.wallet.address}`);
            logger.info(`Contract Address: ${process.env.CONTRACT_ADDRESS}`);
            logger.info(`Backend URL: ${process.env.BACKEND_URL}`);
            logger.info(
                `Callback Server: http://localhost:${this.callbackPort}`
            );
            logger.info(`RazorpayX Key ID: ${process.env.RAZORPAYX_KEY_ID}`);
            logger.info(`RazorpayX configured: ✅`);
        } catch (error) {
            logger.error("Failed to initialize Resolver Bot:", error);
            throw error;
        }
    }

    validateEnvironment() {
        const requiredVars = [
            "PRIVATE_KEY",
            "RPC_URL",
            "CONTRACT_ADDRESS",
            "BACKEND_URL",
            "RAZORPAYX_KEY_ID",
            "RAZORPAYX_KEY_SECRET",
        ];
        for (const varName of requiredVars) {
            if (!process.env[varName]) {
                throw new Error(
                    `Missing required environment variable: ${varName}`
                );
            }
        }
    }

    /**
     * Setup callback server to receive signals from backend
     */
    async setupCallbackServer() {
        try {
            logger.info(
                `🌐 Setting up callback server on port ${this.callbackPort}...`
            );

            const app = express();
            app.use(express.json());

            // Health check endpoint
            app.get("/health", (req, res) => {
                res.json({
                    status: "healthy",
                    resolver: this.wallet.address,
                    timestamp: new Date().toISOString(),
                });
            });

            // Order acceptance callback endpoint
            app.post("/callback/order-accepted", async (req, res) => {
                try {
                    const { type, orderId, resolverAddress, details } =
                        req.body;

                    logger.info(
                        `📡 Received callback: ${type} for order ${orderId}`
                    );

                    if (
                        type === "ORDER_ACCEPTED" &&
                        resolverAddress.toLowerCase() ===
                            this.wallet.address.toLowerCase()
                    ) {
                        logger.info(
                            `🎯 Processing callback for our accepted order ${orderId}`
                        );

                        // Process payment for the accepted order
                        setTimeout(async () => {
                            await this.processOrderPayment(orderId);
                        }, 1000); // Small delay to ensure transaction is confirmed

                        res.json({
                            success: true,
                            message: "Callback received and processing started",
                        });
                    } else {
                        res.json({
                            success: true,
                            message: "Callback not for this resolver",
                        });
                    }
                } catch (error) {
                    logger.error("Error handling callback:", error);
                    res.status(500).json({
                        error: "Failed to process callback",
                    });
                }
            });

            // Start server
            return new Promise((resolve, reject) => {
                this.callbackServer = app.listen(this.callbackPort, (error) => {
                    if (error) {
                        reject(error);
                    } else {
                        logger.info(
                            `✅ Callback server running on port ${this.callbackPort}`
                        );
                        resolve();
                    }
                });
            });
        } catch (error) {
            logger.error("Failed to setup callback server:", error);
            throw error;
        }
    }

    /**
     * Register callback URL with backend
     */
    async registerCallback() {
        try {
            const callbackUrl = `http://localhost:${this.callbackPort}/callback/order-accepted`;

            logger.info(`📡 Registering callback URL: ${callbackUrl}`);

            const response = await axios.post(
                `${process.env.BACKEND_URL}/api/orders/resolver/register`,
                {
                    resolverAddress: this.wallet.address,
                    callbackUrl: callbackUrl,
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                    timeout: 10000,
                }
            );

            if (response.status === 200 && response.data.success) {
                logger.info(`✅ Callback registered successfully with backend`);
            } else {
                logger.warn(`⚠️ Failed to register callback:`, response.data);
            }
        } catch (error) {
            logger.error(
                "Failed to register callback with backend:",
                error.message
            );
            // Don't throw error - callback registration failure shouldn't stop the bot
        }
    }

    /**
     * Setup Socket.IO connection for Dutch auction events
     */
    async setupAuctionSocket() {
        try {
            const backendUrl =
                process.env.BACKEND_URL || "http://localhost:5001";

            logger.info(`🔌 Connecting to auction server at ${backendUrl}...`);

            this.socketClient = io(backendUrl, {
                withCredentials: true,
                transports: ["websocket", "polling"],
            });

            this.socketClient.on("connect", () => {
                logger.info("🔌 Connected to Dutch auction server");
            });

            this.socketClient.on("disconnect", () => {
                logger.warn("🔌 Disconnected from Dutch auction server");
            });

            this.socketClient.on("auctionStarted", (data) => {
                logger.info(
                    `🚀 Dutch auction started for order ${data.orderId}`
                );
                this.handleAuctionStarted(data);
            });

            this.socketClient.on("priceUpdate", (data) => {
                this.handlePriceUpdate(data);
            });

            this.socketClient.on("auctionAccepted", (data) => {
                logger.info(
                    `✅ Dutch auction accepted for order ${data.orderId}`
                );
                this.handleAuctionAccepted(data);
            });

            this.socketClient.on("auctionEnded", (data) => {
                logger.info(
                    `🏁 Dutch auction ended for order ${data.orderId}: ${data.reason}`
                );
                this.handleAuctionEnded(data);
            });

            this.socketClient.on("connect_error", (error) => {
                logger.error(
                    "❌ Failed to connect to auction server:",
                    error.message
                );
            });
        } catch (error) {
            logger.error("Failed to setup auction socket:", error);
            // Don't throw error - auction features are optional
        }
    }

    /**
     * Handle auction started event - decide whether to participate
     */
    handleAuctionStarted(auctionData) {
        const { orderId, startPrice, endPrice, duration } = auctionData;

        // Random decision: 70% chance to participate in auction
        const shouldParticipate = Math.random() < 0.7;

        if (!shouldParticipate) {
            logger.info(
                `⏭️ Skipping auction for order ${orderId} (random decision)`
            );
            return;
        }

        logger.info(`🎯 Participating in Dutch auction for order ${orderId}`);
        logger.info(
            `📊 Price range: ₹${startPrice} → ₹${endPrice} over ${duration}ms`
        );

        // Store auction info
        this.activeAuctions.set(orderId, {
            ...auctionData,
            participating: true,
            startTime: Date.now(),
        });

        // Schedule random acceptance time between 0.5s and 4.5s (leaving 0.5s buffer)
        const minDelay = 500; // 0.5 seconds
        const maxDelay = 4500; // 4.5 seconds
        const randomDelay = Math.random() * (maxDelay - minDelay) + minDelay;

        logger.info(
            `⏰ Will attempt to accept auction for order ${orderId} in ${randomDelay.toFixed(
                0
            )}ms`
        );

        const timeoutId = setTimeout(() => {
            this.attemptAuctionAcceptance(orderId);
        }, randomDelay);

        this.auctionTimeouts.set(orderId, timeoutId);
    }

    /**
     * Handle price update during auction
     */
    handlePriceUpdate(data) {
        const { orderId, currentPrice, progress } = data;
        const auction = this.activeAuctions.get(orderId);

        if (auction && auction.participating) {
            // Log every 20% progress
            if (
                Math.floor(progress / 20) !==
                Math.floor(auction.lastLoggedProgress / 20)
            ) {
                logger.info(
                    `📉 Order ${orderId} price: ₹${currentPrice.toFixed(
                        2
                    )} (${progress.toFixed(1)}%)`
                );
                auction.lastLoggedProgress = progress;
            }
        }
    }

    /**
     * Attempt to accept auction at current price
     */
    async attemptAuctionAcceptance(orderId) {
        try {
            const auction = this.activeAuctions.get(orderId);
            if (!auction || !auction.participating) {
                logger.warn(
                    `⚠️ Cannot accept auction for order ${orderId} - not participating`
                );
                return;
            }

            // Check if auction is still active by making API call
            const backendUrl = process.env.BACKEND_URL;
            const statusResponse = await axios.get(
                `${backendUrl}/api/orders/${orderId}/auction-status`
            );

            if (
                !statusResponse.data.success ||
                !statusResponse.data.data.active
            ) {
                logger.warn(
                    `⚠️ Auction for order ${orderId} is no longer active`
                );
                this.cleanupAuction(orderId);
                return;
            }

            const currentPrice = statusResponse.data.data.currentPrice;
            logger.info(
                `🎯 Attempting to accept order ${orderId} at price ₹${currentPrice.toFixed(
                    2
                )}`
            );

            // Accept the order at current Dutch auction price
            const success = await this.acceptOrder(
                orderId,
                currentPrice.toString()
            );

            if (success) {
                logger.info(
                    `🎉 Successfully accepted Dutch auction for order ${orderId} at ₹${currentPrice.toFixed(
                        2
                    )}`
                );
            } else {
                logger.warn(
                    `❌ Failed to accept Dutch auction for order ${orderId}`
                );
            }

            this.cleanupAuction(orderId);
        } catch (error) {
            logger.error(
                `Error attempting auction acceptance for order ${orderId}:`,
                error.message
            );
            this.cleanupAuction(orderId);
        }
    }

    /**
     * Handle auction accepted event
     */
    handleAuctionAccepted(data) {
        const { orderId } = data;
        this.cleanupAuction(orderId);
    }

    /**
     * Handle auction ended event
     */
    handleAuctionEnded(data) {
        const { orderId } = data;
        this.cleanupAuction(orderId);
    }

    /**
     * Clean up auction tracking data
     */
    cleanupAuction(orderId) {
        // Clear timeout if exists
        const timeoutId = this.auctionTimeouts.get(orderId);
        if (timeoutId) {
            clearTimeout(timeoutId);
            this.auctionTimeouts.delete(orderId);
        }

        // Remove auction data
        this.activeAuctions.delete(orderId);

        logger.debug(`🧹 Cleaned up auction data for order ${orderId}`);
    }

    async testConnection() {
        try {
            const network = await this.provider.getNetwork();
            const balance = await this.provider.getBalance(this.wallet.address);

            logger.info(
                `Connected to network: ${network.name} (Chain ID: ${network.chainId})`
            );
            logger.info(`Wallet balance: ${ethers.formatEther(balance)} ETH`);

            if (balance === 0n) {
                logger.warn(
                    "Wallet has zero balance - may not be able to send transactions"
                );
            }
        } catch (error) {
            logger.error("Connection test failed:", error);
            throw error;
        }
    }

    /**
     * Generate Authorization header for RazorpayX API calls
     * Format: Basic base64(key_id:key_secret)
     * @returns {string} Authorization header value
     */
    getRazorpayXAuthHeader() {
        const keyId = process.env.RAZORPAYX_KEY_ID;
        const keySecret = process.env.RAZORPAYX_KEY_SECRET;

        // Create base64 encoded string of key_id:key_secret
        const credentials = `${keyId}:${keySecret}`;
        const base64Credentials = Buffer.from(credentials).toString("base64");

        return `Basic ${base64Credentials}`;
    }

    calculateAcceptedPrice(startPrice, endPrice) {
        // Calculate a random price between start and end price
        // For better strategy, we could implement Dutch auction logic here
        const startPriceBN = BigInt(startPrice);
        const endPriceBN = BigInt(endPrice);

        // Generate random factor between 0.3 and 0.7 (30% to 70% of the range)
        const randomFactor = Math.random() * 0.4 + 0.3;
        const range = startPriceBN - endPriceBN;
        const discount = BigInt(Math.floor(Number(range) * randomFactor));

        const acceptedPrice = startPriceBN - discount;

        logger.info(
            `Price calculation - Start: ${startPrice}, End: ${endPrice}, Accepted: ${acceptedPrice.toString()}`
        );

        return acceptedPrice.toString();
    }

    /**
     * Read order details from the contract with error handling
     * @param {string} orderId - The order ID to read
     * @returns {Object} Order details from the contract
     */
    async readOrderFromContract(orderId) {
        logger.info(`📖 Reading order ${orderId} from contract...`);

        const order = await this.executeWithFilterRecovery(
            () => this.contract.getOrder(orderId),
            `Reading order ${orderId}`
        );

        const orderDetails = {
            maker: order.maker,
            taker: order.taker,
            recipientUpiAddress: order.recipientUpiAddress,
            amount: order.amount.toString(), // Amount in INR (18 decimals)
            startPrice: order.startPrice.toString(),
            acceptedPrice: order.acceptedPrice.toString(),
            endPrice: order.endPrice.toString(),
            startTime: Number(order.startTime),
            acceptedTime: Number(order.acceptedTime),
            accepted: order.accepted,
            fullfilled: order.fullfilled,
        };

        logger.info(`📋 Order details:`, {
            orderId,
            recipientUpi: orderDetails.recipientUpiAddress,
            amountINR: ethers.formatEther(orderDetails.amount), // Convert to readable format
            accepted: orderDetails.accepted,
            taker: orderDetails.taker,
        });

        return orderDetails;
    }

    /**
     * Create a contact for RazorpayX transactions
     * @param {Object} contactDetails - Contact details
     * @returns {Object} Contact response
     */
    async createContact(orderHash) {
        try {
            // Create a short reference ID (max 40 chars for RazorpayX)
            // Use last 30 chars of order hash for uniqueness
            const shortOrderId = orderHash.slice(-30);
            const referenceId = `ord_${shortOrderId}`;

            const contactData = {
                name: "Order Recipient",
                email: "order@yourapp.com",
                contact: "9999999999",
                type: "self",
                reference_id: referenceId,
                notes: {
                    order_id: orderHash,
                    payment_type: "order_settlement",
                },
            };

            this.logger.info(
                `📞 Creating contact for order ${orderHash} (ref: ${referenceId})`
            );

            const response = await axios.post(
                "https://api.razorpay.com/v1/contacts",
                contactData,
                {
                    auth: {
                        username: this.razorpayKeyId,
                        password: this.razorpayKeySecret,
                    },
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );

            this.logger.info(
                `✅ Contact created successfully: ${response.data.id}`
            );
            return response.data;
        } catch (error) {
            // Simple debug logging to avoid circular reference issues
            console.log("🚨 ERROR IN CONTACT CREATION:");
            console.log("Error message:", error.message);
            console.log("Error type:", typeof error);
            console.log("Has response:", !!error.response);

            this.logger.error("RazorpayX Contact API Error", {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message,
                hasResponse: !!error.response,
            });

            let errorMessage = error.message || "Unknown error";
            if (error.response && error.response.data) {
                if (
                    error.response.data.error &&
                    error.response.data.error.description
                ) {
                    errorMessage = error.response.data.error.description;
                } else {
                    errorMessage = JSON.stringify(error.response.data);
                }
            }

            throw new Error(`Failed to create contact: ${errorMessage}`);
        }
    }

    /**
     * Create a fund account for UPI payments
     * @param {Object} fundAccountDetails - Fund account details
     * @returns {Object} Fund account response
     */
    async createFundAccount(fundAccountDetails) {
        try {
            const { recipientUpiAddress, contactId } = fundAccountDetails;

            logger.info(
                `🏦 Creating fund account for ${recipientUpiAddress}...`
            );

            const fundAccountPayload = {
                contact_id: contactId,
                account_type: "vpa",
                vpa: {
                    address: recipientUpiAddress,
                },
            };

            const response = await axios.post(
                "https://api.razorpay.com/v1/fund_accounts",
                fundAccountPayload,
                {
                    headers: {
                        Authorization: this.getRazorpayXAuthHeader(),
                        "Content-Type": "application/json",
                    },
                    timeout: 30000,
                }
            );

            if (response.status === 200 || response.status === 201) {
                const fundAccountData = response.data;
                logger.info(`✅ Fund account created: ${fundAccountData.id}`);
                return {
                    success: true,
                    fundAccountId: fundAccountData.id,
                    data: fundAccountData,
                };
            } else {
                logger.error(
                    `❌ Fund account creation failed with status ${response.status}`
                );
                return {
                    success: false,
                    error: `HTTP ${response.status}`,
                    message: response.data,
                };
            }
        } catch (error) {
            logger.error(`Failed to create fund account:`, error);

            if (error.response) {
                const { status, data } = error.response;
                logger.error(
                    `RazorpayX Fund Account API Error ${status}:`,
                    data
                );

                return {
                    success: false,
                    error: `API Error ${status}`,
                    message:
                        data.error?.description ||
                        data.message ||
                        "Unknown error",
                    details: data,
                };
            }

            return {
                success: false,
                error: error.code || "UNKNOWN_ERROR",
                message: error.message,
            };
        }
    }

    /**
     * Create a VPA payout using RazorpayX API (proper flow)
     * @param {Object} paymentDetails - Payment details
     * @returns {Object} Payout response
     */
    async createVPAPayout(paymentDetails) {
        try {
            const {
                recipientUpiAddress,
                amountPaise,
                orderId,
                recipientName = "Order Recipient",
            } = paymentDetails;

            logger.info(
                `💳 Creating VPA payout for ${amountPaise} paise to ${recipientUpiAddress}`
            );

            // Step 1: Create contact
            const contact = await this.createContact(orderId);

            if (!contact || !contact.id) {
                logger.error(
                    `❌ Failed to create contact: No contact ID returned`
                );
                return { success: false, message: "Failed to create contact" };
            }

            const contactId = contact.id;
            logger.info(`👤 Using contact: ${contactId}`);

            // Step 2: Create fund account
            const fundAccountResult = await this.createFundAccount({
                recipientUpiAddress,
                contactId,
            });

            if (!fundAccountResult.success) {
                logger.error(
                    `❌ Failed to create fund account: ${fundAccountResult.message}`
                );
                return fundAccountResult;
            }

            const fundAccountId = fundAccountResult.fundAccountId;
            logger.info(`🏦 Using fund account: ${fundAccountId}`);

            // Step 3: Create payout
            const idempotencyKey = uuidv4();

            const payoutPayload = {
                account_number: process.env.RAZORPAYX_ACCOUNT_NUMBER,
                fund_account_id: fundAccountId,
                amount: amountPaise, // Amount in paise
                currency: "INR",
                mode: "UPI",
                purpose: "payout",
                queue_if_low_balance: true,
                reference_id: `order_${orderId.substring(0, 10)}`,
                narration: `Order Payment`, // Keep under 30 chars
                notes: {
                    order_id: orderId,
                    payment_method: "UPI",
                    processed_by: "resolver_bot",
                },
            };

            logger.info(
                `📤 Creating payout with fund account ${fundAccountId}...`
            );

            const response = await axios.post(
                "https://api.razorpay.com/v1/payouts",
                payoutPayload,
                {
                    headers: {
                        Authorization: this.getRazorpayXAuthHeader(),
                        "Content-Type": "application/json",
                        "X-Payout-Idempotency": idempotencyKey,
                    },
                    timeout: 30000,
                }
            );

            if (response.status === 200 || response.status === 201) {
                const payoutData = response.data;
                logger.info(`✅ VPA payout created successfully!`);
                logger.info(`💰 Payout ID: ${payoutData.id}`);
                logger.info(
                    `🏦 Fund Account ID: ${payoutData.fund_account_id}`
                );
                logger.info(`📊 Status: ${payoutData.status}`);
                logger.info(`🔗 UTR: ${payoutData.utr || "Pending"}`);

                return {
                    success: true,
                    payoutId: payoutData.id,
                    fundAccountId: payoutData.fund_account_id,
                    contactId: contactId,
                    status: payoutData.status,
                    utr: payoutData.utr,
                    fees: payoutData.fees,
                    tax: payoutData.tax,
                    createdAt: payoutData.created_at,
                    data: payoutData,
                };
            } else {
                logger.error(
                    `❌ VPA payout failed with status ${response.status}`
                );
                return {
                    success: false,
                    error: `HTTP ${response.status}`,
                    message: response.data,
                };
            }
        } catch (error) {
            logger.error(`Failed to create VPA payout:`, error);

            if (error.response) {
                const { status, data } = error.response;
                logger.error(`RazorpayX API Error ${status}:`, data);

                return {
                    success: false,
                    error: `API Error ${status}`,
                    message:
                        data.error?.description ||
                        data.message ||
                        "Unknown error",
                    details: data,
                };
            }

            return {
                success: false,
                error: error.code || "UNKNOWN_ERROR",
                message: error.message,
            };
        }
    }

    /**
     * Process payment for an accepted order
     * @param {string} orderId - The order ID
     */
    async processOrderPayment(orderId) {
        try {
            logger.info(`🚀 Processing payment for order ${orderId}...`);

            // Step 1: Read order details from contract
            const orderDetails = await this.readOrderFromContract(orderId);

            // Validate order state
            if (!orderDetails.accepted) {
                logger.error(`❌ Order ${orderId} is not accepted yet`);
                return false;
            }

            if (orderDetails.fullfilled) {
                logger.warn(`⚠️ Order ${orderId} is already fulfilled`);
                return false;
            }

            if (
                orderDetails.taker.toLowerCase() !==
                this.wallet.address.toLowerCase()
            ) {
                logger.error(
                    `❌ This resolver is not the taker for order ${orderId}`
                );
                return false;
            }

            // Step 2: Calculate payment amount in paise (INR amount from contract is in 18 decimals)
            const amountInrWei = BigInt(orderDetails.amount);
            const amountInr = Number(ethers.formatEther(amountInrWei)); // Convert to regular INR
            const amountPaise = Math.round(amountInr * 100); // Convert to paise

            logger.info(`💰 Payment details:`, {
                orderId,
                amountINR: amountInr,
                amountPaise,
                recipientUpi: orderDetails.recipientUpiAddress,
            });

            // Step 3: Create VPA payout
            const payoutResult = await this.createVPAPayout({
                recipientUpiAddress: orderDetails.recipientUpiAddress,
                amountPaise,
                orderId,
            });

            if (payoutResult.success) {
                // Step 4: Display success message
                this.displayPaymentSuccess({
                    orderId,
                    recipientUpi: orderDetails.recipientUpiAddress,
                    amountINR: amountInr,
                    amountPaise,
                    payoutId: payoutResult.payoutId,
                    utr: payoutResult.utr,
                    status: payoutResult.status,
                    contactId: payoutResult.contactId,
                    fundAccountId: payoutResult.fundAccountId,
                    fees: payoutResult.fees,
                    tax: payoutResult.tax,
                });

                // Step 5: Submit proof to backend for order fulfillment
                await this.submitProofToBackend(orderId, payoutResult.payoutId);

                return true;
            } else {
                logger.error(
                    `❌ Payment failed for order ${orderId}:`,
                    payoutResult.message
                );
                return false;
            }
        } catch (error) {
            logger.error(
                `Failed to process payment for order ${orderId}:`,
                error
            );
            return false;
        }
    }

    /**
     * Display payment success message with distinct formatting
     * @param {Object} paymentDetails - Payment details to display
     */
    displayPaymentSuccess(paymentDetails) {
        const {
            orderId,
            recipientUpi,
            amountINR,
            amountPaise,
            payoutId,
            utr,
            status,
            contactId,
            fundAccountId,
            fees = 0,
            tax = 0,
        } = paymentDetails;

        const separator = "=".repeat(80);
        const message = `
${separator}
🎉 PAYMENT SUCCESSFULLY COMPLETED! 🎉
${separator}
📋 Order ID: ${orderId}
💰 Amount: ₹${amountINR.toFixed(2)} (${amountPaise} paise)
🏦 Recipient UPI: ${recipientUpi}
🆔 Payout ID: ${payoutId}
🔗 UTR/Transaction ID: ${utr || "Processing..."}
📊 Status: ${status.toUpperCase()}
👤 Contact ID: ${contactId || "N/A"}
🏦 Fund Account ID: ${fundAccountId || "N/A"}
💳 Fees: ₹${((fees || 0) / 100).toFixed(2)}
📋 Tax: ₹${((tax || 0) / 100).toFixed(2)}
⏰ Processed At: ${new Date().toISOString()}
🤖 Processed By: Resolver Bot (${this.wallet.address})
${separator}
`;

        // Log with different levels for visibility
        logger.info(message);
        console.log("\x1b[32m%s\x1b[0m", message); // Green color in console
    }

    async acceptOrder(orderId, acceptedPrice) {
        try {
            logger.info(
                `Sending API request to accept order ${orderId} at price ${acceptedPrice}`
            );

            const backendUrl = process.env.BACKEND_URL;
            const apiEndpoint = `${backendUrl}/api/orders/${orderId}/accept`;

            const requestPayload = {
                acceptedPrice: acceptedPrice,
                resolverAddress: this.wallet.address,
            };

            logger.info(`Making request to: ${apiEndpoint}`);
            logger.info(`Request payload:`, requestPayload);

            // Make API call to backend
            const response = await axios.post(apiEndpoint, requestPayload, {
                headers: {
                    "Content-Type": "application/json",
                },
                timeout: 30000, // 30 second timeout
            });

            if (response.status === 200 && response.data.success) {
                const { transactionHash, blockNumber, gasUsed } =
                    response.data.data;
                logger.info(
                    `✅ Order ${orderId} accepted successfully via API!`
                );
                logger.info(`Transaction Hash: ${transactionHash}`);
                logger.info(`Block Number: ${blockNumber}`);
                logger.info(`Gas Used: ${gasUsed}`);
                return true;
            } else {
                logger.error(
                    `❌ API request failed for order ${orderId}:`,
                    response.data
                );
                return false;
            }
        } catch (error) {
            logger.error(
                `Failed to accept order ${orderId} via API:`,
                error.message
            );

            // Parse API error responses
            if (error.response) {
                const { status, data } = error.response;
                logger.error(`API Error ${status}:`, data);

                // Log specific error messages
                if (status === 409) {
                    logger.warn(
                        `Order ${orderId} was already accepted by another resolver`
                    );
                } else if (status === 400) {
                    logger.warn(
                        `Invalid price or parameters for order ${orderId}`
                    );
                } else if (status === 403) {
                    logger.error(
                        `Resolver ${this.wallet.address} is not registered as a resolver`
                    );
                } else if (status === 404) {
                    logger.warn(`Order ${orderId} does not exist`);
                }
            } else if (error.code === "ECONNREFUSED") {
                logger.error(
                    "Cannot connect to backend server. Is it running?"
                );
            } else if (error.code === "ETIMEDOUT") {
                logger.error("Request to backend server timed out");
            }

            return false;
        }
    }

    async handleOrderCreated(orderId, maker, amount, event) {
        try {
            // Check if we've already processed or are currently processing this order
            if (this.processedOrders.has(orderId)) {
                logger.info(
                    `⏭️ Order ${orderId} already processed, skipping...`
                );
                return;
            }

            if (this.processingOrders.has(orderId)) {
                logger.info(
                    `🔄 Order ${orderId} currently being processed, skipping duplicate...`
                );
                return;
            }

            // Mark as currently processing
            this.processingOrders.add(orderId);

            const startTime = Date.now();
            logger.info(
                `🚨 New order detected! ID: ${orderId}, Maker: ${maker}, Amount: ${amount}`
            );

            // Get order details with filter recovery
            const order = await this.executeWithFilterRecovery(
                () => this.contract.getOrder(orderId),
                `Getting order details for ${orderId}`
            );

            logger.info(`Order details:`, {
                maker: order.maker,
                startPrice: order.startPrice.toString(),
                endPrice: order.endPrice.toString(),
                amount: order.amount.toString(),
            });

            // Check if order is still valid and not accepted
            if (order.accepted) {
                logger.warn(`Order ${orderId} is already accepted`);
                return;
            }

            if (order.fullfilled) {
                logger.warn(`Order ${orderId} is already fulfilled`);
                return;
            }

            // Calculate accepted price
            const acceptedPrice = this.calculateAcceptedPrice(
                order.startPrice.toString(),
                order.endPrice.toString()
            );

            // Accept the order
            const success = await this.acceptOrder(orderId, acceptedPrice);

            const processingTime = Date.now() - startTime;
            logger.info(`Order processing completed in ${processingTime}ms`);

            if (success) {
                logger.info(
                    `🎉 Successfully accepted order ${orderId} in ${processingTime}ms`
                );
                // Mark as processed on success
                this.processedOrders.add(orderId);
            }
        } catch (error) {
            logger.error(`Error handling OrderCreated event:`, error);

            // If it's a filter error, try to recreate listeners
            if (
                error.message &&
                error.message.includes("filter") &&
                error.message.includes("does not exist")
            ) {
                logger.warn(
                    "🔄 Recreating event listeners due to filter error in event handler..."
                );
                await this.recreateEventListeners();
            }
        } finally {
            // Always remove from processing set
            this.processingOrders.delete(orderId);
        }
    }

    async startListening() {
        try {
            if (this.isListening) {
                logger.warn("Bot is already listening for events");
                return;
            }

            logger.info("🎧 Starting to listen for OrderCreated events...");

            // Get current block number for starting point
            this.lastEventBlock = await this.provider.getBlockNumber();
            logger.info(
                `📍 Starting event listening from block: ${this.lastEventBlock}`
            );

            if (this.usePollingMode) {
                logger.info(
                    "🔄 Using polling mode for event monitoring (more reliable)"
                );
                await this.startPollingMode();
            } else {
                logger.info("🎯 Using filter-based event listening");
                // Setup robust event listeners with error handling
                await this.setupEventListeners();
                // Start periodic filter health check
                this.startFilterHealthCheck();
            }

            this.isListening = true;
            logger.info(
                "✅ Bot is now actively listening for events with robust management"
            );
        } catch (error) {
            logger.error("Failed to start listening:", error);
            throw error;
        }
    }

    /**
     * Start polling-based event monitoring (alternative to filters)
     */
    async startPollingMode() {
        logger.info(
            `🔄 Starting polling mode (every ${
                this.pollingIntervalTime / 1000
            }s)`
        );

        this.pollingInterval = setInterval(async () => {
            try {
                await this.pollForNewEvents();
            } catch (error) {
                logger.error("Error during event polling:", error);

                // Handle timeout errors specially
                if (
                    error.code === "TIMEOUT" ||
                    error.message.includes("timeout")
                ) {
                    logger.warn(
                        "⏰ RPC timeout detected, continuing with next poll cycle..."
                    );

                    // Check if we have any pending accepted orders that need payment processing
                    await this.checkPendingPayments();

                    return; // Continue with next poll, don't try to recover
                }

                // If polling fails, try to recover
                if (this.isEthersFilterError(error)) {
                    logger.warn(
                        "🔄 Ethers error during polling, attempting recovery..."
                    );
                    await this.handleEthersFilterError(error);
                }
            }
        }, this.pollingIntervalTime);

        logger.info("✅ Polling mode started successfully");
    }

    /**
     * Poll for new events by checking recent blocks
     */
    async pollForNewEvents() {
        try {
            const currentBlock = await this.provider.getBlockNumber();

            // If we're caught up, no need to check
            if (currentBlock <= this.lastEventBlock) {
                logger.debug(
                    `📍 Already up to date. Current: ${currentBlock}, Last: ${this.lastEventBlock}`
                );
                return;
            }

            // Calculate block range to check (limit to prevent too many requests)
            const fromBlock = this.lastEventBlock + 1;
            const toBlock = Math.min(currentBlock, this.lastEventBlock + 100); // Check max 100 blocks at a time

            logger.debug(
                `🔍 Polling blocks ${fromBlock} to ${toBlock} for events`
            );

            // Get OrderCreated events from the block range
            const orderCreatedFilter = this.contract.filters.OrderCreated();
            const orderCreatedEvents = await this.contract.queryFilter(
                orderCreatedFilter,
                fromBlock,
                toBlock
            );

            // Get OrderAccepted events from the block range
            const orderAcceptedFilter = this.contract.filters.OrderAccepted();
            const orderAcceptedEvents = await this.contract.queryFilter(
                orderAcceptedFilter,
                fromBlock,
                toBlock
            );

            // Process OrderCreated events
            for (const event of orderCreatedEvents) {
                logger.info(
                    `📢 Found OrderCreated event in block ${event.blockNumber}`
                );
                const [orderId, maker, amount] = event.args;
                await this.handleOrderCreated(orderId, maker, amount, event);
            }

            // Process OrderAccepted events
            for (const event of orderAcceptedEvents) {
                logger.info(
                    `📢 Found OrderAccepted event in block ${event.blockNumber}`
                );
                const [orderId, taker, acceptedPrice] = event.args;
                logger.info(
                    `📋 Order ${orderId} accepted by ${taker} at price ${acceptedPrice}`
                );
            }

            // Update last processed block
            this.lastEventBlock = toBlock;

            if (
                orderCreatedEvents.length > 0 ||
                orderAcceptedEvents.length > 0
            ) {
                logger.info(
                    `✅ Processed ${orderCreatedEvents.length} OrderCreated and ${orderAcceptedEvents.length} OrderAccepted events`
                );
            }
        } catch (error) {
            logger.error("Error polling for events:", error);
            throw error;
        }
    }

    /**
     * Check for accepted orders that haven't been processed for payments yet
     */
    async checkPendingPayments() {
        try {
            logger.debug("🔍 Checking for pending payment processing...");

            // Get processed orders that might need payment processing
            for (const orderId of this.processedOrders) {
                try {
                    // Check if order is accepted but not yet fulfilled
                    const orderDetails = await this.executeWithFilterRecovery(
                        () => this.contract.getOrder(orderId),
                        `Checking order ${orderId} for payment processing`
                    );

                    if (
                        orderDetails.accepted &&
                        !orderDetails.fullfilled &&
                        orderDetails.taker === this.wallet.address
                    ) {
                        logger.info(
                            `💰 Found accepted order ${orderId} pending payment processing`
                        );

                        // Trigger payment processing
                        setTimeout(async () => {
                            try {
                                await this.processPayment(orderId);
                            } catch (error) {
                                logger.error(
                                    `Failed to process payment for pending order ${orderId}:`,
                                    error
                                );
                            }
                        }, 1000); // Small delay to avoid overwhelming the system

                        break; // Process one at a time to avoid overwhelming
                    }
                } catch (error) {
                    logger.debug(
                        `Could not check order ${orderId}:`,
                        error.message
                    );
                }
            }
        } catch (error) {
            logger.debug("Error checking pending payments:", error.message);
        }
    }

    /**
     * Switch to filter mode if polling is having issues
     */
    async switchToFilterMode() {
        if (!this.usePollingMode) {
            logger.warn("Already in filter mode");
            return;
        }

        logger.info("🔄 Switching from polling to filter mode...");

        // Stop polling
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }

        this.usePollingMode = false;

        // Start filter-based listening
        await this.setupEventListeners();
        this.startFilterHealthCheck();

        logger.info("✅ Switched to filter mode successfully");
    }

    /**
     * Switch to polling mode if filters are having issues
     */
    async switchToPollingMode() {
        if (this.usePollingMode) {
            logger.warn("Already in polling mode");
            return;
        }

        logger.info("🔄 Switching from filter to polling mode...");

        // Stop filters
        if (this.filterReconnectInterval) {
            clearInterval(this.filterReconnectInterval);
            this.filterReconnectInterval = null;
        }

        this.contract.removeAllListeners();
        this.provider.removeAllListeners();
        this.eventListeners.clear();

        this.usePollingMode = true;

        // Start polling
        await this.startPollingMode();

        logger.info("✅ Switched to polling mode successfully");
    }

    /**
     * Setup event listeners with proper error handling and recovery
     */
    async setupEventListeners() {
        try {
            // Remove existing listeners first
            this.contract.removeAllListeners();
            this.provider.removeAllListeners();

            // Create OrderCreated event listener with error handling
            const orderCreatedListener = async (
                orderId,
                maker,
                amount,
                event
            ) => {
                try {
                    this.lastEventBlock = Math.max(
                        this.lastEventBlock,
                        event.blockNumber
                    );
                    await this.handleOrderCreated(
                        orderId,
                        maker,
                        amount,
                        event
                    );
                } catch (error) {
                    logger.error(`Error in OrderCreated event handler:`, error);
                    // Check if it's an ethers filter issue and recreate listeners
                    if (this.isEthersFilterError(error)) {
                        await this.handleEthersFilterError(error);
                    }
                }
            };

            // Create OrderAccepted event listener with error handling
            const orderAcceptedListener = (
                orderId,
                taker,
                acceptedPrice,
                event
            ) => {
                try {
                    this.lastEventBlock = Math.max(
                        this.lastEventBlock,
                        event.blockNumber
                    );
                    logger.info(
                        `📋 Order ${orderId} accepted by ${taker} at price ${acceptedPrice}`
                    );
                } catch (error) {
                    logger.error(
                        `Error in OrderAccepted event handler:`,
                        error
                    );
                    // Check if it's an ethers filter issue and recreate listeners
                    if (this.isEthersFilterError(error)) {
                        this.handleEthersFilterError(error);
                    }
                }
            };

            // Setup listeners with comprehensive error handling
            this.contract.on("OrderCreated", orderCreatedListener);
            this.contract.on("OrderAccepted", orderAcceptedListener);

            // Store listener references for management
            this.eventListeners.set("OrderCreated", orderCreatedListener);
            this.eventListeners.set("OrderAccepted", orderAcceptedListener);

            // Handle provider errors with enhanced detection
            this.provider.on("error", (error) => {
                logger.error("Provider error detected:", error);
                this.handleProviderError(error);
            });

            // Add additional error handling for ethers.js internal errors
            this.setupEthersErrorHandling();

            logger.info(
                "🔗 Event listeners setup completed with enhanced error handling"
            );
        } catch (error) {
            logger.error("Failed to setup event listeners:", error);
            throw error;
        }
    }

    /**
     * Check if error is an ethers.js filter-related issue
     */
    isEthersFilterError(error) {
        const errorMessage = error.message || error.toString();
        return (
            errorMessage.includes("results is not iterable") ||
            (errorMessage.includes("filter") &&
                errorMessage.includes("does not exist")) ||
            errorMessage.includes("FilterIdEventSubscriber") ||
            errorMessage.includes("_emitResults")
        );
    }

    /**
     * Setup additional error handling for ethers.js internal issues
     */
    setupEthersErrorHandling() {
        // Wrap the provider's internal error handling
        const originalSend = this.provider.send.bind(this.provider);

        this.provider.send = async (method, params) => {
            try {
                const result = await originalSend(method, params);

                // For filter-related methods, ensure result is always iterable
                if (
                    method === "eth_getFilterChanges" ||
                    method === "eth_getFilterLogs"
                ) {
                    // If result is null, undefined, or not an array, return empty array
                    if (!result || !Array.isArray(result)) {
                        logger.debug(
                            `🔧 Normalizing non-array result for ${method}: ${typeof result}`
                        );
                        return [];
                    }
                }

                return result;
            } catch (error) {
                // Handle ethers filter errors at the RPC level
                if (this.isEthersFilterError(error)) {
                    logger.warn(
                        `🔄 Ethers RPC filter error detected: ${error.message}`
                    );
                    await this.handleEthersFilterError(error);

                    // For filter-related RPC calls, return empty result to prevent crashes
                    if (
                        method === "eth_getFilterChanges" ||
                        method === "eth_getFilterLogs"
                    ) {
                        logger.info(
                            "🔄 Returning empty result for expired filter call"
                        );
                        return [];
                    }
                }
                throw error;
            }
        };

        // Additional monkey-patch for the problematic ethers internal method
        this.patchFilterIdEventSubscriber();

        logger.info("🛡️ Enhanced ethers.js error handling configured");
    }

    /**
     * Monkey-patch the problematic FilterIdEventSubscriber._emitResults method
     */
    patchFilterIdEventSubscriber() {
        try {
            // Try to find and patch the FilterIdEventSubscriber class
            const ethersModule = require("ethers");

            // This is a more aggressive approach - patch the prototype if accessible
            const ethersPath = require.resolve("ethers");
            const filterIdPath = ethersPath.replace(
                "lib.commonjs/ethers.js",
                "lib.commonjs/providers/subscriber-filterid.js"
            );

            // Instead of patching directly, let's intercept at the process level
            const originalEmit = process.emit.bind(process);

            process.emit = function (event, ...args) {
                if (event === "uncaughtException") {
                    const error = args[0];
                    if (
                        error &&
                        error.message &&
                        error.message.includes("results is not iterable")
                    ) {
                        logger.warn(
                            "🔄 Caught ethers FilterIdEventSubscriber error, suppressing crash"
                        );
                        // Don't emit the uncaught exception, just log it
                        return false;
                    }
                }
                return originalEmit(event, ...args);
            };

            logger.info(
                "🛡️ Process-level error interception configured for ethers errors"
            );
        } catch (error) {
            logger.warn(
                "Could not patch FilterIdEventSubscriber, using fallback protection:",
                error.message
            );
        }
    }

    /**
     * Handle ethers.js specific filter errors
     */
    async handleEthersFilterError(error) {
        logger.warn(`🔄 Handling ethers.js filter error: ${error.message}`);

        // If we're using polling mode, just log and continue
        if (this.usePollingMode) {
            logger.info(
                "🔄 In polling mode, filter error should not affect operation"
            );
            return;
        }

        // Prevent recursive recreation
        if (this.isRecreatingListeners) {
            logger.info("🔄 Already recreating listeners, skipping...");
            return;
        }

        try {
            this.isRecreatingListeners = true;

            // Track filter error count
            if (!this.filterErrorCount) {
                this.filterErrorCount = 0;
            }
            this.filterErrorCount++;

            // If we've had too many filter errors, switch to polling mode
            if (this.filterErrorCount >= 3) {
                logger.warn(
                    `⚠️ Too many filter errors (${this.filterErrorCount}), switching to polling mode for reliability`
                );
                await this.switchToPollingMode();
                this.filterErrorCount = 0; // Reset counter
                return;
            }

            // Wait a moment for any pending operations to complete
            await new Promise((resolve) => setTimeout(resolve, 2000));

            // Recreate listeners
            await this.recreateEventListeners();
        } finally {
            this.isRecreatingListeners = false;
        }
    }

    /**
     * Handle provider errors and attempt recovery
     */
    async handleProviderError(error) {
        logger.warn("🚨 Handling provider error, attempting recovery...");

        // Check if it's any type of filter-related error (including ethers.js internal errors)
        if (this.isEthersFilterError(error)) {
            logger.info(
                "🔄 Filter/ethers error detected, recreating event listeners..."
            );
            await this.handleEthersFilterError(error);
        } else {
            logger.error("❌ Non-filter provider error:", error);

            // For severe provider errors, attempt a provider reconnection
            if (
                error.message &&
                (error.message.includes("connection") ||
                    error.message.includes("network"))
            ) {
                logger.warn(
                    "🔌 Network error detected, attempting provider reconnection..."
                );
                await this.reconnectProvider();
            }
        }
    }

    /**
     * Attempt to reconnect the provider
     */
    async reconnectProvider() {
        try {
            logger.info("� Reconnecting to RPC provider...");

            // Create a new provider instance
            this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
            this.wallet = new ethers.Wallet(
                process.env.PRIVATE_KEY,
                this.provider
            );

            // Recreate contract instance with new provider
            const abiPath = path.join(__dirname, "abi", "OrderProtocol.json");
            const contractABI = JSON.parse(fs.readFileSync(abiPath, "utf8"));
            this.contract = new ethers.Contract(
                process.env.CONTRACT_ADDRESS,
                contractABI,
                this.wallet
            );

            // Test the new connection
            await this.provider.getBlockNumber();

            // Recreate event listeners
            await this.recreateEventListeners();

            logger.info("✅ Provider reconnection successful");
        } catch (error) {
            logger.error("❌ Provider reconnection failed:", error);

            // Schedule retry after delay
            setTimeout(() => {
                logger.info("⏰ Retrying provider reconnection...");
                this.reconnectProvider();
            }, 10000);
        }
    }

    /**
     * Recreate event listeners after filter expiration
     */
    async recreateEventListeners() {
        try {
            logger.info("🔄 Recreating event listeners...");

            // Remove all existing listeners and clear internal state
            try {
                this.contract.removeAllListeners();
                this.provider.removeAllListeners();
            } catch (cleanupError) {
                logger.warn(
                    "⚠️ Error during listener cleanup (continuing):",
                    cleanupError.message
                );
            }

            this.eventListeners.clear();

            // Wait longer for ethers internal cleanup
            await new Promise((resolve) => setTimeout(resolve, 3000));

            // Get fresh block number for new listeners
            try {
                this.lastEventBlock = await this.provider.getBlockNumber();
                logger.info(
                    `📍 Reset event listening from block: ${this.lastEventBlock}`
                );
            } catch (blockError) {
                logger.warn(
                    "⚠️ Could not get current block, using previous value"
                );
            }

            // Setup listeners again
            await this.setupEventListeners();

            logger.info("✅ Event listeners recreated successfully");
        } catch (error) {
            logger.error("Failed to recreate event listeners:", error);

            // For ethers errors, try a more aggressive reset
            if (this.isEthersFilterError(error)) {
                logger.warn(
                    "🔄 Ethers error during recreation, attempting provider reset..."
                );
                setTimeout(() => {
                    this.reconnectProvider();
                }, 5000);
            } else {
                // Schedule normal retry after a delay
                setTimeout(() => {
                    logger.info("⏰ Retrying event listener recreation...");
                    this.recreateEventListeners();
                }, 5000);
            }
        }
    }

    /**
     * Start periodic health check for filters
     */
    startFilterHealthCheck() {
        if (this.filterReconnectInterval) {
            clearInterval(this.filterReconnectInterval);
        }

        this.filterReconnectInterval = setInterval(async () => {
            try {
                logger.debug("🔍 Performing filter health check...");

                // Try to get the latest block - this will fail if provider connection is bad
                const currentBlock = await this.provider.getBlockNumber();

                // Check if we've missed any blocks (could indicate filter issues)
                const blockDiff = currentBlock - this.lastEventBlock;
                if (blockDiff > 50) {
                    // If we're behind by more than 50 blocks
                    logger.warn(
                        `⚠️ Potential missed events, blocks behind: ${blockDiff}`
                    );
                    logger.info("🔄 Proactively recreating listeners...");
                    await this.recreateEventListeners();
                }

                logger.debug(
                    `✅ Filter health check passed. Current block: ${currentBlock}, Last event block: ${this.lastEventBlock}`
                );
            } catch (error) {
                logger.error("❌ Filter health check failed:", error.message);

                // If health check fails, recreate listeners
                if (
                    error.message.includes("filter") ||
                    error.message.includes("connection")
                ) {
                    await this.recreateEventListeners();
                }
            }
        }, this.filterCheckInterval);

        logger.info(
            `⏰ Filter health check started (every ${
                this.filterCheckInterval / 1000
            }s)`
        );
    }

    /**
     * Execute contract call with automatic filter error recovery
     * @param {Function} contractCall - The contract method to execute
     * @param {string} operationName - Name of the operation for logging
     * @param {number} maxRetries - Maximum number of retry attempts
     */
    async executeWithFilterRecovery(
        contractCall,
        operationName,
        maxRetries = 2
    ) {
        let attempt = 0;

        while (attempt <= maxRetries) {
            try {
                return await contractCall();
            } catch (error) {
                attempt++;

                // Check if it's any type of ethers filter error
                if (this.isEthersFilterError(error)) {
                    logger.warn(
                        `🔄 Ethers filter error in ${operationName} (attempt ${attempt}/${
                            maxRetries + 1
                        }), handling recovery...`
                    );

                    if (attempt <= maxRetries) {
                        await this.handleEthersFilterError(error);
                        await new Promise((resolve) =>
                            setTimeout(resolve, 2000)
                        ); // Wait 2 seconds before retry
                        continue;
                    }
                }

                // If it's not a filter error or we've exhausted retries, throw the error
                logger.error(
                    `❌ ${operationName} failed after ${attempt} attempts:`,
                    error
                );
                throw error;
            }
        }
    }

    async stopListening() {
        try {
            if (!this.isListening) {
                logger.warn("Bot is not currently listening");
                return;
            }

            logger.info("🛑 Stopping event listener...");

            // Stop polling if active
            if (this.pollingInterval) {
                clearInterval(this.pollingInterval);
                this.pollingInterval = null;
                logger.info("🔄 Polling mode stopped");
            }

            // Stop filter health check
            if (this.filterReconnectInterval) {
                clearInterval(this.filterReconnectInterval);
                this.filterReconnectInterval = null;
                logger.info("⏰ Filter health check stopped");
            }

            // Remove all listeners
            this.contract.removeAllListeners();
            this.provider.removeAllListeners();
            this.eventListeners.clear();
            this.isListening = false;

            // Close callback server
            if (this.callbackServer) {
                await new Promise((resolve) => {
                    this.callbackServer.close(() => {
                        logger.info("📴 Callback server stopped");
                        resolve();
                    });
                });
            }

            // Close auction socket connection
            if (this.socketClient) {
                this.socketClient.disconnect();
                logger.info("📴 Auction socket disconnected");
            }

            // Clean up any active auction timeouts
            for (const [orderId, timeoutId] of this.auctionTimeouts) {
                clearTimeout(timeoutId);
                logger.debug(`🧹 Cleared timeout for auction ${orderId}`);
            }
            this.auctionTimeouts.clear();
            this.activeAuctions.clear();

            logger.info("✅ Event listener stopped");
        } catch (error) {
            logger.error("Error stopping listener:", error);
        }
    }

    /**
     * Submit payment proof to backend for order fulfillment verification
     */
    async submitProofToBackend(orderId, transactionId) {
        try {
            this.logger.info(
                `📤 Submitting proof to backend for order ${orderId}...`
            );
            this.logger.info(`🔗 Transaction ID: ${transactionId}`);

            const response = await axios.post(
                `${process.env.BACKEND_URL}/api/orders/${orderId}/fulfill`,
                {
                    transactionId: transactionId,
                    resolverAddress: this.wallet.address,
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                    timeout: 30000,
                }
            );

            if (response.status === 200) {
                this.logger.info(`✅ Proof submitted successfully!`);
                this.logger.info(`📋 Backend response:`, response.data);
                return true;
            } else {
                this.logger.warn(
                    `⚠️ Unexpected response status: ${response.status}`
                );
                return false;
            }
        } catch (error) {
            this.logger.error("❌ Failed to submit proof to backend:", {
                orderId,
                transactionId,
                error: error.message,
                status: error.response?.status,
                responseData: error.response?.data,
                service: "resolver-bot",
                timestamp: new Date().toISOString(),
            });

            // Log specific guidance based on error type
            if (error.response?.status === 400) {
                this.logger.error("💡 Possible causes for 400 error:");
                this.logger.error(
                    "   1. RazorpayX transaction verification failed"
                );
                this.logger.error(
                    "   2. Transaction validation (amount/status mismatch)"
                );
                this.logger.error(
                    "   3. Order not properly accepted on blockchain"
                );
                this.logger.error("   4. Missing or invalid transaction ID");
                this.logger.error(
                    `   🔗 Transaction ID being verified: ${transactionId}`
                );
            }

            return false;
        }
    }

    async start() {
        try {
            await this.initialize();
            await this.startListening();

            logger.info("🚀 Resolver Bot is now running 24x7!");
            logger.info("Press Ctrl+C to stop the bot");

            // Handle graceful shutdown
            process.on("SIGINT", async () => {
                logger.info("\n📴 Received shutdown signal...");
                await this.stopListening();
                process.exit(0);
            });

            process.on("SIGTERM", async () => {
                logger.info("\n📴 Received termination signal...");
                await this.stopListening();
                process.exit(0);
            });

            // Keep the process alive
            process.on("uncaughtException", (error) => {
                logger.error("Uncaught Exception:", error);

                // If it's any ethers filter error, try to recover instead of exiting
                if (this.isEthersFilterError(error)) {
                    logger.warn(
                        "🔄 Ethers filter-related uncaught exception, attempting recovery..."
                    );
                    this.handleEthersFilterError(error).catch((err) => {
                        logger.error(
                            "Failed to recover from filter exception:",
                            err
                        );
                        process.exit(1);
                    });
                } else {
                    process.exit(1);
                }
            });

            process.on("unhandledRejection", (reason, promise) => {
                logger.error(
                    "Unhandled Rejection at:",
                    promise,
                    "reason:",
                    reason
                );

                // If it's any ethers filter error, try to recover instead of crashing
                if (reason && this.isEthersFilterError(reason)) {
                    logger.warn(
                        "🔄 Ethers filter-related unhandled rejection, attempting recovery..."
                    );
                    this.handleEthersFilterError(reason).catch((err) => {
                        logger.error(
                            "Failed to recover from filter rejection:",
                            err
                        );
                    });
                }
            });
        } catch (error) {
            logger.error("Failed to start Resolver Bot:", error);
            process.exit(1);
        }
    }
}

// Create and start the bot
const resolverBot = new ResolverBot();
resolverBot.start();

module.exports = ResolverBot;
