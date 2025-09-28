import "FlowToken"
import "FungibleToken"
import "PYPITypes"
import "PYPIStorage"
import "PYPIEvents"
import "PYPIErrors"
import "PYPIPaymentHandler"
import "PYPIConfigManager"

/// PYPI Main Coordinator (updated)
/// Coordinates all PYPI system functionality

access(all) contract PYPI {

    /// Event emitted when system statistics are updated
    access(all) event SystemStatsUpdated(
        totalAutopays: UInt64,
        activeAutopays: UInt64,
        totalPayments: UInt64,
        totalVolume: UFix64
    )

    /// Event emitted for system health checks
    access(all) event SystemHealthCheck(
        timestamp: UFix64,
        activeAutopays: UInt64,
        pendingTransactions: UInt64,
        systemStatus: String
    )

    /// Setup a new autopay configuration
    access(all) fun setupAutopay(
        userAddress: String,
        amount: UFix64,
        upiId: String,
        interval: UFix64,
        maxPayments: UInt64?,
        evmRequestId: String?
    ): UInt64 {
        // Create payment config
        let paymentConfig = PYPITypes.PaymentConfig(
            recipient: Address.fromString(userAddress) ?? panic("Invalid address"),
            amount: amount,
            tokenType: "PYUSD",
            description: "Payment to ".concat(upiId)
        )

        // Determine schedule type
        let scheduleType = maxPayments == nil
            ? (interval == 0.0 ? PYPITypes.ScheduleType.ONCE : PYPITypes.ScheduleType.LOOP)
            : PYPITypes.ScheduleType.CRON

        // Get config manager
        let manager = self.account.storage
            .borrow<auth(Storage, BorrowValue) &PYPIConfigManager.ConfigManager>(
                from: PYPIStorage.ConfigManagerPath
            )
            ?? panic("Could not borrow ConfigManager")

        // Create config
        return manager.createConfig(
            owner: self.account.address,
            paymentConfig: paymentConfig,
            scheduleType: scheduleType,
            intervalSeconds: interval == 0.0 ? nil : interval,
            maxExecutions: maxPayments
        )
    }

    /// Execute a payment - demonstration version using contract's own vault
    /// Note: In production, this would require proper authorization from the payer
    access(all) fun executePayment(
        payer: Address,
        recipient: Address,
        amount: UFix64,
        tokenType: String
    ): PYPITypes.PaymentResult {
        // For demonstration: Use the contract account's vault to simulate payments
        // In production, this would require pre-authorized capabilities from the payer
        
        let contractVault = self.account.storage
            .borrow<auth(FungibleToken.Withdraw) &FlowToken.Vault>(from: /storage/flowTokenVault)
            ?? panic("Could not borrow contract's FlowToken vault")
        
        // Check contract balance
        if contractVault.balance < amount {
            return PYPITypes.PaymentResult(
                success: false,
                transactionId: nil,
                error: PYPIErrors.getErrorMessage(code: PYPIErrors.ErrorCode.InsufficientBalance)
            )
        }
        
        // Get recipient's vault
        let recipientAccount = getAccount(recipient)
        let recipientVault = recipientAccount.capabilities.get<&FlowToken.Vault>(/public/flowTokenReceiver)
            .borrow()
        
        if recipientVault == nil {
            return PYPITypes.PaymentResult(
                success: false,
                transactionId: nil,
                error: "Recipient vault not available"
            )
        }
        
        // Execute transfer from contract vault to recipient
        let payment <- contractVault.withdraw(amount: amount)
        recipientVault!.deposit(from: <-payment)
        
        // Generate transaction ID
        let txId = "pypi-tx-".concat(payer.toString()).concat("-").concat(recipient.toString()).concat("-").concat(getCurrentBlock().timestamp.toString())
        
        return PYPITypes.PaymentResult(
            success: true,
            transactionId: txId,
            error: nil
        )
    }

    /// Get system health status
    access(all) fun getSystemHealth(): String {
        let storage = self.account.storage
            .borrow<auth(Storage) &PYPIStorage.AutopayStorage>(from: PYPIStorage.AutopayStoragePath)
            ?? panic("Could not borrow AutopayStorage")

        let stats = storage.getSystemStats()
        let activeConfigs = storage.getActiveConfigs()

        emit SystemHealthCheck(
            timestamp: getCurrentBlock().timestamp,
            activeAutopays: UInt64(activeConfigs.length),
            pendingTransactions: 0,
            systemStatus: "healthy"
        )

        return "healthy"
    }

    init() {
        // System is initialized by PYPIStorage, PYPIConfigManager contracts
    }
}