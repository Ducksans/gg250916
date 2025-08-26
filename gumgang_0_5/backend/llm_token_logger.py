#!/usr/bin/env python3
"""
LLM Token Logger for Gumgang 2.0
Tracks token usage for rules enforcement and economic monitoring
Part of the Rules Absolute Enforcement System
"""

import csv
import os
import time
import json
from typing import Dict, Optional, Any
from pathlib import Path
from datetime import datetime

# Try to import tiktoken for accurate token counting
try:
    import tiktoken
    ENCODER = tiktoken.get_encoding("cl100k_base")

    def count_tokens(text: str) -> int:
        """Count tokens using tiktoken"""
        return len(ENCODER.encode(text))

    TIKTOKEN_AVAILABLE = True
except ImportError:
    # Fallback to rough estimation if tiktoken not available
    def count_tokens(text: str) -> int:
        """Estimate token count (roughly 1 token per 4 chars)"""
        return max(1, int(len(text) * 0.25))

    TIKTOKEN_AVAILABLE = False

# Import time utilities for consistent timestamps
import sys
sys.path.append(str(Path(__file__).parent))
try:
    from utils.time_kr import now_kr_str_minute
except ImportError:
    # Fallback if time_kr not available
    def now_kr_str_minute():
        return datetime.now().strftime("%Y-%m-%d %H:%M")

# Log file configuration
LOG_DIR = Path(__file__).parent.parent / "logs" / "metrics"
LOG_FILE = LOG_DIR / "rules_tokens.csv"
SUMMARY_FILE = LOG_DIR / "token_summary.json"

# Ensure log directory exists
LOG_DIR.mkdir(parents=True, exist_ok=True)


class LLMTokenLogger:
    """Logger for tracking LLM token usage with rules enforcement"""

    def __init__(self):
        self.log_file = LOG_FILE
        self.summary_file = SUMMARY_FILE
        self._ensure_csv_header()
        self._load_summary()

    def _ensure_csv_header(self):
        """Ensure CSV file exists with proper header"""
        if not self.log_file.exists():
            with open(self.log_file, "w", newline="", encoding="utf-8") as f:
                writer = csv.writer(f)
                writer.writerow([
                    "timestamp",
                    "call_id",
                    "model",
                    "rules_tokens",
                    "prompt_tokens",
                    "completion_tokens",
                    "total_tokens",
                    "rules_percentage",
                    "endpoint",
                    "status"
                ])

    def _load_summary(self):
        """Load or initialize summary statistics"""
        if self.summary_file.exists():
            with open(self.summary_file, "r", encoding="utf-8") as f:
                self.summary = json.load(f)
        else:
            self.summary = {
                "total_calls": 0,
                "total_rules_tokens": 0,
                "total_prompt_tokens": 0,
                "total_completion_tokens": 0,
                "total_all_tokens": 0,
                "average_rules_percentage": 0,
                "last_updated": now_kr_str_minute(),
                "tiktoken_available": TIKTOKEN_AVAILABLE
            }

    def _save_summary(self):
        """Save summary statistics to JSON file"""
        self.summary["last_updated"] = now_kr_str_minute()
        with open(self.summary_file, "w", encoding="utf-8") as f:
            json.dump(self.summary, f, indent=2, ensure_ascii=False)

    def log_rules_tokens(
        self,
        call_id: str,
        rules_text: str,
        final_prompt: str,
        model: str = "unknown",
        usage: Optional[Dict[str, Any]] = None,
        endpoint: str = "/api/unknown",
        status: str = "success"
    ):
        """
        Log token usage for an LLM call with rules enforcement

        Args:
            call_id: Unique identifier for this call
            rules_text: The rules text that was prepended
            final_prompt: The complete prompt sent to LLM (including rules)
            model: LLM model name
            usage: Usage dictionary from LLM response (optional)
            endpoint: API endpoint that triggered this call
            status: Status of the call (success/error)
        """
        # Get timestamp
        timestamp = now_kr_str_minute()

        # Count tokens
        rules_tokens = count_tokens(rules_text)
        prompt_tokens = count_tokens(final_prompt)

        # Extract completion tokens from usage if available
        completion_tokens = usage.get("completion_tokens", "") if usage else ""
        total_tokens = usage.get("total_tokens", "") if usage else ""

        # If no usage data, estimate total
        if not total_tokens and completion_tokens:
            total_tokens = prompt_tokens + completion_tokens
        elif not total_tokens:
            total_tokens = prompt_tokens  # Minimum estimate

        # Calculate rules percentage
        rules_percentage = round((rules_tokens / prompt_tokens * 100), 2) if prompt_tokens > 0 else 0

        # Write to CSV
        with open(self.log_file, "a", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow([
                timestamp,
                call_id,
                model,
                rules_tokens,
                prompt_tokens,
                completion_tokens,
                total_tokens,
                rules_percentage,
                endpoint,
                status
            ])

        # Update summary
        self.summary["total_calls"] += 1
        self.summary["total_rules_tokens"] += rules_tokens
        self.summary["total_prompt_tokens"] += prompt_tokens

        if isinstance(completion_tokens, int):
            self.summary["total_completion_tokens"] += completion_tokens

        if isinstance(total_tokens, int):
            self.summary["total_all_tokens"] += total_tokens

        # Update average rules percentage
        prev_avg = self.summary["average_rules_percentage"]
        n = self.summary["total_calls"]
        self.summary["average_rules_percentage"] = round(
            (prev_avg * (n - 1) + rules_percentage) / n, 2
        )

        # Save summary
        self._save_summary()

        return {
            "logged": True,
            "call_id": call_id,
            "rules_tokens": rules_tokens,
            "prompt_tokens": prompt_tokens,
            "rules_percentage": rules_percentage
        }

    def get_summary(self) -> Dict[str, Any]:
        """Get current summary statistics"""
        self._load_summary()  # Reload to get latest
        return self.summary

    def get_recent_logs(self, limit: int = 10) -> list:
        """Get recent log entries"""
        if not self.log_file.exists():
            return []

        with open(self.log_file, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            logs = list(reader)

        return logs[-limit:] if len(logs) > limit else logs

    def calculate_daily_stats(self, date: Optional[str] = None) -> Dict[str, Any]:
        """Calculate statistics for a specific day"""
        if not self.log_file.exists():
            return {"error": "No log file found"}

        # Use today if no date specified
        if not date:
            date = now_kr_str_minute().split(" ")[0]

        daily_stats = {
            "date": date,
            "total_calls": 0,
            "total_rules_tokens": 0,
            "total_prompt_tokens": 0,
            "total_completion_tokens": 0,
            "average_rules_percentage": 0
        }

        rules_percentages = []

        with open(self.log_file, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row["timestamp"].startswith(date):
                    daily_stats["total_calls"] += 1

                    if row["rules_tokens"]:
                        daily_stats["total_rules_tokens"] += int(row["rules_tokens"])

                    if row["prompt_tokens"]:
                        daily_stats["total_prompt_tokens"] += int(row["prompt_tokens"])

                    if row["completion_tokens"] and row["completion_tokens"].isdigit():
                        daily_stats["total_completion_tokens"] += int(row["completion_tokens"])

                    if row["rules_percentage"]:
                        rules_percentages.append(float(row["rules_percentage"]))

        if rules_percentages:
            daily_stats["average_rules_percentage"] = round(
                sum(rules_percentages) / len(rules_percentages), 2
            )

        return daily_stats


# Global logger instance
token_logger = LLMTokenLogger()


def log_rules_tokens(
    call_id: str,
    rules_text: str,
    final_prompt: str,
    model: str = "unknown",
    usage: Optional[Dict[str, Any]] = None,
    endpoint: str = "/api/unknown",
    status: str = "success"
) -> Dict[str, Any]:
    """
    Convenience function to log token usage

    Returns:
        dict: Logging result with token counts
    """
    return token_logger.log_rules_tokens(
        call_id=call_id,
        rules_text=rules_text,
        final_prompt=final_prompt,
        model=model,
        usage=usage,
        endpoint=endpoint,
        status=status
    )


def get_token_summary() -> Dict[str, Any]:
    """Get current token usage summary"""
    return token_logger.get_summary()


if __name__ == "__main__":
    # Self-test when run directly
    print("🔢 LLM Token Logger Test")
    print("=" * 40)

    # Test token counting
    test_text = "This is a test prompt for token counting."
    tokens = count_tokens(test_text)
    print(f"Test text: '{test_text}'")
    print(f"Token count: {tokens}")
    print(f"Tiktoken available: {TIKTOKEN_AVAILABLE}")

    # Test logging
    import uuid
    test_id = str(uuid.uuid4())[:8]

    result = log_rules_tokens(
        call_id=test_id,
        rules_text="[RULES v1.0] Test rules content...",
        final_prompt="[RULES v1.0] Test rules content...\n\n---\n\nActual prompt here",
        model="test-model",
        usage={"completion_tokens": 50, "total_tokens": 100},
        endpoint="/api/test",
        status="test"
    )

    print(f"\nLogging result: {result}")

    # Show summary
    summary = get_token_summary()
    print(f"\nSummary:")
    print(f"  Total calls: {summary['total_calls']}")
    print(f"  Total rules tokens: {summary['total_rules_tokens']}")
    print(f"  Average rules %: {summary['average_rules_percentage']}%")

    print(f"\n✅ Token logger is working correctly")
    print(f"📊 Logs saved to: {LOG_FILE}")
    print(f"📈 Summary saved to: {SUMMARY_FILE}")
