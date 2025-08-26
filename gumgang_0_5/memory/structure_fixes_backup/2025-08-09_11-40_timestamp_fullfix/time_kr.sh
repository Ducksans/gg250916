#!/usr/bin/env bash
#
# Time utility for Korea Standard Time (KST/Asia/Seoul)
# Enforces YYYY-MM-DD HH:mm format for all timestamps
# Part of Gumgang 2.0 Timestamp Absolute Enforcement System
#
# Usage:
#   source scripts/time_kr.sh
#   now_kr_minute
#

# Force timezone to Asia/Seoul
export TZ=Asia/Seoul

# Main function: Returns current time in KST with format: YYYY-MM-DD HH:mm
# This is the ONLY function that should be used for timestamps
# in the entire Gumgang 2.0 project shell scripts.
#
# Example:
#   now_kr_minute  # "2025-08-09 11:15"
now_kr_minute() {
    date "+%Y-%m-%d %H:%M"
}

# Returns current KST time formatted for use in filenames
# Replaces spaces with underscore and colons with hyphen
#
# Example:
#   format_for_filename  # "2025-08-09_11-15"
format_for_filename() {
    date "+%Y-%m-%d_%H-%M"
}

# Returns current date only in KST
#
# Example:
#   now_kr_date  # "2025-08-09"
now_kr_date() {
    date "+%Y-%m-%d"
}

# Returns current time only in KST
#
# Example:
#   now_kr_time  # "11:15"
now_kr_time() {
    date "+%H:%M"
}

# Validate if a string matches the required timestamp format
# Args: $1 - timestamp string to validate
# Returns: 0 if valid, 1 if invalid
#
# Example:
#   validate_kr_timestamp "2025-08-09 11:15"  # returns 0
#   validate_kr_timestamp "invalid"           # returns 1
validate_kr_timestamp() {
    local timestamp="$1"

    if [[ -z "$timestamp" ]]; then
        return 1
    fi

    # Check format using regex
    if [[ "$timestamp" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}\ [0-9]{2}:[0-9]{2}$ ]]; then
        return 0
    else
        return 1
    fi
}

# Convert seconds since epoch to KR timestamp format
# Args: $1 - seconds since epoch
#
# Example:
#   epoch_to_kr 1723171500  # "2025-08-09 11:15"
epoch_to_kr() {
    local epoch="$1"

    if [[ -z "$epoch" ]]; then
        echo "Error: No epoch time provided" >&2
        return 1
    fi

    date -d "@$epoch" "+%Y-%m-%d %H:%M" 2>/dev/null || \
    date -r "$epoch" "+%Y-%m-%d %H:%M" 2>/dev/null || \
    echo "Error: Failed to convert epoch time" >&2
}

# Add timestamp prefix to a log message
# Args: $* - message to log
#
# Example:
#   log_with_timestamp "Server started"  # "[2025-08-09 11:15] Server started"
log_with_timestamp() {
    echo "[$(now_kr_minute)] $*"
}

# Create a backup directory with timestamp
# Args: $1 - base directory name
#
# Example:
#   create_backup_dir "mybackup"  # Creates "mybackup_2025-08-09_11-15"
create_backup_dir() {
    local base_name="$1"

    if [[ -z "$base_name" ]]; then
        base_name="backup"
    fi

    local dir_name="${base_name}_$(format_for_filename)"
    mkdir -p "$dir_name"
    echo "$dir_name"
}

# Check if timestamp is recent (within N minutes)
# Args: $1 - timestamp string, $2 - minutes threshold (default 5)
# Returns: 0 if recent, 1 if old or invalid
#
# Example:
#   is_timestamp_recent "2025-08-09 11:10" 10  # Check if within 10 minutes
is_timestamp_recent() {
    local timestamp="$1"
    local threshold="${2:-5}"

    if ! validate_kr_timestamp "$timestamp"; then
        return 1
    fi

    # Convert timestamp to seconds
    local ts_epoch
    ts_epoch=$(date -d "$timestamp" "+%s" 2>/dev/null) || return 1

    local now_epoch
    now_epoch=$(date "+%s")

    local diff=$((now_epoch - ts_epoch))
    local threshold_seconds=$((threshold * 60))

    if [[ $diff -le $threshold_seconds ]]; then
        return 0
    else
        return 1
    fi
}

# Module constants
readonly TIMESTAMP_FORMAT="%Y-%m-%d %H:%M"
readonly TIMEZONE_NAME="Asia/Seoul"
readonly FILENAME_FORMAT="%Y-%m-%d_%H-%M"

# Self-test when sourced with TEST_TIME_KR=1
if [[ "${TEST_TIME_KR}" == "1" ]]; then
    echo "Testing time_kr.sh functions..."
    echo "Current KST time: $(now_kr_minute)"
    echo "Filename format: $(format_for_filename)"
    echo "Date only: $(now_kr_date)"
    echo "Time only: $(now_kr_time)"

    test_ts="$(now_kr_minute)"
    if validate_kr_timestamp "$test_ts"; then
        echo "Validation test: PASS"
    else
        echo "Validation test: FAIL"
    fi

    echo "Backup dir example: $(create_backup_dir "test")"
    rmdir "test_$(format_for_filename)" 2>/dev/null
fi

# Export functions for use in subshells
export -f now_kr_minute
export -f format_for_filename
export -f now_kr_date
export -f now_kr_time
export -f validate_kr_timestamp
export -f log_with_timestamp
