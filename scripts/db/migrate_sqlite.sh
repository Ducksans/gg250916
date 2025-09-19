#!/usr/bin/env bash
set -euo pipefail
SQLITE_FILE=${SQLITE_FILE:-db/gumgang.db}
echo "[migrate] SQLite → $SQLITE_FILE"
sqlite3 "$SQLITE_FILE" < db/migrations/sqlite/002_content_v2.sql
sqlite3 "$SQLITE_FILE" < db/migrations/sqlite/003_ops_v2.sql
sqlite3 "$SQLITE_FILE" < db/migrations/sqlite/004_analytics_v2.sql
sqlite3 "$SQLITE_FILE" < db/migrations/sqlite/005_search_v2.sql
echo "[OK] SQLite v2 migrations applied."
