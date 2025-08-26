#!/usr/bin/env python3
"""
Timestamp Format Validator for Gumgang 2.0
Validates timestamps against the required format: YYYY-MM-DD HH:mm (KST)
Part of the Timestamp Absolute Enforcement System

Usage:
    echo "2025-08-09 11:15" | python3 timestamp_lint.py
    python3 timestamp_lint.py "2025-08-09 11:15"
    python3 timestamp_lint.py --file timestamps.txt
"""

import re
import sys
import argparse
from typing import List, Tuple

# Required timestamp pattern
TIMESTAMP_PATTERN = re.compile(r'^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$')

def validate_timestamp(timestamp: str) -> bool:
    """
    Validate a single timestamp string

    Args:
        timestamp: String to validate

    Returns:
        bool: True if valid, False otherwise
    """
    return bool(TIMESTAMP_PATTERN.match(timestamp.strip()))

def validate_timestamps(timestamps: List[str]) -> Tuple[List[str], List[str]]:
    """
    Validate multiple timestamps

    Args:
        timestamps: List of timestamp strings

    Returns:
        Tuple of (valid_timestamps, invalid_timestamps)
    """
    valid = []
    invalid = []

    for ts in timestamps:
        ts = ts.strip()
        if not ts:  # Skip empty lines
            continue

        if validate_timestamp(ts):
            valid.append(ts)
        else:
            invalid.append(ts)

    return valid, invalid

def main():
    """Main function"""
    parser = argparse.ArgumentParser(
        description='Validate timestamps against Gumgang 2.0 format (YYYY-MM-DD HH:mm)'
    )
    parser.add_argument(
        'timestamp',
        nargs='?',
        help='Single timestamp to validate'
    )
    parser.add_argument(
        '--file', '-f',
        help='File containing timestamps (one per line)'
    )
    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Verbose output'
    )
    parser.add_argument(
        '--quiet', '-q',
        action='store_true',
        help='Quiet mode (only exit code)'
    )

    args = parser.parse_args()

    timestamps_to_check = []

    # Collect timestamps from various sources
    if args.file:
        # Read from file
        try:
            with open(args.file, 'r') as f:
                timestamps_to_check.extend(f.readlines())
        except FileNotFoundError:
            if not args.quiet:
                print(f"ERROR: File not found: {args.file}", file=sys.stderr)
            sys.exit(2)
    elif args.timestamp:
        # Single timestamp from argument
        timestamps_to_check.append(args.timestamp)
    else:
        # Read from stdin
        if not sys.stdin.isatty():
            timestamps_to_check.extend(sys.stdin.readlines())
        else:
            if not args.quiet:
                print("ERROR: No input provided. Use --help for usage.", file=sys.stderr)
            sys.exit(2)

    # Validate timestamps
    valid, invalid = validate_timestamps(timestamps_to_check)

    # Output results
    if not args.quiet:
        if args.verbose:
            if valid:
                print(f"✅ VALID TIMESTAMPS ({len(valid)}):")
                for ts in valid:
                    print(f"  ✓ {ts}")

            if invalid:
                print(f"\n❌ INVALID TIMESTAMPS ({len(invalid)}):")
                for ts in invalid:
                    print(f"  ✗ {ts}")
                print(f"\nExpected format: YYYY-MM-DD HH:mm (e.g., 2025-08-09 11:15)")
        else:
            # Simple output
            if invalid:
                print(f"INVALID TIMESTAMP(S):", file=sys.stderr)
                for ts in invalid:
                    print(f"  {ts}", file=sys.stderr)
            else:
                print("OK")

    # Exit with appropriate code
    if invalid:
        sys.exit(1)
    else:
        sys.exit(0)

if __name__ == "__main__":
    main()
