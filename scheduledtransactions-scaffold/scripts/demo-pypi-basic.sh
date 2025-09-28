#!/bin/bash
# PYPI Basic Demo

# Ensure we're in the project root
cd "$(dirname "$0")/.."

# Deploy contracts
echo "🚀 Deploying PYPI contracts..."
flow project deploy --network emulator

# Initialize system
echo "⚙️ Initializing PYPI system..."
flow transactions send cadence/transactions/pypi/InitPYPISchedulerManager.cdc \
    --network emulator --signer emulator-account

flow transactions send cadence/transactions/pypi/InitPYPIAutopayHandler.cdc \
    --network emulator --signer emulator-account

# Schedule a single payment
echo "💸 Scheduling single payment..."
flow transactions send cadence/transactions/pypi/SchedulePYPIPaymentIn.cdc \
    --network emulator --signer emulator-account \
    --args-json '[
        {"type":"String","value":"0x01"},
        {"type":"UFix64","value":"100.0"},
        {"type":"String","value":"demo@upi"},
        {"type":"UFix64","value":"2.0"},
        {"type":"UInt8","value":"1"},
        {"type":"UInt64","value":"1000"},
        {"type":"Optional","value":null}
    ]'

# Wait for execution
echo "⏳ Waiting for payment execution..."
sleep 3

# Check payment status
echo "📊 Checking payment status..."
flow scripts execute cadence/scripts/pypi/GetPYPIStatistics.cdc \
    --network emulator

echo "✅ PYPI basic demo completed"