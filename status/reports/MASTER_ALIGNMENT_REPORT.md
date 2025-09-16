# MASTER_ALIGNMENT_REPORT — 문서·코드 정합 평가

> 입력: [[reports/MASTER_DOC_AUDIT.md]], [[reports/MASTER_CODE_AUDIT.md]]

## 1. 정합성 매트릭스

| 항목                        | 문서 상태                                                                                                                                 | 코드 상태                                                                                | 정합         | 조치 제안                                                                                       |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------ | ----------------------------------------------------------------------------------------------- |
| ST0102 CI Runner 흐름       | [[status/catalog/MASTER_RUNBOOK.md]]와 [[status/tasks/ST0102_dev_ui_ci_checklist.md]]에 lint→test→build→guard 및 5175→승인→5173 흐름 명시 | `npm run` 체인과 `watch_last_green.sh` 존재하나 guard evidence·자동 배포 스크립트 미구현 | ⚠ 부분 정합 | `scripts/ci/st0102_runner.sh` 생성(코드), MASTER_RUNBOOK에 evidence 경로 템플릿 추가(문서)      |
| Thread 복구/채팅 파이프라인 | EXEC_PLAN 2~3단계 상세, BT-06 backlog에 후속 계획 존재                                                                                    | chatStore에 import 없음, sendPipeline 모듈화 미완                                        | ❌ 불일치    | Dev UI에 마이그레이션 훅/테스트 추가(코드), 실행 지시서에 단계별 체크리스트 추가(문서)          |
| BT-06 ST-0603~0609 산출물   | MASTER_RUNBOOK·BT-06_ST-0602가 `status/design/` 문서 생성 요구                                                                            | 해당 문서 및 스키마 미생성                                                               | ❌ 불일치    | 설계 문서 초안 생성(문서), FastAPI/Bridge/Dev UI에 stub 타입 준비(코드)                         |
| Guardrails 증거 체계        | AGENTS_log와 ST0102 체크리스트에 “로그 남기기”만 추상적으로 언급                                                                          | `guard:ui` 스크립트 로그 표준 경로 없음                                                  | ⚠ 부분 정합 | npm script에서 로그 파일 생성(코드), ST0102 문서에 경로 명시(문서)                              |
| 메타데이터/phase 관리       | AGENTS 계열·SSOT_SITEMAP이 YAML 헤더 요구                                                                                                 | docs/projects 레거시 문서 다수 헤더 누락                                                 | ❌ 불일치    | 메타데이터 보강 스프린트(문서), pre-commit 또는 lint 스크립트로 검사(코드)                      |
| QUARANTINE 정책             | QUARANTINE/QUARANTINE.md에 실행 계획·No-Reference 규칙 명시                                                                               | 코드에서 자동 참조 차단 로직 없음, 레거시 스크립트 여전히 실행 가능                      | ⚠ 부분 정합 | `.rules`/스クリ립트에 경고 추가(코드), QUARANTINE 문서에 실행 담당/체크포인트 절차 보강(문서)   |
| CI Evidence 기록            | MASTER_RUNBOOK “체크포인트 기록” 섹션 존재                                                                                                | `status/checkpoints/CKPT_72H_RUN.jsonl` append 도구 자동화 부재                          | ⚠ 부분 정합 | scripts/checkpoint_append.py 신설 또는 npm postbuild hook(코드), RUNBOOK에 샘플 JSON 갱신(문서) |

## 2. 불일치별 책임 분류

- **문서 업데이트 필요**

  1. MASTER_RUNBOOK & ST0102 문서에 guard evidence 경로, 5175 승인 체크포인트 JSON 샘플 추가.
  2. BT-06 ST-0603~0609 설계 문서 초안 작성(roadmap, API, bridge, UI, test plan, risk)과 phase 지정.
  3. QUARANTINE 매니페스트에 담당자/승인 조건/체크포인트 ID 템플릿 추가.
  4. docs/projects 레거시 파일에 YAML 헤더 삽입 가이드 문서화(AGENTS_log Gate 섹션).

- **코드 수정 필요**
  1. `scripts/ci/st0102_runner.sh`(가칭) 또는 npm script로 ST0102 전체 파이프라인 실행 & evidence 수집 자동화.
  2. Dev UI `chatStore`/`sendPipeline` 모듈화, 스레드 임포트/증거 노출 구현.
  3. Guardrails 로그 파일을 `status/evidence/ui/guardrails_YYYYMMDD.log`에 남기도록 npm script/Node 체크 수정.
  4. `.rules` 또는 shell scripts에 QUARANTINE 경고 삽입, gumgang_0_5 자동 실행 스크립트에 안전장치 추가.
  5. Metadata lint 도구(`scripts/ckpt_lint.py` 확장 등)로 YAML 헤더 자동 검출.

## 3. CI Runner(ST0102) 준비도 평가

- **준비도**: 3/5 — 명령 체인과 guard 스크립트는 존재하나, 증거 기록 및 5175→5173 전환 자동화 부재.
- **필수 보완**
  - Evidence 표준화: `dist` 압축본과 guard 로그를 `status/evidence/ui/` 하위에 저장 후 체크포인트에 경로 기록.
  - 승인 루프: 5175 프리뷰 종료 후 사용자가 승인하면 `CKPT_72H_RUN.jsonl`에 `{ "decision": "ST0102_APPROVED" }` 형식 Append.
  - 실패 핸들러: npm script exit 코드 캡처 후 `status/evidence/ui/logs`에 원인 저장, MASTER_RUNBOOK “의사결정 대기” 섹션과 연동.

## 4. BT-06 ST-0603~0609 실행 로드맵 (문서 ↔ 코드)

1. **ST-0603 로드맵 초안** — `status/design/roadmap_BT07_BT10.md`를 생성하고, Dev UI/Bridge/Backend 의존성을 표로 작성(문서). 이후 README/EXEC_PLAN에 링크 추가(문서). 코드 영향 없음.
2. **ST-0604 백엔드 계약** — FastAPI pydantic 모델 초안 작성(문서) 후 `app/api.py`에서 스켈레톤 라우트/스키마 선언(코드).
3. **ST-0605 브리지 계약** — `bridge/server.js`에 Schema object stub 추가(코드), `status/design/bridge_contract.md`에 요청/응답 정의(문서).
4. **ST-0606 UI 통합 설계** — `status/design/ui_integration.md`에 UX/단축키/패널 정의(문서), Dev UI에 placeholder component/route 추가(코드).
5. **ST-0607 테스트 계획** — 시나리오 표 작성(문서) + `scripts/tests/`에 대응 자동화 스크립트 skeleton 작성(코드).
6. **ST-0608 리스크 레지스터** — 문서 작성(문서), README 위험 섹션 갱신(문서), `watch_last_green.sh`와 guard script에 리스크 대응 로깅(코드).

## 5. 권고 체크리스트 (즉시 착수 우선)

- [ ] ST0102 Runner 스크립트 PoC 작성 및 guard evidence 경로 확정.
- [ ] Dev UI thread import 기능 PoC → MASTER_RUNBOOK에 결과 반영.
- [ ] 메타데이터 보강 대상 문서 목록(예: `docs/*.md`, `projects/*.md`)을 AGENTS_log 게이트에 기록.
- [ ] QUARANTINE 실행 승인 여부 결정 후 체크포인트 템플릿 작성.
- [ ] CI Runner 결과를 `status/checkpoints/CKPT_72H_RUN.jsonl`에 Append하는 자동 스크립트 초안 작성.
