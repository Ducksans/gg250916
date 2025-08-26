#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ckpt_lint.py — Checkpoint JSONL integrity checker (BT-14 ST-1401/1402)

Validates:
- JSONL parse (one JSON object per line)
- Hash chain continuity:
    this_hash == SHA256(canonical(core) + "\n" + prev_hash)
  where core = {run_id, scope, decision, next_step, evidence} (NFC-normalized strings)
- Monotonicity: (utc_ts, seq) strictly increasing
- Evidence path policy: repo-relative under gumgang_meeting/** (optional hard fail)

Exit codes (per spec):
- 0 OK
- 2 CHAIN_BREAK
- 3 MONOTONIC_FAIL
- 4 IO_ERROR

Usage:
  python scripts/ckpt_lint.py \
    --path gumgang_meeting/status/checkpoints/CKPT_72H_RUN.jsonl \
    [--format json|md] [--fail-on-evidence] [--max-lines N] [--quiet]
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
import unicodedata


GENESIS = "0" * 64
CORE_KEYS = ("run_id", "scope", "decision", "next_step", "evidence")
HEX64 = set("0123456789abcdef")


def nfc(s: Any) -> Any:
    if isinstance(s, str):
        return unicodedata.normalize("NFC", s)
    return s


def canonical_core(core: Dict[str, Any]) -> str:
    # Normalize string values to NFC and produce minified JSON with sorted keys
    norm = {k: nfc(core.get(k)) for k in CORE_KEYS if k in core}
    return json.dumps(norm, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha256_hex(data: str) -> str:
    return hashlib.sha256(data.encode("utf-8")).hexdigest()


def parse_iso8601z(s: str) -> datetime:
    """
    Parse ISO8601 with trailing Z (UTC). Accepts fractional seconds.
    """
    if not isinstance(s, str) or not s:
        raise ValueError("empty ts")
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    # Python 3.11+ handles fromisoformat with offset
    dt = datetime.fromisoformat(s)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def is_hex64(s: str) -> bool:
    if not isinstance(s, str) or len(s) != 64:
        return False
    return all(c in HEX64 for c in s.lower())


@dataclass
class BreakInfo:
    index: int
    reason: str


@dataclass
class LintResult:
    ok: bool
    chain_ok: bool
    monotonic_ok: bool
    invalid_evidence: int
    last_hash: Optional[str]
    last_ts: Optional[str]
    last_seq: Optional[int]
    count: int
    chain_breaks: List[BreakInfo]
    monotonic_breaks: List[BreakInfo]
    evidence_breaks: List[BreakInfo]


def valid_evidence_path(p: Any) -> bool:
    if not isinstance(p, str) or not p or len(p) > 512:
        return False
    if os.path.isabs(p):
        return False
    return p.startswith("gumgang_meeting/")


def read_jsonl(path: str, max_lines: Optional[int] = None) -> Tuple[List[Dict[str, Any]], Optional[str]]:
    items: List[Dict[str, Any]] = []
    try:
        with open(path, "r", encoding="utf-8") as f:
            for i, raw in enumerate(f):
                if max_lines is not None and i >= max_lines:
                    break
                line = raw.rstrip("\n")
                if not line:
                    continue
                try:
                    obj = json.loads(line)
                except Exception as e:
                    return items, f"JSON_DECODE_FAIL at line {i}: {e}"
                items.append(obj)
    except FileNotFoundError:
        # Treat missing file as empty (not an error)
        return [], None
    except Exception as e:
        return items, f"IO_ERROR: {e}"
    return items, None


def lint(path: str, fail_on_evidence: bool = False, max_lines: Optional[int] = None) -> LintResult:
    items, err = read_jsonl(path, max_lines=max_lines)
    chain_breaks: List[BreakInfo] = []
    monotonic_breaks: List[BreakInfo] = []
    evidence_breaks: List[BreakInfo] = []

    if err:
        # IO or decode error → IO_ERROR classification later
        return LintResult(
            ok=False,
            chain_ok=False,
            monotonic_ok=False,
            invalid_evidence=0,
            last_hash=None,
            last_ts=None,
            last_seq=None,
            count=len(items),
            chain_breaks=[BreakInfo(index=len(items), reason=err)],
            monotonic_breaks=[],
            evidence_breaks=[],
        )

    prev_hash = GENESIS
    last_ts: Optional[str] = None
    last_seq: Optional[int] = None

    for idx, it in enumerate(items):
        # Evidence validation (warning by default)
        if not valid_evidence_path(it.get("evidence")):
            evidence_breaks.append(BreakInfo(idx, f"INVALID_EVIDENCE_PATH: {it.get('evidence')}"))

        # Check hashes
        this_hash: Optional[str] = it.get("this_hash")
        rec_prev: Optional[str] = it.get("prev_hash")
        if not (isinstance(this_hash, str) and is_hex64(this_hash)):
            chain_breaks.append(BreakInfo(idx, "THIS_HASH_INVALID"))
        if not (isinstance(rec_prev, str) and is_hex64(rec_prev)):
            chain_breaks.append(BreakInfo(idx, "PREV_HASH_INVALID"))

        # Genesis prev must be zeros on first record
        if idx == 0 and rec_prev != GENESIS:
            chain_breaks.append(BreakInfo(idx, "GENESIS_PREV_HASH_NOT_ZERO"))

        # Recompute expected this_hash from canonical core + prev_hash
        core = {k: it.get(k) for k in CORE_KEYS}
        canonical = canonical_core(core) + "\n" + (prev_hash if prev_hash is not None else GENESIS)
        expect = sha256_hex(canonical)
        if this_hash != expect:
            chain_breaks.append(BreakInfo(idx, "HASH_MISMATCH"))

        # prev linkage: recorded prev must equal prior this_hash
        if rec_prev != prev_hash:
            chain_breaks.append(BreakInfo(idx, "PREV_LINK_MISMATCH"))

        # Monotonicity (utc_ts, seq) strictly increasing
        ts = it.get("utc_ts")
        seq = it.get("seq")
        try:
            dt = parse_iso8601z(ts)
        except Exception:
            monotonic_breaks.append(BreakInfo(idx, "UTC_TS_PARSE_FAIL"))
            dt = None  # continue checks conservatively

        if last_ts is not None and dt is not None:
            try:
                last_dt = parse_iso8601z(last_ts)
                if dt < last_dt:
                    monotonic_breaks.append(BreakInfo(idx, "UTC_TS_REGRESSED"))
                elif dt == last_dt:
                    # seq must strictly increase
                    try:
                        last_seq_int = int(last_seq) if last_seq is not None else 0
                        seq_int = int(seq) if seq is not None else -1
                        if seq_int <= last_seq_int:
                            monotonic_breaks.append(BreakInfo(idx, "SEQ_NOT_INCREASING"))
                    except Exception:
                        monotonic_breaks.append(BreakInfo(idx, "SEQ_PARSE_FAIL"))
                # if dt > last_dt, seq can reset to 1 (no check)
            except Exception:
                monotonic_breaks.append(BreakInfo(idx, "LAST_TS_PARSE_FAIL"))

        # advance
        last_ts = ts
        last_seq = seq
        prev_hash = this_hash if this_hash is not None else prev_hash

    chain_ok = len(chain_breaks) == 0
    monotonic_ok = len(monotonic_breaks) == 0
    ok = chain_ok and monotonic_ok and (not fail_on_evidence or len(evidence_breaks) == 0)

    return LintResult(
        ok=ok,
        chain_ok=chain_ok,
        monotonic_ok=monotonic_ok,
        invalid_evidence=len(evidence_breaks),
        last_hash=(items[-1].get("this_hash") if items else None),
        last_ts=(items[-1].get("utc_ts") if items else None),
        last_seq=(items[-1].get("seq") if items else None),
        count=len(items),
        chain_breaks=chain_breaks,
        monotonic_breaks=monotonic_breaks,
        evidence_breaks=evidence_breaks,
    )


def to_json(result: LintResult) -> str:
    def b2d(b: List[BreakInfo]) -> List[Dict[str, Any]]:
        return [{"index": x.index, "reason": x.reason} for x in b]

    out = {
        "ok": result.ok,
        "chain_ok": result.chain_ok,
        "monotonic_ok": result.monotonic_ok,
        "invalid_evidence": result.invalid_evidence,
        "last_hash": result.last_hash,
        "last_ts": result.last_ts,
        "last_seq": result.last_seq,
        "count": result.count,
        "breaks": {
            "chain": b2d(result.chain_breaks),
            "monotonic": b2d(result.monotonic_breaks),
            "evidence": [{"index": x.index, "evidence": ""} for x in result.evidence_breaks],
        },
    }
    return json.dumps(out, ensure_ascii=False, indent=2)


def to_md(result: LintResult) -> str:
    lines: List[str] = []
    lines.append("# ckpt_lint — Report")
    lines.append("")
    lines.append(f"- ok: {result.ok}")
    lines.append(f"- chain_ok: {result.chain_ok}")
    lines.append(f"- monotonic_ok: {result.monotonic_ok}")
    lines.append(f"- invalid_evidence: {result.invalid_evidence}")
    lines.append(f"- last_hash: {result.last_hash}")
    lines.append(f"- last_ts: {result.last_ts}")
    lines.append(f"- last_seq: {result.last_seq}")
    lines.append(f"- count: {result.count}")
    if result.chain_breaks:
        lines.append("## Chain Breaks")
        for b in result.chain_breaks:
            lines.append(f"- line {b.index+1}: {b.reason}")
    if result.monotonic_breaks:
        lines.append("## Monotonicity Breaks")
        for b in result.monotonic_breaks:
            lines.append(f"- line {b.index+1}: {b.reason}")
    if result.evidence_breaks:
        lines.append("## Evidence Issues")
        for b in result.evidence_breaks:
            lines.append(f"- line {b.index+1}: INVALID_EVIDENCE_PATH")
    return "\n".join(lines) + "\n"


def main(argv: Optional[List[str]] = None) -> int:
    ap = argparse.ArgumentParser(description="Validate checkpoint JSONL hash chain and monotonicity")
    ap.add_argument(
        "--path",
        default="gumgang_meeting/status/checkpoints/CKPT_72H_RUN.jsonl",
        help="Path to JSONL file (default: gumgang_meeting/status/checkpoints/CKPT_72H_RUN.jsonl)",
    )
    ap.add_argument("--format", choices=["json", "md"], default="json", help="Output format")
    ap.add_argument("--fail-on-evidence", action="store_true", help="Fail if evidence path is invalid")
    ap.add_argument("--max-lines", type=int, default=None, help="Limit lines to read (for large files)")
    ap.add_argument("--quiet", action="store_true", help="Suppress stdout report (exit code only)")
    args = ap.parse_args(argv)

    result = lint(args.path, fail_on_evidence=args.fail_on_evidence, max_lines=args.max_lines)

    # Print report
    if not args.quiet:
        print(to_json(result) if args.format == "json" else to_md(result))

    # Exit code mapping
    if not result.count and os.path.exists(args.path):
        # Empty file is acceptable → OK
        return 0

    # Detect IO error signalized via chain_breaks with IO message
    io_err = any("IO_ERROR" in b.reason or "JSON_DECODE_FAIL" in b.reason for b in result.chain_breaks)
    if io_err:
        return 4
    if not result.chain_ok:
        return 2
    if not result.monotonic_ok:
        return 3
    if args.fail_on_evidence and result.invalid_evidence > 0:
        return 4  # classify as IO/policy error for CI gating
    return 0


if __name__ == "__main__":
    sys.exit(main())
