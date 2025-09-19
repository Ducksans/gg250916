---
timestamp:
  utc: 2025-09-17T13:02Z
  kst: 2025-09-17 22:02
author: Codex (AI Agent)
summary: SQLite v2 마이그레이션 적용 및 /api/import E2E(로컬)
document_type: task_instruction
tags: [tasks, db, sqlite]
BT: BT-07
ST: ST-0703
phase: pending
DOCS_TIME_SPEC: GG_TIME_SPEC_V1
---

# ST-0703 — SQLite v2 Migration E2E

목적
- 로컬(SQLite)에서 v2 스키마(content/ops/analytics/search) 적용 후 /api/import → DB upsert → /api/search 확인까지 E2E 검증.

체크리스트
- migrations 적용: db/schema/sqlite/*v2.sql + db/migrations/sqlite/* 실행
- /api/v2/content/import: 샘플 payload upsert, ops 로그 기록 확인
- /api/v2/content/search: view 결과 확인

증적
- status/evidence/db/sqlite_v2_migration_<UTC>.{log,json}

AC
- E2E PASS, CKPT Append 기록

