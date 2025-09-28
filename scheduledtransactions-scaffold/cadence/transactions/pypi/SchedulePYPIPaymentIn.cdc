import "FlowTransactionScheduler"
import "FlowTransactionSchedulerUtils"
import "FlowToken"
import "FungibleToken"
import "PYPI"

/// Schedule a PYPI payment in delaySeconds (equivalent to ScheduleIncrementIn.cdc)
transaction(
    userAddress: String,
    amount: UFix64,
    upiId: String,
    delaySeconds: UFix64,
    priority: UInt8,
    executionEffort: UInt64,
    transactionData: AnyStruct?
) {
    prepare(signer: auth(Storage, Capabilities) &Account) {
        let future = getCurrentBlock().timestamp + delaySeconds

        let pr = priority == 0
            ? FlowTransactionScheduler.Priority.High
            : priority == 1
            ? FlowTransactionScheduler.Priority.Medium
            : FlowTransactionScheduler.Priority.Low

        // Create PYPI autopay config for single payment
        let configId = PYPI.setupAutopay(
            userAddress: userAddress,
            amount: amount,
            upiId: upiId,
            interval: 0.0, // Single payment
            maxPayments: 1, // Only one payment
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

        // if a transaction scheduler manager has not been created for this account yet, create one
        if !signer.storage.check<@{FlowTransactionSchedulerUtils.Manager}>(from: FlowTransactionSchedulerUtils.managerStoragePath) {
            let manager <- FlowTransactionSchedulerUtils.createManager()
            signer.storage.save(<-manager, to: FlowTransactionSchedulerUtils.managerStoragePath)

            // create a public capability to the scheduled transaction manager
            let managerRef = signer.capabilities.storage.issue<&{FlowTransactionSchedulerUtils.Manager}>(FlowTransactionSchedulerUtils.managerStoragePath)
            signer.capabilities.publish(managerRef, at: FlowTransactionSchedulerUtils.managerPublicPath)
        }

        // Get a capability to the PYPI handler stored in the PYPI contract account
        // Get the entitled capability that will be used to create the transaction
        // Need to check both controllers because the order of controllers is not guaranteed
        var handlerCap: Capability<auth(FlowTransactionScheduler.Execute) &{FlowTransactionScheduler.TransactionHandler}>? = nil

        if let cap = PYPI.account.capabilities.storage
            .getControllers(forPath: /storage/PYPIAutopayHandler)[0]
            .capability as? Capability<auth(FlowTransactionScheduler.Execute) &{FlowTransactionScheduler.TransactionHandler}> {
            handlerCap = cap
        } else {
            handlerCap = PYPI.account.capabilities.storage
                .getControllers(forPath: /storage/PYPIAutopayHandler)[1]
                .capability as! Capability<auth(FlowTransactionScheduler.Execute) &{FlowTransactionScheduler.TransactionHandler}>
        }

        // borrow a reference to the scheduled transaction manager
        let manager = signer.storage.borrow<auth(FlowTransactionSchedulerUtils.Owner) &{FlowTransactionSchedulerUtils.Manager}>(from: FlowTransactionSchedulerUtils.managerStoragePath)
            ?? panic("Could not borrow a Manager reference from \(FlowTransactionSchedulerUtils.managerStoragePath)")

        let transactionId = manager.schedule(
            handlerCap: handlerCap,
            data: configId,
            timestamp: future,
            priority: pr,
            executionEffort: executionEffort,
            fees: <-fees
        )

        log("🚀 Scheduled PYPI payment at \(future)")
        log("   Config ID: " + configId.toString())
        log("   Transaction ID: " + transactionId.toString())
        log("   User: " + userAddress)
        log("   Amount: " + amount.toString() + " PYUSD")
        log("   UPI ID: " + upiId)
    }
}