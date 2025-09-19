#!/usr/bin/env bash
set -euo pipefail
: "${PGURL:?PGURL is required}"
echo "[migrate] Postgres → $PGURL"
psql "$PGURL" -v ON_ERROR_STOP=1 -f db/migrations/postgres/002_content_v2.sql
psql "$PGURL" -v ON_ERROR_STOP=1 -f db/migrations/postgres/003_ops_v2.sql
psql "$PGURL" -v ON_ERROR_STOP=1 -f db/migrations/postgres/004_analytics_v2.sql
psql "$PGURL" -v ON_ERROR_STOP=1 -f db/migrations/postgres/005_search_v2.sql
echo "[OK] Postgres v2 migrations applied."
