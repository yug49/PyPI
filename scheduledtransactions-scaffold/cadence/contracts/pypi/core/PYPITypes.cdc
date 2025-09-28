import "FungibleToken"
import "FlowToken"

/// PYPI Core Types & Interfaces
/// Defines the core data structures for the PYPI (Pay Your Payment Instantly) system

access(all) contract PYPITypes {

    /// Payment configuration for autopay
    access(all) struct PaymentConfig {
        access(all) let recipient: Address
        access(all) let amount: UFix64
        access(all) let tokenType: String
        access(all) let description: String
        access(all) var isActive: Bool
        access(all) var createdAt: UFix64
        access(all) var lastExecuted: UFix64?

        init(
            recipient: Address,
            amount: UFix64,
            tokenType: String,
            description: String
        ) {
            self.recipient = recipient
            self.amount = amount
            self.tokenType = tokenType
            self.description = description
            self.isActive = true
            self.createdAt = getCurrentBlock().timestamp
            self.lastExecuted = nil
        }

        access(all) fun withLastExecuted(timestamp: UFix64): PaymentConfig {
            let config = PaymentConfig(
                recipient: self.recipient,
                amount: self.amount,
                tokenType: self.tokenType,
                description: self.description
            )
            config.isActive = self.isActive
            config.createdAt = self.createdAt
            config.lastExecuted = timestamp
            return config
        }

        access(all) fun deactivate(): PaymentConfig {
            let config = PaymentConfig(
                recipient: self.recipient,
                amount: self.amount,
                tokenType: self.tokenType,
                description: self.description
            )
            config.isActive = false
            config.createdAt = self.createdAt
            config.lastExecuted = self.lastExecuted
            return config
        }
    }

    /// Autopay configuration for recurring payments
    access(all) struct AutopayConfig {
        access(all) let id: UInt64
        access(all) let owner: Address
        access(all) let paymentConfig: PaymentConfig
        access(all) let scheduleType: ScheduleType
        access(all) let intervalSeconds: UFix64?
        access(all) let maxExecutions: UInt64?
        access(all) var executionCount: UInt64
        access(all) var isActive: Bool
        access(all) var createdAt: UFix64
        access(all) var lastScheduled: UFix64?

        init(
            id: UInt64,
            owner: Address,
            paymentConfig: PaymentConfig,
            scheduleType: ScheduleType,
            intervalSeconds: UFix64?,
            maxExecutions: UInt64?
        ) {
            self.id = id
            self.owner = owner
            self.paymentConfig = paymentConfig
            self.scheduleType = scheduleType
            self.intervalSeconds = intervalSeconds
            self.maxExecutions = maxExecutions
            self.executionCount = 0
            self.isActive = true
            self.createdAt = getCurrentBlock().timestamp
            self.lastScheduled = nil
        }

        access(all) fun withIncrementedCount(): AutopayConfig {
            let config = AutopayConfig(
                id: self.id,
                owner: self.owner,
                paymentConfig: self.paymentConfig,
                scheduleType: self.scheduleType,
                intervalSeconds: self.intervalSeconds,
                maxExecutions: self.maxExecutions
            )
            config.executionCount = self.executionCount + 1
            config.isActive = self.isActive
            config.createdAt = self.createdAt
            config.lastScheduled = self.lastScheduled
            return config
        }

        access(all) fun withLastScheduled(timestamp: UFix64): AutopayConfig {
            let config = AutopayConfig(
                id: self.id,
                owner: self.owner,
                paymentConfig: self.paymentConfig,
                scheduleType: self.scheduleType,
                intervalSeconds: self.intervalSeconds,
                maxExecutions: self.maxExecutions
            )
            config.executionCount = self.executionCount
            config.isActive = self.isActive
            config.createdAt = self.createdAt
            config.lastScheduled = timestamp
            return config
        }

        access(all) fun deactivate(): AutopayConfig {
            let config = AutopayConfig(
                id: self.id,
                owner: self.owner,
                paymentConfig: self.paymentConfig.deactivate(),
                scheduleType: self.scheduleType,
                intervalSeconds: self.intervalSeconds,
                maxExecutions: self.maxExecutions
            )
            config.executionCount = self.executionCount
            config.isActive = false
            config.createdAt = self.createdAt
            config.lastScheduled = self.lastScheduled
            return config
        }

        access(all) fun shouldContinue(): Bool {
            if !self.isActive {
                return false
            }
            if let max = self.maxExecutions {
                return self.executionCount < max
            }
            return true
        }
    }

    /// Schedule types for autopay
    access(all) enum ScheduleType: UInt8 {
        access(all) case ONCE
        access(all) case LOOP
        access(all) case CRON
    }

    /// System statistics
    access(all) struct SystemStats {
        access(all) let totalAutopays: UInt64
        access(all) let activeAutopays: UInt64
        access(all) let totalPayments: UInt64
        access(all) let totalVolume: UFix64
        access(all) let lastUpdated: UFix64

        init(
            totalAutopays: UInt64,
            activeAutopays: UInt64,
            totalPayments: UInt64,
            totalVolume: UFix64
        ) {
            self.totalAutopays = totalAutopays
            self.activeAutopays = activeAutopays
            self.totalPayments = totalPayments
            self.totalVolume = totalVolume
            self.lastUpdated = getCurrentBlock().timestamp
        }
    }

    /// Payment execution result
    access(all) struct PaymentResult {
        access(all) let success: Bool
        access(all) let transactionId: String?
        access(all) let error: String?
        access(all) let timestamp: UFix64

        init(success: Bool, transactionId: String?, error: String?) {
            self.success = success
            self.transactionId = transactionId
            self.error = error
            self.timestamp = getCurrentBlock().timestamp
        }
    }

    /// Bridge Order Types and Enums

    /// Supported blockchain networks for bridge operations
    access(all) enum BridgeChain: UInt8 {
        access(all) case ethereum
        access(all) case flow
        access(all) case arbitrum  // Added for Arbitrum support
    }

    /// Types of bridge operations
    access(all) enum BridgeOrderType: UInt8 {
        access(all) case deposit   // From external chain to Flow
        access(all) case withdraw  // From Flow to external chain
    }

    /// Supported token types for bridging
    access(all) enum BridgeTokenType: UInt8 {
        access(all) case PYUSD
        access(all) case USDC
        // Future token types can be added here
    }

    /// Bridge order priority levels
    access(all) enum BridgeOrderPriority: UInt8 {
        access(all) case low
        access(all) case medium
        access(all) case high
        access(all) case urgent
    }

    /// Bridge order status
    access(all) enum BridgeOrderStatus: UInt8 {
        access(all) case pending
        access(all) case processing
        access(all) case completed
        access(all) case failed
        access(all) case cancelled
    }

    /// Bridge operation statistics
    access(all) struct BridgeStats {
        access(all) let totalOrders: UInt64
        access(all) let pendingOrders: UInt64
        access(all) let completedOrders: UInt64
        access(all) let failedOrders: UInt64
        access(all) let totalVolume: UFix64
        access(all) let lastUpdated: UFix64

        init(
            totalOrders: UInt64,
            pendingOrders: UInt64,
            completedOrders: UInt64,
            failedOrders: UInt64,
            totalVolume: UFix64
        ) {
            self.totalOrders = totalOrders
            self.pendingOrders = pendingOrders
            self.completedOrders = completedOrders
            self.failedOrders = failedOrders
            self.totalVolume = totalVolume
            self.lastUpdated = getCurrentBlock().timestamp
        }
    }

    /// Bridge configuration for autopay-style recurring bridge orders
    access(all) struct BridgeAutopayConfig {
        access(all) let id: UInt64
        access(all) let owner: Address
        access(all) let amount: UFix64
        access(all) let sourceChain: String
        access(all) let destinationChain: String
        access(all) let recipient: Address
        access(all) let tokenType: String
        access(all) let orderType: String
        access(all) let scheduleType: ScheduleType
        access(all) let intervalSeconds: UFix64?
        access(all) let maxExecutions: UInt64?
        access(all) var executionCount: UInt64
        access(all) var isActive: Bool
        access(all) var createdAt: UFix64
        access(all) var lastScheduled: UFix64?

        init(
            id: UInt64,
            owner: Address,
            amount: UFix64,
            sourceChain: String,
            destinationChain: String,
            recipient: Address,
            tokenType: String,
            orderType: String,
            scheduleType: ScheduleType,
            intervalSeconds: UFix64?,
            maxExecutions: UInt64?
        ) {
            self.id = id
            self.owner = owner
            self.amount = amount
            self.sourceChain = sourceChain
            self.destinationChain = destinationChain
            self.recipient = recipient
            self.tokenType = tokenType
            self.orderType = orderType
            self.scheduleType = scheduleType
            self.intervalSeconds = intervalSeconds
            self.maxExecutions = maxExecutions
            self.executionCount = 0
            self.isActive = true
            self.createdAt = getCurrentBlock().timestamp
            self.lastScheduled = nil
        }

        access(all) fun withIncrementedCount(): BridgeAutopayConfig {
            let config = BridgeAutopayConfig(
                id: self.id,
                owner: self.owner,
                amount: self.amount,
                sourceChain: self.sourceChain,
                destinationChain: self.destinationChain,
                recipient: self.recipient,
                tokenType: self.tokenType,
                orderType: self.orderType,
                scheduleType: self.scheduleType,
                intervalSeconds: self.intervalSeconds,
                maxExecutions: self.maxExecutions
            )
            config.executionCount = self.executionCount + 1
            config.isActive = self.isActive
            config.createdAt = self.createdAt
            config.lastScheduled = self.lastScheduled
            return config
        }

        access(all) fun deactivate(): BridgeAutopayConfig {
            let config = BridgeAutopayConfig(
                id: self.id,
                owner: self.owner,
                amount: self.amount,
                sourceChain: self.sourceChain,
                destinationChain: self.destinationChain,
                recipient: self.recipient,
                tokenType: self.tokenType,
                orderType: self.orderType,
                scheduleType: self.scheduleType,
                intervalSeconds: self.intervalSeconds,
                maxExecutions: self.maxExecutions
            )
            config.executionCount = self.executionCount
            config.isActive = false
            config.createdAt = self.createdAt
            config.lastScheduled = self.lastScheduled
            return config
        }

        access(all) fun shouldContinue(): Bool {
            if !self.isActive {
                return false
            }
            if let max = self.maxExecutions {
                return self.executionCount < max
            }
            return true
        }
    }
}
