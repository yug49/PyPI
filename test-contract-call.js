const { createPublicClient, http } = require("viem");

async function testContractCall() {
    console.log("🔧 Testing Direct Contract Call...");

    try {
        const rpcUrl = "https://testnet.evm.nodes.onflow.org";
        const contractAddress = "0x756523eDF6FfC690361Df3c61Ec3719F77e9Aa1a";
        const orderId =
            "0x2e3ca2e75fd1b193a8df070bcc33f03d6aa3edfa0e29fe418d881837e0f6da1c";

        console.log("📋 Order ID:", orderId);
        console.log("🏗️ Contract:", contractAddress);
        console.log("🌐 RPC:", rpcUrl);

        // Create public client
        const publicClient = createPublicClient({
            chain: {
                id: 4801,
                name: "Worldchain Sepolia",
                network: "worldchain-sepolia",
                nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
                rpcUrls: {
                    default: { http: [rpcUrl] },
                    public: { http: [rpcUrl] },
                },
                blockExplorers: {
                    default: {
                        name: "Explorer",
                        url: "https://testnet.evm.nodes.onflow.org",
                    },
                },
            },
            transport: http(rpcUrl),
        });

        console.log("✅ Public client created");

        // Simple ABI for getOrder
        const abi = [
            {
                inputs: [
                    {
                        internalType: "bytes32",
                        name: "_orderId",
                        type: "bytes32",
                    },
                ],
                name: "getOrder",
                outputs: [
                    {
                        components: [
                            {
                                internalType: "address",
                                name: "maker",
                                type: "address",
                            },
                            {
                                internalType: "address",
                                name: "taker",
                                type: "address",
                            },
                            {
                                internalType: "string",
                                name: "recipientUpiAddress",
                                type: "string",
                            },
                            {
                                internalType: "uint256",
                                name: "amount",
                                type: "uint256",
                            },
                            {
                                internalType: "address",
                                name: "token",
                                type: "address",
                            },
                            {
                                internalType: "uint256",
                                name: "startPrice",
                                type: "uint256",
                            },
                            {
                                internalType: "uint256",
                                name: "acceptedPrice",
                                type: "uint256",
                            },
                            {
                                internalType: "uint256",
                                name: "endPrice",
                                type: "uint256",
                            },
                            {
                                internalType: "uint256",
                                name: "startTime",
                                type: "uint256",
                            },
                            {
                                internalType: "uint256",
                                name: "acceptedTime",
                                type: "uint256",
                            },
                            {
                                internalType: "bool",
                                name: "accepted",
                                type: "bool",
                            },
                            {
                                internalType: "bool",
                                name: "fullfilled",
                                type: "bool",
                            },
                        ],
                        internalType: "struct OrderProtocol.Order",
                        name: "",
                        type: "tuple",
                    },
                ],
                stateMutability: "view",
                type: "function",
            },
        ];

        console.log("📞 Calling getOrder...");

        // Call contract
        const result = await publicClient.readContract({
            address: contractAddress,
            abi: abi,
            functionName: "getOrder",
            args: [orderId],
        });

        console.log("✅ Contract call successful!");
        console.log("📋 Raw result:", result);

        // Parse result
        const order = {
            maker: result[0],
            taker: result[1],
            recipientUpiAddress: result[2],
            amount: result[3].toString(),
            token: result[4],
            startPrice: result[5].toString(),
            acceptedPrice: result[6].toString(),
            endPrice: result[7].toString(),
            startTime: Number(result[8]),
            acceptedTime: Number(result[9]),
            accepted: result[10],
            fullfilled: result[11],
        };

        console.log("📊 Parsed order:");
        console.log(JSON.stringify(order, null, 2));
    } catch (error) {
        console.error("❌ Error calling contract:");
        console.error("Message:", error.message);
        console.error("Details:", error);
    }
}

testContractCall();
