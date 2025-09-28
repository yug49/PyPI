#!/bin/bash
# PYPI Cron Demo

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

# Setup cron payment
echo "⏰ Setting up cron payment..."
flow transactions send cadence/transactions/pypi/SetupPYPIAutopayCron.cdc \
    --network emulator --signer emulator-account \
    --args-json '[
        {"type":"String","value":"0x01"},
        {"type":"UFix64","value":"100.0"},
        {"type":"String","value":"cron@upi"},
        {"type":"UFix64","value":"3.0"},
        {"type":"UInt8","value":"1"},
        {"type":"UInt64","value":"1000"},
        {"type":"UInt64","value":"3"},
        {"type":"UFix64","value":"2.0"}
    ]'

# Wait for all executions
echo "⏳ Waiting for payment executions..."
for i in {1..3}; do
    echo "📊 Checking stats after $i executions..."
    sleep 4
    flow scripts execute cadence/scripts/pypi/GetPYPIStatistics.cdc \
        --network emulator
done

echo "✅ PYPI cron demo completed"