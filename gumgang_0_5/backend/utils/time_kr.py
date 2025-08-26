#!/usr/bin/env python3
"""
Time utility for Korea Standard Time (KST/Asia/Seoul)
Enforces YYYY-MM-DD HH:mm format for all timestamps
Part of Gumgang 2.0 Timestamp Absolute Enforcement System
"""

from datetime import datetime, timezone, timedelta
import os
import time

# Korea Standard Time (UTC+9)
KST = timezone(timedelta(hours=9))

def now_kr_str_minute() -> str:
    """
    Returns current time in KST with format: YYYY-MM-DD HH:mm

    This is the ONLY function that should be used for timestamps
    in the entire Gumgang 2.0 project.

    Returns:
        str: Current time in "YYYY-MM-DD HH:mm" format (KST)

    Example:
        >>> now_kr_str_minute()
        "2025-08-09 11:15"
    """
    # Force timezone to Asia/Seoul
    os.environ["TZ"] = "Asia/Seoul"

    # Try to set timezone (not available on all platforms)
    try:
        time.tzset()
    except AttributeError:
        pass  # Windows doesn't have tzset

    # Get current time in KST and format
    return datetime.now(tz=KST).strftime("%Y-%m-%d %H:%M")


def parse_kr_str_minute(timestamp_str: str) -> datetime:
    """
    Parse a KST timestamp string back to datetime object

    Args:
        timestamp_str: Timestamp in "YYYY-MM-DD HH:mm" format

    Returns:
        datetime: Parsed datetime object with KST timezone

    Raises:
        ValueError: If timestamp format is invalid
    """
    try:
        dt = datetime.strptime(timestamp_str, "%Y-%m-%d %H:%M")
        return dt.replace(tzinfo=KST)
    except ValueError as e:
        raise ValueError(f"Invalid timestamp format. Expected 'YYYY-MM-DD HH:mm', got '{timestamp_str}': {e}")


def validate_kr_timestamp(timestamp_str: str) -> bool:
    """
    Validate if a string matches the required timestamp format

    Args:
        timestamp_str: String to validate

    Returns:
        bool: True if valid format, False otherwise
    """
    import re
    pattern = r'^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$'
    return bool(re.match(pattern, timestamp_str))


def format_for_filename() -> str:
    """
    Returns current KST time formatted for use in filenames
    Replaces spaces and colons with underscores

    Returns:
        str: Current time as "YYYY-MM-DD_HH-mm"

    Example:
        >>> format_for_filename()
        "2025-08-09_11-15"
    """
    return now_kr_str_minute().replace(" ", "_").replace(":", "-")


# Module-level constant for import convenience
TIMESTAMP_FORMAT = "%Y-%m-%d %H:%M"
TIMEZONE_NAME = "Asia/Seoul"

# Test on import to ensure system is working
if __name__ == "__main__":
    print(f"Current KST time: {now_kr_str_minute()}")
    print(f"Filename format: {format_for_filename()}")
    test_ts = now_kr_str_minute()
    print(f"Validation test: {validate_kr_timestamp(test_ts)}")
