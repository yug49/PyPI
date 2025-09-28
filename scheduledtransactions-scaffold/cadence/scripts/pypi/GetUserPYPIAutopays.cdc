import "PYPIStorage"
import "PYPITypes"

/// Get all autopay configurations for a specific user
access(all) fun main(userAddress: Address): [PYPITypes.AutopayConfig] {
    let storage = getAccount(PYPI.account.address)
        .getCapability(PYPIStorage.AutopayPublicPath)
        .borrow<&{PYPIStorage.AutopayStoragePublic}>()
        ?? panic("Could not borrow AutopayStorage")

    return storage.getConfigsByUser(userAddress: userAddress)
}