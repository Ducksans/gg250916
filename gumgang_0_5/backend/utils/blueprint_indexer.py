#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gumgang 2.0 — Blueprint Indexer (v1)

Purpose
- Parse docs/blueprint_v1.2.md and produce a lightweight headings index
- Compute sha256 of the source file for integrity checks
- Stamp output with KST timestamp (YYYY-MM-DD HH:mm) via backend/utils/time_kr.now_kr_str_minute
- Optional write of JSON index and JSONL (append-only) with file locking

Index shape (JSON)
{
  "version": "blueprint_index.v1",
  "ts_kst": "YYYY-MM-DD HH:mm",
  "path": "docs/blueprint_v1.2.md",
  "sha256": "<hex>",
  "headings": [
    { "level": 1, "title": "Title", "line": 3, "anchor": "title" },
    { "level": 2, "title": "Section", "line": 10, "anchor": "section" },
    ...
  ]
}

CLI
  # Print index to stdout (pretty)
  python backend/utils/blueprint_indexer.py

  # Specify file and write JSON to logs path (atomic), also append JSONL
  python backend/utils/blueprint_indexer.py \
      --md docs/blueprint_v1.2.md \
      --write-json logs/blueprint_index.json \
      --append-jsonl logs/blueprint_index.jsonl

Notes
- No external dependencies
- File writes use flock + atomic replace for safety
"""

from __future__ import annotations

import argparse
import fcntl
import hashlib
import io
import json
import os
import re
import sys
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any, Dict, List, Optional

# Project roots/paths
HERE = Path(__file__).resolve()
ROOT = HERE.parents[2]  # gumgang_0_5/
DOCS_DIR = ROOT / "docs"
LOGS_DIR = ROOT / "logs"

# Import KST time util (MUST be used for all timestamps)
sys.path.insert(0, str((ROOT / "backend").resolve()))
try:
    from utils.time_kr import now_kr_str_minute  # type: ignore
except Exception:  # pragma: no cover
    from datetime import datetime, timezone, timedelta
    def now_kr_str_minute() -> str:
        return (datetime.now(timezone(timedelta(hours=9)))).strftime("%Y-%m-%d %H:%M")


HEADING_RE = re.compile(r"^(?P<prefix>#{1,6})\s+(?P<title>.+?)\s*$")


@dataclass
class Heading:
    level: int
    title: str
    line: int
    anchor: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


def compute_sha256(path: Path) -> str:
    """Compute sha256(hex) of file content."""
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def slugify_anchor(text: str, max_len: int = 120) -> str:
    """
    Create GitHub/Markdown-like anchor:
    - lowercase
    - spaces -> hyphens
    - remove characters that are not word, hyphen or Korean letters
    - collapse multiple hyphens
    """
    t = (text or "").strip().lower()
    t = re.sub(r"\s+", "-", t)
    # keep unicode word chars (\w), hyphen, and Korean unicode range
    t = re.sub(r"[^\w\-\u3131-\u318E\uAC00-\uD7A3]", "", t, flags=re.UNICODE)
    t = re.sub(r"-{2,}", "-", t).strip("-")
    if len(t) > max_len:
        t = t[:max_len].rstrip("-")
    return t or "section"


def parse_headings(md_text: str) -> List[Heading]:
    """
    Parse headings (# ... up to ######) with 1-based line numbers and anchors.
    """
    out: List[Heading] = []
    for i, raw in enumerate(md_text.splitlines(), start=1):
        m = HEADING_RE.match(raw)
        if not m:
            continue
        level = len(m.group("prefix"))
        title = m.group("title").strip()
        anchor = slugify_anchor(title)
        out.append(Heading(level=level, title=title, line=i, anchor=anchor))
    return out


def build_index(md_path: Path) -> Dict[str, Any]:
    """Build the blueprint index JSON object."""
    if not md_path.exists():
        raise FileNotFoundError(f"Blueprint file not found: {md_path}")

    text = md_path.read_text(encoding="utf-8", errors="ignore")
    headings = parse_headings(text)
    sha = compute_sha256(md_path)

    # Try to make relative path for readability
    try:
        rel = md_path.relative_to(ROOT).as_posix()
    except Exception:
        rel = str(md_path)

    index = {
        "version": "blueprint_index.v1",
        "ts_kst": now_kr_str_minute(),
        "path": rel,
        "sha256": sha,
        "headings": [h.to_dict() for h in headings],
    }
    return index


# ----------------------------
# Safe writing (flock + atomic)
# ----------------------------
def _ensure_dirs() -> None:
    LOGS_DIR.mkdir(parents=True, exist_ok=True)


def _flock_exclusive(fp) -> None:
    fcntl.flock(fp.fileno(), fcntl.LOCK_EX)


def _flock_release(fp) -> None:
    fcntl.flock(fp.fileno(), fcntl.LOCK_UN)


def atomic_write_json(path: Path, data: Dict[str, Any]) -> None:
    """Atomic write JSON with UTF-8 and newline at EOF."""
    _ensure_dirs()
    tmp = path.with_suffix(path.suffix + ".tmp")
    text = json.dumps(data, ensure_ascii=False, indent=2) + "\n"
    with tmp.open("w", encoding="utf-8") as f:
        f.write(text)
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp, path)


def append_jsonl(path: Path, data: Dict[str, Any]) -> None:
    """Append one JSONL line with file lock."""
    _ensure_dirs()
    line = json.dumps(data, ensure_ascii=False)
    with path.open("a", encoding="utf-8") as f:
        _flock_exclusive(f)
        f.write(line + "\n")
        f.flush()
        os.fsync(f.fileno())
        _flock_release(f)


# ----------------------------
# CLI
# ----------------------------
def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Gumgang 2.0 — Blueprint Indexer")
    p.add_argument(
        "--md",
        default=str((DOCS_DIR / "blueprint_v1.2.md").as_posix()),
        help="Markdown path (default: docs/blueprint_v1.2.md)",
    )
    p.add_argument(
        "--write-json",
        default=None,
        help="Write JSON index to this path (e.g., logs/blueprint_index.json)",
    )
    p.add_argument(
        "--append-jsonl",
        default=None,
        help="Append JSONL line to this path (e.g., logs/blueprint_index.jsonl)",
    )
    p.add_argument("--pretty", action="store_true", help="Pretty-print JSON to stdout")
    return p.parse_args()


def main() -> None:
    args = _parse_args()
    md_path = (ROOT / args.md).resolve() if not args.md.startswith("/") else Path(args.md).resolve()

    index = build_index(md_path)

    # Optional writes
    if args.write_json:
        out_json = (ROOT / args.write_json) if not args.write_json.startswith("/") else Path(args.write_json)
        atomic_write_json(out_json, index)

    if args.append_jsonl:
        out_jsonl = (ROOT / args.append_jsonl) if not args.append_jsonl.startswith("/") else Path(args.append_jsonl)
        append_jsonl(out_jsonl, index)

    # Stdout
    if args.pretty:
        print(json.dumps(index, ensure_ascii=False, indent=2))
    else:
        print(json.dumps(index, ensure_ascii=False))


if __name__ == "__main__":
    main()
