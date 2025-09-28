import "PYPIStorage"
import "PYPITypes"

/// Get PYPI system statistics
access(all) fun main(): PYPITypes.SystemStats {
    let storage = getAccount(0xf8d6e0586b0a20c7)
        .capabilities.get<&{PYPIStorage.AutopayStoragePublic}>(PYPIStorage.AutopayPublicPath)
        .borrow()
        ?? panic("Could not borrow AutopayStorage")

    return storage.getSystemStats()
}