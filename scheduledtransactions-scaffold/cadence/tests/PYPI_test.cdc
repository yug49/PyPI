import Test
import "PYPI"
import "PYPITypes"
import "PYPIStorage"
import "PYPIEvents"
import "PYPIErrors"
import "PYPIPaymentHandler"
import "PYPIConfigManager"
import "PYPIAutopayHandler"

/// PYPI Unit Tests
access(all) let account = Test.createAccount()

/// Test contract deployment
access(all) fun testDeployContracts() {
    // Deploy core contracts
    Test.deployContract(name: "PYPITypes", path: "../contracts/pypi/core/PYPITypes.cdc", arguments: [])
    Test.deployContract(name: "PYPIEvents", path: "../contracts/pypi/core/PYPIEvents.cdc", arguments: [])
    Test.deployContract(name: "PYPIErrors", path: "../contracts/pypi/core/PYPIErrors.cdc", arguments: [])
    Test.deployContract(name: "PYPIStorage", path: "../contracts/pypi/core/PYPIStorage.cdc", arguments: [])

    // Deploy handlers
    Test.deployContract(name: "PYPIPaymentHandler", path: "../contracts/pypi/handlers/PYPIPaymentHandler.cdc", arguments: [])
    Test.deployContract(name: "PYPIAutopayHandler", path: "../contracts/pypi/handlers/PYPIAutopayHandler.cdc", arguments: [])

    // Deploy manager
    Test.deployContract(name: "PYPIConfigManager", path: "../contracts/pypi/managers/PYPIConfigManager.cdc", arguments: [])

    // Deploy main contract
    Test.deployContract(name: "PYPI", path: "../contracts/pypi/main/PYPI.cdc", arguments: [])
}

/// Test payment configuration
access(all) fun testPaymentConfig() {
    let config = PYPITypes.PaymentConfig(
        recipient: account.address,
        amount: 100.0,
        tokenType: "PYUSD",
        description: "Test payment"
    )

    Test.expect(config.recipient, Test.beEqual(account.address))
    Test.expect(config.amount, Test.beEqual(100.0))
    Test.expect(config.tokenType, Test.beEqual("PYUSD"))
    Test.expect(config.description, Test.beEqual("Test payment"))
    Test.expect(config.isActive, Test.beEqual(true))
}

/// Test autopay configuration
access(all) fun testAutopayConfig() {
    let paymentConfig = PYPITypes.PaymentConfig(
        recipient: account.address,
        amount: 100.0,
        tokenType: "PYUSD",
        description: "Test payment"
    )

    let config = PYPITypes.AutopayConfig(
        id: 1,
        owner: account.address,
        paymentConfig: paymentConfig,
        scheduleType: PYPITypes.ScheduleType.LOOP,
        intervalSeconds: 3600.0,
        maxExecutions: nil
    )

    Test.expect(config.id, Test.beEqual(1))
    Test.expect(config.owner, Test.beEqual(account.address))
    Test.expect(config.scheduleType, Test.beEqual(PYPITypes.ScheduleType.LOOP))
    Test.expect(config.intervalSeconds, Test.beEqual(3600.0))
    Test.expect(config.maxExecutions, Test.beNil())
    Test.expect(config.executionCount, Test.beEqual(0))
    Test.expect(config.isActive, Test.beEqual(true))
}

/// Test error handling
access(all) fun testErrorHandling() {
    let invalidAmount = PYPIErrors.getErrorMessage(code: PYPIErrors.ErrorCode.InvalidAmount)
    Test.expect(invalidAmount, Test.beEqual("Invalid payment amount. Amount must be greater than 0."))

    let customError = PYPIErrors.createCustomError(
        code: PYPIErrors.ErrorCode.PaymentFailed,
        customMessage: "Custom error message"
    )
    Test.expect(customError.message, Test.beEqual("Custom error message"))
}

/// Test payment execution
access(all) fun testPaymentExecution() {
    let result = PYPIPaymentHandler.executePayment(
        payer: account.address,
        recipient: account.address,
        amount: 100.0,
        tokenType: "PYUSD"
    )

    Test.expect(result.success, Test.beEqual(false))
    Test.expect(result.error, Test.beEqual("Invalid recipient address. Recipient cannot be the same as sender."))
}

/// Test system health
access(all) fun testSystemHealth() {
    let health = PYPI.getSystemHealth()
    Test.expect(health, Test.beEqual("healthy"))
}

/// Run all tests
access(all) fun testAll() {
    testDeployContracts()
    testPaymentConfig()
    testAutopayConfig()
    testErrorHandling()
    testPaymentExecution()
    testSystemHealth()
}