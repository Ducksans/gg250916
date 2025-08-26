#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gumgang 2.0 — Ideas Recorder (Quick MVP)

Purpose
- Persist lightweight ideas as Markdown files under docs/ideas/
- Append an index line to logs/ideas.jsonl (JSONL, append-only)
- Use KST timestamps (YYYY-MM-DD HH:mm) via backend/utils/time_kr.now_kr_str_minute
- Extract [[WikiLink]]s and store in frontmatter + index
- Provide a small CLI:
    - capture  : create a new idea markdown + append JSONL index
    - tail     : show recent lines of ideas.jsonl
    - list     : list recent idea files with metadata parsed from frontmatter

File layout
- docs/ideas/YYYYMMDD-HHmm-<slug>.md
  ---
  title: "<title>"
  ts_kst: "YYYY-MM-DD HH:mm"
  id: "YYYYMMDD-HHmm-<slug>"
  tags: [tag1, tag2]
  links: ["Target A", "Target B"]
  ---
  <body>

- logs/ideas.jsonl (append-only):
  {"ts_kst":"...", "id":"...", "path":"docs/ideas/...md", "title":"...", "tags":["..."], "links":["..."]}

Notes
- Append-only guarantees: never mutate existing JSONL lines.
- File locking (flock) for logs/ideas.jsonl appends.
- Minimal YAML frontmatter (no external deps) — written by us, parsed by simple parser in this module.
"""

from __future__ import annotations

import argparse
import fcntl
import io
import json
import os
import re
import sys
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

# Project roots/paths
HERE = Path(__file__).resolve()
ROOT = HERE.parents[2]  # gumgang_0_5/
DOCS_DIR = ROOT / "docs"
IDEAS_DIR = DOCS_DIR / "ideas"
LOGS_DIR = ROOT / "logs"
IDEAS_LOG = LOGS_DIR / "ideas.jsonl"

# Import KST util (MUST be used for all timestamps)
sys.path.insert(0, str((ROOT / "backend").resolve()))
try:
    from utils.time_kr import now_kr_str_minute  # type: ignore
except Exception:  # pragma: no cover
    from datetime import datetime, timezone, timedelta

    def now_kr_str_minute() -> str:
        return (datetime.now(timezone(timedelta(hours=9)))).strftime("%Y-%m-%d %H:%M")


WIKILINK_RE = re.compile(r"\[\[([^\]]+)\]\]")
BP_LINK_RE = re.compile(r"\[\[BP:([^\]]+)\]\]")

def _load_blueprint_index() -> Dict[str, Any]:
    """
    Build/load blueprint index from docs/blueprint_v1.2.md and return headings map.
    Returns:
      {
        "sha256": "...",
        "headings": [{"level":..,"title":..,"line":..,"anchor":..}, ...],
        "_title_to_anchor": {"Section Title": "section-title", ...},
        "_anchors": {"section-title", ...}
      }
    """
    try:
        from utils.blueprint_indexer import build_index  # local import
    except Exception:
        return {"headings": [], "_title_to_anchor": {}, "_anchors": set(), "sha256": ""}

    md_path = (ROOT / "docs" / "blueprint_v1.2.md")
    try:
        index = build_index(md_path)
        t2a: Dict[str, str] = {}
        anchors: set[str] = set()
        for h in index.get("headings", []):
            title = str(h.get("title", "")).strip()
            anchor = str(h.get("anchor", "")).strip()
            if title and anchor:
                t2a[title] = anchor
                anchors.add(anchor)
        index["_title_to_anchor"] = t2a
        index["_anchors"] = anchors
        return index
    except Exception:
        return {"headings": [], "_title_to_anchor": {}, "_anchors": set(), "sha256": ""}

def extract_blueprint_refs(body: str) -> List[str]:
    """Extract raw [[BP:Section Title]] refs from body (order-preserving, dedup)."""
    if not body:
        return []
    seen = set()
    out: List[str] = []
    for m in BP_LINK_RE.finditer(body):
        val = m.group(1).strip()
        if val and val not in seen:
            seen.add(val)
            out.append(val)
    return out

def resolve_blueprint_refs(raw_refs: List[str]) -> List[str]:
    """
    Validate raw [[BP:...]] refs against blueprint index titles.
    Returns list of anchors that exist in the blueprint index.
    """
    if not raw_refs:
        return []
    idx = _load_blueprint_index()
    t2a: Dict[str, str] = idx.get("_title_to_anchor", {})
    anchors: List[str] = []
    for ref in raw_refs:
        if ref in t2a:
            anchors.append(t2a[ref])
        # else: unknown section title → skip (strict validation)
    # dedup preserve
    dedup_seen = set()
    result: List[str] = []
    for a in anchors:
        if a not in dedup_seen:
            dedup_seen.add(a)
            result.append(a)
    return result

# -----------------------------
# Dataclasses
# -----------------------------

@dataclass
class IdeaIndexRecord:
    ts_kst: str
    id: str
    path: str
    title: str
    tags: List[str]
    links: List[str]
    blueprint_refs: List[str]
    session_id: Optional[str] = None
    actor: Optional[str] = None
    meta: Optional[Dict[str, Any]] = None

    def to_jsonl(self) -> str:
        return json.dumps(asdict(self), ensure_ascii=False)


@dataclass
class IdeaCaptureResult:
    ts_kst: str
    id: str
    path: str
    title: str
    tags: List[str]
    links: List[str]
    blueprint_refs: List[str]
    written: bool
    indexed: bool


# -----------------------------
# Filesystem helpers
# -----------------------------

def _ensure_dirs() -> None:
    IDEAS_DIR.mkdir(parents=True, exist_ok=True)
    LOGS_DIR.mkdir(parents=True, exist_ok=True)


def _flock_exclusive(fp) -> None:
    fcntl.flock(fp.fileno(), fcntl.LOCK_EX)


def _flock_release(fp) -> None:
    fcntl.flock(fp.fileno(), fcntl.LOCK_UN)


# -----------------------------
# Core
# -----------------------------

def slugify(text: str, max_len: int = 64) -> str:
    """
    Create a filesystem and URL friendly slug (very permissive, unicode letters kept).
    """
    t = text.strip()
    t = re.sub(r"\s+", "-", t)
    t = re.sub(r"[^\w\-\u3131-\u318E\uAC00-\uD7A3]", "", t, flags=re.UNICODE)  # keep korean chars
    t = re.sub(r"-{2,}", "-", t)
    t = t.strip("-_")
    if len(t) > max_len:
        t = t[:max_len].rstrip("-_")
    return t or "idea"


def extract_wikilinks(body: str) -> List[str]:
    """
    Return a list of page titles referenced by [[WikiLink]] in body text (dedup, order-preserving).
    """
    if not body:
        return []
    seen = set()
    out: List[str] = []
    for m in WIKILINK_RE.finditer(body):
        val = m.group(1).strip()
        if val and val not in seen:
            seen.add(val)
            out.append(val)
    return out


def build_idea_filename(ts_kst: str, title: str) -> Tuple[str, str]:
    """
    Build ID and filename from KST timestamp and title slug.
    ID/filename prefix: YYYYMMDD-HHmm
    """
    # ts_kst format: "YYYY-MM-DD HH:mm"
    date_part = ts_kst.replace("-", "").replace(":", "").replace(" ", "-")[:13]  # YYYYMMDD-HHmm
    slug = slugify(title)
    idea_id = f"{date_part}-{slug}"
    fname = f"{idea_id}.md"
    return idea_id, fname


def write_markdown(path: Path, title: str, ts_kst: str, idea_id: str, tags: List[str], links: List[str], blueprint_refs: List[str], body: str) -> None:
    """
    Write Markdown file with YAML-like frontmatter.
    """
    # Frontmatter lists as YAML inline arrays
    tags_yaml = "[" + ", ".join(json.dumps(t, ensure_ascii=False) for t in tags) + "]"
    links_yaml = "[" + ", ".join(json.dumps(l, ensure_ascii=False) for l in links) + "]"
    bp_yaml = "[" + ", ".join(json.dumps(b, ensure_ascii=False) for b in blueprint_refs) + "]"

    content = io.StringIO()
    content.write("---\n")
    content.write(f"title: {json.dumps(title, ensure_ascii=False)}\n")
    content.write(f"ts_kst: {json.dumps(ts_kst)}\n")
    content.write(f"id: {json.dumps(idea_id)}\n")
    content.write(f"tags: {tags_yaml}\n")
    content.write(f"links: {links_yaml}\n")
    content.write(f"blueprint_refs: {bp_yaml}\n")
    content.write("---\n\n")
    content.write(body or "")
    content.write("\n")

    path.write_text(content.getvalue(), encoding="utf-8")


def append_index_line(rec: IdeaIndexRecord) -> None:
    """
    Append one JSONL line to logs/ideas.jsonl with file locking.
    """
    line = rec.to_jsonl() + "\n"
    with IDEAS_LOG.open("a", encoding="utf-8") as f:
        _flock_exclusive(f)
        f.write(line)
        f.flush()
        os.fsync(f.fileno())
        _flock_release(f)


def capture_idea(
    *,
    title: str,
    body: str = "",
    tags: Optional[List[str]] = None,
    session_id: Optional[str] = None,
    actor: Optional[str] = None,
    meta: Optional[Dict[str, Any]] = None,
) -> IdeaCaptureResult:
    """
    Capture a new idea:
    - Create docs/ideas/YYYYMMDD-HHmm-<slug>.md with frontmatter(title, ts_kst, id, tags, links, blueprint_refs)
    - Append index line to logs/ideas.jsonl

    Returns IdeaCaptureResult (path relative to repo root).
    """
    _ensure_dirs()

    ts_kst = now_kr_str_minute()
    idea_id, fname = build_idea_filename(ts_kst, title)
    fpath = IDEAS_DIR / fname

    # Extract links
    links = extract_wikilinks(body)
    # Extract and resolve blueprint refs ([[BP:Section Title]])
    raw_bp = extract_blueprint_refs(body)
    bp_refs = resolve_blueprint_refs(raw_bp)

    tag_list = list(dict.fromkeys((tags or [])))  # dedup preserve

    # Write markdown
    write_markdown(
        fpath,
        title=title,
        ts_kst=ts_kst,
        idea_id=idea_id,
        tags=tag_list,
        links=links,
        blueprint_refs=bp_refs,
        body=body,
    )

    # Append JSONL index (including blueprint_refs)
    rec = IdeaIndexRecord(
        ts_kst=ts_kst,
        id=idea_id,
        path=str(fpath.relative_to(ROOT).as_posix()),
        title=title,
        tags=tag_list,
        links=links,
        blueprint_refs=bp_refs,
        session_id=session_id,
        actor=actor,
        meta=meta or {},
    )
    append_index_line(rec)

    return IdeaCaptureResult(
        ts_kst=ts_kst,
        id=idea_id,
        path=str(fpath.relative_to(ROOT).as_posix()),
        title=title,
        tags=tag_list,
        links=links,
        blueprint_refs=bp_refs,
        written=True,
        indexed=True,
    )


# -----------------------------
# Query helpers (MVP)
# -----------------------------

def parse_frontmatter(md_text: str) -> Dict[str, Any]:
    """
    Very small frontmatter parser for our own generated files.
    Expects:
      ---
      key: value
      key2: [...]
      ---
    """
    lines = md_text.splitlines()
    if not lines or lines[0].strip() != "---":
        return {}
    fm: Dict[str, Any] = {}
    i = 1
    while i < len(lines):
        if lines[i].strip() == "---":
            break
        line = lines[i]
        i += 1
        if ":" not in line:
            continue
        key, val = line.split(":", 1)
        key = key.strip()
        val = val.strip()
        # Try JSON parse for arrays/quoted strings
        try:
            parsed = json.loads(val)
        except Exception:
            parsed = val.strip('"').strip("'")
        fm[key] = parsed
    return fm


def list_recent_ideas(limit: int = 20) -> List[Dict[str, Any]]:
    """
    Return a list of recent ideas from docs/ideas by mtime (desc), with basic metadata.
    """
    _ensure_dirs()
    files = sorted(IDEAS_DIR.glob("*.md"), key=lambda p: p.stat().st_mtime, reverse=True)[: max(1, min(200, limit))]
    out: List[Dict[str, Any]] = []
    for p in files:
        try:
            text = p.read_text(encoding="utf-8", errors="ignore")
            fm = parse_frontmatter(text)
            out.append(
                {
                    "path": str(p.relative_to(ROOT).as_posix()),
                    "title": fm.get("title") or p.stem,
                    "ts_kst": fm.get("ts_kst"),
                    "id": fm.get("id"),
                    "tags": fm.get("tags") or [],
                    "links": fm.get("links") or [],
                }
            )
        except Exception:
            out.append({"path": str(p.relative_to(ROOT).as_posix()), "title": p.stem})
    return out


def tail_index(lines: int = 20) -> List[Dict[str, Any]]:
    """
    Return last N JSONL index lines parsed as objects (best-effort).
    """
    if not IDEAS_LOG.exists():
        return []
    lines = max(1, min(1000, int(lines)))
    with IDEAS_LOG.open("rb") as f:
        _flock_exclusive(f)  # exclusive is okay for read-tail (short)
        try:
            f.seek(0, os.SEEK_END)
            size = f.tell()
            block = 4096
            data = b""
            while len(data.splitlines()) <= lines and size > 0:
                read = min(block, size)
                size -= read
                f.seek(size)
                data = f.read(read) + data
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
            continue
    return out


# -----------------------------
# CLI
# -----------------------------

def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Gumgang 2.0 — Ideas Recorder (Quick MVP)")
    sub = p.add_subparsers(dest="cmd", required=True)

    c = sub.add_parser("capture", help="Capture a new idea")
    c.add_argument("--title", required=True, help="Idea title")
    c.add_argument("--body", default="", help="Idea body (markdown, supports [[WikiLink]])")
    c.add_argument("--tags", default="", help="Comma-separated tags (e.g., ai,graph,obsidian)")
    c.add_argument("--session", default=None, help="Session ID (optional)")
    c.add_argument("--actor", default=None, help="Actor/user (optional)")
    c.add_argument("--meta", default=None, help='Extra JSON meta (optional)')

    l = sub.add_parser("list", help="List recent ideas")
    l.add_argument("--limit", type=int, default=20, help="Max items")

    t = sub.add_parser("tail", help="Tail recent JSONL index lines")
    t.add_argument("--lines", type=int, default=20, help="Lines to read (1-1000)")

    return p.parse_args()


def _main() -> None:
    args = _parse_args()
    if args.cmd == "capture":
        meta: Dict[str, Any] = {}
        if args.meta:
            try:
                meta = json.loads(args.meta)
                if not isinstance(meta, dict):
                    meta = {"_": meta}
            except Exception:
                meta = {"unparsed_meta": args.meta}
        tag_list = [t.strip() for t in (args.tags or "").split(",") if t.strip()]
        res = capture_idea(
            title=args.title,
            body=args.body,
            tags=tag_list,
            session_id=args.session,
            actor=args.actor,
            meta=meta,
        )
        print(json.dumps(asdict(res), ensure_ascii=False, indent=2))
    elif args.cmd == "list":
        print(json.dumps(list_recent_ideas(limit=args.limit), ensure_ascii=False, indent=2))
    elif args.cmd == "tail":
        print(json.dumps(tail_index(lines=args.lines), ensure_ascii=False, indent=2))
    else:
        raise SystemExit(2)


if __name__ == "__main__":
    _main()
