#!/bin/bash

# PYPI System Setup Script
# Automates the complete setup of the PYPI (Pay Your Payment Instantly) system

set -e  # Exit on any error

echo "🚀 Starting PYPI System Setup..."
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Flow CLI is installed and correct version
print_status "Checking Flow CLI version..."
if ! command -v flow &> /dev/null; then
    print_error "Flow CLI not found. Please install Flow CLI 2.7.2+ first."
    exit 1
fi

FLOW_VERSION=$(flow version | grep -o 'v[0-9]\+\.[0-9]\+\.[0-9]\+' | head -1 | sed 's/v//')
REQUIRED_VERSION="2.7.2"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$FLOW_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    print_error "Flow CLI version $FLOW_VERSION is too old. Required: $REQUIRED_VERSION+"
    print_warning "Please update: brew update && brew upgrade flow-cli"
    exit 1
fi

print_success "Flow CLI version $FLOW_VERSION is compatible"

# Check if we're in the right directory
if [ ! -f "flow.json" ]; then
    print_error "flow.json not found. Please run this script from the scheduledtransactions-scaffold directory."
    exit 1
fi

print_success "Found flow.json - in correct directory"

# Stop any existing emulator
print_status "Stopping any existing Flow emulator..."
pkill -f "flow emulator" 2>/dev/null || true
sleep 2

# Start Flow emulator with scheduled transactions
print_status "Starting Flow emulator with scheduled transactions..."
flow emulator --scheduled-transactions --block-time 1s --verbose > emulator.log 2>&1 &
EMULATOR_PID=$!

# Wait for emulator to start
print_status "Waiting for emulator to initialize..."
sleep 5

# Check if emulator is running
if ! ps -p $EMULATOR_PID > /dev/null; then
    print_error "Failed to start Flow emulator"
    exit 1
fi

print_success "Flow emulator started (PID: $EMULATOR_PID)"

# Deploy contracts
print_status "Deploying all contracts..."
if flow project deploy --network emulator; then
    print_success "All contracts deployed successfully"
else
    print_error "Contract deployment failed"
    exit 1
fi

# Initialize PYPI system components
print_status "Initializing PYPI Scheduler Manager..."
if flow transactions send ./cadence/transactions/pypi/InitPYPISchedulerManager.cdc --signer emulator-account --network emulator > /dev/null 2>&1; then
    print_success "PYPI Scheduler Manager initialized"
else
    print_error "Failed to initialize PYPI Scheduler Manager"
    exit 1
fi

print_status "Initializing PYPI Autopay Handler..."
if flow transactions send ./cadence/transactions/pypi/InitPYPIAutopayHandler.cdc --signer emulator-account --network emulator > /dev/null 2>&1; then
    print_success "PYPI Autopay Handler initialized"
else
    print_error "Failed to initialize PYPI Autopay Handler"
    exit 1
fi

# Test system health
print_status "Testing system health..."
HEALTH=$(flow scripts execute ./cadence/scripts/pypi/GetPYPISystemHealth.cdc --network emulator 2>/dev/null | grep -o '"[^"]*"' | sed 's/"//g')

if [ "$HEALTH" = "healthy" ]; then
    print_success "System health check passed: $HEALTH"
else
    print_warning "System health check returned: $HEALTH"
fi

# Get system statistics
print_status "Checking system statistics..."
flow scripts execute ./cadence/scripts/pypi/GetPYPIStatistics.cdc --network emulator > /dev/null 2>&1
print_success "System statistics accessible"

# Create a test recipient account
print_status "Creating test recipient account..."
ACCOUNT_OUTPUT=$(flow accounts create --network emulator 2>&1)
RECIPIENT_ADDRESS=$(echo "$ACCOUNT_OUTPUT" | grep -o '0x[a-fA-F0-9]\{16\}' | head -1)

if [ -n "$RECIPIENT_ADDRESS" ]; then
    print_success "Test recipient account created: $RECIPIENT_ADDRESS"
else
    print_warning "Could not create test account automatically"
    RECIPIENT_ADDRESS="0x179b6b1cb6755e31"  # Fallback address
fi

# Setup example autopay
print_status "Setting up example autopay loop..."
if flow transactions send ./cadence/transactions/pypi/SetupPYPIAutopayLoop.cdc \
    "$RECIPIENT_ADDRESS" 1.0 "setup-script-test" 10.0 1 100 5.0 \
    --signer emulator-account --network emulator > /dev/null 2>&1; then
    print_success "Example autopay loop created successfully"
    print_status "  → Recipient: $RECIPIENT_ADDRESS"
    print_status "  → Amount: 1.0 FLOW per payment"
    print_status "  → Interval: 10 seconds"
    print_status "  → Type: Unlimited loop payments"
else
    print_warning "Failed to create example autopay (system still functional)"
fi

# Final status check
echo ""
echo "🎉 PYPI System Setup Complete!"
echo "================================="
print_success "Flow Emulator: Running (PID: $EMULATOR_PID)"
print_success "All Contracts: Deployed"
print_success "System Components: Initialized"
print_success "Test Account: $RECIPIENT_ADDRESS"

echo ""
echo "📋 Next Steps:"
echo "1. Monitor system: flow scripts execute ./cadence/scripts/pypi/GetPYPIStatistics.cdc --network emulator"
echo "2. Check balances: flow accounts get 0xf8d6e0586b0a20c7 --network emulator"
echo "3. View emulator logs: tail -f emulator.log"
echo "4. Read documentation: README_PYPI.md"

echo ""
echo "⚡ Quick Commands:"
echo "# Check system health"
echo "flow scripts execute ./cadence/scripts/pypi/GetPYPISystemHealth.cdc --network emulator"
echo ""
echo "# Monitor statistics (run every 15 seconds to see payments)"
echo "flow scripts execute ./cadence/scripts/pypi/GetPYPIStatistics.cdc --network emulator"
echo ""
echo "# Stop emulator when done"
echo "pkill -f 'flow emulator'"

echo ""
print_success "PYPI system is ready for use! 🚀"

# Save important info to a file
cat > PYPI_SETUP_INFO.txt << EOF
PYPI System Setup Information
============================
Setup Date: $(date)
Flow CLI Version: $FLOW_VERSION
Emulator PID: $EMULATOR_PID
Test Recipient: $RECIPIENT_ADDRESS

Emulator Command:
flow emulator --scheduled-transactions --block-time 1s --verbose

Key Accounts:
- Emulator Account: 0xf8d6e0586b0a20c7
- Test Recipient: $RECIPIENT_ADDRESS

Quick Health Check:
flow scripts execute ./cadence/scripts/pypi/GetPYPISystemHealth.cdc --network emulator

Monitor Statistics:
flow scripts execute ./cadence/scripts/pypi/GetPYPIStatistics.cdc --network emulator

Stop Emulator:
pkill -f "flow emulator"
EOF

print_success "Setup information saved to PYPI_SETUP_INFO.txt"
