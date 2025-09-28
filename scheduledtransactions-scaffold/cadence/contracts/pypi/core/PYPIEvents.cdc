/// PYPI Event Definitions
/// Defines common events for the PYPI system

access(all) contract PYPIEvents {

    /// Event emitted when an autopay is deactivated
    access(all) event AutopayDeactivated(
        autopayId: UInt64,
        owner: Address,
        reason: String
    )

    /// Bridge Order Events
    
    /// Event emitted when a bridge order is successfully created
    access(all) event BridgeOrderCreated(
        orderId: String,
        amount: UFix64,
        sourceChain: String,
        destinationChain: String,
        recipient: String,
        timestamp: UFix64
    )

    /// Event emitted when a bridge order is scheduled for future execution
    access(all) event BridgeOrderScheduled(
        orderId: String,
        scheduledTime: UFix64,
        priority: String,
        timestamp: UFix64
    )

    /// Event emitted when a bridge order fails
    access(all) event BridgeOrderFailed(
        orderId: String,
        error: String,
        timestamp: UFix64
    )

    /// Event emitted when a recurring bridge order is set up
    access(all) event RecurringBridgeOrderCreated(
        baseOrderId: String,
        intervalSeconds: UFix64,
        maxExecutions: UInt32,
        owner: Address,
        timestamp: UFix64
    )
}
