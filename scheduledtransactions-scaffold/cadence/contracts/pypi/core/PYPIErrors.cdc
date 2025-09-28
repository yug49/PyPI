/// PYPI Error Handling
/// Defines all error codes and messages for the PYPI system

access(all) contract PYPIErrors {

    /// Error codes for PYPI system
    access(all) enum ErrorCode: UInt8 {
        access(all) case InvalidAmount
        access(all) case InvalidRecipient
        access(all) case InsufficientBalance
        access(all) case AutopayNotFound
        access(all) case AutopayAlreadyExists
        access(all) case InvalidScheduleType
        access(all) case InvalidInterval
        access(all) case MaxExecutionsReached
        access(all) case AutopayInactive
        access(all) case PaymentFailed
        access(all) case SchedulerError
        access(all) case CapabilityError
        access(all) case StorageError
        access(all) case ConfigurationError
        access(all) case SystemError
    }

    /// Error messages for PYPI system
    access(all) struct ErrorMessage {
        access(all) let code: ErrorCode
        access(all) let message: String

        init(code: ErrorCode, message: String) {
            self.code = code
            self.message = message
        }
    }

    /// Get error message by code
    access(all) fun getErrorMessage(code: ErrorCode): String {
        switch code {
            case ErrorCode.InvalidAmount:
                return "Invalid payment amount. Amount must be greater than 0."
            case ErrorCode.InvalidRecipient:
                return "Invalid recipient address. Recipient cannot be the same as sender."
            case ErrorCode.InsufficientBalance:
                return "Insufficient balance for payment."
            case ErrorCode.AutopayNotFound:
                return "Autopay configuration not found."
            case ErrorCode.AutopayAlreadyExists:
                return "Autopay configuration already exists."
            case ErrorCode.InvalidScheduleType:
                return "Invalid schedule type. Must be ONCE, LOOP, or CRON."
            case ErrorCode.InvalidInterval:
                return "Invalid interval. Interval must be greater than 0 for LOOP and CRON schedules."
            case ErrorCode.MaxExecutionsReached:
                return "Maximum number of executions reached for this autopay."
            case ErrorCode.AutopayInactive:
                return "Autopay is inactive and cannot be executed."
            case ErrorCode.PaymentFailed:
                return "Payment execution failed."
            case ErrorCode.SchedulerError:
                return "Scheduled transaction error occurred."
            case ErrorCode.CapabilityError:
                return "Capability access error occurred."
            case ErrorCode.StorageError:
                return "Storage access error occurred."
            case ErrorCode.ConfigurationError:
                return "Configuration error occurred."
            case ErrorCode.SystemError:
                return "System error occurred."
            default:
                return "Unknown error occurred."
        }
    }

    /// Create error message
    access(all) fun createError(code: ErrorCode): ErrorMessage {
        return ErrorMessage(code: code, message: self.getErrorMessage(code: code))
    }

    /// Create custom error message
    access(all) fun createCustomError(code: ErrorCode, customMessage: String): ErrorMessage {
        return ErrorMessage(code: code, message: customMessage)
    }
}
