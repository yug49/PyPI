#!/bin/bash
# PYPI Loop Demo

# Ensure we're in the project root
cd "$(dirname "$0")/.."

# Deploy contracts if not already deployed
if ! flow scripts execute cadence/scripts/pypi/GetPYPISystemHealth.cdc --network emulator &> /dev/null; then
    echo "🚀 Deploying PYPI contracts..."
    flow project deploy --network emulator

    echo "⚙️ Initializing PYPI system..."
    flow transactions send cadence/transactions/pypi/InitPYPISchedulerManager.cdc \
        --network emulator --signer emulator-account

    flow transactions send cadence/transactions/pypi/InitPYPIAutopayHandler.cdc \
        --network emulator --signer emulator-account
fi

# Setup loop payment
echo "🔄 Setting up loop payment..."
flow transactions send cadence/transactions/pypi/SetupPYPIAutopayLoop.cdc \
    --network emulator --signer emulator-account \
    --args-json '[
        {"type":"String","value":"0x01"},
        {"type":"UFix64","value":"100.0"},
        {"type":"String","value":"loop@upi"},
        {"type":"UFix64","value":"3.0"},
        {"type":"UInt8","value":"1"},
        {"type":"UInt64","value":"1000"},
        {"type":"UFix64","value":"2.0"}
    ]'

# Wait for multiple executions
echo "⏳ Waiting for payment executions..."
for i in {1..4}; do
    echo "📊 Checking stats after $i executions..."
    sleep 4
    flow scripts execute cadence/scripts/pypi/GetPYPIStatistics.cdc \
        --network emulator
done

echo "✅ PYPI loop demo completed"