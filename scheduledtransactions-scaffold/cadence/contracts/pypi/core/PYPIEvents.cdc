/// PYPI Event Definitions
/// Defines common events for the PYPI system

access(all) contract PYPIEvents {

    /// Event emitted when an autopay is deactivated
    access(all) event AutopayDeactivated(
        autopayId: UInt64,
        owner: Address,
        reason: String
    )
}
