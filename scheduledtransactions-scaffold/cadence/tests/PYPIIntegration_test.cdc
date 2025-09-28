import Test
import "PYPI"
import "PYPITypes"
import "PYPIStorage"
import "PYPIEvents"
import "PYPIErrors"
import "PYPIPaymentHandler"
import "PYPIConfigManager"
import "PYPIAutopayHandler"
import "FlowToken"
import "FungibleToken"
import "FlowTransactionScheduler"
import "FlowTransactionSchedulerUtils"

/// PYPI Integration Tests
access(all) let account = Test.createAccount()

/// Test complete autopay flow
access(all) fun testAutopayFlow() {
    // Setup accounts
    let payer = Test.createAccount()
    let recipient = Test.createAccount()

    // Setup FlowToken vaults
    setupFlowTokenVault(payer)
    setupFlowTokenVault(recipient)

    // Initialize scheduler manager
    initializeSchedulerManager(payer)

    // Initialize autopay handler
    initializeAutopayHandler(payer)

    // Create autopay config
    let configId = PYPI.setupAutopay(
        userAddress: recipient.address.toString(),
        amount: 100.0,
        upiId: "test@upi",
        interval: 3600.0,
        maxPayments: 3,
        evmRequestId: nil
    )

    // Verify config was created
    let storage = getAccount(PYPI.account.address)
        .getCapability(PYPIStorage.AutopayPublicPath)
        .borrow<&{PYPIStorage.AutopayStoragePublic}>()
        ?? panic("Could not borrow AutopayStorage")

    let config = storage.getConfig(id: configId)
        ?? panic("Config not found")

    Test.expect(config.paymentConfig.amount, Test.beEqual(100.0))
    Test.expect(config.paymentConfig.recipient, Test.beEqual(recipient.address))
    Test.expect(config.maxExecutions, Test.beEqual(3))
    Test.expect(config.isActive, Test.beEqual(true))

    // Execute payment manually
    let handler = PYPI.account.storage
        .borrow<&PYPIAutopayHandler.Handler>(from: /storage/PYPIAutopayHandler)
        ?? panic("Could not borrow handler")

    handler.executeTransaction(id: 999, data: configId)

    // Verify payment was executed
    let updatedConfig = storage.getConfig(id: configId)
        ?? panic("Config not found")

    Test.expect(updatedConfig.executionCount, Test.beEqual(1))
}

/// Helper function to setup FlowToken vault
access(all) fun setupFlowTokenVault(_ acct: Test.Account) {
    let vault <- FlowToken.createEmptyVault()
    acct.storage.save(<-vault, to: /storage/flowTokenVault)

    acct.capabilities.publish(
        acct.capabilities.storage.issue<&FlowToken.Vault{FungibleToken.Balance, FungibleToken.Receiver}>(
            /storage/flowTokenVault
        ),
        at: /public/flowTokenVault
    )
}

/// Helper function to initialize scheduler manager
access(all) fun initializeSchedulerManager(_ acct: Test.Account) {
    let manager <- FlowTransactionSchedulerUtils.createManager()
    acct.storage.save(<-manager, to: FlowTransactionSchedulerUtils.managerStoragePath)

    acct.capabilities.publish(
        acct.capabilities.storage.issue<&FlowTransactionSchedulerUtils.Manager>(
            FlowTransactionSchedulerUtils.managerStoragePath
        ),
        at: FlowTransactionSchedulerUtils.managerPublicPath
    )
}

/// Helper function to initialize autopay handler
access(all) fun initializeAutopayHandler(_ acct: Test.Account) {
    let handler <- PYPIAutopayHandler.createHandler()
    acct.storage.save(<-handler, to: /storage/PYPIAutopayHandler)

    let publicCap = acct.capabilities.storage
        .issue<&{FlowTransactionScheduler.TransactionHandler}>(/storage/PYPIAutopayHandler)
    acct.capabilities.publish(publicCap, at: /public/PYPIAutopayHandler)
}

/// Run all integration tests
access(all) fun testAll() {
    testAutopayFlow()
}