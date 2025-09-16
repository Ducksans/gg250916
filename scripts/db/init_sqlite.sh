#!/usr/bin/env bash
set -euo pipefail

DB_PATH="${1:-./status/data/gumgang.sqlite3}"
SCHEMA="db/schema/sqlite/schema_v1.sql"
mkdir -p "$(dirname "$DB_PATH")"

if ! command -v sqlite3 >/dev/null 2>&1; then
  echo "[FAIL] sqlite3 not found" >&2; exit 1
fi

sqlite3 "$DB_PATH" < "$SCHEMA"
echo "[OK] SQLite schema applied to $DB_PATH"

