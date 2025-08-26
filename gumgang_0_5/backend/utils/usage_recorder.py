#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gumgang 2.0 — Usage Recorder (per-turn tokens)

Purpose
- Persist per-turn token usage into logs/usage.jsonl (append-only, one JSON object per line)
- KST timestamps (YYYY-MM-DD HH:mm) via backend/utils/time_kr.now_kr_str_minute
- File locking (flock) to avoid concurrent write corruption
- Lightweight helpers for session summary and tail queries
- Optional approximations for tokens when provider does not return usage

Data shape (JSONL)
{
  "ts_kst": "YYYY-MM-DD HH:mm",
  "session_id": "string",
  "turn_id": "string",            # arbitrary id for the turn (can be uuid)
  "model": "gpt-5",
  "prompt_tokens": 123,
  "completion_tokens": 456,
  "total_tokens": 579,
  "meta": { "source": "openai", "route": "/ask" }
}

CLI (convenience)
- Record a usage line:
  python backend/utils/usage_recorder.py record \
      --session SID --turn TID --model gpt-5 \
      --prompt 100 --completion 120 --meta '{"route":"/ask"}'

- Summarize a session:
  python backend/utils/usage_recorder.py summary --session SID

- Tail recent lines:
  python backend/utils/usage_recorder.py tail --lines 20
"""

from __future__ import annotations

import argparse
import fcntl
import io
import json
import os
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any, Dict, Iterable, Iterator, List, Optional, Tuple, Union

# Project root and paths
HERE = Path(__file__).resolve()
ROOT = HERE.parents[2]  # gumgang_0_5/
LOGS_DIR = ROOT / "logs"
USAGE_LOG = LOGS_DIR / "usage.jsonl"

# Import KST time util (MUST be used for timestamps)
import sys

sys.path.insert(0, str((ROOT / "backend").resolve()))
try:
    from utils.time_kr import now_kr_str_minute  # type: ignore
except Exception:  # pragma: no cover
    # Fallback to prevent crash if import path differs in certain tools
    from datetime import datetime, timezone, timedelta

    def now_kr_str_minute() -> str:
        return (datetime.now(timezone(timedelta(hours=9)))).strftime("%Y-%m-%d %H:%M")


@dataclass
class UsageRecord:
    ts_kst: str
    session_id: str
    turn_id: str
    model: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    meta: Dict[str, Any]

    def to_jsonl(self) -> str:
        return json.dumps(asdict(self), ensure_ascii=False)


# ----------------------------
# Filesystem helpers
# ----------------------------

def _ensure_dirs() -> None:
    LOGS_DIR.mkdir(parents=True, exist_ok=True)


def _flock_exclusive(fp) -> None:
    fcntl.flock(fp.fileno(), fcntl.LOCK_EX)


def _flock_shared(fp) -> None:
    fcntl.flock(fp.fileno(), fcntl.LOCK_SH)


def _flock_release(fp) -> None:
    fcntl.flock(fp.fileno(), fcntl.LOCK_UN)


# ----------------------------
# Core API
# ----------------------------

def record_usage(
    *,
    session_id: str,
    turn_id: str,
    model: str,
    prompt_tokens: Optional[int] = None,
    completion_tokens: Optional[int] = None,
    total_tokens: Optional[int] = None,
    meta: Optional[Dict[str, Any]] = None,
) -> UsageRecord:
    """
    Append a usage record to usage.jsonl (append-only).

    Returns the UsageRecord object. Raises on I/O errors.
    """
    _ensure_dirs()

    p = int(prompt_tokens or 0)
    c = int(completion_tokens or 0)
    t = int(total_tokens if total_tokens is not None else (p + c))

    rec = UsageRecord(
        ts_kst=now_kr_str_minute(),
        session_id=str(session_id),
        turn_id=str(turn_id),
        model=str(model),
        prompt_tokens=max(0, p),
        completion_tokens=max(0, c),
        total_tokens=max(0, t),
        meta=meta or {},
    )

    line = rec.to_jsonl() + "\n"
    with open(USAGE_LOG, "a", encoding="utf-8") as f:
        _flock_exclusive(f)
        f.write(line)
        f.flush()
        os.fsync(f.fileno())
        _flock_release(f)

    return rec


def record_from_openai_usage(
    *,
    session_id: str,
    turn_id: str,
    model: str,
    usage: Any,
    meta: Optional[Dict[str, Any]] = None,
) -> UsageRecord:
    """
    Convenience wrapper to record from OpenAI-like usage object/dict:
      usage.prompt_tokens, usage.completion_tokens, usage.total_tokens
    """
    # Support both dict and object with attributes
    def _get(u, k, default=0):
        if isinstance(u, dict):
            return int(u.get(k, default) or 0)
        return int(getattr(u, k, default) or 0)

    p = _get(usage, "prompt_tokens", 0)
    c = _get(usage, "completion_tokens", 0)
    t = _get(usage, "total_tokens", p + c)

    return record_usage(
        session_id=session_id,
        turn_id=turn_id,
        model=model,
        prompt_tokens=p,
        completion_tokens=c,
        total_tokens=t,
        meta=meta or {"source": "openai"},
    )


def approximate_tokens_from_text(*texts: str, average_chars_per_token: float = 4.0) -> int:
    """
    Very rough tokens approximation when provider does not return usage.
    Default heuristic: 1 token ~= 4 chars.

    Returns an integer >= 0.
    """
    total_chars = sum(len(t) for t in texts if isinstance(t, str))
    if average_chars_per_token <= 0:
        average_chars_per_token = 4.0
    return max(0, int(round(total_chars / average_chars_per_token)))


# ----------------------------
# Query helpers
# ----------------------------

def tail_usage(lines: int = 50) -> List[Dict[str, Any]]:
    """
    Return the last N usage records (parsed JSON objects).
    """
    if not USAGE_LOG.exists():
        return []
    lines = max(1, min(1000, int(lines)))
    # Efficient tail read
    with open(USAGE_LOG, "rb") as f:
        _flock_shared(f)
        try:
            f.seek(0, os.SEEK_END)
            size = f.tell()
            block = 4096
            data = b""
            while len(data.splitlines()) <= lines and size > 0:
                read_size = min(block, size)
                size -= read_size
                f.seek(size)
                data = f.read(read_size) + data
        finally:
            _flock_release(f)

    text = data.decode("utf-8", errors="ignore")
    out: List[Dict[str, Any]] = []
    for ln in text.splitlines()[-lines:]:
        ln = ln.strip()
        if not ln:
            continue
        try:
            out.append(json.loads(ln))
        except Exception:
            # Skip malformed lines
            continue
    return out


def summarize_session(session_id: str) -> Dict[str, Any]:
    """
    Compute session-level totals from usage.jsonl.
    """
    totals = {
        "session_id": session_id,
        "turns": 0,
        "prompt_tokens": 0,
        "completion_tokens": 0,
        "total_tokens": 0,
        "first_ts_kst": None,
        "last_ts_kst": None,
    }

    if not USAGE_LOG.exists():
        return totals

    with open(USAGE_LOG, "r", encoding="utf-8", errors="ignore") as f:
        _flock_shared(f)
        try:
            for ln in f:
                ln = ln.strip()
                if not ln:
                    continue
                try:
                    obj = json.loads(ln)
                except Exception:
                    continue
                if obj.get("session_id") != session_id:
                    continue
                totals["turns"] += 1
                totals["prompt_tokens"] += int(obj.get("prompt_tokens", 0) or 0)
                totals["completion_tokens"] += int(obj.get("completion_tokens", 0) or 0)
                totals["total_tokens"] += int(obj.get("total_tokens", 0) or 0)
                ts = obj.get("ts_kst")
                if ts and totals["first_ts_kst"] is None:
                    totals["first_ts_kst"] = ts
                totals["last_ts_kst"] = ts or totals["last_ts_kst"]
        finally:
            _flock_release(f)

    return totals


# ----------------------------
# CLI
# ----------------------------

def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Gumgang 2.0 — Usage Recorder")
    sub = p.add_subparsers(dest="cmd", required=True)

    p_rec = sub.add_parser("record", help="Append a usage line")
    p_rec.add_argument("--session", required=True, help="Session ID")
    p_rec.add_argument("--turn", required=True, help="Turn ID")
    p_rec.add_argument("--model", required=True, help="Model name (e.g., gpt-5)")
    p_rec.add_argument("--prompt", type=int, default=0, help="Prompt tokens")
    p_rec.add_argument("--completion", type=int, default=0, help="Completion tokens")
    p_rec.add_argument("--total", type=int, default=None, help="Total tokens")
    p_rec.add_argument("--meta", type=str, default=None, help='JSON string for meta (e.g., {"route":"/ask"})')

    p_sum = sub.add_parser("summary", help="Summarize a session")
    p_sum.add_argument("--session", required=True, help="Session ID")

    p_tail = sub.add_parser("tail", help="Tail recent usage lines")
    p_tail.add_argument("--lines", type=int, default=20, help="Number of lines (1-1000)")

    p_est = sub.add_parser("estimate", help="Approximate tokens for given texts")
    p_est.add_argument("--avg", type=float, default=4.0, help="Average chars per token")
    p_est.add_argument("texts", nargs="*", help="Texts to estimate")

    return p.parse_args()


def _main() -> None:
    args = _parse_args()
    if args.cmd == "record":
        meta: Dict[str, Any] = {}
        if args.meta:
            try:
                meta = json.loads(args.meta)
                if not isinstance(meta, dict):
                    meta = {"_": meta}
            except Exception:
                meta = {"unparsed_meta": args.meta}
        rec = record_usage(
            session_id=args.session,
            turn_id=args.turn,
            model=args.model,
            prompt_tokens=args.prompt,
            completion_tokens=args.completion,
            total_tokens=args.total,
            meta=meta,
        )
        print(json.dumps(asdict(rec), ensure_ascii=False, indent=2))
    elif args.cmd == "summary":
        print(json.dumps(summarize_session(args.session), ensure_ascii=False, indent=2))
    elif args.cmd == "tail":
        for obj in tail_usage(args.lines):
            print(json.dumps(obj, ensure_ascii=False))
    elif args.cmd == "estimate":
        tokens = approximate_tokens_from_text(*args.texts, average_chars_per_token=args.avg)
        print(json.dumps({"approx_tokens": tokens, "avg_chars_per_token": args.avg}, ensure_ascii=False, indent=2))
    else:  # pragma: no cover
        raise SystemExit(2)


if __name__ == "__main__":
    _main()
