#!/usr/bin/env bash
set -euo pipefail

# Usage: PGURL=postgres://user:pass@host:5432/db scripts/db/init_postgres.sh
SCHEMA="db/schema/postgres/schema_v1.sql"
PGURL="${PGURL:-}"

if [ -z "$PGURL" ]; then
  echo "[FAIL] Set PGURL env (e.g., postgres://user:pass@localhost:5432/gumgang)" >&2; exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "[FAIL] psql not found" >&2; exit 1
fi

psql "$PGURL" -v ON_ERROR_STOP=1 -f "$SCHEMA"
echo "[OK] PostgreSQL schema applied"

