#!/usr/bin/env bash
#
# Automatic Timestamp Fix Script for Gumgang 2.0
# Automatically fixes timestamp violations in Bash scripts
# Part of the Timestamp Absolute Enforcement System
#
# Usage:
#   ./fix_timestamps.sh           # Dry run - shows what would be changed
#   ./fix_timestamps.sh --apply   # Actually apply the fixes
#   ./fix_timestamps.sh --help    # Show help
#
# Exit codes:
#   0 - Success (or no changes needed)
#   1 - Error occurred
#   2 - Invalid arguments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DRY_RUN=1
VERBOSE=0
BACKUP=1

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --apply)
            DRY_RUN=0
            shift
            ;;
        --verbose|-v)
            VERBOSE=1
            shift
            ;;
        --no-backup)
            BACKUP=0
            shift
            ;;
        --help|-h)
            echo "Automatic Timestamp Fix Script for Gumgang 2.0"
            echo ""
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --apply       Actually apply the fixes (default is dry run)"
            echo "  --verbose     Show detailed output"
            echo "  --no-backup   Don't create backup files"
            echo "  --help        Show this help message"
            echo ""
            echo "This script will:"
            echo "  1. Find Bash scripts using 'date' command"
            echo "  2. Add 'source scripts/time_kr.sh' if missing"
            echo "  3. Replace date patterns with time_kr.sh functions"
            echo ""
            echo "Replacements:"
            echo "  date '+%Y-%m-%d %H:%M:%S' → now_kr_minute"
            echo "  date '+%Y-%m-%d %H:%M'    → now_kr_minute"
            echo "  date '+%Y-%m-%d'          → now_kr_date"
            echo "  date '+%H:%M'             → now_kr_time"
            echo "  date '+%Y%m%d_%H%M%S'     → format_for_filename_compact"
            echo "  date '+%Y%m%d_%H%M'       → format_for_filename_compact"
            echo "  date '+%Y-%m-%d_%H-%M'    → format_for_filename"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
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
        "CHANGE")
            echo -e "${YELLOW}📝 $message${NC}"
            ;;
    esac
}

# Get project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "========================================="
echo "🕒 Gumgang 2.0 Timestamp Auto-Fix"
echo "========================================="
echo ""

if [ $DRY_RUN -eq 1 ]; then
    print_status "INFO" "Running in DRY RUN mode (no files will be modified)"
    print_status "INFO" "Use --apply to actually fix the files"
else
    print_status "WARN" "Running in APPLY mode (files will be modified)"
    if [ $BACKUP -eq 1 ]; then
        print_status "INFO" "Backups will be created with .bak extension"
    fi
fi
echo ""

# Counter for fixed files
FIXED_COUNT=0
TOTAL_CHANGES=0

# Function to fix a single file
fix_file() {
    local file="$1"
    local changes_made=0
    local temp_file="${file}.tmp"

    # Skip time_kr.sh itself
    if [[ "$file" == *"time_kr.sh" ]]; then
        return 0
    fi

    # Check if file needs fixing
    if ! grep -q "date " "$file" 2>/dev/null; then
        return 0
    fi

    # Check if already uses time_kr functions
    if grep -q "now_kr_minute\|now_kr_date\|now_kr_time\|format_for_filename" "$file" 2>/dev/null; then
        # File uses both - might be partially fixed
        if [ $VERBOSE -eq 1 ]; then
            print_status "INFO" "Partially fixed: $file"
        fi
    fi

    # Copy file for processing
    cp "$file" "$temp_file"

    # Check if time_kr.sh is already sourced
    if ! grep -q "source.*time_kr.sh\|\..*time_kr.sh" "$temp_file" 2>/dev/null; then
        # Add source line after shebang
        if [ $DRY_RUN -eq 0 ]; then
            # Find the line number after shebang and any initial comments
            local insert_line=2
            while IFS= read -r line; do
                if [[ ! "$line" =~ ^#.*$ ]] && [[ ! -z "$line" ]]; then
                    break
                fi
                ((insert_line++))
            done < "$temp_file"

            # Insert the source line
            sed -i "${insert_line}i\\
# Source time utilities for KST timestamps\\
source \$(dirname \"\$0\")/scripts/time_kr.sh 2>/dev/null || source scripts/time_kr.sh 2>/dev/null || true\\
" "$temp_file"
        fi
        print_status "CHANGE" "$file: Added source scripts/time_kr.sh"
        ((changes_made++))
    fi

    # Replace date patterns
    local patterns=(
        "s/date '+%Y-%m-%d %H:%M:%S'/now_kr_minute/g"
        "s/date \"+%Y-%m-%d %H:%M:%S\"/now_kr_minute/g"
        "s/date '+%Y-%m-%d %H:%M'/now_kr_minute/g"
        "s/date \"+%Y-%m-%d %H:%M\"/now_kr_minute/g"
        "s/date '+%Y-%m-%d'/now_kr_date/g"
        "s/date \"+%Y-%m-%d\"/now_kr_date/g"
        "s/date '+%H:%M:%S'/now_kr_time/g"
        "s/date \"+%H:%M:%S\"/now_kr_time/g"
        "s/date '+%H:%M'/now_kr_time/g"
        "s/date \"+%H:%M\"/now_kr_time/g"
        "s/date '+%Y%m%d_%H%M%S'/format_for_filename_compact/g"
        "s/date \"+%Y%m%d_%H%M%S\"/format_for_filename_compact/g"
        "s/date '+%Y%m%d_%H%M'/format_for_filename_compact/g"
        "s/date \"+%Y%m%d_%H%M\"/format_for_filename_compact/g"
        "s/date '+%Y%m%d-%H%M%S'/format_for_filename_compact/g"
        "s/date \"+%Y%m%d-%H%M%S\"/format_for_filename_compact/g"
        "s/date '+%Y-%m-%d_%H-%M'/format_for_filename/g"
        "s/date \"+%Y-%m-%d_%H-%M\"/format_for_filename/g"
        "s/\$(date)/\$(now_kr_minute)/g"
        "s/\`date\`/\$(now_kr_minute)/g"
    )

    for pattern in "${patterns[@]}"; do
        if grep -q "$(echo "$pattern" | sed 's/s\///' | sed 's/\/.*//')" "$temp_file" 2>/dev/null; then
            if [ $DRY_RUN -eq 0 ]; then
                sed -i "$pattern" "$temp_file"
            fi
            print_status "CHANGE" "$file: Applied pattern: $pattern"
            ((changes_made++))
        fi
    done

    # If changes were made and not dry run, update the file
    if [ $changes_made -gt 0 ]; then
        if [ $DRY_RUN -eq 0 ]; then
            # Create backup if requested
            if [ $BACKUP -eq 1 ]; then
                cp "$file" "${file}.bak"
                if [ $VERBOSE -eq 1 ]; then
                    print_status "INFO" "Created backup: ${file}.bak"
                fi
            fi

            # Apply changes
            mv "$temp_file" "$file"
            print_status "OK" "Fixed: $file ($changes_made changes)"
        else
            print_status "INFO" "Would fix: $file ($changes_made changes)"
        fi

        ((FIXED_COUNT++))
        ((TOTAL_CHANGES+=changes_made))
    else
        if [ $VERBOSE -eq 1 ]; then
            print_status "INFO" "No changes needed: $file"
        fi
    fi

    # Clean up temp file
    rm -f "$temp_file"
}

# Export function for use with xargs
export -f fix_file
export -f print_status
export DRY_RUN VERBOSE BACKUP
export RED GREEN YELLOW BLUE NC

# Find and fix all Bash scripts
echo "Scanning for Bash scripts..."
echo "----------------------------"

BASH_FILES=$(find . -name "*.sh" -type f \
    ! -path "./venv/*" \
    ! -path "./.venv/*" \
    ! -path "./node_modules/*" \
    ! -path "./*/venv/*" \
    ! -path "./*/.venv/*" \
    ! -name "time_kr.sh" \
    2>/dev/null || true)

if [ -z "$BASH_FILES" ]; then
    print_status "INFO" "No Bash scripts found"
else
    # Process each file
    for file in $BASH_FILES; do
        fix_file "$file"
    done
fi

echo ""
echo "========================================="
echo "Summary"
echo "========================================="

if [ $DRY_RUN -eq 1 ]; then
    if [ $FIXED_COUNT -gt 0 ]; then
        print_status "INFO" "Would fix $FIXED_COUNT files with $TOTAL_CHANGES total changes"
        echo ""
        echo "Re-run with --apply to actually fix the files:"
        echo "  $0 --apply"
    else
        print_status "OK" "No files need fixing!"
    fi
else
    if [ $FIXED_COUNT -gt 0 ]; then
        print_status "OK" "Fixed $FIXED_COUNT files with $TOTAL_CHANGES total changes"
        if [ $BACKUP -eq 1 ]; then
            echo ""
            echo "Backup files created with .bak extension"
            echo "To remove backups: find . -name '*.sh.bak' -delete"
        fi
    else
        print_status "OK" "No files needed fixing!"
    fi
fi

echo ""
echo "Run tools/validate_timestamps.sh to verify compliance"

exit 0
