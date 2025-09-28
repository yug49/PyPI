import "PYPITypes"
import "PYPIStorage"
import "PYPIEvents"
import "PYPIErrors"

/// PYPI Configuration Manager
/// Manages autopay configurations for the PYPI system

access(all) contract PYPIConfigManager {

    /// Event emitted when a new autopay is created
    access(all) event AutopayCreated(
        autopayId: UInt64,
        owner: Address,
        recipient: Address,
        amount: UFix64,
        scheduleType: UInt8,
        intervalSeconds: UFix64?,
        maxExecutions: UInt64?
    )

    /// Event emitted when a configuration is updated
    access(all) event ConfigUpdated(
        autopayId: UInt64,
        owner: Address,
        field: String,
        oldValue: String,
        newValue: String
    )

    /// Resource interface for configuration management
    access(all) resource interface ConfigManagerPublic {
        access(all) fun getConfig(id: UInt64): PYPITypes.AutopayConfig?
        access(all) fun getActiveConfigs(): [PYPITypes.AutopayConfig]
        access(all) fun getConfigsByUser(userAddress: Address): [PYPITypes.AutopayConfig]
        access(all) fun getSystemStats(): PYPITypes.SystemStats
    }

    /// Resource for managing autopay configurations
    access(all) resource ConfigManager: ConfigManagerPublic {
        /// Create a new autopay configuration
        access(all) fun createConfig(
            owner: Address,
            paymentConfig: PYPITypes.PaymentConfig,
            scheduleType: PYPITypes.ScheduleType,
            intervalSeconds: UFix64?,
            maxExecutions: UInt64?
        ): UInt64 {
            // Validate inputs
            if paymentConfig.amount <= 0.0 {
                panic(PYPIErrors.getErrorMessage(code: PYPIErrors.ErrorCode.InvalidAmount))
            }

            if owner == paymentConfig.recipient {
                panic(PYPIErrors.getErrorMessage(code: PYPIErrors.ErrorCode.InvalidRecipient))
            }

            if scheduleType != PYPITypes.ScheduleType.ONCE && intervalSeconds == nil {
                panic(PYPIErrors.getErrorMessage(code: PYPIErrors.ErrorCode.InvalidInterval))
            }

            // Create config
            let config = PYPITypes.AutopayConfig(
                id: 0, // Will be set by storage
                owner: owner,
                paymentConfig: paymentConfig,
                scheduleType: scheduleType,
                intervalSeconds: intervalSeconds,
                maxExecutions: maxExecutions
            )

            // Get storage and save config
            let storage = PYPIConfigManager.account.storage
                .borrow<auth(Storage, BorrowValue) &PYPIStorage.AutopayStorage>(from: PYPIStorage.AutopayStoragePath)
                ?? panic("Could not borrow AutopayStorage")

            let configId = storage.addConfig(config: config)

            // Emit event
            emit AutopayCreated(
                autopayId: configId,
                owner: owner,
                recipient: paymentConfig.recipient,
                amount: paymentConfig.amount,
                scheduleType: UInt8(scheduleType.rawValue),
                intervalSeconds: intervalSeconds,
                maxExecutions: maxExecutions
            )

            return configId
        }

        /// Update an existing autopay configuration
        access(all) fun updateConfig(
            id: UInt64,
            isActive: Bool?,
            amount: UFix64?,
            intervalSeconds: UFix64?,
            maxExecutions: UInt64?
        ) {
            let storage = PYPIConfigManager.account.storage
                .borrow<auth(Storage, BorrowValue) &PYPIStorage.AutopayStorage>(from: PYPIStorage.AutopayStoragePath)
                ?? panic("Could not borrow AutopayStorage")

            if let config = storage.getConfig(id: id) {
                // Create updated payment config if needed
                var updatedPaymentConfig = config.paymentConfig
                if let newAmount = amount {
                    if newAmount <= 0.0 {
                        panic(PYPIErrors.getErrorMessage(code: PYPIErrors.ErrorCode.InvalidAmount))
                    }
                    updatedPaymentConfig = PYPITypes.PaymentConfig(
                        recipient: config.paymentConfig.recipient,
                        amount: newAmount,
                        tokenType: config.paymentConfig.tokenType,
                        description: config.paymentConfig.description
                    )
                }

                // Create updated config
                var updatedConfig = PYPITypes.AutopayConfig(
                    id: config.id,
                    owner: config.owner,
                    paymentConfig: updatedPaymentConfig,
                    scheduleType: config.scheduleType,
                    intervalSeconds: intervalSeconds ?? config.intervalSeconds,
                    maxExecutions: maxExecutions ?? config.maxExecutions
                )

                // Update active status if specified
                if let newActive = isActive {
                    if !newActive {
                        updatedConfig = updatedConfig.deactivate()
                    }
                }

                // Save updated config
                storage.updateConfig(id: id, config: updatedConfig)

                // Emit event
                emit ConfigUpdated(
                    autopayId: id,
                    owner: config.owner,
                    field: "config",
                    oldValue: "old",
                    newValue: "new"
                )
            } else {
                panic(PYPIErrors.getErrorMessage(code: PYPIErrors.ErrorCode.AutopayNotFound))
            }
        }

        /// Implement ConfigManagerPublic interface
        access(all) fun getConfig(id: UInt64): PYPITypes.AutopayConfig? {
            let storage = PYPIConfigManager.account.storage
                .borrow<auth(Storage, BorrowValue) &PYPIStorage.AutopayStorage>(from: PYPIStorage.AutopayStoragePath)
                ?? panic("Could not borrow AutopayStorage")
            return storage.getConfig(id: id)
        }

        access(all) fun getActiveConfigs(): [PYPITypes.AutopayConfig] {
            let storage = PYPIConfigManager.account.storage
                .borrow<auth(Storage, BorrowValue) &PYPIStorage.AutopayStorage>(from: PYPIStorage.AutopayStoragePath)
                ?? panic("Could not borrow AutopayStorage")
            return storage.getActiveConfigs()
        }

        access(all) fun getConfigsByUser(userAddress: Address): [PYPITypes.AutopayConfig] {
            let storage = PYPIConfigManager.account.storage
                .borrow<auth(Storage, BorrowValue) &PYPIStorage.AutopayStorage>(from: PYPIStorage.AutopayStoragePath)
                ?? panic("Could not borrow AutopayStorage")
            return storage.getConfigsByUser(userAddress: userAddress)
        }

        access(all) fun getSystemStats(): PYPITypes.SystemStats {
            let storage = PYPIConfigManager.account.storage
                .borrow<auth(Storage, BorrowValue) &PYPIStorage.AutopayStorage>(from: PYPIStorage.AutopayStoragePath)
                ?? panic("Could not borrow AutopayStorage")
            return storage.getSystemStats()
        }
    }

    /// Create a new config manager resource
    access(all) fun createConfigManager(): @ConfigManager {
        return <- create ConfigManager()
    }

    init() {
        // Create and save the config manager
        let manager <- create ConfigManager()
        self.account.storage.save(<-manager, to: PYPIStorage.ConfigManagerPath)

        // Create public capability
        self.account.capabilities.publish(
            self.account.capabilities.storage.issue<&{ConfigManagerPublic}>(
                PYPIStorage.ConfigManagerPath
            ),
            at: PYPIStorage.ConfigManagerPublicPath
        )
    }
}