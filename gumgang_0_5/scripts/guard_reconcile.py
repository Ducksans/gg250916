#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gumgang 2.0 — Guard Reconcile (Phase 3)
Detect missing/invalid audit records and '미확인' timestamps. Provide strict exit codes
for pre-push/CI enforcement and generate a concise report.

- Read-only by default. Does NOT modify logs/guard_audit.log (append-only policy respected).
- Optionally emits a suggestions file to assist manual fixes.

Checks:
1) guard_audit.log
   - Invalid TSV rows (column count < 12)
   - Timestamp issues: '미확인' or invalid format (must be 'YYYY-MM-DD HH:mm', Asia/Seoul minute resolution)
   - Duplicate keys: (task_id, operation, path)
   - Missing path on disk (best-effort, may be false positive for deleted files)
2) .session/session_manifest.json
   - changesets[].ts_kst '미확인' or invalid format
   - For each (task_id, paths[]), ensure at least one audit line exists for each path
   - Audit entries whose task_id is absent in changesets (FYI)
3) Optional git lookback (best-effort; requires 'git')
   - List files changed in the last --minutes window (staged+recent log) and check if they appear in audit entries

Usage:
  python scripts/guard_reconcile.py
  python scripts/guard_reconcile.py --minutes 60 --strict
  python scripts/guard_reconcile.py --minutes 120 --strict --git-scan
  python scripts/guard_reconcile.py --fix-missing-ts   # emits suggestions file (does not edit audit)

Exit codes:
  0: OK (no issues or non-strict mode)
  1: Issues found AND --strict enabled
  2: Soft warnings only (non-strict)

Report:
- Prints a human-readable summary to stdout
- Writes a detailed report to logs/guard_reconcile_report_YYYY-MM-DD_HH-mm.md
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple

# Project paths
HERE = Path(__file__).resolve()
ROOT = HERE.parents[1]
LOGS_DIR = ROOT / "logs"
SESSION_DIR = ROOT / ".session"
AUDIT_LOG = LOGS_DIR / "guard_audit.log"
MANIFEST = SESSION_DIR / "session_manifest.json"

# Import KST time util (MUST be used for timestamps)
sys.path.insert(0, str((ROOT / "backend").resolve()))
try:
    from utils.time_kr import now_kr_str_minute  # type: ignore
except Exception as e:  # pragma: no cover
    print(f"[reconcile] WARN: cannot import time util: {e}", file=sys.stderr)
    def now_kr_str_minute() -> str:  # fallback (not timezone-accurate)
        from datetime import datetime
        return datetime.now().strftime("%Y-%m-%d %H:%M")

TS_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$")


@dataclass
class AuditEntry:
    ts_kst: str
    task_id: str
    actor: str
    phase: str
    operation: str
    risk: str
    path: str
    status: str
    message: str
    rules_version: str
    session_id: str
    blueprint_sha: str
    raw: str

    @property
    def key(self) -> Tuple[str, str, str]:
        return (self.task_id, self.operation, self.path)


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return ""


def parse_audit_log(path: Path) -> Tuple[List[AuditEntry], List[Tuple[int, str]]]:
    """
    Returns (entries, invalid_rows) where invalid_rows are (line_no, line_str)
    """
    entries: List[AuditEntry] = []
    invalid: List[Tuple[int, str]] = []

    text = read_text(path)
    if not text:
        return entries, invalid

    lines = text.splitlines()
    # Skip header until schema line appears (starting with 'ts_kst\ttask_id\t...')
    schema_seen = False
    for i, line in enumerate(lines, 1):
        if not schema_seen:
            if line.startswith("ts_kst\t"):
                schema_seen = True
            continue
        if not line.strip() or line.startswith("#"):
            continue
        parts = line.split("\t")
        if len(parts) < 12:
            invalid.append((i, line))
            continue
        try:
            entries.append(
                AuditEntry(
                    ts_kst=parts[0].strip(),
                    task_id=parts[1].strip(),
                    actor=parts[2].strip(),
                    phase=parts[3].strip(),
                    operation=parts[4].strip(),
                    risk=parts[5].strip(),
                    path=parts[6].strip(),
                    status=parts[7].strip(),
                    message=parts[8].strip(),
                    rules_version=parts[9].strip(),
                    session_id=parts[10].strip(),
                    blueprint_sha=parts[11].strip(),
                    raw=line,
                )
            )
        except Exception:
            invalid.append((i, line))

    return entries, invalid


def load_manifest(path: Path) -> Dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def is_valid_ts(ts: str) -> bool:
    return bool(TS_PATTERN.match(ts))


def list_changed_files(minutes: int) -> List[str]:
    """
    Best-effort list of files changed recently (staged + recent commits).
    Requires git; returns [] on failure.
    """
    changed: List[str] = []
    try:
        # staged
        out = subprocess.check_output(
            ["git", "diff", "--name-only", "--cached"],
            cwd=str(ROOT),
            stderr=subprocess.DEVNULL,
        )
        changed.extend([ln.strip() for ln in out.decode("utf-8", errors="ignore").splitlines() if ln.strip()])
    except Exception:
        pass

    try:
        out = subprocess.check_output(
            ["git", "log", f"--since={minutes} minutes ago", "--name-only", "--pretty=format:"],
            cwd=str(ROOT),
            stderr=subprocess.DEVNULL,
        )
        changed.extend([ln.strip() for ln in out.decode("utf-8", errors="ignore").splitlines() if ln.strip()])
    except Exception:
        pass

    # Normalize & dedup, keep only files under ROOT
    seen = set()
    result: List[str] = []
    for p in changed:
        p = p.replace("\\", "/")
        if p and p not in seen and (ROOT / p).exists():
            seen.add(p)
            result.append(p)
    return result


def generate_report(
    entries: List[AuditEntry],
    invalid_rows: List[Tuple[int, str]],
    manifest: Dict[str, Any],
    minutes: int,
    do_git_scan: bool,
    strict: bool,
    issues: Dict[str, List[str]],
) -> str:
    ts = now_kr_str_minute()
    lines: List[str] = []
    lines.append(f"# Guard Reconcile Report — {ts} (KST)")
    lines.append("")
    lines.append("## Summary")
    lines.append(f"- audit_entries: {len(entries)}")
    lines.append(f"- invalid_rows: {len(invalid_rows)}")
    for k in ["invalid_ts", "missing_ts_mihwak_in", "duplicates", "missing_path", "manifest_ts_invalid",
              "manifest_missing_in_audit", "audit_missing_in_manifest", "git_changed_unrecorded"]:
        cnt = len(issues.get(k, []))
        lines.append(f"- {k}: {cnt}")
    lines.append(f"- strict: {strict}")
    lines.append("")

    def section(title: str, key: str, limit: int = 50):
        arr = issues.get(key, [])
        if not arr:
            return
        lines.append(f"## {title} ({len(arr)})")
        for s in arr[:limit]:
            lines.append(f"- {s}")
        if len(arr) > limit:
            lines.append(f"... ({len(arr) - limit} more)")
        lines.append("")

    if invalid_rows:
        lines.append(f"## Invalid TSV Rows in guard_audit.log ({len(invalid_rows)})")
        for (ln_no, ln) in invalid_rows[:50]:
            lines.append(f"- line {ln_no}: {ln}")
        if len(invalid_rows) > 50:
            lines.append(f"... ({len(invalid_rows) - 50} more)")
        lines.append("")

    section("Invalid timestamps (audit)", "invalid_ts")
    section("'미확인' timestamps (audit)", "missing_ts_mihwak_in")
    section("Duplicate (task_id, operation, path) keys", "duplicates")
    section("Missing path on disk (best-effort)", "missing_path")
    section("Invalid timestamps (manifest changesets)", "manifest_ts_invalid")
    section("Manifest paths missing in audit", "manifest_missing_in_audit")
    section("Audit task_ids missing in manifest", "audit_missing_in_manifest")
    if do_git_scan:
        section("Recently changed (git) but not recorded", "git_changed_unrecorded")

    return "\n".join(lines) + "\n"


def main() -> int:
    ap = argparse.ArgumentParser(description="Gumgang 2.0 — Guard Reconcile")
    ap.add_argument("--minutes", type=int, default=60, help="Lookback window for git scan (when enabled)")
    ap.add_argument("--git-scan", action="store_true", help="Enable best-effort git-based changed files scan")
    ap.add_argument("--strict", action="store_true", help="Exit non-zero when issues found")
    ap.add_argument("--fix-missing-ts", action="store_true",
                    help="Emit suggestions file for '미확인' timestamps (does not modify audit log)")
    args = ap.parse_args()

    # Load data
    entries, invalid_rows = parse_audit_log(AUDIT_LOG)
    manifest = load_manifest(MANIFEST)

    issues: Dict[str, List[str]] = defaultdict(list)

    # 1) Audit checks
    for e in entries:
        if e.ts_kst == "미확인":
            issues["missing_ts_mihwak_in"].append(e.raw)
        elif not is_valid_ts(e.ts_kst):
            issues["invalid_ts"].append(e.raw)

        # Missing path
        p = (ROOT / e.path)
        if not p.exists():
            issues["missing_path"].append(f"{e.path} (task={e.task_id})")

    # Duplicates
    ctr = Counter([e.key for e in entries])
    for key, cnt in ctr.items():
        if cnt > 1:
            task_id, op, path = key
            issues["duplicates"].append(f"{task_id} / {op} / {path} — {cnt} times")

    # 2) Manifest cross-check
    changesets = manifest.get("changesets") or []
    # ts_kst invalid
    for cs in changesets:
        ts = str(cs.get("ts_kst", "")).strip()
        if ts and ts != "미확인" and not is_valid_ts(ts):
            issues["manifest_ts_invalid"].append(f"{cs.get('task_id')} ts_kst={ts}")
        if ts == "미확인":
            issues["manifest_ts_invalid"].append(f"{cs.get('task_id')} ts_kst=미확인")

    # For each (task_id, path) in manifest, ensure at least one audit entry exists
    audit_by_task_path = set((e.task_id, e.path) for e in entries)
    for cs in changesets:
        task_id = str(cs.get("task_id", "")).strip()
        for p in (cs.get("paths") or []):
            if (task_id, p) not in audit_by_task_path:
                issues["manifest_missing_in_audit"].append(f"{task_id} / {p}")

    # Audit entries task_ids not present in manifest
    manifest_tasks = set(str(cs.get("task_id", "")).strip() for cs in changesets if cs.get("task_id"))
    for e in entries:
        if e.task_id and e.task_id not in manifest_tasks:
            issues["audit_missing_in_manifest"].append(f"{e.task_id} / {e.path}")

    # 3) Optional git scan
    if args.git_scan:
        changed = list_changed_files(args.minutes)
        # Each changed file should appear at least once in audit paths (best-effort heuristic)
        audit_paths = set(e.path for e in entries)
        for p in changed:
            if p not in audit_paths:
                issues["git_changed_unrecorded"].append(p)

    # 4) Suggestions for '미확인' timestamps
    suggestions_path: Optional[Path] = None
    if args.fix_missing_ts and issues["missing_ts_mihwak_in"]:
        suggestions_path = LOGS_DIR / f"guard_audit_fix_suggestions_{now_kr_str_minute().replace(' ', '_').replace(':','-')}.tsv"
        try:
            LOGS_DIR.mkdir(parents=True, exist_ok=True)
            with suggestions_path.open("w", encoding="utf-8") as f:
                f.write("# This file lists audit lines with '미확인' timestamps.\n")
                f.write("# Policy: guard_audit.log is append-only. Do NOT modify it in place.\n")
                f.write("# If you need to correct timestamps, consider appending a corrected mirror entry with the same data but fixed ts_kst.\n")
                f.write("# Columns: suggested_ts_kst\toriginal_line\n")
                for raw in issues["missing_ts_mihwak_in"]:
                    f.write(f"{now_kr_str_minute()}\t{raw}\n")
        except Exception as e:
            print(f"[reconcile] WARN: could not write suggestions: {e}", file=sys.stderr)

    # 5) Report to stdout and file
    report = generate_report(
        entries=entries,
        invalid_rows=invalid_rows,
        manifest=manifest,
        minutes=args.minutes,
        do_git_scan=bool(args.git_scan),
        strict=bool(args.strict),
        issues=issues,
    )
    print(report)

    report_path = LOGS_DIR / f"guard_reconcile_report_{now_kr_str_minute().replace(' ', '_').replace(':','-')}.md"
    try:
        LOGS_DIR.mkdir(parents=True, exist_ok=True)
        report_path.write_text(report, encoding="utf-8")
        print(f"[reconcile] Detailed report written to: {report_path}")
        if suggestions_path:
            print(f"[reconcile] Suggestions written to: {suggestions_path}")
    except Exception as e:
        print(f"[reconcile] WARN: could not write report: {e}", file=sys.stderr)

    # 6) Exit code logic
    total_issues = sum(len(v) for v in issues.values()) + len(invalid_rows)
    if args.strict and total_issues > 0:
        return 1
    if total_issues > 0:
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
