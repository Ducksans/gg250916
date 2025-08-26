#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
chatgpt_dump_to_md.py — Safe streamer to ingest huge ChatGPT conversations.json
into Markdown files under knowledge/chatgpt, one file per conversation.

Why
- ChatGPT export can be very large (100MB+). Loading it with json.load() can OOM.
- This script streams a top-level JSON array using JSONDecoder.raw_decode.

Default paths (relative to repo root):
- Input:  knowledge/chatgpt_raw/conversations.json
- Output: knowledge/chatgpt/*.md

Usage
  python gumgang_meeting/scripts/importers/chatgpt_dump_to_md.py
  python gumgang_meeting/scripts/importers/chatgpt_dump_to_md.py \
    --in knowledge/chatgpt_raw/conversations.json \
    --out knowledge/chatgpt \
    --limit 0 \
    --roles user,assistant,system

Notes
- Keeps only text content from message.content.parts (strings or {text})
- Orders messages by create_time if available, otherwise keeps discovery order
- File name: "{safe_title}__{id}.md" (sanitized), deduped with suffix if exists
- Returns non-zero exit code on fatal errors
"""

from __future__ import annotations

import argparse
import io
import json
import os
import re
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Iterable, Iterator, List, Optional, Tuple


# ---------- Defaults ----------

SCRIPT_PATH = Path(__file__).resolve()
PROJECT_ROOT = SCRIPT_PATH.parents[2] if len(SCRIPT_PATH.parents) >= 2 else Path.cwd()

DEFAULT_IN = PROJECT_ROOT / "knowledge" / "chatgpt_raw" / "conversations.json"
DEFAULT_OUT = PROJECT_ROOT / "knowledge" / "chatgpt"

CHUNK_BYTES = 2 * 1024 * 1024  # 2 MiB read chunk for streaming parser


# ---------- Helpers ----------

def iso_from_unix(ts: Optional[float]) -> str:
    try:
        if ts is None:
            return ""
        return datetime.fromtimestamp(float(ts), tz=timezone.utc).isoformat().replace("+00:00", "Z")
    except Exception:
        return ""


def safe_title(s: str, fallback: str = "untitled") -> str:
    s = (s or "").strip() or fallback
    # Allow Korean, basic word chars, space, -, _, .
    s = re.sub(r"[^\w\.\-\s\uAC00-\uD7A3]+", "_", s)
    s = re.sub(r"\s+", " ", s).strip()
    if not s:
        s = fallback
    # avoid absurdly long names
    return s[:80]


def safe_id(s: str, fallback: str = "conv") -> str:
    s = (s or "").strip() or fallback
    return re.sub(r"[^A-Za-z0-9_\-]+", "_", s)[:64] or fallback


def ensure_unique_path(base_dir: Path, fname: str) -> Path:
    p = base_dir / fname
    if not p.exists():
        return p
    stem = p.stem
    ext = p.suffix
    i = 2
    while True:
        cand = base_dir / f"{stem}-{i}{ext}"
        if not cand.exists():
            return cand
        i += 1


def parts_to_text(parts: Iterable) -> str:
    out: List[str] = []
    for p in parts or []:
        if isinstance(p, str):
            out.append(p)
        elif isinstance(p, dict):
            # Some exports store {"text": "..."} or {"type":"text","text":"..."}
            t = p.get("text") or ""
            if isinstance(t, str) and t.strip():
                out.append(t)
    return "\n\n".join([s for s in out if s]).strip()


@dataclass
class Turn:
    role: str
    ts_iso: str
    text: str


def extract_turns_from_mapping(mapping: Dict) -> List[Turn]:
    """ChatGPT export (new) uses 'mapping': { id: { message, parent, children } }."""
    turns: List[Turn] = []
    # Collect (ts, idx) for sorting. Fallback to discovery order.
    for node in mapping.values():
        msg = node.get("message") or {}
        content = msg.get("content") or {}
        parts = content.get("parts") or []
        text = parts_to_text(parts)
        if not text:
            continue
        role = (msg.get("author") or {}).get("role") or msg.get("role") or "user"
        ts = msg.get("create_time")
        ts_iso = iso_from_unix(ts)
        turns.append(Turn(role=role, ts_iso=ts_iso, text=text))
    # Prefer chronological order if timestamps available
    def key(t: Turn) -> Tuple[int, str]:
        try:
            if t.ts_iso:
                dt = datetime.fromisoformat(t.ts_iso.replace("Z", "+00:00"))
                return (0, dt.isoformat())
        except Exception:
            pass
        return (1, "")  # unknown time — keep stable original order via sort stability
    turns_sorted = sorted(range(len(turns)), key=lambda i: key(turns[i]))
    return [turns[i] for i in turns_sorted]


def extract_turns_from_messages(messages: List[Dict]) -> List[Turn]:
    """Some exports use a flat 'messages' array."""
    turns: List[Turn] = []
    for m in messages or []:
        role = (m.get("author") or {}).get("role") or m.get("role") or "user"
        content = m.get("content") or {}
        parts = content.get("parts") or m.get("parts") or []
        text = parts_to_text(parts)
        if not text:
            continue
        ts_iso = iso_from_unix(m.get("create_time"))
        turns.append(Turn(role=role, ts_iso=ts_iso, text=text))
    # Keep message order; optionally stabilize by timestamp if present
    return turns


def render_markdown(title: str, conv_id: str, turns: List[Turn], source_hint: str = "chatgpt export") -> str:
    lines: List[str] = []
    lines.append(f"# {title}")
    lines.append("")
    lines.append(f"> source: {source_hint}")
    lines.append(f"> id: {conv_id}")
    lines.append("")
    for t in turns:
        ts = f" ({t.ts_iso})" if t.ts_iso else ""
        hdr = f"## {t.role.upper()}{ts}"
        lines.append(hdr)
        lines.append("")
        lines.append(t.text)
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def filter_roles(turns: List[Turn], allowed_roles: Optional[Iterable[str]]) -> List[Turn]:
    if not allowed_roles:
        return turns
    allow = {r.strip().lower() for r in allowed_roles}
    out: List[Turn] = []
    for t in turns:
        if (t.role or "").lower() in allow:
            out.append(t)
    return out


# ---------- Streaming parser ----------

def iter_json_array_objs(path: Path, chunk_size: int = CHUNK_BYTES) -> Iterator[Dict]:
    """
    Stream a top-level JSON array file, yielding each element as a Python object.

    This avoids loading the entire file in memory:
      [ { ... }, { ... }, ... ]
    """
    dec = json.JSONDecoder()
    with path.open("r", encoding="utf-8", errors="ignore") as f:
        buf = ""
        idx = 0
        started = False
        eof = False
        while not eof:
            chunk = f.read(chunk_size)
            if chunk == "":
                eof = True
            buf += chunk
            if not started:
                m = re.search(r"\[", buf)
                if not m:
                    if eof:
                        break
                    # need more data
                    continue
                idx = m.end()
                started = True
            while True:
                # skip whitespace and commas
                while idx < len(buf) and buf[idx] in " \r\n\t,":
                    idx += 1
                if idx >= len(buf):
                    break
                if buf[idx] == "]":
                    # end of array
                    return
                try:
                    obj, end = dec.raw_decode(buf, idx)
                except json.JSONDecodeError:
                    # need more data
                    break
                yield obj
                idx = end
            # shrink buffer to keep memory bounded
            if idx > 0:
                buf = buf[idx:]
                idx = 0


# ---------- Main ingestion ----------

def ingest_dump(inp: Path, out_dir: Path, roles: List[str], limit: int = 0) -> Tuple[int, int, int]:
    """
    Returns (conversations_seen, files_written, turns_written)
    """
    out_dir.mkdir(parents=True, exist_ok=True)
    conv_seen = 0
    files_written = 0
    turns_written = 0

    for conv in iter_json_array_objs(inp):
        conv_seen += 1
        try:
            title = safe_title(str(conv.get("title") or "untitled"))
            conv_id = safe_id(str(conv.get("id") or conv.get("conversation_id") or f"conv_{conv_seen:06d}"))
            mapping = conv.get("mapping")
            turns = extract_turns_from_mapping(mapping) if isinstance(mapping, dict) else extract_turns_from_messages(conv.get("messages") or [])
            if not turns:
                continue
            turns = filter_roles(turns, roles)
            if not turns:
                continue
            md = render_markdown(title, conv_id, turns)
            fname = f"{title}__{conv_id}.md"
            out_path = ensure_unique_path(out_dir, fname)
            out_path.write_text(md, encoding="utf-8")
            files_written += 1
            turns_written += len(turns)
            # limit enforcement
            if limit and files_written >= limit:
                break
        except Exception as e:
            # best-effort; continue with next conversation
            sys.stderr.write(f"[warn] conversation {conv_seen}: {e}\n")
            continue
    return conv_seen, files_written, turns_written


def parse_args(argv: Optional[List[str]] = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Stream-ingest ChatGPT conversations.json to Markdown")
    p.add_argument("--in", dest="inp", default=str(DEFAULT_IN), help=f"Input conversations.json (default: {DEFAULT_IN})")
    p.add_argument("--out", dest="out", default=str(DEFAULT_OUT), help=f"Output dir for Markdown files (default: {DEFAULT_OUT})")
    p.add_argument("--roles", dest="roles", default="user,assistant,system", help="Comma-separated roles to include")
    p.add_argument("--limit", dest="limit", type=int, default=0, help="Max files to write (0 = no limit)")
    p.add_argument("--chunk-bytes", dest="chunk_bytes", type=int, default=CHUNK_BYTES, help=f"Read chunk size in bytes (default: {CHUNK_BYTES})")
    return p.parse_args(argv)


def main(argv: Optional[List[str]] = None) -> int:
    args = parse_args(argv)
    inp = Path(args.inp).expanduser().resolve()
    out_dir = Path(args.out).expanduser().resolve()

    if not inp.exists():
        sys.stderr.write(f"[error] conversations.json not found: {inp}\n")
        return 2
    if inp.stat().st_size <= 2:
        sys.stderr.write(f"[error] input file looks empty: {inp}\n")
        return 2

    # Allow overriding chunk size (advanced)
    global CHUNK_BYTES
    CHUNK_BYTES = max(64 * 1024, int(args.chunk_bytes or CHUNK_BYTES))

    roles = [r.strip().lower() for r in (args.roles or "").split(",") if r.strip()]
    if not roles:
        roles = ["user", "assistant", "system"]

    sys.stdout.write(f"Input : {inp}\n")
    sys.stdout.write(f"Output: {out_dir}\n")
    sys.stdout.write(f"Roles : {roles}\n")
    sys.stdout.write(f"Chunk : {CHUNK_BYTES} bytes\n")
    sys.stdout.flush()

    conv_seen, files_written, turns_written = ingest_dump(inp, out_dir, roles, limit=int(args.limit or 0))

    sys.stdout.write(f"\n✅ Done. conversations: {conv_seen}, files: {files_written}, turns: {turns_written}\n")
    sys.stdout.flush()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
