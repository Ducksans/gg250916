#!/usr/bin/env bash
#
# Timestamp Validation Script for Gumgang 2.0
# Validates that all timestamps in the project comply with the KST format rules
# Part of the Timestamp Absolute Enforcement System
#
# Usage:
#   ./validate_timestamps.sh          # Run validation
#   ./validate_timestamps.sh --verbose # Run with detailed output
#   ./validate_timestamps.sh --fix     # Show fix suggestions
#
# Exit codes:
#   0 - All validations passed
#   1 - Violations found
#   2 - Script error

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
VERBOSE=0
SHOW_FIX=0
while [[ $# -gt 0 ]]; do
    case $1 in
        --verbose|-v)
            VERBOSE=1
            shift
            ;;
        --fix)
            SHOW_FIX=1
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--verbose] [--fix]"
            exit 2
            ;;
    esac
done

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

# Initialize counters
TOTAL_VIOLATIONS=0
PYTHON_VIOLATIONS=0
TS_VIOLATIONS=0
BASH_VIOLATIONS=0

echo "========================================="
echo "🕒 Gumgang 2.0 Timestamp Validation"
echo "========================================="
echo ""

# Get project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

print_status "INFO" "Project root: $PROJECT_ROOT"
print_status "INFO" "Timestamp format: YYYY-MM-DD HH:mm (KST)"
echo ""

# 1. Python validation
echo "Checking Python files..."
echo "------------------------"

# Find Python files with violations
PYTHON_FILES=$(find . -name "*.py" -type f \
    ! -path "./venv/*" \
    ! -path "./.venv/*" \
    ! -path "./node_modules/*" \
    ! -path "./__pycache__/*" \
    ! -path "./*/.venv/*" \
    ! -path "./*/__pycache__/*" \
    ! -path "./*/venv/*" \
    2>/dev/null || true)

if [ -n "$PYTHON_FILES" ]; then
    for file in $PYTHON_FILES; do
        if grep -q "datetime\.now\(\|datetime\.utcnow\(\|\.isoformat\(\|\.strftime\(" "$file" 2>/dev/null; then
            # Skip if it's the time_kr.py utility itself
            if [[ "$file" == *"time_kr.py" ]]; then
                continue
            fi

            # Check if the file uses the approved utility
            if ! grep -q "now_kr_str_minute" "$file" 2>/dev/null; then
                ((PYTHON_VIOLATIONS++))
                ((TOTAL_VIOLATIONS++))

                if [ $VERBOSE -eq 1 ]; then
                    print_status "FAIL" "$file"
                    grep -n "datetime\.now\(\|datetime\.utcnow\(\|\.isoformat\(\|\.strftime\(" "$file" | head -3
                fi
            fi
        fi
    done
fi

if [ $PYTHON_VIOLATIONS -eq 0 ]; then
    print_status "OK" "Python: No violations found"
else
    print_status "FAIL" "Python: $PYTHON_VIOLATIONS files with violations"
    if [ $SHOW_FIX -eq 1 ]; then
        echo "  Fix: Add 'from utils.time_kr import now_kr_str_minute' and replace datetime.now() calls"
    fi
fi
echo ""

# 2. TypeScript/JavaScript validation
echo "Checking TypeScript/JavaScript files..."
echo "----------------------------------------"

# Find TS/JS files with violations
TS_FILES=$(find gumgang-v2 \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
    ! -path "*/node_modules/*" \
    ! -path "*/.next/*" \
    2>/dev/null || true)

if [ -n "$TS_FILES" ]; then
    for file in $TS_FILES; do
        if grep -q "new Date\(\|Date\.now\(\|toISOString\(" "$file" 2>/dev/null; then
            # Skip if it's the timeKR utility itself
            if [[ "$file" == *"timeKR"* ]]; then
                continue
            fi

            # Check if the file uses the approved utility
            if ! grep -q "nowKRMinute\|timeKR" "$file" 2>/dev/null; then
                ((TS_VIOLATIONS++))
                ((TOTAL_VIOLATIONS++))

                if [ $VERBOSE -eq 1 ]; then
                    print_status "FAIL" "$file"
                    grep -n "new Date\(\|Date\.now\(\|toISOString\(" "$file" | head -3
                fi
            fi
        fi
    done
fi

if [ $TS_VIOLATIONS -eq 0 ]; then
    print_status "OK" "TypeScript/JavaScript: No violations found"
else
    print_status "FAIL" "TypeScript/JavaScript: $TS_VIOLATIONS files with violations"
    if [ $SHOW_FIX -eq 1 ]; then
        echo "  Fix: Import { nowKRMinute } from '@/lib/timeKR' and replace Date() calls"
    fi
fi
echo ""

# 3. Bash validation
echo "Checking Bash scripts..."
echo "------------------------"

# Find Bash files with violations
BASH_FILES=$(find . -name "*.sh" -type f \
    ! -path "./venv/*" \
    ! -path "./.venv/*" \
    ! -path "./node_modules/*" \
    ! -path "./*/venv/*" \
    2>/dev/null || true)

if [ -n "$BASH_FILES" ]; then
    for file in $BASH_FILES; do
        # Skip if it's the time_kr.sh utility itself
        if [[ "$file" == *"time_kr.sh" ]]; then
            continue
        fi

        # Check for date command usage
        if grep -q "date " "$file" 2>/dev/null; then
            # Check if it's using the approved functions
            if ! grep -q "now_kr_minute\|now_kr_date\|now_kr_time\|format_for_filename" "$file" 2>/dev/null; then
                # Check if time_kr.sh is sourced
                if ! grep -q "source.*time_kr.sh\|\..*time_kr.sh" "$file" 2>/dev/null; then
                    ((BASH_VIOLATIONS++))
                    ((TOTAL_VIOLATIONS++))

                    if [ $VERBOSE -eq 1 ]; then
                        print_status "FAIL" "$file"
                        grep -n "date " "$file" | grep -v "now_kr_\|format_for_filename" | head -3
                    fi
                fi
            fi
        fi
    done
fi

if [ $BASH_VIOLATIONS -eq 0 ]; then
    print_status "OK" "Bash: No violations found"
else
    print_status "FAIL" "Bash: $BASH_VIOLATIONS files with violations"
    if [ $SHOW_FIX -eq 1 ]; then
        echo "  Fix: Source scripts/time_kr.sh and use now_kr_minute instead of date command"
    fi
fi
echo ""

# 4. Summary
echo "========================================="
echo "Summary"
echo "========================================="

print_status "INFO" "Python violations: $PYTHON_VIOLATIONS"
print_status "INFO" "TypeScript/JavaScript violations: $TS_VIOLATIONS"
print_status "INFO" "Bash violations: $BASH_VIOLATIONS"
print_status "INFO" "Total violations: $TOTAL_VIOLATIONS"
echo ""

if [ $TOTAL_VIOLATIONS -eq 0 ]; then
    print_status "OK" "All timestamp rules compliant! 🎉"
    echo ""
    echo "All timestamps follow the format: YYYY-MM-DD HH:mm (KST)"
    exit 0
else
    print_status "FAIL" "Timestamp violations found!"
    echo ""
    echo "Run with --verbose to see detailed violations"
    echo "Run with --fix to see how to fix the violations"
    echo "Run tools/fix_timestamps.sh to automatically fix some violations"
    exit 1
fi
