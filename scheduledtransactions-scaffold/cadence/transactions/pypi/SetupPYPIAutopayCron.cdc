import "FlowTransactionScheduler"
import "FlowTransactionSchedulerUtils"
import "FlowToken"
import "FungibleToken"
import "PYPI"

/// Setup PYPI autopay with cron functionality (equivalent to cron handler pattern)
transaction(
    userAddress: String,
    amount: UFix64,
    upiId: String,
    intervalSeconds: UFix64,
    priority: UInt8,
    executionEffort: UInt64,
    maxExecutions: UInt64,
    startDelaySeconds: UFix64
) {
    prepare(signer: auth(Storage, Capabilities) &Account) {
        let future = getCurrentBlock().timestamp + startDelaySeconds

        let pr = priority == 0
            ? FlowTransactionScheduler.Priority.High
            : priority == 1
            ? FlowTransactionScheduler.Priority.Medium
            : FlowTransactionScheduler.Priority.Low

        // Create PYPI autopay config for cron-style payments
        let configId = PYPI.setupAutopay(
            userAddress: userAddress,
            amount: amount,
            upiId: upiId,
            interval: intervalSeconds,
            maxPayments: maxExecutions, // Limited executions like cron
            evmRequestId: nil
        )

        let est = FlowTransactionScheduler.estimate(
            data: configId,
            timestamp: future,
            priority: pr,
            executionEffort: executionEffort
        )

        assert(
            est.timestamp != nil || pr == FlowTransactionScheduler.Priority.Low,
            message: est.error ?? "estimation failed"
        )

        let vaultRef = signer.storage
            .borrow<auth(FungibleToken.Withdraw) &FlowToken.Vault>(from: /storage/flowTokenVault)
            ?? panic("missing FlowToken vault")
        let fees <- vaultRef.withdraw(amount: est.flowFee ?? 0.0) as! @FlowToken.Vault

        // Initialize manager if needed
        if !signer.storage.check<@{FlowTransactionSchedulerUtils.Manager}>(from: FlowTransactionSchedulerUtils.managerStoragePath) {
            let manager <- FlowTransactionSchedulerUtils.createManager()
            signer.storage.save(<-manager, to: FlowTransactionSchedulerUtils.managerStoragePath)

            let managerRef = signer.capabilities.storage.issue<&{FlowTransactionSchedulerUtils.Manager}>(FlowTransactionSchedulerUtils.managerStoragePath)
            signer.capabilities.publish(managerRef, at: FlowTransactionSchedulerUtils.managerPublicPath)
        }

        // Get PYPI handler capability
        let handlerCap = PYPI.account.capabilities.storage
            .issue<auth(FlowTransactionScheduler.Execute) &{FlowTransactionScheduler.TransactionHandler}>(/storage/PYPIAutopayHandler)

        let manager = signer.storage.borrow<auth(FlowTransactionSchedulerUtils.Owner) &{FlowTransactionSchedulerUtils.Manager}>(from: FlowTransactionSchedulerUtils.managerStoragePath)
            ?? panic("Could not borrow Manager")

        let transactionId = manager.schedule(
            handlerCap: handlerCap,
            data: configId,
            timestamp: future,
            priority: pr,
            executionEffort: executionEffort,
            fees: <-fees
        )

        log("⏰ Scheduled PYPI autopay cron at \(future)")
        log("   Config ID: " + configId.toString())
        log("   Transaction ID: " + transactionId.toString())
        log("   User: " + userAddress)
        log("   Amount: " + amount.toString() + " PYUSD per payment")
        log("   UPI ID: " + upiId)
        log("   Interval: " + intervalSeconds.toString() + " seconds")
        log("   Max Executions: " + maxExecutions.toString())
        log("   Type: Cron-style limited payments")
    }
}