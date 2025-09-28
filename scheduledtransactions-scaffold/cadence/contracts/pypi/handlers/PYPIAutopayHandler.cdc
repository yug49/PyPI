import "FlowTransactionScheduler"
import "FlowTransactionSchedulerUtils"
import "FlowToken"
import "FungibleToken"
import "PYPITypes"
import "PYPIStorage"
import "PYPIEvents"
import "PYPI"

/// PYPI Autopay Handler
/// Handles scheduled payment execution for PYPI system

access(all) contract PYPIAutopayHandler {

    /// Event emitted when an autopay is executed
    access(all) event AutopayExecuted(
        autopayId: UInt64,
        owner: Address,
        recipient: Address,
        amount: UFix64,
        executionCount: UInt64,
        transactionId: String?
    )

    /// Event emitted when an autopay is scheduled
    access(all) event AutopayScheduled(
        autopayId: UInt64,
        owner: Address,
        nextExecutionTime: UFix64,
        executionCount: UInt64
    )

    /// Event emitted when an autopay reaches its maximum executions
    access(all) event AutopayCompleted(
        autopayId: UInt64,
        owner: Address,
        totalExecutions: UInt64,
        totalAmount: UFix64
    )

    /// Event emitted when a payment fails
    access(all) event PaymentFailed(
        autopayId: UInt64?,
        payer: Address,
        recipient: Address,
        amount: UFix64,
        error: String
    )

    /// Handler resource that implements the Scheduled Transaction interface
    access(all) resource Handler: FlowTransactionScheduler.TransactionHandler {
        access(FlowTransactionScheduler.Execute) fun executeTransaction(id: UInt64, data: AnyStruct?) {
            // Extract config ID from transaction data
            let configId = data as! UInt64? ?? panic("Config ID required")

            // Get config from storage
            let storage = PYPIAutopayHandler.account.storage
                .borrow<&PYPIStorage.AutopayStorage>(from: PYPIStorage.AutopayStoragePath)
                ?? panic("Could not borrow AutopayStorage")

            let config = storage.getConfig(id: configId)
                ?? panic("Config not found: ".concat(configId.toString()))

            if !config.isActive {
                emit PaymentFailed(
                    autopayId: configId,
                    payer: config.owner,
                    recipient: config.paymentConfig.recipient,
                    amount: config.paymentConfig.amount,
                    error: "Autopay is inactive"
                )
                return
            }

            // Execute payment
            let result = PYPI.executePayment(
                payer: config.owner,
                recipient: config.paymentConfig.recipient,
                amount: config.paymentConfig.amount,
                tokenType: config.paymentConfig.tokenType
            )

            if result.success {
                // Update config with execution details
                let updatedConfig = config
                    .withIncrementedCount()
                    .withLastScheduled(timestamp: getCurrentBlock().timestamp)
                storage.updateConfig(id: configId, config: updatedConfig)

                // Record successful payment
                storage.recordPayment(amount: config.paymentConfig.amount)

                // Emit success event
                emit AutopayExecuted(
                    autopayId: configId,
                    owner: config.owner,
                    recipient: config.paymentConfig.recipient,
                    amount: config.paymentConfig.amount,
                    executionCount: updatedConfig.executionCount,
                    transactionId: result.transactionId
                )

                // Check if we should continue scheduling
                if !updatedConfig.shouldContinue() {
                    emit AutopayCompleted(
                        autopayId: configId,
                        owner: config.owner,
                        totalExecutions: updatedConfig.executionCount,
                        totalAmount: UFix64(updatedConfig.executionCount) * config.paymentConfig.amount
                    )
                    return
                }

                // Schedule next execution if this is a recurring payment
                if config.scheduleType != PYPITypes.ScheduleType.ONCE {
                    let nextTimestamp = getCurrentBlock().timestamp + (config.intervalSeconds ?? 0.0)
                    
                    // Get manager capability
                    let managerCap = PYPIAutopayHandler.account.capabilities.storage
                        .issue<auth(FlowTransactionSchedulerUtils.Owner) &{FlowTransactionSchedulerUtils.Manager}>(
                            FlowTransactionSchedulerUtils.managerStoragePath
                        )

                    // Get fee provider capability
                    let feeProviderCap = PYPIAutopayHandler.account.capabilities.storage
                        .issue<auth(FungibleToken.Withdraw) &FlowToken.Vault>(
                            /storage/flowTokenVault
                        )

                    // Schedule next execution
                    let manager = managerCap.borrow() ?? panic("Could not borrow manager")
                    let feeProvider = feeProviderCap.borrow() ?? panic("Could not borrow fee provider")

                    let est = FlowTransactionScheduler.estimate(
                        data: configId,
                        timestamp: nextTimestamp,
                        priority: FlowTransactionScheduler.Priority.Medium,
                        executionEffort: 1000
                    )

                    let fees <- feeProvider.withdraw(amount: est.flowFee ?? 0.0)

                    let nextId = manager.scheduleByHandler(
                        handlerTypeIdentifier: self.getType().identifier,
                        handlerUUID: self.uuid,
                        data: configId,
                        timestamp: nextTimestamp,
                        priority: FlowTransactionScheduler.Priority.Medium,
                        executionEffort: 1000,
                        fees: <-fees as! @FlowToken.Vault
                    )

                    emit AutopayScheduled(
                        autopayId: configId,
                        owner: config.owner,
                        nextExecutionTime: nextTimestamp,
                        executionCount: updatedConfig.executionCount
                    )
                }
            } else {
                emit PaymentFailed(
                    autopayId: configId,
                    payer: config.owner,
                    recipient: config.paymentConfig.recipient,
                    amount: config.paymentConfig.amount,
                    error: result.error ?? "Unknown error"
                )
            }
        }

        access(all) view fun getViews(): [Type] {
            return [Type<StoragePath>(), Type<PublicPath>()]
        }

        access(all) fun resolveView(_ view: Type): AnyStruct? {
            switch view {
                case Type<StoragePath>():
                    return /storage/PYPIAutopayHandler
                case Type<PublicPath>():
                    return /public/PYPIAutopayHandler
                default:
                    return nil
            }
        }
    }

    /// Factory for the handler resource
    access(all) fun createHandler(): @Handler {
        return <- create Handler()
    }
}