import "FlowToken"
import "FungibleToken"
import "PYPITypes"
import "PYPIEvents"
import "PYPIErrors"

/// PYPI Payment Handler
/// Handles actual payment execution for PYPI system

access(all) contract PYPIPaymentHandler {

    /// Event emitted when a manual payment is executed
    access(all) event ManualPaymentExecuted(
        payer: Address,
        recipient: Address,
        amount: UFix64,
        tokenType: String,
        transactionId: String?
    )

    /// Execute a payment between two accounts
    /// Note: This function expects to be called from a transaction context
    /// where both accounts have been properly authorized
    access(all) fun executePayment(
        payerVault: auth(FungibleToken.Withdraw) &FlowToken.Vault,
        recipientVault: &FlowToken.Vault,
        amount: UFix64,
        tokenType: String,
        payer: Address,
        recipient: Address
    ): PYPITypes.PaymentResult {
        // Validate inputs
        if amount <= 0.0 {
            return PYPITypes.PaymentResult(
                success: false,
                transactionId: nil,
                error: PYPIErrors.getErrorMessage(code: PYPIErrors.ErrorCode.InvalidAmount)
            )
        }

        if payer == recipient {
            return PYPITypes.PaymentResult(
                success: false,
                transactionId: nil,
                error: PYPIErrors.getErrorMessage(code: PYPIErrors.ErrorCode.InvalidRecipient)
            )
        }

        // Check balance
        if payerVault.balance < amount {
            return PYPITypes.PaymentResult(
                success: false,
                transactionId: nil,
                error: PYPIErrors.getErrorMessage(code: PYPIErrors.ErrorCode.InsufficientBalance)
            )
        }

        // Execute transfer
        let payment <- payerVault.withdraw(amount: amount)
        recipientVault.deposit(from: <-payment)

        // Generate transaction ID
        let txId = self.generateTransactionId(
            payer: payer,
            recipient: recipient,
            amount: amount,
            timestamp: getCurrentBlock().timestamp
        )

        // Emit success event
        emit ManualPaymentExecuted(
            payer: payer,
            recipient: recipient,
            amount: amount,
            tokenType: tokenType,
            transactionId: txId
        )

        return PYPITypes.PaymentResult(
            success: true,
            transactionId: txId,
            error: nil
        )
    }

    /// Generate a unique transaction ID
    access(all) fun generateTransactionId(
        payer: Address,
        recipient: Address,
        amount: UFix64,
        timestamp: UFix64
    ): String {
        let payerStr = payer.toString()
        let recipientStr = recipient.toString()
        let amountStr = amount.toString()
        let timestampStr = timestamp.toString()
        
        return "PYPI-".concat(payerStr)
            .concat("-")
            .concat(recipientStr)
            .concat("-")
            .concat(amountStr)
            .concat("-")
            .concat(timestampStr)
    }
}