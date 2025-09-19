#!/usr/bin/env python3
"""
Initialize SQLite database for Gumgang (threads/messages schema).

Usage:
  python scripts/db/init_sqlite.py --db db/gumgang.db --schema db/schema/sqlite/schema_v1.sql [--force]

Notes:
  - Safe by default; refuses to overwrite an existing DB unless --force.
  - Writes evidence log to status/evidence/db/init_<UTC>.log
"""
import argparse
import os
import sqlite3
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT = os.path.abspath(os.path.join(ROOT, ".."))


def utc_ts():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", default=os.path.join(PROJECT, "db", "gumgang.db"))
    ap.add_argument(
        "--schema", default=os.path.join(PROJECT, "db", "schema", "sqlite", "schema_v1.sql")
    )
    ap.add_argument("--force", action="store_true", help="overwrite existing DB if present")
    args = ap.parse_args()

    db_path = os.path.abspath(args.db)
    schema_path = os.path.abspath(args.schema)

    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    os.makedirs(os.path.join(PROJECT, "status", "evidence", "db"), exist_ok=True)
    log_path = os.path.join(
        PROJECT, "status", "evidence", "db", f"init_{datetime.now(timezone.utc).strftime('%Y%m%dT%H%MZ')}.log"
    )

    if os.path.exists(db_path) and not args.force:
        with open(log_path, "w", encoding="utf-8") as f:
            f.write(f"[{utc_ts()}] DB exists, not overwriting: {db_path}\n")
        print(f"[SKIP] DB already exists: {db_path}")
        print(f"Evidence: {log_path}")
        return 0

    sql = open(schema_path, "r", encoding="utf-8").read()
    con = sqlite3.connect(db_path)
    try:
        con.executescript(sql)
        con.commit()
        with open(log_path, "w", encoding="utf-8") as f:
            f.write(f"[{utc_ts()}] Schema applied: {schema_path}\n")
            f.write(f"DB: {db_path}\n")
    finally:
        con.close()
    print(f"[OK] Initialized DB: {db_path}")
    print(f"Evidence: {log_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

