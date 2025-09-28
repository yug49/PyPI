#!/bin/bash
# PYPI Performance Tests

# Ensure we're in the project root
cd "$(dirname "$0")/../.."

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

# Test concurrent payments
echo "🔄 Testing concurrent payments..."
for i in {1..5}; do
    flow transactions send cadence/transactions/pypi/SchedulePYPIPaymentIn.cdc \
        --network emulator --signer emulator-account \
        --args-json "[
            {\"type\":\"String\",\"value\":\"0x0$i\"},
            {\"type\":\"UFix64\",\"value\":\"100.0\"},
            {\"type\":\"String\",\"value\":\"test$i@upi\"},
            {\"type\":\"UFix64\",\"value\":\"2.0\"},
            {\"type\":\"UInt8\",\"value\":\"1\"},
            {\"type\":\"UInt64\",\"value\":\"1000\"},
            {\"type\":\"Optional\",\"value\":null}
        ]" &
done

# Wait for executions
sleep 5

# Check system stats
echo "📊 Checking system stats..."
flow scripts execute cadence/scripts/pypi/GetPYPIStatistics.cdc \
    --network emulator

# Check system health
echo "🏥 Checking system health..."
flow scripts execute cadence/scripts/pypi/GetPYPISystemHealth.cdc \
    --network emulator

echo "✅ PYPI performance tests completed"