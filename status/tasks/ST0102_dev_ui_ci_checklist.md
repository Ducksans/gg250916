---
timestamp:
  utc: 2025-09-16T07:59Z
  kst: 2025-09-16 16:59
author: Codex (AI Agent)
summary: Dev UI 복구 작업을 CI Runner로 검증하기 위한 선형 체크리스트
document_type: task_instruction
tags:
  - #tasks
  - #ci-runner
BT: BT01_DevUI_채팅복원
ST: ST0102
phase: present
DOCS_TIME_SPEC: GG_TIME_SPEC_V1
---

# ST0102 — Dev UI CI Runner 체크리스트

## 1. 목적
Dev UI 복구(T1 트랙)를 CI Runner 환경에서 자동 검증하고, 사용자는 5175 포트 프리뷰로 빌드 통과 여부만 판단할 수 있도록 준비한다.

## 2. 선행 조건
- Backend(8000), Bridge(3037), Dev UI(5173) 미기동 상태 유지.
- `npm install` 필요 시 완료(`ui/dev_a1_vite/`, `bridge/`, `app/`).
- `.env`는 Runner에서 참조 가능한 위치에 존재.
- 체크포인트 기록(마지막 항목) 확인: `status/checkpoints/CKPT_72H_RUN.jsonl`.

## 3. Runner 실행 단계
1. 워크스페이스 동기화
   - `git status`로 깨끗한 상태 확인.
   - 필요 시 `npm ci`로 깨끗한 노드 모듈 설치.
2. Dev UI 빌드/검증
   - `cd ui/dev_a1_vite`
   - `npm run lint`
   - `npm run test -- --watch=false`
   - `npm run build`
3. UI Guardrails 검사
   - `npm run guard:ui` (`scripts/check_ui_guardrails.cjs` 호출)
4. Bridge/Backend 계약 검증(문서 기반)
   - 스키마 diff 또는 `npm run schema:validate`(없으면 TODO로 표기)
5. 아티팩트 준비
   - `ui/dev_a1_vite/dist/` 산출물 보관
   - 필요 시 `scripts/watch_last_green.sh`로 그린 플래그 캡처

## 4. 검증 항목
| 항목 | 방법 | Evidence 예시 |
| --- | --- | --- |
| Dev UI 빌드 성공 | `npm run build` 종료 코드 0 | `ui/dev_a1_vite/dist/index.html` 존재, 로그 캡처 |
| Guardrails 통과 | `npm run guard:ui` | `scripts/check_ui_guardrails.cjs` 로그 |
| 스레드 복구 | 프리뷰 5175 접속, 스레드 목록/타임라인 확인 | 스크린샷 또는 `status/evidence/ui/20250916_preview.png` |
| 채팅 로직 | 동일 프리뷰에서 메시지 송수신 | 스크린샷/Log Panel |
| Tool Mode 상태 | 5175에서 Tool Mode ON/OFF 동작 확인 | 캡처 |

## 5. 사용자 승인 흐름
1. Runner가 위 단계를 모두 통과하면 5175 포트로 Dev UI 프리뷰를 띄운다.
2. 사용자는 화면(5175)에서 UI/UX 확인 후 승인 또는 반려를 결정한다.
3. 승인 시 5173에 배포(수동 또는 Runner 스텝). 반려 시 수정 후 Runner 재실행.

## 6. 체크포인트 기록 가이드
```json
{
  "run_id": "ST0102_DEV_UI_CI",
  "scope": "CI_RUNNER",
  "decision": "ST0102 CI Runner 통과",
  "next_step": "사용자 확인 후 5173 적용",
  "evidence": "ui/dev_a1_vite/dist/index.html,status/evidence/ui/20250916_preview.png"
}
```
> 실패 시 `decision`에 실패 원인과 로그 경로, `next_step`에 재시도 계획을 기입.

## 7. 실패 시 조치
- 빌드 실패: `npm run build -- --verbose` 로 자세한 로그 확보 후 `status/evidence/memory/`에 저장.
- Guardrails 실패: `.rules`와 `rules/ai/ST-1206.ui.rules.md`를 참조하여 위반 항목 수정.
- 프리뷰 검수 실패: MASTER_RUNBOOK의 “의사결정 대기” 섹션에 반려 사유 기록 후 Runner 재실행.

## 8. 참고 문서
- [[status/catalog/MASTER_RUNBOOK.md]]
- [[status/restore/UI_RESTORE_SSOT.md]] (T1 트랙)
- [[status/tasks/BT-06_backlog.md]] (후속 ST 목록)
