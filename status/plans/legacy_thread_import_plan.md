---
timestamp:
  utc: 2025-09-18T05:36Z
  kst: 2025-09-18 14:36
author: Codex (AI Agent)
summary: Legacy thread(JSONL/memory) 데이터를 DB(v2)에 이관하기 위한 계획 초안
document_type: plan
stage: stage1
DOCS_TIME_SPEC: GG_TIME_SPEC_V1
---

# Legacy Thread Import Plan (Draft)

## 목적
- Evidence fallback이 가리키는 legacy/memory 스레드를 DB(v2)에 정식 반영해 `/api/v2/threads/view`가 항상 DB 데이터를 우선 사용하도록 한다.

## 현재 상태 (2025-09-18)
- inventory: `status/evidence/memory/legacy_threads_inventory_20250918T090532Z.txt` (19개 스레드)

## TODO
- [x] legacy JSONL → `/api/v2/threads/import` 배치 실행 스크립트 작성 (`scripts/cron_legacy_import.py`)
- [x] inventory 목록을 기반으로 v2 payload 생성 → dry-run 검증 (`status/plans/legacy_threads_import_payload.json`)
- [ ] CKPT 기록 및 README/Timeline 반영 (자동화 완료 후)

## 참고 문서
- `scripts/db/ingest_threads_jsonl.py`
- `status/logs/rag_injection_latest.json`

- [x] nightly cron 스크립트 초안: scripts/cron_legacy_import.py
