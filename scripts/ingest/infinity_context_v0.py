#!/usr/bin/env python3
"""
Infinity Context v0 — migrated_chat_store.json ingest helper

Policy: Use FastAPI as the single gateway.
- Read source via GET /api/threads/migrated?limit=...
- Write via POST /api/v2/threads/import (batch upsert)

Usage:
  python3 scripts/ingest/infinity_context_v0.py --dry-run --limit 100 --batch-size 20 --base http://127.0.0.1:8000 

Outputs:
- Evidence JSON at status/evidence/ui/ingest/INFINITY_V0_<UTC>.json

Safety:
- Default is --dry-run; must pass --execute to write.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

import urllib.request


PROJECT_ROOT = Path(__file__).resolve().parents[2]
EVIDENCE_DIR = PROJECT_ROOT / "status" / "evidence" / "ui" / "ingest"
EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)


def utc_tag() -> str:
    return datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")


def http_get_json(url: str) -> Dict[str, Any]:
    req = urllib.request.Request(url, method="GET")
    req.add_header("Accept", "application/json")
    with urllib.request.urlopen(req, timeout=15) as r:
        data = r.read()
    return json.loads(data.decode("utf-8", errors="replace"))


def http_post_json(url: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(url, data=body, method="POST")
    req.add_header("Content-Type", "application/json; charset=utf-8")
    req.add_header("Accept", "application/json")
    with urllib.request.urlopen(req, timeout=30) as r:
        data = r.read()
    return json.loads(data.decode("utf-8", errors="replace"))


def fetch_migrated(base: str, limit: int) -> List[Dict[str, Any]]:
    j = http_get_json(f"{base}/api/threads/migrated?limit={limit}")
    if not j.get("ok"):
        raise RuntimeError(f"/api/threads/migrated failed: {j.get('error')}")
    items = j.get("data", {}).get("items") or []
    return items


def to_import_threads(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    threads: List[Dict[str, Any]] = []
    for it in items:
        tid = str(it.get("convId") or it.get("id") or "").strip()
        if not tid:
            # Skip items without id
            continue
        title = it.get("title")
        turns = it.get("turns") or it.get("messages") or []
        messages: List[Dict[str, Any]] = []
        for t in turns:
            role = str(t.get("role") or "").strip().lower() or "user"
            text = t.get("text") or t.get("content") or ""
            if not text:
                continue
            ts = t.get("ts") or t.get("timestamp")
            # Normalize ts to int milliseconds when possible
            try:
                ts_ms = int(ts) if ts is not None else int(time.time() * 1000)
            except Exception:
                ts_ms = int(time.time() * 1000)
            meta = t.get("meta") or {}
            messages.append({"role": role, "content": text, "ts": ts_ms, "meta": meta})
        threads.append({"id": tid, "title": title, "messages": messages})
    return threads


def chunked(lst: List[Any], n: int) -> List[List[Any]]:
    return [lst[i : i + n] for i in range(0, len(lst), n)]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default=os.environ.get("GG_API_BASE", "http://127.0.0.1:8000"), help="FastAPI base URL")
    ap.add_argument("--limit", type=int, default=200, help="Max threads to ingest from migrated store")
    ap.add_argument("--batch-size", type=int, default=50, help="Import batch size for /api/v2/threads/import")
    ap.add_argument("--dry-run", action="store_true", help="Parse and map only; do not write to DB")
    ap.add_argument("--execute", action="store_true", help="Actually import into DB (overrides --dry-run)")
    args = ap.parse_args()

    base = args.base.rstrip("/")
    limit = max(1, min(10_000, int(args.limit)))
    bsz = max(1, min(500, int(args.batch_size)))
    do_write = bool(args.execute) and not bool(args.dry_run)

    ts = utc_tag()
    ev_path = EVIDENCE_DIR / f"INFINITY_V0_{ts}.json"

    summary: Dict[str, Any] = {
        "ts": ts,
        "base": base,
        "limit": limit,
        "batch_size": bsz,
        "mode": "execute" if do_write else "dry-run",
        "counts": {},
        "batches": [],
        "errors": [],
    }

    try:
        items = fetch_migrated(base, limit)
        mapped = to_import_threads(items)
        summary["counts"]["source_items"] = len(items)
        summary["counts"]["mapped_threads"] = len(mapped)

        if not mapped:
            summary["errors"].append("No threads mapped from migrated store")
        else:
            for batch in chunked(mapped, bsz):
                if do_write:
                    res = http_post_json(f"{base}/api/v2/threads/import", {"threads": batch})
                    ok = bool(res.get("ok"))
                    info = {
                        "ok": ok,
                        "imported": (res.get("data") or {}).get("imported"),
                        "error": res.get("error"),
                    }
                else:
                    info = {"ok": True, "imported": len(batch), "dry_run": True}
                summary["batches"].append(info)

    except Exception as e:
        summary["errors"].append(str(e))

    # Write evidence
    try:
        ev_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
        print(str(ev_path))
    except Exception as e:
        print(f"[warn] failed to write evidence: {e}", file=sys.stderr)
        print(json.dumps(summary, ensure_ascii=False))

    return 0 if not summary.get("errors") else 1


if __name__ == "__main__":
    raise SystemExit(main())

