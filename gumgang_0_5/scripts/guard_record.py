#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
guard_record.py — CLI wrapper for Gumgang 2.0 guard recorder

Purpose
- Append audit lines to logs/guard_audit.log and upsert changesets in .session/session_manifest.json
- Generate KST timestamps via backend/utils/time_kr.now_kr_str_minute
- Provide convenient options for git hooks and manual usage

Examples
  # Basic
  python scripts/guard_record.py \
    --task G2-UI-STATUS-HUD \
    --op edit \
    --path gumgang-v2/components/layout/StatusHUD.tsx \
    --path gumgang-v2/app/layout.tsx \
    --notes "Add HUD (CPU/MEM/WS) with 10s polling" \
    --message "HUD: CPU/MEM/WS polling (10s)"

  # Read paths from stdin (one per line)
  git diff --name-only --cached | python scripts/guard_record.py \
    --task G2-UI-DASH-CLARIFY \
    --op edit \
    --stdin-paths \
    --notes "Dashboard wording clarified"

  # Auto extract task id from commit message file (for commit-msg hook)
  python scripts/guard_record.py \
    --op edit \
    --from-commit-msg .git/COMMIT_EDITMSG \
    --from-git-staged \
    --notes "Auto-record from commit"

Exit codes
  0: success
  1: invalid args / task id not resolvable
  2: no valid paths to record
  3: internal error
"""

from __future__ import annotations

import argparse
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Iterable, List, Optional, Tuple

# Resolve project root
HERE = Path(__file__).resolve()
ROOT = HERE.parents[1]  # gumgang_0_5/
BACKEND_DIR = ROOT / "backend"

# Ensure backend is importable
sys.path.insert(0, str(BACKEND_DIR))

# Import guard recorder and KST time util
try:
    from utils.guard_recorder import record, record_audit, record_manifest  # type: ignore
    from utils.time_kr import now_kr_str_minute  # type: ignore
except Exception as e:  # pragma: no cover
    print(f"[guard_record] ERROR: cannot import recorder/time util: {e}", file=sys.stderr)
    sys.exit(3)


def _read_stdin_paths() -> List[str]:
    if sys.stdin.isatty():
        return []
    text = sys.stdin.read()
    return [ln.strip() for ln in text.splitlines() if ln.strip()]


def _git_staged_paths() -> List[str]:
    try:
        out = subprocess.check_output(
            ["git", "diff", "--name-only", "--cached"],
            cwd=str(ROOT),
            stderr=subprocess.DEVNULL,
        )
        return [ln.strip() for ln in out.decode("utf-8", errors="ignore").splitlines() if ln.strip()]
    except Exception:
        return []


def _filter_existing(paths: Iterable[str]) -> List[str]:
    out: List[str] = []
    for p in paths:
        # Normalize to posix-style relative paths from ROOT
        pp = Path(p)
        if pp.is_absolute():
            try:
                rel = pp.relative_to(ROOT)
            except Exception:
                # Skip absolute outside root
                continue
            norm = str(rel.as_posix())
        else:
            norm = str(pp.as_posix())
        if (ROOT / norm).exists():
            out.append(norm)
    # Deduplicate while preserving order
    seen = set()
    uniq: List[str] = []
    for p in out:
        if p in seen:
            continue
        seen.add(p)
        uniq.append(p)
    return uniq


def _extract_task_from_commit_msg(path: Path) -> Optional[str]:
    if not path.exists():
        return None
    text = path.read_text(encoding="utf-8", errors="ignore")
    # 1) explicit "task: <ID>"
    m = re.search(r"(?im)^\s*task:\s*([A-Za-z0-9_.\-]+)\s*$", text)
    if m:
        return m.group(1).strip()

    # 2) conventional commit-like feat(G2-UI-STATUS-HUD): ...
    m = re.search(r"\(\s*([A-Z0-9][A-Z0-9_.\-]+)\s*\)", text)
    if m:
        return m.group(1).strip()

    # 3) fallback: something-like-ID in the subject
    m = re.search(r"\b([A-Z][A-Z0-9]+(?:[-_.][A-Z0-9]+)+)\b", text)
    if m:
        return m.group(1).strip()

    return None


def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Guard Recorder CLI — Append audit and update manifest (KST timestamps)."
    )
    p.add_argument("--task", help="Task ID (e.g., G2-UI-STATUS-HUD)")
    p.add_argument("--op", default="edit", help="Operation (edit/create/mkdir/mv/checkpoint)")
    p.add_argument("--path", dest="paths", action="append", default=[], help="Path (repeatable)")
    p.add_argument(
        "--stdin-paths",
        action="store_true",
        help="Read additional paths from stdin (newline-separated)",
    )
    p.add_argument(
        "--from-git-staged",
        action="store_true",
        help="Include git staged paths (git diff --name-only --cached)",
    )
    p.add_argument(
        "--from-commit-msg",
        help="Extract --task from a commit message file (e.g., .git/COMMIT_EDITMSG)",
    )
    p.add_argument("--notes", default="", help="Notes for manifest changeset")
    p.add_argument("--message", default=None, help="Message for audit (defaults to notes)")
    p.add_argument("--risk", default="SAFE", help="Risk level (SAFE/CAUTION/DANGEROUS)")
    p.add_argument("--actor", default="gpt-5", help="Actor for audit (default: gpt-5)")
    p.add_argument("--dry-run", action="store_true", help="Do not write files; print actions")
    return p.parse_args()


def main() -> int:
    args = _parse_args()

    # Resolve task id
    task_id = args.task
    if not task_id and args.from_commit_msg:
        task_id = _extract_task_from_commit_msg(Path(args.from_commit_msg))

    if not task_id:
        print("[guard_record] ERROR: Task ID is required (use --task or --from-commit-msg)", file=sys.stderr)
        return 1

    # Collect paths
    paths: List[str] = list(args.paths or [])
    if args.stdin_paths:
        paths.extend(_read_stdin_paths())
    if args.from_git_staged:
        paths.extend(_git_staged_paths())

    valid_paths = _filter_existing(paths)
    if not valid_paths:
        print("[guard_record] No valid paths to record (after filtering by project root).", file=sys.stderr)
        return 2

    ts = now_kr_str_minute()
    msg = args.message or args.notes or ""

    if args.dry_run:
        print(f"[DRY-RUN] {ts} KST — would record:")
        print(f"  task: {task_id}")
        print(f"  op:   {args.op}")
        print("  paths:")
        for p in valid_paths:
            print(f"    - {p}")
        print(f"  notes:   {args.notes}")
        print(f"  message: {msg}")
        print(f"  risk:    {args.risk}")
        print(f"  actor:   {args.actor}")
        return 0

    try:
        appended, modified = record(
            task_id=task_id,
            operation=args.op,
            paths=valid_paths,
            notes=args.notes,
            message=msg,
            risk=args.risk,
            actor=args.actor,
        )
        print(
            f"[guard_record] {ts} KST — task={task_id} appended={appended} manifest_modified={modified}"
        )
        return 0
    except Exception as e:  # pragma: no cover
        print(f"[guard_record] ERROR: {e}", file=sys.stderr)
        return 3


if __name__ == "__main__":
    sys.exit(main())
