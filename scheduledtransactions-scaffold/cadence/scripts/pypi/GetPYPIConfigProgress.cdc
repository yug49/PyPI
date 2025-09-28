import "PYPIStorage"
import "PYPITypes"

/// Get progress of a specific autopay configuration
access(all) fun main(configId: UInt64): {String: AnyStruct} {
    let storage = getAccount(PYPI.account.address)
        .getCapability(PYPIStorage.AutopayPublicPath)
        .borrow<&{PYPIStorage.AutopayStoragePublic}>()
        ?? panic("Could not borrow AutopayStorage")

    if let config = storage.getConfig(id: configId) {
        let progress: {String: AnyStruct} = {
            "configId": configId,
            "isActive": config.isActive,
            "executionCount": config.executionCount,
            "maxExecutions": config.maxExecutions,
            "lastScheduled": config.lastScheduled,
            "totalAmount": UFix64(config.executionCount) * config.paymentConfig.amount
        }
        return progress
    }
    
    panic("Config not found: ".concat(configId.toString()))
}