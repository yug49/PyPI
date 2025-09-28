import "PYPIAutopayHandler"
import "FlowTransactionScheduler"

/// Initialize PYPI autopay handler (equivalent to InitCounterTransactionHandler.cdc)
transaction() {
    prepare(signer: auth(Storage, Capabilities) &Account) {
        // Save a PYPI autopay handler resource to storage if not already present
        if signer.storage.borrow<&AnyResource>(from: /storage/PYPIAutopayHandler) == nil {
            let handler <- PYPIAutopayHandler.createHandler()
            signer.storage.save(<-handler, to: /storage/PYPIAutopayHandler)
        }

        // Validation/example that we can create and issue a handler capability with correct entitlement for FlowTransactionScheduler
        let _ = signer.capabilities.storage
            .issue<auth(FlowTransactionScheduler.Execute) &{FlowTransactionScheduler.TransactionHandler}>(/storage/PYPIAutopayHandler)

        // Issue a non-entitled public capability for the handler that is publicly accessible
        let publicCap = signer.capabilities.storage
            .issue<&{FlowTransactionScheduler.TransactionHandler}>(/storage/PYPIAutopayHandler)

        // publish the capability
        signer.capabilities.publish(publicCap, at: /public/PYPIAutopayHandler)
        
        log("✅ PYPI Autopay Handler initialized")
        log("   Handler saved to: /storage/PYPIAutopayHandler")
        log("   Public capability published at: /public/PYPIAutopayHandler")
    }
}