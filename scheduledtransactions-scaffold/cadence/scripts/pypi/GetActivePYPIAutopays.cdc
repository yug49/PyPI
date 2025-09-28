import "PYPIStorage"
import "PYPITypes"

/// Get all active autopay configurations
access(all) fun main(): [PYPITypes.AutopayConfig] {
    let storage = getAccount(PYPI.account.address)
        .getCapability(PYPIStorage.AutopayPublicPath)
        .borrow<&{PYPIStorage.AutopayStoragePublic}>()
        ?? panic("Could not borrow AutopayStorage")

    return storage.getActiveConfigs()
}