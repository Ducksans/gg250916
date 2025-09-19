---
timestamp:
  utc: 2025-09-17T12:50Z
  kst: 2025-09-17 21:50
author: Codex (AI Agent)
summary: SGM soft 모드 3샷 검증 결과 요약(파일 요약, 근거 부족, 멀티턴)
document_type: validation_report
tags: [sgm, validation, ui]
phase: past
DOCS_TIME_SPEC: GG_TIME_SPEC_V1
links:
  - [[status/catalog/MASTER_RUNBOOK.md]]
  - [[status/reports/TBD_sendPipeline_audit.md]]
---

# SGM Soft Validation — 2025-09-17

## 시나리오 및 기대 신호
- 파일 요약(툴·근거): 특정 문서 요약 + path#Lx‑y 3건 인용, 링크 하이라이트
- 근거 부족(soft): 하드 차단 대신 보류 안내 + 1차 후보 소스 제시
- 멀티턴 연속성: 직전 응답 참조·보강, 각 턴 최소 1개 이상 인용 유지

## 관측 결과(요약)
- 파일 요약: PASS — GG_API_CONTEXT_SUMMARY.md 요약 + path#Lx‑y 3건(뷰어 하이라이트 정상)
- 근거 부족: PASS — “최근 7일 빌드 실패율” 질의에 [SGM: 근거 부족 — 답변 보류] 출력
- 멀티턴: PASS — ‘legacy→v2 리라이트, #Lx‑y 하이라이트’ 포함 여부 점검 → 보강 요약 4줄 작성

## 증적(Evidence)
- JSON: status/evidence/ui/sgm_runs/SGM_soft_20250917T112819Z.json
- 캡처: status/evidence/ui/sgm_runs/SGM_soft_20250917T113226Z_5173.png, status/evidence/ui/sgm_runs/SGM_soft_20250917T113226Z_5175.png
- 링크 뷰어: GET /api/files/view?path=…, GET /api/v2/threads/view?id=…#Lx-y

## 결론
- SGM soft 기준 충족(인용률 유지·보류 템플릿·멀티턴 연속성). 후속은 미세 개선(링크 유효성 필터, 하이라이트 대비).

