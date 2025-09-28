import "PYPIStorage"

/// Get total number of autopay configurations
access(all) fun main(): UInt64 {
    let storage = getAccount(0xf8d6e0586b0a20c7)
        .capabilities.get<&{PYPIStorage.AutopayStoragePublic}>(PYPIStorage.AutopayPublicPath)
        .borrow()
        ?? panic("Could not borrow AutopayStorage")

    let stats = storage.getSystemStats()
    return stats.totalAutopays
}