import "PYPIStorage"
import "PYPITypes"

/// Get specific autopay configuration by ID
access(all) fun main(configId: UInt64): PYPITypes.AutopayConfig? {
    let storage = getAccount(PYPI.account.address)
        .getCapability(PYPIStorage.AutopayPublicPath)
        .borrow<&{PYPIStorage.AutopayStoragePublic}>()
        ?? panic("Could not borrow AutopayStorage")

    return storage.getConfig(id: configId)
}