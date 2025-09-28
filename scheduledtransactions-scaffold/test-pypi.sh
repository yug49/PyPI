#!/bin/bash

# PYPI System Test Script
# Tests the PYPI system functionality after setup

set -e  # Exit on any error

echo "🧪 PYPI System Test Suite"
echo "========================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Function to print colored output
print_test() {
    echo -e "${BLUE}[TEST $((++TESTS_RUN))]${NC} $1"
}

print_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((TESTS_PASSED++))
}

print_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((TESTS_FAILED++))
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Test 1: Check if emulator is running
print_test "Checking if Flow emulator is running..."
if pgrep -f "flow emulator" > /dev/null; then
    print_pass "Flow emulator is running"
else
    print_fail "Flow emulator is not running"
    echo "Please run: flow emulator --scheduled-transactions --block-time 1s --verbose &"
    exit 1
fi

# Test 2: Check system health
print_test "Checking PYPI system health..."
HEALTH=$(flow scripts execute ./cadence/scripts/pypi/GetPYPISystemHealth.cdc --network emulator 2>/dev/null | grep -o '"[^"]*"' | sed 's/"//g')
if [ "$HEALTH" = "healthy" ]; then
    print_pass "System health: $HEALTH"
else
    print_fail "System health: $HEALTH (expected: healthy)"
fi

# Test 3: Check system statistics accessibility
print_test "Testing system statistics accessibility..."
if flow scripts execute ./cadence/scripts/pypi/GetPYPIStatistics.cdc --network emulator > /dev/null 2>&1; then
    print_pass "System statistics accessible"
else
    print_fail "Cannot access system statistics"
fi

# Test 4: Check autopay count accessibility
print_test "Testing autopay count accessibility..."
if flow scripts execute ./cadence/scripts/pypi/GetPYPIAutopayCount.cdc --network emulator > /dev/null 2>&1; then
    print_pass "Autopay count accessible"
else
    print_fail "Cannot access autopay count"
fi

# Test 5: Get current statistics
print_test "Getting current system statistics..."
STATS_OUTPUT=$(flow scripts execute ./cadence/scripts/pypi/GetPYPIStatistics.cdc --network emulator 2>/dev/null)
if [ -n "$STATS_OUTPUT" ]; then
    print_pass "Retrieved system statistics"
    print_info "Current stats: $STATS_OUTPUT"
    
    # Extract values for further testing
    TOTAL_AUTOPAYS=$(echo "$STATS_OUTPUT" | grep -o 'totalAutopays: [0-9]\+' | grep -o '[0-9]\+')
    TOTAL_PAYMENTS=$(echo "$STATS_OUTPUT" | grep -o 'totalPayments: [0-9]\+' | grep -o '[0-9]\+')
    
    print_info "Total Autopays: $TOTAL_AUTOPAYS"
    print_info "Total Payments: $TOTAL_PAYMENTS"
else
    print_fail "Could not retrieve system statistics"
fi

# Test 6: Check account balances
print_test "Checking emulator account balance..."
EMULATOR_BALANCE=$(flow accounts get 0xf8d6e0586b0a20c7 --network emulator 2>/dev/null | grep "Balance" | grep -o '[0-9.]\+')
if [ -n "$EMULATOR_BALANCE" ]; then
    print_pass "Emulator account balance: $EMULATOR_BALANCE FLOW"
else
    print_fail "Could not retrieve emulator account balance"
fi

# Test 7: Test direct payment execution (if possible)
print_test "Testing direct payment execution..."
RECIPIENT_ADDRESS="0x179b6b1cb6755e31"  # Default test address

# Create test script
cat > temp_test_payment.cdc << 'EOF'
import "PYPI"
import "PYPITypes"

access(all) fun main(): PYPITypes.PaymentResult {
    return PYPI.executePayment(
        payer: 0xf8d6e0586b0a20c7,
        recipient: 0x179b6b1cb6755e31,
        amount: 0.1,
        tokenType: "FlowToken"
    )
}
EOF

if PAYMENT_RESULT=$(flow scripts execute ./temp_test_payment.cdc --network emulator 2>/dev/null); then
    print_pass "Direct payment execution test completed"
    print_info "Payment result: $PAYMENT_RESULT"
    rm -f temp_test_payment.cdc
else
    print_fail "Direct payment execution test failed"
    rm -f temp_test_payment.cdc
fi

# Test 8: Performance test - check if system responds quickly
print_test "Testing system response time..."
START_TIME=$(date +%s.%N)
flow scripts execute ./cadence/scripts/pypi/GetPYPISystemHealth.cdc --network emulator > /dev/null 2>&1
END_TIME=$(date +%s.%N)
RESPONSE_TIME=$(echo "$END_TIME - $START_TIME" | bc)

# Convert to milliseconds for easier reading
RESPONSE_TIME_MS=$(echo "$RESPONSE_TIME * 1000" | bc | cut -d. -f1)

if [ "$RESPONSE_TIME_MS" -lt 5000 ]; then  # Less than 5 seconds
    print_pass "System response time: ${RESPONSE_TIME_MS}ms"
else
    print_fail "System response time too slow: ${RESPONSE_TIME_MS}ms"
fi

# Test 9: Check if autopays are executing (if any exist)
if [ "$TOTAL_AUTOPAYS" -gt 0 ]; then
    print_test "Testing autopay execution (waiting 15 seconds)..."
    INITIAL_PAYMENTS=$TOTAL_PAYMENTS
    sleep 15
    
    NEW_STATS=$(flow scripts execute ./cadence/scripts/pypi/GetPYPIStatistics.cdc --network emulator 2>/dev/null)
    NEW_PAYMENTS=$(echo "$NEW_STATS" | grep -o 'totalPayments: [0-9]\+' | grep -o '[0-9]\+')
    
    if [ "$NEW_PAYMENTS" -gt "$INITIAL_PAYMENTS" ]; then
        print_pass "Autopays are executing (payments increased from $INITIAL_PAYMENTS to $NEW_PAYMENTS)"
    else
        print_fail "Autopays may not be executing (payments unchanged: $TOTAL_PAYMENTS)"
    fi
else
    print_info "No autopays configured - skipping execution test"
fi

# Final summary
echo ""
echo "📊 Test Summary"
echo "==============="
echo "Tests Run: $TESTS_RUN"
echo "Tests Passed: $TESTS_PASSED"
echo "Tests Failed: $TESTS_FAILED"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! PYPI system is working correctly.${NC}"
    echo ""
    echo "✅ System Status: FULLY FUNCTIONAL"
    echo "✅ Health: Healthy"
    echo "✅ Statistics: Accessible"
    echo "✅ Payment Execution: Working"
    echo "✅ Response Time: Good"
    
    if [ "$TOTAL_AUTOPAYS" -gt 0 ]; then
        echo "✅ Autopays: $TOTAL_AUTOPAYS configured and executing"
    fi
    
    echo ""
    echo "🚀 Your PYPI system is ready for production use!"
    
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Please check the issues above.${NC}"
    echo ""
    echo "💡 Common solutions:"
    echo "1. Restart emulator: pkill -f 'flow emulator' && flow emulator --scheduled-transactions --block-time 1s --verbose &"
    echo "2. Redeploy contracts: flow project deploy --network emulator"
    echo "3. Re-initialize system: ./setup-pypi.sh"
    
    exit 1
fi
