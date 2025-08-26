#!/usr/bin/env python3
"""
Rules Enforcer for Gumgang 2.0
Ensures .rules are permanently sealed and enforced on all LLM calls
Part of the Rules Absolute Enforcement System
"""

import json
import hashlib
import pathlib
from typing import Tuple, Dict, Any

# Project root and paths
ROOT = pathlib.Path(__file__).resolve().parents[2]
RULES_PATH = ROOT / ".rules"
META_PATH = ROOT / ".rules.meta.json"
HEAD_MARK = "[RULES v1.0 — Gumgang 2.0 / KST 2025-08-09 12:33]"


def load_rules() -> str:
    """
    Load the .rules file content

    Returns:
        str: The full .rules content

    Raises:
        FileNotFoundError: If .rules file doesn't exist
    """
    if not RULES_PATH.exists():
        raise FileNotFoundError(f"❌ .rules file not found at {RULES_PATH}")

    return RULES_PATH.read_text(encoding="utf-8")


def load_meta() -> Dict[str, Any]:
    """
    Load the .rules.meta.json metadata

    Returns:
        dict: The metadata dictionary

    Raises:
        FileNotFoundError: If .rules.meta.json doesn't exist
    """
    if not META_PATH.exists():
        raise FileNotFoundError(f"❌ .rules.meta.json not found at {META_PATH}")

    return json.loads(META_PATH.read_text(encoding="utf-8"))


def assert_locked():
    """
    Assert that rules are locked (sealed)

    Raises:
        RuntimeError: If rules are not locked
    """
    meta = load_meta()
    if not meta.get("locked", True):
        raise RuntimeError("❌ .rules lock is OFF. Relock or declare provisional success.")


def rules_hash_raw() -> str:
    """
    Calculate SHA256 hash of rules content (first 12 chars)

    Returns:
        str: First 12 characters of SHA256 hash
    """
    rules_content = load_rules()
    hash_full = hashlib.sha256(rules_content.encode("utf-8")).hexdigest()
    return hash_full[:12]


def verify_rules_integrity() -> bool:
    """
    Verify that rules start with the correct header

    Returns:
        bool: True if rules are intact, False otherwise
    """
    try:
        rules_content = load_rules()
        return rules_content.startswith(HEAD_MARK)
    except Exception:
        return False


def prepend_full_rules(prompt: str) -> Tuple[str, str, str]:
    """
    Prepend full rules to a prompt, ensuring rules are sealed

    Args:
        prompt: The original prompt

    Returns:
        Tuple of (injected_prompt, rules_hash, head_mark)

    Raises:
        RuntimeError: If rules are not locked or header mismatch
    """
    # Check lock status
    assert_locked()

    # Load rules
    raw = load_rules()

    # Verify header
    if not raw.startswith(HEAD_MARK):
        raise RuntimeError("❌ .rules head mismatch. Refusing to proceed.")

    # Prepend rules to prompt
    injected = f"{raw.strip()}\n\n---\n\n{prompt.strip()}"

    return injected, rules_hash_raw(), HEAD_MARK


def extract_rules_from_prompt(prompt: str) -> Tuple[bool, str]:
    """
    Check if prompt already contains rules

    Args:
        prompt: The prompt to check

    Returns:
        Tuple of (has_rules, cleaned_prompt)
    """
    prompt_stripped = prompt.strip()

    if prompt_stripped.startswith(HEAD_MARK):
        # Rules already present, extract the actual prompt
        parts = prompt_stripped.split("\n---\n", 1)
        if len(parts) > 1:
            return True, parts[1].strip()
        return True, ""

    return False, prompt


def validate_rules_in_response(response_text: str) -> bool:
    """
    Validate that response acknowledges rules

    Args:
        response_text: The LLM response text

    Returns:
        bool: True if response seems compliant
    """
    # Basic check - can be enhanced
    lower_text = response_text.lower()

    # Check for rule violations
    violations = [
        "i'll ignore the rules",
        "disregarding the rules",
        "not following the rules",
        "override the rules"
    ]

    for violation in violations:
        if violation in lower_text:
            return False

    return True


def get_enforcement_status() -> Dict[str, Any]:
    """
    Get current enforcement status

    Returns:
        dict: Status information
    """
    try:
        meta = load_meta()
        rules_valid = verify_rules_integrity()
        hash_val = rules_hash_raw() if rules_valid else "INVALID"

        return {
            "locked": meta.get("locked", False),
            "rules_valid": rules_valid,
            "hash": hash_val,
            "head_mark": HEAD_MARK,
            "fixed_timestamp": meta.get("fixed_timestamp_kst"),
            "enforcement": meta.get("enforcement", {})
        }
    except Exception as e:
        return {
            "error": str(e),
            "locked": False,
            "rules_valid": False
        }


def update_meta_verification():
    """
    Update last verification timestamp in metadata
    """
    try:
        meta = load_meta()

        # Import time_kr for consistent timestamp
        import sys
        sys.path.append(str(ROOT / "backend"))
        from utils.time_kr import now_kr_str_minute

        meta["last_verified"] = now_kr_str_minute()

        META_PATH.write_text(
            json.dumps(meta, indent=2, ensure_ascii=False),
            encoding="utf-8"
        )
    except Exception as e:
        print(f"Warning: Could not update meta verification: {e}")


# Module-level constants for easy import
RULES_HASH = rules_hash_raw() if RULES_PATH.exists() else "PENDING"
RULES_LOCKED = load_meta().get("locked", False) if META_PATH.exists() else False


if __name__ == "__main__":
    # Self-test when run directly
    print("🔒 Rules Enforcer Status")
    print("=" * 40)

    status = get_enforcement_status()

    print(f"Locked: {status.get('locked', False)}")
    print(f"Valid: {status.get('rules_valid', False)}")
    print(f"Hash: {status.get('hash', 'N/A')}")
    print(f"Fixed Time: {status.get('fixed_timestamp', 'N/A')}")

    if status.get('rules_valid'):
        print("\n✅ Rules are properly sealed and ready for enforcement")
    else:
        print("\n❌ Rules validation failed - check .rules file")
