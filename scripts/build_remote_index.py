#!/usr/bin/env python3
"""Build a remote workspace index as JSON Lines.

Outputs entries with: path, size, mtime, sha256, is_binary, snippet (optional), mime

Usage:
  python scripts/build_remote_index.py --root /path/to/workspace --out status/remote_workspace_index.jsonl

"""
from __future__ import annotations

import argparse
import hashlib
import json
import mimetypes
import os
import sys
from pathlib import Path
from typing import Optional


def sha256_file(path: Path, chunk_size: int = 8192) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(chunk_size), b""):
            h.update(chunk)
    return h.hexdigest()


def is_binary_string(bytes_data: bytes) -> bool:
    # Heuristic: if there's a NUL byte or a high ratio of non-text bytes
    if b"\x00" in bytes_data:
        return True
    text_chars = bytearray({7,8,9,10,12,13,27} | set(range(0x20,0x100)))
    return bool(bytes_data.translate(None, text_chars))


def sniff_mime(path: Path) -> str:
    mt, _ = mimetypes.guess_type(str(path))
    return mt or "application/octet-stream"


def build_index(root: Path, out_path: Path, max_content_bytes: int = 4096, exclude: Optional[list[str]] = None):
    exclude = exclude or []
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8") as out_f:
        for dirpath, dirnames, filenames in os.walk(root):
            # filter dirs
            rel_dir = os.path.relpath(dirpath, start=root)
            if any(rel_dir.startswith(e) for e in exclude if rel_dir != "."):
                continue
            for fname in filenames:
                fpath = Path(dirpath) / fname
                try:
                    stat = fpath.stat()
                except OSError:
                    continue

                relpath = os.path.relpath(fpath, start=root)
                try:
                    file_hash = sha256_file(fpath)
                except Exception:
                    file_hash = None

                mime = sniff_mime(fpath)
                snippet = None
                is_binary = False
                try:
                    with fpath.open("rb") as f:
                        content = f.read(max_content_bytes)
                        is_binary = is_binary_string(content)
                        if not is_binary:
                            try:
                                snippet = content.decode("utf-8", errors="replace")
                            except Exception:
                                snippet = None
                except Exception:
                    snippet = None

                entry = {
                    "path": relpath,
                    "abs_path": str(fpath.resolve()),
                    "size": stat.st_size,
                    "mtime": int(stat.st_mtime),
                    "sha256": file_hash,
                    "mime": mime,
                    "is_binary": is_binary,
                }
                if snippet is not None:
                    entry["snippet"] = snippet

                out_f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def parse_args():
    p = argparse.ArgumentParser(description="Build remote workspace index as JSONL")
    p.add_argument("--root", type=str, required=False, default=".", help="root path to index")
    p.add_argument("--out", type=str, required=False, default="status/remote_workspace_index.jsonl", help="output JSONL path")
    p.add_argument("--max-content-bytes", type=int, default=4096, help="max bytes to read for snippet")
    p.add_argument("--exclude", type=str, action="append", help="relative paths to exclude (prefix match)")
    return p.parse_args()


def main():
    args = parse_args()
    root = Path(args.root).resolve()
    out_path = Path(args.out).resolve()
    print(f"Indexing root={root} -> out={out_path}")
    build_index(root, out_path, max_content_bytes=args.max_content_bytes, exclude=args.exclude)
    print("Done")


if __name__ == "__main__":
    main()
