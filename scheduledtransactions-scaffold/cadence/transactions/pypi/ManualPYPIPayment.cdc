import "PYPI"
import "PYPIAutopayHandler"

/// Manually execute a PYPI payment (equivalent to manual counter increment)
transaction(configId: UInt64) {
    prepare(signer: auth(Storage) &Account) {
        // Get the PYPI autopay handler and execute payment manually
        if let handler = PYPI.account.storage.borrow<&PYPIAutopayHandler.Handler>(from: /storage/PYPIAutopayHandler) {
            handler.executeTransaction(id: 999, data: configId)
            log("✅ PYPI payment executed manually for config: " + configId.toString())
        } else {
            panic("PYPI Autopay Handler not found - run InitPYPIAutopayHandler first")
        }
    }
}