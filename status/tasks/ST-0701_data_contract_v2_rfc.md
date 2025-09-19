---
timestamp:
  utc: 2025-09-17T13:00Z
  kst: 2025-09-17 22:00
author: Codex (AI Agent)
summary: DATA_CONTRACT_v2 RFC(스키마/API/마이그레이션 전략) 초안 작성
document_type: task_instruction
tags: [tasks, rfc, db]
BT: BT-07
ST: ST-0701
phase: present
DOCS_TIME_SPEC: GG_TIME_SPEC_V1
---

# ST-0701 — DATA_CONTRACT_v2 RFC

범위
- 스키마 모듈: content(items/tags/collections), ops(import_jobs/evidence/checkpoints), analytics(events), search(view)
- API: POST /api/v2/content/import, GET /api/v2/content/search, POST /api/v2/content/revalidate
- 원칙: 가산적 변경, append-only evidence/ckpt, SQLite↔PG 동등, FastAPI 단일 관문

산출물
- status/reports/DATA_CONTRACT_v2_RFC.md 초안(필드/타입/제약/예시)
- JSON 예시(payload, search result)

AC
- RFC 링크를 RUNBOOK에 등재, 다음 단계 ST-0702/0703 선행 문서로 승인

