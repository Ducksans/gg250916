#!/usr/bin/env python3
"""
Ingest conversations/threads/*.jsonl into SQLite threads/messages tables.

Usage:
  python scripts/db/ingest_threads_jsonl.py --db db/gumgang.db --root conversations/threads --dry-run

Notes:
  - Default is --dry-run. Use --apply to actually write.
  - Batches inserts in transactions per file for speed.
  - Evidence summary written to status/evidence/db/ingest_<UTC>.json
"""
import argparse
import json
import os
import sqlite3
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import List, Tuple

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT = os.path.abspath(os.path.join(ROOT, ".."))


def utc_ts():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


@dataclass
class Counters:
    files: int = 0
    threads: int = 0
    messages: int = 0
    skipped: int = 0


def ensure_dirs():
    os.makedirs(os.path.join(PROJECT, "status", "evidence", "db"), exist_ok=True)


def iter_jsonl_files(root: str) -> List[str]:
    paths: List[str] = []
    for d, _, files in os.walk(root):
        for fn in files:
            if fn.endswith(".jsonl"):
                paths.append(os.path.join(d, fn))
    return sorted(paths)


def parse_thread_file(fp: str) -> Tuple[str, List[dict]]:
    """Return (convId, turns[]) from a .jsonl file."""
    conv_id = os.path.splitext(os.path.basename(fp))[0]
    turns: List[dict] = []
    with open(fp, "r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except Exception:
                continue
            if isinstance(obj, dict):
                turns.append(obj)
    return conv_id, turns


def apply_ingest(db_path: str, items: List[Tuple[str, List[dict]]]) -> None:
    con = sqlite3.connect(db_path)
    try:
        con.execute("PRAGMA journal_mode=WAL;")
        con.execute("PRAGMA foreign_keys=ON;")
        for conv_id, turns in items:
            ts_now = int(datetime.now(timezone.utc).timestamp() * 1000)
            con.execute(
                "INSERT OR IGNORE INTO threads(id, title, tags, created_at, updated_at) VALUES(?,?,?,?,?)",
                (conv_id, None, None, ts_now, ts_now),
            )
            for t in turns:
                msg_id = f"{conv_id}:{t.get('turn', len(t))}"
                role = str(t.get("role") or "").strip()
                if role not in {"user", "assistant", "system"}:
                    continue
                content = t.get("text") or t.get("content") or ""
                meta = json.dumps(t.get("meta") or {}, ensure_ascii=False)
                ts = t.get("ts")
                if isinstance(ts, str):
                    # store as epoch ms if parseable (best-effort ISO8601)
                    try:
                        s = ts.replace("Z", "+00:00")
                        dt = datetime.fromisoformat(s)
                        ts_ms = int(dt.timestamp() * 1000)
                    except Exception:
                        ts_ms = ts_now
                elif isinstance(ts, (int, float)):
                    ts_ms = int(float(ts))
                else:
                    ts_ms = ts_now
                con.execute(
                    "INSERT OR REPLACE INTO messages(id, thread_id, role, content, meta_json, created_at) VALUES(?,?,?,?,?,?)",
                    (msg_id, conv_id, role, content, meta, ts_ms),
                )
        con.commit()
    finally:
        con.close()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", default=os.path.join(PROJECT, "db", "gumgang.db"))
    ap.add_argument("--root", default=os.path.join(PROJECT, "conversations", "threads"))
    g = ap.add_mutually_exclusive_group()
    g.add_argument("--dry-run", action="store_true", default=True)
    g.add_argument("--apply", action="store_true")
    args = ap.parse_args()

    ensure_dirs()

    files = iter_jsonl_files(args.root)
    ctr = Counters(files=len(files))
    items: List[Tuple[str, List[dict]]] = []
    for fp in files:
        conv_id, turns = parse_thread_file(fp)
        ctr.threads += 1
        ctr.messages += len(turns)
        items.append((conv_id, turns))

    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%MZ")
    out_json = os.path.join(PROJECT, "status", "evidence", "db", f"ingest_{stamp}.json")
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(
            {
                "ok": True,
                "utc": utc_ts(),
                "root": os.path.relpath(args.root, PROJECT),
                "db": os.path.relpath(args.db, PROJECT),
                "files": ctr.files,
                "threads": ctr.threads,
                "messages": ctr.messages,
                "mode": "apply" if args.apply else "dry-run",
            },
            f,
            ensure_ascii=False,
            indent=2,
        )

    print(f"[PLAN] files={ctr.files} threads={ctr.threads} messages~={ctr.messages}")
    print(f"Evidence: {out_json}")

    if args.apply:
        if not os.path.exists(args.db):
            raise SystemExit(f"DB not found: {args.db}. Run init_sqlite.py first.")
        apply_ingest(args.db, items)
        print("[OK] Ingest applied.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
