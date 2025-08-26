# -*- coding: utf-8 -*-
"""
Memory Status Adapter

Purpose
- Provide a single place to standardize memory status into:
  {
    "tiers": {
      "ultra_short": int,
      "short_term": int,
      "medium_term": int,
      "long_term": int,
      "meta": int
    },
    "ts_kst": "YYYY-MM-DD HH:mm"   # generated strictly by now_kr_str_minute()
  }

Design notes
- Do NOT guess. Only derive values from provided structures.
- Timestamp must use project utility (backend/utils/time_kr.now_kr_str_minute).
- Safe defaults: if a value is missing or invalid, coerce to 0.
"""

from typing import Any, Dict

# Import KST timestamp generator from project utility (minute precision only)
# This points to backend/utils/time_kr.py (module name "utils.time_kr" at runtime)
from utils.time_kr import now_kr_str_minute

TIERS_KEYS = ("ultra_short", "short_term", "medium_term", "long_term", "meta")

__all__ = [
    "build_tiers_response",
    "from_simple_memory",
    "from_temporal_stats",
]


def _to_nonnegative_int(value: Any) -> int:
    """
    Coerce value to non-negative int. Fallback to 0 if invalid.
    """
    try:
        iv = int(value)
        return iv if iv >= 0 else 0
    except Exception:
        return 0


def _ensure_tiers_shape(raw: Dict[str, Any]) -> Dict[str, int]:
    """
    Ensure the tiers dict has all required keys with non-negative ints.
    Missing keys become 0.
    """
    out: Dict[str, int] = {}
    for k in TIERS_KEYS:
        out[k] = _to_nonnegative_int(raw.get(k, 0))
    return out


def build_tiers_response(tiers: Dict[str, Any]) -> Dict[str, Any]:
    """
    Build standardized memory status response with KST timestamp.

    Returns:
        {
          "tiers": {
            "ultra_short": int,
            "short_term": int,
            "medium_term": int,
            "long_term": int,
            "meta": int
          },
          "ts_kst": "YYYY-MM-DD HH:mm"
        }
    """
    normalized = _ensure_tiers_shape(tiers or {})
    return {
        "tiers": normalized,
        "ts_kst": now_kr_str_minute(),
    }


def from_simple_memory(memory_system: Any) -> Dict[str, int]:
    """
    Adapt counts from the simple_main.py memory system instance.

    Expected attributes (as observed in backend/simple_main.py):
      - memory_system.ultra_short.buffer                -> list-like
      - memory_system.short_term.traces                 -> dict-like
      - memory_system.medium_term.traces                -> dict-like
      - memory_system.long_term.core_knowledge          -> dict-like
      - meta: currently not directly available; follow existing behavior (fixed 10)

    Returns:
        Dict[str, int] for the five standardized tiers.
    """
    def _safe_len(obj: Any) -> int:
        try:
            return _to_nonnegative_int(len(obj))  # len() may raise if not sized
        except Exception:
            return 0

    ultra_short = _safe_len(getattr(getattr(memory_system, "ultra_short", None), "buffer", []))
    short_term = _safe_len(getattr(getattr(memory_system, "short_term", None), "traces", {}))
    medium_term = _safe_len(getattr(getattr(memory_system, "medium_term", None), "traces", {}))
    long_term = _safe_len(getattr(getattr(memory_system, "long_term", None), "core_knowledge", {}))

    # Meta: maintain current behavior in simple_main.py (level5 fixed at 10)
    meta = 10

    return _ensure_tiers_shape(
        {
            "ultra_short": ultra_short,
            "short_term": short_term,
            "medium_term": medium_term,
            "long_term": long_term,
            "meta": meta,
        }
    )


def from_temporal_stats(stats: Dict[str, Any]) -> Dict[str, int]:
    """
    Adapt counts from temporal memory stats used in backend/main.py.

    Observed structure from backend/main.py:
      - get_memory_stats() returns a dict with key 'layers'
      - each layer entry looks like: { "current_size": int, "capacity": int, ... }

    Mapping strategy:
      - Prefer exact keys in layers: ultra_short, short_term, medium_term, long_term, meta
      - If exact keys are missing, attempt common prefixes:
          ultra_* -> ultra_short
          short_* -> short_term
          medium_* -> medium_term
          long_* -> long_term
          meta* -> meta
      - If still missing, default to 0.

    Args:
        stats: Dict with at least 'layers': Dict[str, Dict[str, Any]]

    Returns:
        Dict[str, int] for the five standardized tiers.
    """
    layers = {}
    try:
        layers = stats.get("layers", {}) if isinstance(stats, dict) else {}
    except Exception:
        layers = {}

    def _current_size(layer_name: str) -> int:
        layer_info = layers.get(layer_name, {})
        if isinstance(layer_info, dict):
            val = layer_info.get("current_size", 0)
            return _to_nonnegative_int(val)
        return 0

    # Direct mapping if exact names exist
    mapped = {
        "ultra_short": _current_size("ultra_short"),
        "short_term": _current_size("short_term"),
        "medium_term": _current_size("medium_term"),
        "long_term": _current_size("long_term"),
        "meta": _current_size("meta"),
    }

    # If any are still zero and we have other candidate keys, try prefix-based mapping
    if any(v == 0 for v in mapped.values()) and isinstance(layers, dict):
        lower_keys = list(layers.keys())

        def find_by_prefix(prefixes):
            for k in lower_keys:
                lk = str(k).lower()
                for p in prefixes:
                    if lk.startswith(p):
                        return _current_size(k)
            return 0

        if mapped["ultra_short"] == 0:
            mapped["ultra_short"] = find_by_prefix(("ultra", "working", "sensory"))
        if mapped["short_term"] == 0:
            mapped["short_term"] = find_by_prefix(("short",))
        if mapped["medium_term"] == 0:
            mapped["medium_term"] = find_by_prefix(("medium", "mid"))
        if mapped["long_term"] == 0:
            mapped["long_term"] = find_by_prefix(("long",))
        if mapped["meta"] == 0:
            mapped["meta"] = find_by_prefix(("meta", "metacog", "metacognitive"))

    return _ensure_tiers_shape(mapped)
