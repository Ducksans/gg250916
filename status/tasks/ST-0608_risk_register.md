---
timestamp:
  utc: 2025-09-17T05:26Z
  kst: 2025-09-17 14:26
author: Codex (AI Agent)
summary: Dev UI/Bridge/Backend v2 통합 리스크 레지스터(현행화)
document_type: task_instruction
tags: [tasks, #tasks]
BT: BT-06
ST: ST-0608
phase: done
DOCS_TIME_SPEC: GG_TIME_SPEC_V1
---

# ST-0608 — Risk Register (Current)

- 범위: UI(5173/5175), Bridge(3037), Backend(8000), DB(SQLite), 문서/런북 동기화.
- 목표: 즉시 조치/완화책과 확인 방법을 명시해 재발을 방지한다.

## 상태 체크리스트
- [x] 리스크 목록 최신화(아래 항목 검토/보강)
- [x] 각 리스크별 완화책/검증 방법 명시
 - [x] README 경고·가이드 반영(Origin/포트 충돌)
- [x] 정기 스모크 스케줄 정의(주 2회 등)
- [x] CKPT Append 완료

## 핵심 리스크 목록
- Origin 불일치로 IndexedDB 분리 → 스레드 목록 비어 보임
  - 징후: 5173/5175 또는 localhost/127.0.0.1 전환 시 초기화처럼 보임
  - 완화: 한 Origin 고정, README 경고 문구, UI Import Threads 버튼 안내
  - 검증: 동일 Origin 유지 후 새로고침 시 목록 보존

- 포트 충돌(8000/3037/5173/5175)
  - 완화: `scripts/preflight.sh`로 선점 확인, README에 충돌 대처 링크
  - 검증: health OK, tmux 세션 정상 구동

- DB 마이그레이션/ingest 실패
  - 완화: ingest 로그 증적 보관, 실패 시 롤백 안내, /api/v2/* 스모크
  - 검증: recent/read PASS, meta.db 경로 일치

- Bridge 프록시/계약 드리프트
  - 완화: 계약 문서(status/design/bridge_contract.md)와 server.js 동시 갱신 규칙
  - 검증: /bridge/api/v2/threads/* 스모크 PASS

- Lint 규칙 드리프트 및 조건부 훅 호출
  - 완화: 에러 0 유지(완료), 경고는 우선순위 기반 점진 해결
  - 검증: `npm run lint` 결과 에러 0, 경고 목록 추적

- 사용자 승인 흐름 누락
  - 완화: CKPT writer=human 항목 강제, RUNBOOK “오늘의 상태/다음 행동” 갱신
  - 검증: CKPT jsonl에 승인 레코드 존재, RUNBOOK 표 반영

## 스케줄/운용
- 정기 스모크 주기: 화/금 10:00 KST — 브릿지 v2 recent/read, UI Import(DB) 1회 캡처 저장
- 실행 러너: 수동(브라우저/스크립트) → 장기적으로 `scripts/ci/st0103_import_runner.sh` 활용 검토
- 증적 저장 경로 규칙: `status/evidence/bridge/V2_PROXY_SMOKE_<UTC>.json`, `status/evidence/ui/ui_import_<UTC>.png`

## Session Updates — 2025-09-17 (UTC)
- v2 프록시 스모크 PASS 및 UI Import(DB) 캡처 확보.
  - Evidence: `status/evidence/bridge/V2_PROXY_SMOKE_20250917T060839Z.json`, `status/evidence/bridge/V2_PROXY_READ_20250917T060839Z.json`, `status/evidence/ui/ui_import_20250917T060845Z.png`
- Origin 경고는 README 반영 대기(다음 액션): UI 사용 시 127.0.0.1 고정, 5173/5175 혼용 시 캐시 리셋 안내 문구 추가 예정.
 - README에 Origin/Ports 가드레일 추가 완료: `README.md` (127.0.0.1 고정, 포트 고정/충돌 대처, Toolbar API/Source 가이드)

## 모니터링/증적
- health/스모크 정기 실행 → `status/evidence/**` 저장 → CKPT Append
- 런북 Dataview 표가 비면 태그/메타 필드 확인(tags, ST, phase)

## 완료 기준
- 상기 리스크 각각에 완화책 문서화 + 검증 링크 확보.

## 체크포인트 예
```json
{
  "run_id": "ST-0608_RISK_REGISTER_UPDATE",
  "scope": "BT-06.ST-0608",
  "decision": "Risk register updated with mitigations",
  "next_step": "Automate smoke schedule and update README warnings",
  "evidence": "status/tasks/ST-0608_risk_register.md"
}
```

### CKPT Append 템플릿
```bash
UTC=$(date -u +%Y-%m-%dT%H:%M:%SZ)
echo '{"run_id":"ST-0608_RISK_REGISTER_UPDATE","scope":"BT-06.ST-0608","decision":"Risk register updated with mitigations","next_step":"Automate smoke schedule and update README warnings","evidence":"status/tasks/ST-0608_risk_register.md","utc_ts":"'"$UTC"'","writer":"agent"}' >> status/checkpoints/CKPT_72H_RUN.jsonl
```
