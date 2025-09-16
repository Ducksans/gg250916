---
timestamp:
  utc: 2025-09-16T16:34Z
  kst: 2025-09-17 01:35
author: Codex (AI Agent)
summary: Dev UI sendPipeline 구현 현황과 선행 조건 점검 내용을 정리한 ST0101 감사 보고서
document_type: audit_report
tags:
  - #reports
  - #st0101
  - #dev-ui
phase: present
DOCS_TIME_SPEC: GG_TIME_SPEC_V1
links:
  - [[status/plans/MASTER_EXECUTION_PLAN.md]]
  - [[status/tasks/ST0102_dev_ui_ci_checklist.md]]
---

# ST0101 — Dev UI sendPipeline 감사

## 1. 모듈 현황 요약
- 경로: `ui/dev_a1_vite/src/features/chat/sendPipeline.ts` — fetch 기반 OpenAI 프록시 호출, 증거 문자열 헬퍼, 시스템 메시지 조립 유틸을 포함.
- 호출부: [[ui/dev_a1_vite/src/components/A1Dev.jsx]] 632~640행에서 `callChatAPI`를 직접 호출하며, 별도 sendPipeline orchestrator는 아직 미구현.
- 상태 평가:
  | 항목 | 기대 상태 | 현재 코드 | 평가 |
  | --- | --- | --- | --- |
  | API 요청 구성 | message payload + tool def + evidence 스코어링 통합 | payload 생성 및 evidence 정렬 함수 존재, Tool 호출 파이프라인 스텁 | ⚠ 부분 구현 |
  | Thread import 연계 | chatStore 초기화 시 마이그레이션 | `migrated_chat_store.json` 참조만 존재, sendPipeline과 무관 | ❌ 미연계 |
  | Evidence 출력 | Guard 규칙 준수 path#Lx-y | `buildEvidenceStrings` 제공, 실제 UI 노출 경로 미결 | ⚠ 부분 구현 |
  | 에러 핸들링 | 네트워크 예외·Tool fallback | `fetch` 예외시 HTTP 코드만 반환, 재시도/백오프 없음 | ❌ 미구현 |

## 2. 선행 조건 점검 (타임라인 §3 대응)
- [x] Node/PNPM 설치 상태 확인 — `ui/dev_a1_vite/node_modules/` 존재, `package-lock.json` 최신(2025-09-16) 유지.
- [ ] Python venv 초기화 — `venv/` 존재하나 `./scripts/dev_backend.sh init` 최근 실행 로그 부재, 재확인 필요.
- [ ] Bridge 서버 헬스 체크 — `node bridge/server.js` 실행 로그 미확인. ST0102 전에 수동 헬스체크 필요.
- [x] QUARANTINE 정책 재확인 — [[QUARANTINE/QUARANTINE.md]] 2025-09-16 판 상태 유지, 변경 없음.
- [ ] Dataview 준비 — `status/design/*` 문서 `phase` 값 업데이트 필요(§3 참조). Obsidian에서 재색인 필요.

## 3. 격차 및 조치안
1. **sendPipeline orchestration** — `callChatAPI` 직접 호출을 `sendPipeline` 상위 래퍼로 이동하여 Guard evidence 저장/승인 루프에 연결 필요.
2. **에러 & Tool fallback** — 429/500 대응, Tool Mode 분기(`ToolDef`) 로깅 추가.
3. **Thread import** — ST0103 착수 전 `chatStore` 마이그레이션 함수와 sendPipeline 재사용 계획 정리.
4. **Evidence 경로** — ST0102에서 사용할 `status/evidence/ui/` 경로에 build/guard/preview 로그 파일명을 표준화(§4 참고).

## 4. 권장 산출물
- `scripts/ci/st0102_runner.sh` — lint/test/build/guard 실행 후 아래 경로에 증거 보관
  - `status/evidence/ui/build_<UTC>.log`
  - `status/evidence/ui/guardrails_<UTC>.log`
  - `status/evidence/ui/preview_<UTC>.png`
  - `status/evidence/ui/dist_<UTC>.zip`
- `status/logs/document_gate/20250916_st0101.md` — 메타데이터 게이트 실행 기록 (추가 예정)

## 5. 다음 단계
1. 본 보고서를 근거로 ST0102 Runner 스크립트 작성 및 dry-run 수행.
2. Runner 결과를 바탕으로 5175 프리뷰 제공 → Human 승인 후 5173 배포 절차 정비.
3. ST0103 (Thread import) 설계 시 본 모듈과 Evidence 경로를 재검토.

> 체크포인트 제안: `status/checkpoints/CKPT_72H_RUN.jsonl`에 `ST0101_AUDIT_COMPLETE` 기록 후 ST0102 진행을 승인.
