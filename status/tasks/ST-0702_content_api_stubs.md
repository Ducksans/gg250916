---
timestamp:
  utc: 2025-09-17T13:01Z
  kst: 2025-09-17 22:01
author: Codex (AI Agent)
summary: FastAPI 스텁 — /api/v2/content/{import,search,revalidate}
document_type: task_instruction
tags: [tasks, api, fastapi]
BT: BT-07
ST: ST-0702
phase: pending
DOCS_TIME_SPEC: GG_TIME_SPEC_V1
---

# ST-0702 — Content API Stubs(FastAPI)

목적
- 금강UI·파이프라인·허브 공용 계약의 최소 API 3종 스텁 구현.

목록
- POST /api/v2/content/import — payload 검증·upsert 호출·ops 로그
- GET  /api/v2/content/search — DB view 우선 검색(필요 시 Meili 어댑터)
- POST /api/v2/content/revalidate — 캐시/ISR 큐 등록

AC
- 로컬에서 200 OK 및 스키마 필수 키 확인(JSON 예시와 일치)
- 증적 캡처 및 CKPT 기록

