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
  - [[status/reports/MASTER_EXECUTION_PLAN.md]]
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
- [x] Python venv 초기화 — `./scripts/dev_backend.sh init` 재실행으로 의존성 최신화 완료(2025-09-16T17:05Z).
- [x] Bridge 서버 헬스 체크 — `node bridge/server.js` 임시 기동 후 `/api/health` 200 응답 확인.
- [x] QUARANTINE 정책 재확인 — [[QUARANTINE/QUARANTINE.md]] 2025-09-16 판 상태 유지, 변경 없음.
- [x] Dataview 준비 — `status/design/*` 문서 메타데이터 갱신 완료(Obsidian 재색인 필요).

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
---
timestamp:
  utc: 2025-09-17T08:35Z
  kst: 2025-09-17 17:35
author: Codex (AI Agent)
summary: FastAPI+DB 단일 관문 전환에 따른 SGM(엄격 게이트) 튜닝 계획과 send 파이프라인 점검 항목
document_type: audit_note
tags: [design, audit]
phase: present
DOCS_TIME_SPEC: GG_TIME_SPEC_V1
---

# Send Pipeline Audit — SGM Tuning (Soft/Hard)

목표: 실사용 품질을 해치지 않으면서(환각/근거 없는 추측 억제) 무응답률을 낮추고 멀티턴 연속성을 강화한다. 운영은 FastAPI + DB 단일 관문을 기준으로 한다.

## 결정
- API=FastAPI, Source=DB 고정. Bridge는 프리뷰/스냅샷 전용.
- 개발에서는 `GG_STRICT_GATE=soft|hard` 토글로 실측. soft가 목표 지표를 만족하면 운영 기본으로 채택하고 UI 토글은 숨긴다.

## 지표(각 50샷 기준)
- 무응답률(없음 템플릿) ↓ (목표 ≤ 10%)
- 인용 포함률(path#Lx-y) ↑ (목표 ≥ 90%)
- 멀티턴 연속성(직전/이전 턴 반영) ↑ (목표 ≥ 80%)
- 응답 시간 p95 ≤ 1500ms

## 테스트 세트
- 파일 요약(툴콜): /README.md, /docs/*, /status/checkpoints/CKPT_72H_RUN.jsonl 일부 범위
- 검색 쿼리: “SSOT Sitemap — 금강 문서 색인”, “MASTER_RUNBOOK 요약” 등 파일 본문 일치 구문
- 대화 연속성: “이 스레드 요약/정리/다음 액션” 3턴 묶음

## 증적 규약
- JSON: `status/evidence/ui/sgm_runs/SGM_<soft|hard>_<UTC>.json`
- 캡처: `status/evidence/ui/sgm_runs/SGM_<soft|hard>_<UTC>.png`
- CKPT: `SGM_TUNING_<soft|hard>_<UTC>`

## 운영 권고(초안)
- 기본 soft + SSOT 보너스 유지(보수형 필터는 완화)
- hard 모드는 디버깅 전용(DevTools·설정에서만 변경)

## 변경 영향
- UI Toolbar에서 API/Source 토글 제거/잠금(문구 안내). Tool Mode 기본 ON.
- 문서/헬스/스모크는 FastAPI 계약만 측정.

---
timestamp:
  utc: 2025-09-17T11:51Z
  kst: 2025-09-17 20:51
author: Codex (AI Agent)
summary: FastAPI+DB 단일 관문 수렴 인계 문단과 실행 트리거 문장 추가
document_type: handoff_and_trigger
tags: [handoff, trigger, sgm, fastapi]
phase: present
DOCS_TIME_SPEC: GG_TIME_SPEC_V1
---

## 인계 문단

결론: FastAPI + DB 단일 관문으로 수렴. Bridge는 스냅샷/프리뷰(5175) 전용으로 프리즈. SGM(엄격 게이트)은 개발 중 soft/hard 토글로 튜닝, 운영 기본은 soft(또는 자동)로 고정 예정.

문서 상태: README/AGENTS/ui_integration/roadmap/risks/RUNBOOK/sendPipeline_audit에 단일화·SGM 방침 반영 완료. CKPT에 결정 기록 추가.

현재 UX 진단: UI 전송 흐름(…→본문), 점프, 무한스크롤 PASS. 검색/인용은 FastAPI 기반이 표준. Bridge 경로의 자동 툴콜은 더 이상 확장하지 않음.

다음 핵심 과제: 1) UI 토글(Backend/Source) 잠금 및 기본값 fastapi/db 하드코딩, 2) Infinity Context v0(과거 대화 ingest)로 멀티턴/근거 강화, 3) SGM soft 기준에서 send 파이프라인 성능·품질 측정 및 운영 기본 확정.

## 새 스레드 트리거 문장

“FASTAPI+DB 단일 관문 고정 후 UX/품질 검증을 진행해 주세요. 구체적으로:

헬스 확인: ./check_servers.sh → 8000/3037/5173/5175 OK 캡처
UI 기본값 고정 점검: API=FastAPI, Source=DB, Tool Mode=ON 상태 확인(토글은 읽기 전용/숨김 계획 전제)
SGM soft 검증(50샷 축약 세트):
파일 요약(툴콜): /home/duksan/…/README.md, CKPT_72H_RUN.jsonl 일부 등 3건
검색/인용: ‘SSOT Sitemap — 금강 문서 색인’, ‘MASTER_RUNBOOK 요약’ 등 3건(strict=0 포함)
멀티턴: ‘이 스레드 요약/정리/다음 액션’ 3턴
증적: status/evidence/ui/sgm_runs/SGM_soft_<UTC>.json, …/SGM_soft_<UTC>.png
Infinity Context v0 준비: migrated_chat_store.json ingest 설계 초안/실행 계획 작성(실행은 차기 단계로 분리)
CKPT Append:
FASTAPI_DB_CONVERGENCE_EXEC_<UTC>
SGM_TUNING_SOFT_RUN_<UTC>
evidence: 위 파일 경로
마지막으로 README/RUNBOOK에 ‘토글 잠금(표시 제거 또는 읽기 전용)’ 작업 항목을 TODO로 표기해 주세요.”

원하시면 트리거 실행 후, UI 토글 잠금 코드 패치와 ingest 스크립트 구현까지 연속 진행하겠습니다.
