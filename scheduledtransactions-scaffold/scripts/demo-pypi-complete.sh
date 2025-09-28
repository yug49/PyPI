#!/bin/bash
# PYPI Complete Demo

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

# Demo 1: Single Payment
echo "💫 Demo 1: Single Payment"
echo "------------------------"
flow transactions send cadence/transactions/pypi/SchedulePYPIPaymentIn.cdc \
    --network emulator --signer emulator-account \
    --args-json '[
        {"type":"String","value":"0x01"},
        {"type":"UFix64","value":"100.0"},
        {"type":"String","value":"single@upi"},
        {"type":"UFix64","value":"2.0"},
        {"type":"UInt8","value":"1"},
        {"type":"UInt64","value":"1000"},
        {"type":"Optional","value":null}
    ]'

sleep 3
flow scripts execute cadence/scripts/pypi/GetPYPIStatistics.cdc --network emulator

# Demo 2: Loop Payment
echo -e "\n💫 Demo 2: Loop Payment"
echo "------------------------"
flow transactions send cadence/transactions/pypi/SetupPYPIAutopayLoop.cdc \
    --network emulator --signer emulator-account \
    --args-json '[
        {"type":"String","value":"0x02"},
        {"type":"UFix64","value":"200.0"},
        {"type":"String","value":"loop@upi"},
        {"type":"UFix64","value":"3.0"},
        {"type":"UInt8","value":"1"},
        {"type":"UInt64","value":"1000"},
        {"type":"UFix64","value":"2.0"}
    ]'

sleep 7
flow scripts execute cadence/scripts/pypi/GetPYPIStatistics.cdc --network emulator

# Demo 3: Cron Payment
echo -e "\n💫 Demo 3: Cron Payment"
echo "------------------------"
flow transactions send cadence/transactions/pypi/SetupPYPIAutopayCron.cdc \
    --network emulator --signer emulator-account \
    --args-json '[
        {"type":"String","value":"0x03"},
        {"type":"UFix64","value":"300.0"},
        {"type":"String","value":"cron@upi"},
        {"type":"UFix64","value":"3.0"},
        {"type":"UInt8","value":"1"},
        {"type":"UInt64","value":"1000"},
        {"type":"UInt64","value":"2"},
        {"type":"UFix64","value":"2.0"}
    ]'

sleep 7
flow scripts execute cadence/scripts/pypi/GetPYPIStatistics.cdc --network emulator

# Demo 4: Manual Payment
echo -e "\n💫 Demo 4: Manual Payment"
echo "------------------------"
flow transactions send cadence/transactions/pypi/ManualPYPIPayment.cdc \
    --network emulator --signer emulator-account \
    --args-json '[{"type":"UInt64","value":"1"}]'

sleep 2
flow scripts execute cadence/scripts/pypi/GetPYPIStatistics.cdc --network emulator

# System Health Check
echo -e "\n🏥 System Health Check"
echo "------------------------"
flow scripts execute cadence/scripts/pypi/GetPYPISystemHealth.cdc --network emulator

echo -e "\n✅ PYPI complete demo finished"