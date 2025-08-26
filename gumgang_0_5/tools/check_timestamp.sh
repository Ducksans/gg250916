#!/usr/bin/env bash
#
# API Timestamp Validation Script for Gumgang 2.0
# Checks that all API endpoints return timestamps in the correct format
# Part of the Timestamp Absolute Enforcement System
#
# Usage:
#   ./check_timestamp.sh
#   ./check_timestamp.sh --verbose
#

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

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Source time utilities
source "$PROJECT_ROOT/scripts/time_kr.sh"

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

# Function to check API headers
check_api_headers() {
    local endpoint=$1
    local url="${BASE_URL}${endpoint}"

    if [[ "$VERBOSE" == "--verbose" ]]; then
        print_status "INFO" "Checking $url"
    fi

    # Get headers
    local headers
    headers=$(curl -sI "$url" 2>/dev/null || echo "FAILED")

    if [[ "$headers" == "FAILED" ]]; then
        print_status "FAIL" "Could not connect to $url"
        return 1
    fi

    # Check for timestamp header
    local timestamp_header
    timestamp_header=$(echo "$headers" | grep -i "X-Gumgang-Timestamp:" | cut -d' ' -f2- | tr -d '\r\n')

    if [[ -z "$timestamp_header" ]]; then
        print_status "FAIL" "$endpoint: Missing X-Gumgang-Timestamp header"
        return 1
    fi

    # Check for timezone header
    local tz_header
    tz_header=$(echo "$headers" | grep -i "X-Gumgang-TZ:" | cut -d' ' -f2- | tr -d '\r\n')

    if [[ "$tz_header" != "Asia/Seoul" ]]; then
        print_status "FAIL" "$endpoint: Wrong timezone (expected Asia/Seoul, got $tz_header)"
        return 1
    fi

    # Validate timestamp format
    if echo "$timestamp_header" | python3 "$SCRIPT_DIR/timestamp_lint.py" -q; then
        if [[ "$VERBOSE" == "--verbose" ]]; then
            print_status "OK" "$endpoint: $timestamp_header"
        fi
        return 0
    else
        print_status "FAIL" "$endpoint: Invalid timestamp format: $timestamp_header"
        return 1
    fi
}

# Function to check JSON response timestamps
check_json_timestamp() {
    local endpoint=$1
    local json_path=${2:-.timestamp}
    local url="${BASE_URL}${endpoint}"

    if [[ "$VERBOSE" == "--verbose" ]]; then
        print_status "INFO" "Checking JSON response from $url"
    fi

    # Get JSON response
    local response
    response=$(curl -s "$url" 2>/dev/null || echo "{}")

    # Extract timestamp using jq or python
    local timestamp
    if command -v jq &> /dev/null; then
        timestamp=$(echo "$response" | jq -r "$json_path" 2>/dev/null || echo "")
    else
        timestamp=$(echo "$response" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('timestamp', ''))" 2>/dev/null || echo "")
    fi

    if [[ -z "$timestamp" || "$timestamp" == "null" ]]; then
        print_status "WARN" "$endpoint: No timestamp field in JSON response"
        return 1
    fi

    # Validate timestamp format
    if echo "$timestamp" | python3 "$SCRIPT_DIR/timestamp_lint.py" -q; then
        if [[ "$VERBOSE" == "--verbose" ]]; then
            print_status "OK" "$endpoint JSON: $timestamp"
        fi
        return 0
    else
        print_status "FAIL" "$endpoint JSON: Invalid timestamp format: $timestamp"
        return 1
    fi
}

# Main execution
main() {
    echo "========================================="
    echo "Gumgang 2.0 API Timestamp Validation"
    echo "========================================="
    echo ""

    print_status "INFO" "Base URL: $BASE_URL"
    print_status "INFO" "Current KST: $(now_kr_minute)"
    echo ""

    # Check if server is running
    if ! curl -s "$BASE_URL/health" > /dev/null 2>&1; then
        print_status "FAIL" "Server is not running at $BASE_URL"
        exit 1
    fi

    # Endpoints to check
    endpoints=(
        "/health"
        "/"
        "/api/echo"
        "/api/protocol/health"
        "/api/memory/status"
        "/api/dashboard/stats"
    )

    # Counters
    passed=0
    failed=0

    echo "Checking API Headers:"
    echo "---------------------"
    for endpoint in "${endpoints[@]}"; do
        if check_api_headers "$endpoint"; then
            ((passed++))
        else
            ((failed++))
        fi
    done

    echo ""
    echo "Checking JSON Responses:"
    echo "------------------------"
    for endpoint in "${endpoints[@]}"; do
        if check_json_timestamp "$endpoint"; then
            ((passed++))
        else
            ((failed++))
        fi
    done

    echo ""
    echo "========================================="
    if [[ $failed -eq 0 ]]; then
        print_status "OK" "All checks passed! ($passed/$((passed + failed)))"
        echo "All timestamps are in correct format: YYYY-MM-DD HH:mm"
        exit 0
    else
        print_status "FAIL" "Some checks failed! (Passed: $passed, Failed: $failed)"
        echo "Please fix timestamp formats to match: YYYY-MM-DD HH:mm"
        exit 1
    fi
}

# Run main function
main
