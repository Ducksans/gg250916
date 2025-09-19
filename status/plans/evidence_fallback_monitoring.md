---
timestamp:
  utc: 2025-09-18T11:30Z
  kst: 2025-09-18 20:30
author: Codex (AI Agent)
summary: Evidence fallback/compact 토글 모니터링 자동화를 위한 계획 초안
document_type: plan
stage: stage1
DOCS_TIME_SPEC: GG_TIME_SPEC_V1
---

# Evidence Fallback Monitoring Plan

## 목표
- `/api/v2/threads/view` fallback 및 Evidence compact 토글이 정상 동작하는지 자동 점검하고, 이상 시 경보를 발송.

## 지표 후보
| 지표 | 설명 | 데이터 소스 | 경보 기준 |
| --- | --- | --- | --- |
| fallback_success_rate | fallback HTML 응답 비율(legacy/memory) | cron 테스트 결과 로그 | < 100% → 경고 |
| 404_count | /api/v2/threads/view 404 횟수 | nginx/FastAPI 로그 | > 0 → 경고 |
| rag_missing_refs | rag_injection_latest에 unresolved refs 수 | status/logs/rag_injection_latest.json | > 0 → 경고 |
| compact_toggle_latency | Evidence 토글 응답 시간 | UI telemetry (TODO) | > 2s → 경고 |

## TODO
- [x] 지표 초안 정의
- [x] cron 테스트 스크립트에서 fallback_success_rate 기록 (`scripts/monitor/evidence_fallback_check.py`)
- [x] rag_injection_latest → 요약 로그 자동화 (output: `status/logs/evidence_monitor_*`)
- [x] README/Runbook에 모니터링 절차 링크 추가 (README Section 5 예시 포함)
- [ ] 경보 채널(메일/슬랙 등) 설계

## 참고 자료
- `status/logs/rag_injection_summary_20250918T0945Z.txt`
- `scripts/cron_legacy_import.py`
- Runbook Tomorrow Queue
