#!/usr/bin/env python3
"""Summarise evidence fallback health metrics.

Outputs JSON summary under status/logs/evidence_monitor_<timestamp>.json
"""
from __future__ import annotations
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LOG_DIR = ROOT / "status" / "logs"
RAG_LOG = LOG_DIR / "rag_injection_latest.json"
CRON_RESULT_DIR = ROOT / "status" / "evidence" / "ui" / "ingest"


def utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def load_rag() -> dict:
    if not RAG_LOG.exists():
        return {}
    with RAG_LOG.open("r", encoding="utf-8") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return {}


def latest_cron() -> tuple[str | None, dict | None]:
    files = sorted(
        CRON_RESULT_DIR.glob("cron_legacy_import_run_*.json"),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    if not files:
        return None, None
    path = files[0]
    with path.open("r", encoding="utf-8") as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError:
            data = {}
    return path.name, data


def main() -> int:
    rag = load_rag()
    hits = rag.get("hits", []) if isinstance(rag, dict) else []
    fallback_refs = [h for h in hits if isinstance(h, dict) and "thread_" in str(h.get("path", ""))]
    unresolved = [h for h in hits if isinstance(h, dict) and "thread_" in str(h.get("path", "")) and "conversations/threads" in str(h.get("path", ""))]
    injected = rag.get("injected", []) if isinstance(rag, dict) else []
    fallback_success = len(injected)
    latest_cron_name, cron_data = latest_cron()

    summary = {
        "ts": utc_now(),
        "metrics": {
            "rag_hits": len(hits),
            "fallback_refs": len(fallback_refs),
            "unresolved_refs": len(unresolved),
            "injected_count": fallback_success,
        },
        "latest_cron_result": {
            "file": latest_cron_name,
            "imported": cron_data.get("data", {}).get("imported") if isinstance(cron_data, dict) else None,
        },
        "status": "ok" if fallback_success >= len(fallback_refs) and (cron_data or {}).get("ok") else "warn",
    }

    LOG_DIR.mkdir(parents=True, exist_ok=True)
    out_path = LOG_DIR / f"evidence_monitor_{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}.json"
    out_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(out_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
