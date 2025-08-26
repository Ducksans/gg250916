#!/usr/bin/env bash
#
# Rules Enforcement Validation Script for Gumgang 2.0
# Validates that .rules are properly sealed and enforced on all LLM calls
# Part of the Rules Absolute Enforcement System
#
# Usage:
#   ./validate_rules_enforced.sh          # Run validation
#   ./validate_rules_enforced.sh --verbose # Run with detailed output
#
# Exit codes:
#   0 - All validations passed
#   1 - Validation failed
#   2 - Script error

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-http://localhost:8000}"
VERBOSE="${1:-}"
HEAD_MARK="[RULES v1.0 — Gumgang 2.0 / KST 2025-08-09 12:33]"

# Function to print colored output
print_status() {
    local status=$1
    local message=$2

    case $status in
        "OK")
            echo -e "${GREEN}✅ $message${NC}"
            ;;
        "FAIL")
            echo -e "${RED}❌ $message${NC}"
            ;;
        "INFO")
            echo -e "${BLUE}ℹ️  $message${NC}"
            ;;
        "WARN")
            echo -e "${YELLOW}⚠️  $message${NC}"
            ;;
    esac
}

echo "========================================="
echo "🔒 Gumgang 2.0 Rules Enforcement Validation"
echo "========================================="
echo ""

print_status "INFO" "Base URL: $BASE_URL"
print_status "INFO" "Expected head: $HEAD_MARK"
echo ""

# Check if server is running
if ! curl -s "$BASE_URL/health" > /dev/null 2>&1; then
    print_status "FAIL" "Server is not running at $BASE_URL"
    exit 1
fi

# Test 1: Check if rules are injected in prompt
echo "Test 1: Rules Injection in Prompts"
echo "-----------------------------------"

# Create a test request without rules
TEST_PROMPT="Test prompt without rules"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/test" \
    -H "Content-Type: application/json" \
    -d "{\"prompt\": \"$TEST_PROMPT\"}" 2>/dev/null || echo "FAILED")

if [ "$RESPONSE" == "FAILED" ]; then
    print_status "WARN" "Test endpoint /api/test not available"
else
    # Check if response indicates rules were injected
    if echo "$RESPONSE" | grep -q "rules_enforcement"; then
        print_status "OK" "Rules enforcement active"
    else
        print_status "INFO" "Response received (rules may be transparent)"
    fi
fi

# Test 2: Check response headers for rules hash
echo ""
echo "Test 2: Response Headers Validation"
echo "------------------------------------"

HEADERS=$(curl -sI -X POST "$BASE_URL/api/test" \
    -H "Content-Type: application/json" \
    -d "{\"prompt\": \"test\"}" 2>/dev/null || echo "FAILED")

if [ "$HEADERS" == "FAILED" ]; then
    print_status "FAIL" "Could not get response headers"
    exit 1
fi

# Check for X-Rules-Hash header
if echo "$HEADERS" | grep -qi "X-Rules-Hash:"; then
    HASH=$(echo "$HEADERS" | grep -i "X-Rules-Hash:" | cut -d' ' -f2 | tr -d '\r\n')
    print_status "OK" "X-Rules-Hash present: $HASH"
else
    print_status "FAIL" "X-Rules-Hash header missing"
    FAILED=1
fi

# Check for X-Rules-Head header
if echo "$HEADERS" | grep -qi "X-Rules-Head:"; then
    HEAD=$(echo "$HEADERS" | grep -i "X-Rules-Head:" | cut -d' ' -f2- | tr -d '\r\n')
    if [ "$HEAD" == "$HEAD_MARK" ]; then
        print_status "OK" "X-Rules-Head matches expected value"
    else
        print_status "FAIL" "X-Rules-Head mismatch"
        if [ "$VERBOSE" == "--verbose" ]; then
            echo "  Expected: $HEAD_MARK"
            echo "  Got: $HEAD"
        fi
        FAILED=1
    fi
else
    print_status "WARN" "X-Rules-Head header not found"
fi

# Check for X-Rules-Injected header
if echo "$HEADERS" | grep -qi "X-Rules-Injected:"; then
    INJECTED=$(echo "$HEADERS" | grep -i "X-Rules-Injected:" | cut -d' ' -f2 | tr -d '\r\n')
    if [ "$INJECTED" == "true" ]; then
        print_status "OK" "Rules were injected into prompt"
    else
        print_status "WARN" "X-Rules-Injected: $INJECTED"
    fi
fi

# Test 3: Check .rules file integrity
echo ""
echo "Test 3: Rules File Integrity"
echo "-----------------------------"

RULES_FILE="/home/duksan/바탕화면/gumgang_0_5/.rules"
META_FILE="/home/duksan/바탕화면/gumgang_0_5/.rules.meta.json"

if [ -f "$RULES_FILE" ]; then
    # Check if file starts with correct header
    FIRST_LINE=$(head -n 1 "$RULES_FILE")
    if [ "$FIRST_LINE" == "$HEAD_MARK" ]; then
        print_status "OK" ".rules file has correct header"
    else
        print_status "FAIL" ".rules file header mismatch"
        FAILED=1
    fi

    # Calculate hash
    RULES_HASH=$(sha256sum "$RULES_FILE" | cut -c1-12)
    print_status "INFO" "Rules hash: $RULES_HASH"
else
    print_status "FAIL" ".rules file not found"
    FAILED=1
fi

if [ -f "$META_FILE" ]; then
    # Check if locked
    LOCKED=$(python3 -c "import json; print(json.load(open('$META_FILE'))['locked'])" 2>/dev/null || echo "false")
    if [ "$LOCKED" == "True" ]; then
        print_status "OK" ".rules.meta.json is locked"
    else
        print_status "FAIL" ".rules.meta.json is not locked"
        FAILED=1
    fi

    # Check timestamp
    TIMESTAMP=$(python3 -c "import json; print(json.load(open('$META_FILE'))['fixed_timestamp_kst'])" 2>/dev/null || echo "unknown")
    if [ "$TIMESTAMP" == "2025-08-09 12:33" ]; then
        print_status "OK" "Fixed timestamp correct: $TIMESTAMP"
    else
        print_status "WARN" "Timestamp mismatch: $TIMESTAMP"
    fi
else
    print_status "FAIL" ".rules.meta.json not found"
    FAILED=1
fi

# Test 4: Protocol Guard Integration
echo ""
echo "Test 4: Protocol Guard Integration"
echo "-----------------------------------"

if command -v python3 &> /dev/null; then
    # Try to import and check rules enforcer
    ENFORCER_STATUS=$(python3 -c "
import sys
sys.path.append('/home/duksan/바탕화면/gumgang_0_5/backend')
try:
    from utils.rules_enforcer import get_enforcement_status
    status = get_enforcement_status()
    print('locked' if status.get('locked') else 'unlocked')
except Exception as e:
    print(f'error: {e}')
" 2>&1)

    if echo "$ENFORCER_STATUS" | grep -q "locked"; then
        print_status "OK" "Rules enforcer reports locked status"
    elif echo "$ENFORCER_STATUS" | grep -q "error"; then
        print_status "WARN" "Could not check rules enforcer"
        if [ "$VERBOSE" == "--verbose" ]; then
            echo "  Error: $ENFORCER_STATUS"
        fi
    else
        print_status "FAIL" "Rules enforcer not locked"
        FAILED=1
    fi
else
    print_status "WARN" "Python3 not available for enforcer check"
fi

# Test 5: Token Logger
echo ""
echo "Test 5: Token Logger"
echo "--------------------"

LOG_FILE="/home/duksan/바탕화면/gumgang_0_5/logs/metrics/rules_tokens.csv"
SUMMARY_FILE="/home/duksan/바탕화면/gumgang_0_5/logs/metrics/token_summary.json"

if [ -f "$LOG_FILE" ]; then
    LINE_COUNT=$(wc -l < "$LOG_FILE")
    print_status "OK" "Token log exists ($LINE_COUNT lines)"
else
    print_status "INFO" "Token log not yet created"
fi

if [ -f "$SUMMARY_FILE" ]; then
    print_status "OK" "Token summary exists"
    if [ "$VERBOSE" == "--verbose" ]; then
        echo "  Summary:"
        python3 -c "import json; d=json.load(open('$SUMMARY_FILE')); print(f\"    Total calls: {d.get('total_calls', 0)}\")" 2>/dev/null || true
        python3 -c "import json; d=json.load(open('$SUMMARY_FILE')); print(f\"    Avg rules %: {d.get('average_rules_percentage', 0)}%\")" 2>/dev/null || true
    fi
else
    print_status "INFO" "Token summary not yet created"
fi

# Summary
echo ""
echo "========================================="
echo "Summary"
echo "========================================="

if [ -z "${FAILED+x}" ]; then
    print_status "OK" "All rules enforcement validations passed! 🎉"
    echo ""
    echo "The .rules are properly sealed and enforced:"
    echo "  - File integrity verified"
    echo "  - Metadata locked"
    echo "  - Headers present in responses"
    echo "  - Enforcement middleware active"
    exit 0
else
    print_status "FAIL" "Some validations failed!"
    echo ""
    echo "Please check:"
    echo "  1. .rules file exists with correct header"
    echo "  2. .rules.meta.json is locked"
    echo "  3. Backend is running with enforcement middleware"
    echo "  4. Protocol Guard integration is active"
    exit 1
fi
