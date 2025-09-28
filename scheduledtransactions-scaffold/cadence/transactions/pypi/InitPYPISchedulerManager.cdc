import "FlowTransactionSchedulerUtils"

/// Initialize PYPI scheduler manager (equivalent to InitSchedulerManager.cdc)
transaction() {
    prepare(signer: auth(Storage, Capabilities) &Account) {
        // Create and save the Manager resource for PYPI
        if signer.storage.borrow<&AnyResource>(from: FlowTransactionSchedulerUtils.managerStoragePath) == nil {
            let manager <- FlowTransactionSchedulerUtils.createManager()
            signer.storage.save(<-manager, to: FlowTransactionSchedulerUtils.managerStoragePath)
            
            // Create a capability for the Manager
            let managerCap = signer.capabilities.storage.issue<&{FlowTransactionSchedulerUtils.Manager}>(FlowTransactionSchedulerUtils.managerStoragePath)
            signer.capabilities.publish(managerCap, at: FlowTransactionSchedulerUtils.managerPublicPath)
            
            log("✅ PYPI Scheduler Manager initialized")
        } else {
            log("ℹ️ PYPI Scheduler Manager already exists")
        }
    }
}