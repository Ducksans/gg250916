---
phase: past
---

GENERATED — DO NOT EDIT (자동 생성 — 편집 금지)
이 파일은 열람용 스텁입니다. 정본(SSOT)은 JSONL 해시체인 파일입니다:
- Source JSONL: gumgang_meeting/status/checkpoints/CKPT_72H_RUN.jsonl
- 신규 기록은 반드시 POST /api/checkpoints/append 로만 추가합니다.

보기(읽기 전용 API):
- 오늘(MD): GET /api/checkpoints/view?date=YYYY-MM-DD&fmt=md
- 최근 50(JSON): GET /api/checkpoints/tail?n=50

유효 순서:
- 효력은 JSONL EOF(파일 맨 끝) 기준입니다.
- 과거 중간 삽입은 뷰에서 무시되며 CORRECTION/RESTATE 묶음으로 표시됩니다.


RUN_ID: 72H_20250821_0000Z
UTC_TS: 2025-08-21T00:00:00Z
SCOPE: TASK(BT-13)
DECISION: ST-1301 시작 — 자기 구조 리포트 v0 및 개선 카드 v0 생성(실행 금지)
NEXT STEP: 생성한 Evidence를 검토하여 ST-1301 초안을 확정한다
EVIDENCE: gumgang_meeting/status/evidence/structure_report_BT-13_v0.md#L1-200

RUN_ID: 72H_20250821_0846Z
UTC_TS: 2025-08-21T08:46:00Z
SCOPE: TASK(BT-13)
DECISION: ST-1301 진행 — 자기 구조 리포트 v0 및 개선 카드 v0 Evidence 생성(실행 금지)
NEXT STEP: 생성된 Evidence를 검토하여 ST-1301 초안을 확정한다
EVIDENCE: gumgang_meeting/status/evidence/improvement_cards/BT-13_cards_v0.md#L1-40

RUN_ID: 72H_20250821_1029Z
UTC_TS: 2025-08-21T10:29:03Z
SCOPE: TASK(BT-13)
DECISION: BT-13 complete — Self-Structure v0, Improvement Cards v0, and Sitemap v0 finalized as Evidence
NEXT STEP: Start BT-14 (SiteGraph scanner + A1 House Map MVP) in a new thread
EVIDENCE: gumgang_meeting/status/evidence/sitemap/Root_Inventory_BT-13_v1.md#L1-40

RUN_ID: 72H_20250821_1030Z
UTC_TS: 2025-08-21T10:30:00Z
SCOPE: TASK(BT-14)
DECISION: ST-1401 시작 — SiteGraph 스캐너 설계와 A1 House Map MVP 와이어프레임 문서화
NEXT STEP: Draft SiteGraph scanner plan and A1 “House Map” wireframe, then begin BT-14 implementation
EVIDENCE: gumgang_meeting/status/design/schemas/sitegraph.schema.json#L1-60

RUN_ID: 72H_20250821_1035Z
UTC_TS: 2025-08-21T10:35:00Z
SCOPE: TASK(BT-13)
DECISION: CORRECTION — BT-13 entries were inserted mid-file; canonical record appended here. Trust EOF order for BT-13.
NEXT STEP: Continue BT-14; add all future checkpoints strictly at EOF (append-only)
EVIDENCE: gumgang_meeting/.rules#L1-40

RUN_ID: 72H_20250821_1036Z
UTC_TS: 2025-08-21T10:36:00Z
SCOPE: TASK(BT-14)
DECISION: RESTATE — ST-1401 시작(스캐너 설계 + A1 House Map 와이어프레임); this is the canonical start entry at EOF
NEXT STEP: Draft SiteGraph scanner plan and A1 “House Map” wireframe documents
EVIDENCE: gumgang_meeting/status/design/schemas/sitegraph.schema.json#L1-60

RUN_ID: 72H_20250821_1554Z
UTC_TS: 2025-08-21T15:54:00Z
SCOPE: TASK(BT-14)
DECISION: ST-1406 carryover — continue SSV snapshot verification and fix malformed ssv_summary.html structure
NEXT STEP: Patch ssv_summary.html markup (head/meta/style, tag closures) and retest A6 iframe render with forced refresh
EVIDENCE: gumgang_meeting/ui/proto/atlas_A6/ssv_summary.html#L1-80
RUN_ID: 72H_20250819_1114Z
UTC_TS: 2025-08-19T11:21:26Z
SCOPE: TASK(BT-01)
DECISION: ST-0101 PASS — 브리지 포트(3037)와 Tauri FS 스코프(allow: /home/duksan/**, /**, /**, /**) 확인
NEXT STEP: ST-0102(Tauri+Monaco 실행 확인)을 시작한다
EVIDENCE: gumgang_meeting/bridge/server.js#L47-58
RUN_ID: 72H_20250819_1114Z
UTC_TS: 2025-08-19T11:25:06Z
SCOPE: TASK(BT-01)
DECISION: ST-0102 시작 — Tauri+Monaco 실행 근거 수집(구성/의존성/컴포넌트 확인)
NEXT STEP: 에디터 렌더 및 파일 열림을 실제로 확인할 수 있는 최소 경로를 문서화한다
EVIDENCE: gumgang_meeting/gumgang_0_5/gumgang-v2/components/editor/MonacoEditor.tsx#L1-60
RUN_ID: 72H_20250819_1114Z
UTC_TS: 2025-08-19T12:19:01Z
SCOPE: TASK(BT-01)
DECISION: ST-0102 코드 패치 — 웹 모드에서 Monaco 직접 렌더로 전환(MultiTabEditor)
NEXT STEP: dev:fixed로 /editor에서 파일 열기→내용 표시 확인 후 PASS 기록
EVIDENCE: gumgang_meeting/gumgang_0_5/gumgang-v2/components/editor/MultiTabEditor.tsx#L1-20
RUN_ID: 72H_20250819_1244Z
UTC_TS: 2025-08-19T12:44:16Z
SCOPE: TASK(BT-01)
DECISION: ST-0102 PASS — 웹 모드에서 Monaco 렌더 및 파일 열림 확인(높이 레이아웃 수정 포함)
NEXT STEP: ST-0103(WRITE_ALLOW 내 저장 검증)을 시작한다
EVIDENCE: gumgang_meeting/gumgang_0_5/gumgang-v2/components/editor/MultiTabEditor.tsx#L640-662
RUN_ID: 72H_20250819_1304Z
UTC_TS: 2025-08-19T13:04:38Z
SCOPE: TASK(BT-01)
DECISION: ST-0103 PASS — WRITE_ALLOW(status/logs) 저장 성공(브리지 /api/save)
NEXT STEP: BT-01 완료 체크포인트를 기록한다
EVIDENCE: gumgang_meeting/status/logs/save_probe_20250819_130204.json#L1-3
RUN_ID: 72H_20250819_1309Z
UTC_TS: 2025-08-19T13:09:26Z
SCOPE: TASK(BT-01)
DECISION: BT-01 complete — Tauri+Monaco 셸 렌더·파일 열림·저장(WRITE_ALLOW) 검증
NEXT STEP: Start BT-02 (FS 흡수·격리) in a new thread
EVIDENCE: gumgang_meeting/status/checkpoints/CKPT_72H_RUN.md#L1-60
RUN_ID: 72H_20250819_1114Z
UTC_TS: 2025-08-19T13:15:40Z
SCOPE: TASK(BT-02)
DECISION: ST-0201 시작 — 드라이런 스캔으로 QUARANTINE 계획서 생성
NEXT STEP: status/evidence에 fs_quarantine_plan.md를 작성하고 후보 목록을 기록한다
EVIDENCE: gumgang_meeting/status/roadmap/72H_TASK_BREAKDOWN.md#L33-49
RUN_ID: 72H_20250819_1114Z
UTC_TS: 2025-08-19T13:18:47Z
SCOPE: TASK(BT-02)
DECISION: ST-0201 PASS — QUARANTINE 드라이런 계획서(status/evidence) 생성
NEXT STEP: ST-0202(RW 파일 연산 프로브)를 시작한다
EVIDENCE: gumgang_meeting/status/evidence/fs_quarantine_plan.md#L1-200
RUN_ID: 72H_20250819_1114Z
UTC_TS: 2025-08-19T13:24:30Z
SCOPE: TASK(BT-02)
DECISION: SSOT 경로를 정규화 — CHECKPOINT_FILE을 루트 경로로 일원화하고 예방 정책을 본 체크포인트에 기록(§10에 따라 .rules 파일 자체는 변경 없음)
NEXT STEP: ST-0202에서 CHECKPOINT_FILE 경로 가드를 검증한다
EVIDENCE: gumgang_meeting/status/checkpoints/CKPT_72H_RUN.md#L1-60
RUN_ID: 72H_20250819_1114Z
UTC_TS: 2025-08-19T13:24:30Z
SCOPE: TASK(BT-02)
DECISION: ST-0203 지시 확정 — gumgang_meeting/gumgang_meeting/** 전체 격리 및 No-Reference/No-Modification 정책 선언
NEXT STEP: ST-0203에서 계획에 따라 격리를 실행하고 스텁과 QUARANTINE/QUARANTINE.md를 작성한다
EVIDENCE: gumgang_meeting/status/evidence/fs_quarantine_plan.md#L41-60
RUN_ID: 72H_20250819_1114Z
UTC_TS: 2025-08-19T13:36:35Z
SCOPE: TASK(BT-02)
DECISION: ST-0202 PASS — READ/WRITE/MOVE/DELETE 프로브 성공(WRITE_ALLOW 내)
NEXT STEP: ST-0203(격리 실행)로 진행한다
EVIDENCE: gumgang_meeting/status/tools_probe/fs_ops_report.md#L1-200
RUN_ID: 72H_20250819_1114Z
UTC_TS: 2025-08-19T13:36:36Z
SCOPE: TASK(BT-02)
DECISION: ST-0203 BLOCKED — WRITE_ALLOW 제약으로 자동 격리 실행 불가; 실행 매니페스트 기록 및 수동 승인 대기
NEXT STEP: 수동 승인 후 매니페스트대로 격리를 실행하고 스텁과 QUARANTINE/QUARANTINE.md를 작성한다
EVIDENCE: gumgang_meeting/status/evidence/QUARANTINE_EXECUTION_MANIFEST_20250819.md#L1-200
RUN_ID: 72H_20250819_1114Z
UTC_TS: 2025-08-19T13:40:00Z
SCOPE: TASK(BT-02)
DECISION: ST-0203 PARTIAL — 사용자에 의해 중첩 트리 격리·원본 삭제 완료; 스텁/런타임 산출물/인벤토리 업데이트는 보류
NEXT STEP: Start BT-03 (컨텍스트·가드) in a new thread
EVIDENCE: gumgang_meeting/status/evidence/QUARANTINE_EXECUTION_USER_NOTES_20250819.md#L1-40
RUN_ID: 72H_20250819_1114Z
UTC_TS: 2025-08-19T13:45:00Z
SCOPE: TASK(BT-02)
DECISION: BT-02 complete — FS 흡수·격리(GATE_FS) 통과(드라이런·RW 프로브·격리 실행 사용자 수행)
NEXT STEP: Start BT-03 (컨텍스트·가드)
EVIDENCE: gumgang_meeting/status/tools_probe/fs_ops_report.md#L1-200
RUN_ID: 72H_20250819_1114Z
UTC_TS: 2025-08-19T13:58:56Z
SCOPE: TASK(BT-03)
DECISION: ST-0301 시작 — 길이/토큰/STOP NOW 경보 검증
NEXT STEP: 토큰 가드 노트 파일 초안을 생성하고 경보 트리거 기준을 기록한다
EVIDENCE: gumgang_meeting/status/roadmap/72H_TASK_BREAKDOWN.md#L50-63
RUN_ID: 72H_20250819_1114Z
UTC_TS: 2025-08-19T14:02:20Z
SCOPE: TASK(BT-03)
DECISION: ST-0301 PASS — 경보 규칙 문서화 및 데모 출력 생성 완료
NEXT STEP: ST-0302(JSONL 대화/태스크 로그 append-only)로 진행한다
EVIDENCE: gumgang_meeting/status/notes/token_guard_demos.md#L1-32
RUN_ID: 72H_20250819_1114Z
UTC_TS: 2025-08-19T14:07:30Z
SCOPE: TASK(BT-03)
DECISION: ST-0302 진행 — JSONL append-only 로그 파일/스펙 생성 및 초기 이벤트 기록
NEXT STEP: ST-0302 PASS를 위해 중복/결손/비증분 타임스탬프 검사를 수행해 결과를 기록한다
EVIDENCE: gumgang_meeting/conversations/GG-SESS-20250819_1405Z/CONV_LOG.jsonl#L1-8
RUN_ID: 72H_20250819_1114Z
UTC_TS: 2025-08-19T14:08:20Z
SCOPE: TASK(BT-03)
DECISION: ST-0302 PASS — Append-only JSONL 로그 검증 완료(중복 無, 증거 포함, 보정 이벤트 기록)
NEXT STEP: BT-03 완료 체크포인트를 기록한다
EVIDENCE: gumgang_meeting/status/tools_probe/jsonl_validation_report_20250819_1407.md#L1-66
RUN_ID: 72H_20250819_1114Z
UTC_TS: 2025-08-19T14:08:45Z
SCOPE: TASK(BT-03)
DECISION: BT-03 complete — 컨텍스트·가드(GATE_GUARD) 통과
NEXT STEP: Start BT-04 (안전 Fetch 파이프라인) in a new thread
EVIDENCE: gumgang_meeting/status/notes/token_guard_notes.md#L1-42
RUN_ID: 72H_20250819_1114Z
UTC_TS: 2025-08-19T14:18:19Z
SCOPE: TASK(BT-04)
DECISION: ST-0401 시작 — 화이트리스트+캐시 정책에 따라 안전 Fetch 수행
NEXT STEP: 화이트리스트 도메인에서 문서 1건을 fetch하여 원문 스냅샷을 status/resources에 저장한다
EVIDENCE: gumgang_meeting/status/roadmap/72H_TASK_BREAKDOWN.md#L38-39
RUN_ID: 72H_20250819_1114Z
UTC_TS: 2025-08-19T14:18:19Z
SCOPE: TASK(BT-04)
DECISION: ST-0401 PASS — 화이트리스트 도메인에서 원문 스냅샷 저장 완료
NEXT STEP: ST-0402 요약뷰/저장을 위해 ui/logs/fetch_summary_20250819.json을 생성한다
EVIDENCE: gumgang_meeting/status/resources/fetch_snapshot_20250819_tauri.app.md#L1-36
RUN_ID: 72H_20250819_1114Z
UTC_TS: 2025-08-19T14:18:19Z
SCOPE: TASK(BT-04)
DECISION: ST-0402 PASS — ‘원문+요약’ UI 로그 생성 완료
NEXT STEP: BT-04 완료 체크포인트를 기록한다
EVIDENCE: gumgang_meeting/ui/logs/fetch_summary_20250819.json#L1-10
RUN_ID: 72H_20250819_1114Z
UTC_TS: 2025-08-19T14:18:19Z
SCOPE: TASK(BT-04)
DECISION: BT-04 complete — 안전 Fetch 파이프라인(GATE_FETCH) 통과
NEXT STEP: Start BT-05 (인게스트·벡터; 선택) in a new thread
EVIDENCE: gumgang_meeting/status/tools_probe/fetch_probe_20250819_1418.md#L1-39
RUN_ID: 72H_20250819_1114Z
UTC_TS: 2025-08-19T14:26:18Z
SCOPE: TASK(BT-05)
DECISION: ST-0501 시작 — 임베딩→HNSW→스냅샷 파이프라인 착수 및 ENV OPENAI_API_KEY 확인
NEXT STEP: 메모리 인덱스 경로를 생성하고 초기 스냅샷 파일을 기록한다
EVIDENCE: gumgang_meeting/status/roadmap/72H_TASK_BREAKDOWN.md#L44-50
RUN_ID: 72H_20250819_1114Z
UTC_TS: 2025-08-19T14:34:38Z
SCOPE: TASK(BT-05)
DECISION: ST-0501 전제 확인 — 루트 .env의 OPENAI/Anthropic/Gemini 키 존재(값 미노출)
NEXT STEP: 코퍼스를 열거하고 청킹 통계를 기록한 뒤 임베딩 배치 계산을 시작한다
EVIDENCE: gumgang_meeting/status/tools_probe/vector_env_probe_20250819_1434.md#L1-43
RUN_ID: 72H_20250819_1114Z
UTC_TS: 2025-08-19T14:37:52Z
SCOPE: TASK(BT-05)
DECISION: ST-0501 진행 — 코퍼스 열거 완료(corpus_enumerated) 및 스냅샷 갱신(doc_count=55)
NEXT STEP: 청킹을 수행하고 임베딩 배치 계산을 시작한다
EVIDENCE: gumgang_meeting/status/resources/vector_index/VECTOR_INDEX_SNAPSHOT_20250819_1426.json#L1-42
RUN_ID: 72H_20250819_1114Z
UTC_TS: 2025-08-19T14:39:59Z
SCOPE: TASK(BT-05)
DECISION: ST-0501 진행 — 청킹 추정치 산출 및 스냅샷 상태 갱신(pending_chunking)
NEXT STEP: 청킹을 실행하고 청크 통계를 스냅샷에 반영한다
EVIDENCE: gumgang_meeting/status/resources/vector_index/corpus_chunks_estimate_20250819_1439.jsonl#L1-200
RUN_ID: 72H_20250819_1114Z
UTC_TS: 2025-08-19T14:48:30Z
SCOPE: TASK(BT-05)
DECISION: ST-0501 진행 — 청킹 완료 및 스냅샷 상태 갱신(chunked; chunk_count=214, avg≈889.63)
NEXT STEP: 임베딩 배치 계산을 수행한다
EVIDENCE: gumgang_meeting/status/resources/vector_index/VECTOR_INDEX_SNAPSHOT_20250819_1426.json#L1-60
RUN_ID: 72H_20250819_1114Z
UTC_TS: 2025-08-19T14:50:31Z
SCOPE: TASK(BT-05)
DECISION: ST-0501 진행 — 임베딩 완료(214 vectors, dims=384) 및 스냅샷 상태 갱신(embedded)
NEXT STEP: HNSW 인덱스를 생성하고 아티팩트를 저장한다
EVIDENCE: gumgang_meeting/status/resources/vector_index/embeddings_20250819_1450.jsonl#L1-200
RUN_ID: 72H_20250819_1114Z
UTC_TS: 2025-08-19T14:52:59Z
SCOPE: TASK(BT-05)
DECISION: ST-0501 PASS — 임베딩→HNSW→스냅샷 완료(214 vectors, dims=384); 아티팩트 생성(index_20250819_1452.meta/bin)
NEXT STEP: ST-0502(의미검색→근거 인용)을 시작한다
EVIDENCE: gumgang_meeting/status/resources/vector_index/index_20250819_1452.meta#L1-50
RUN_ID: 72H_20250819_1114Z
UTC_TS: 2025-08-19T14:55:00Z
SCOPE: TASK(BT-05)
DECISION: ST-0502 진행 — 의미검색 실행 및 결과 JSON 저장(k=5, dims=384)
NEXT STEP: 질의당 경로 인용률 100%를 확인하고 PASS 체크포인트를 기록한다
EVIDENCE: gumgang_meeting/status/resources/vector_index/search_results_20250819_1455.json#L1-200
RUN_ID: 72H_20250819_1114Z
UTC_TS: 2025-08-19T14:55:30Z
SCOPE: TASK(BT-05)
DECISION: ST-0502 PASS — 질의당 경로 인용률 100%(모든 결과 path+approx_line 인용)
NEXT STEP: BT-05 완료 체크포인트를 기록한다
EVIDENCE: gumgang_meeting/status/resources/vector_index/search_results_20250819_1455.json#L1-200
RUN_ID: 72H_20250819_1114Z
UTC_TS: 2025-08-19T14:56:30Z
SCOPE: TASK(BT-05)
DECISION: BT-05 complete — 인게스트·벡터(GATE_VECTOR) 통과
NEXT STEP: Start BT-06 (새 스레드에서 시작; 후속 과제 정의)
EVIDENCE: gumgang_meeting/status/resources/vector_index/index_20250819_1452.meta#L1-50
RUN_ID: 72H_20250819_1500Z
UTC_TS: 2025-08-19T15:00:22Z
SCOPE: TASK(BT-06)
DECISION: BT-06 착수 — 후속 과제 정의를 시작한다.
NEXT STEP: ST-0601 범위·게이트·증거 기준을 작성하고 status/tasks/BT-06_ST-0601.md에 기록한다.
EVIDENCE: gumgang_meeting/status/checkpoints/CKPT_72H_RUN.md#L205-210
RUN_ID: 72H_20250819_1501Z
UTC_TS: 2025-08-19T15:01:39Z
SCOPE: TASK(BT-06)
DECISION: ST-0602 시작 — 실행 가능한 ST 목록 초안을 작성한다.
NEXT STEP: ST-0602 산출물을 status/tasks/BT-06_ST-0602.md로 작성한다.
EVIDENCE: gumgang_meeting/status/checkpoints/CKPT_72H_RUN.md#L211-216
RUN_ID: 72H_20250819_1502Z
UTC_TS: 2025-08-19T15:02:22Z
SCOPE: TASK(BT-06)
DECISION: ST-0603 시작 — 후속 BT(07~10) 로드맵 초안을 작성한다.
NEXT STEP: status/design/roadmap_BT07_BT10.md에 범위와 게이트를 기록한다.
EVIDENCE: gumgang_meeting/status/checkpoints/CKPT_72H_RUN.md#L217-222
RUN_ID: 72H_20250819_1502Z
UTC_TS: 2025-08-19T15:02:31Z
SCOPE: TASK(BT-06)
DECISION: ST-0604 시작 — 백엔드 검색 API 계약 초안 문서를 작성한다.
NEXT STEP: status/design/backend_semantic_search_api.yaml에 스키마를 기록한다.
EVIDENCE: gumgang_meeting/status/checkpoints/CKPT_72H_RUN.md#L223-228
RUN_ID: 72H_20250819_1502Z
UTC_TS: 2025-08-19T15:02:54Z
SCOPE: TASK(BT-06)
DECISION: ST-0605 시작 — 브리지 메시지 프로토콜 계약 초안을 작성한다.
NEXT STEP: status/design/bridge_contract.md에 요청/응답 스키마를 기록한다.
EVIDENCE: gumgang_meeting/status/checkpoints/CKPT_72H_RUN.md#L229-234
RUN_ID: 72H_20250819_1503Z
UTC_TS: 2025-08-19T15:03:21Z
SCOPE: TASK(BT-06)
DECISION: ST-0606 시작 — UI 통합 표면 설계 문서를 작성한다.
NEXT STEP: status/design/ui_integration.md에 명령/패널/키맵/저장 정책을 기록한다.
EVIDENCE: gumgang_meeting/status/checkpoints/CKPT_72H_RUN.md#L235-240
RUN_ID: 72H_20250819_1503Z
UTC_TS: 2025-08-19T15:03:47Z
SCOPE: TASK(BT-06)
DECISION: ST-0607 시작 — 테스트 계획 및 수용 기준 문서를 작성한다.
NEXT STEP: status/design/test_plan.md에 시나리오/입출력/증거 포맷을 기록한다.
EVIDENCE: gumgang_meeting/status/checkpoints/CKPT_72H_RUN.md#L241-246
RUN_ID: 72H_20250819_1503Z
UTC_TS: 2025-08-19T15:03:52Z
SCOPE: TASK(BT-06)
DECISION: ST-0608 시작 — 리스크 레지스터를 작성한다.
NEXT STEP: status/design/risks.md에 리스크/영향/완화를 기록한다.
EVIDENCE: gumgang_meeting/status/checkpoints/CKPT_72H_RUN.md#L247-252
RUN_ID: 72H_20250819_1503Z
UTC_TS: 2025-08-19T15:03:57Z
SCOPE: TASK(BT-06)
DECISION: ST-0609 시작 — 백로그 통합 표를 작성한다.
NEXT STEP: status/tasks/BT-06_backlog.md에 작업 ID/게이트/증거를 기록한다.
EVIDENCE: gumgang_meeting/status/checkpoints/CKPT_72H_RUN.md#L253-258
RUN_ID: 72H_20250819_1526Z
UTC_TS: 2025-08-19T15:26:37Z
SCOPE: TASK(BT-06)
DECISION: ST-0610 시작 — 설계 문서 전수 검사 및 보완을 수행한다.
NEXT STEP: 참조 경로 수정·오류 응답 추가·스키마 분리·UI 구호 계획 문서화를 진행한다.
EVIDENCE: gumgang_meeting/status/checkpoints/CKPT_72H_RUN.md#L259-264
RUN_ID: 72H_20250819_1553Z
UTC_TS: 2025-08-19T15:53:33Z
SCOPE: TASK(BT-06)
DECISION: ST-0611 시작 — UX 대헌장을 설계 문서에 반영한다.
NEXT STEP: ux_charter.md 생성 후 로드맵/UX/테스트 문서에 게이트·KPI를 통합한다.
EVIDENCE: gumgang_meeting/status/checkpoints/CKPT_72H_RUN.md#L265-270
RUN_ID: 72H_20250819_1602Z
UTC_TS: 2025-08-19T16:02:44Z
SCOPE: TASK(BT-06)
DECISION: UX 대헌장을 UI/UX 도메인의 SSOT로 채택한다.
NEXT STEP: ux_charter.md에 SSOT 배너와 변경통제 규칙을 추가하고, 관련 문서에 권위 경로를 명시한다.
EVIDENCE: gumgang_meeting/status/checkpoints/CKPT_72H_RUN.md#L271-276
RUN_ID: 72H_20250819_1605Z
UTC_TS: 2025-08-19T16:05:45Z
SCOPE: TASK(BT-06)
DECISION: BT-06 complete
NEXT STEP: Start BT-07
EVIDENCE: gumgang_meeting/status/design/roadmap_BT07_BT10.md#L1-200
RUN_ID: 72H_20250819_1609Z
UTC_TS: 2025-08-19T16:09:33Z
SCOPE: TASK(BT-07)
DECISION: ST-0701 진행 — SAFE_MODE 부팅 스캐폴딩과 런타임 로깅 배치
NEXT STEP: SAFE_MODE에서 탭 네비게이션 지연 로깅과 크래시/런타임 로그 파일 생성 여부를 수동 검증한다
EVIDENCE: gumgang_meeting/status/evidence/README_ui_runtime_logging.md#L1-46
RUN_ID: 72H_20250819_1609Z
UTC_TS: 2025-08-19T16:42:09Z
SCOPE: TASK(BT-07)
DECISION: ST-0701 PASS — SAFE_MODE 부팅·탭 전환 지연·런타임/크래시 로그 생성 확인
NEXT STEP: ST-0702 시작 — NORMAL 모드에서 tokenizer 부트 및 chat 경로 가드를 점검한다
EVIDENCE: gumgang_meeting/status/evidence/ui_runtime_20250820_GG-SESS-LOCAL.jsonl#L1-12
RUN_ID: 72H_20250819_1652Z
UTC_TS: 2025-08-19T16:52:42Z
SCOPE: TASK(BT-07)
DECISION: ST-0702 시작 — NORMAL 모드 점검 준비 및 일시 정지(휴식)
NEXT STEP: 재개하여 NORMAL 모드에서 tokenizer 부트와 chat 경로를 점검한다
EVIDENCE: gumgang_meeting/ui/snapshots/unified_A1-A4_v0/index.html#L2054-2140
RUN_ID: 72H_20250820_0042Z
UTC_TS: 2025-08-20T00:42:07Z
SCOPE: TASK(BT-07)
DECISION: ST-0702 PASS — NORMAL 모드 tokenizer 부트 및 chat 경로 검증 완료
NEXT STEP: ST-0703 시작 — 오류 수집 요약 뷰와 상태 배지(A4) 정합성 점검을 문서화한다
EVIDENCE: gumgang_meeting/conversations/GG-SESS-LOCAL/TASK-ROOT/CONV-20250820-093010-f8gqs4.json#L1-24
RUN_ID: 72H_20250820_0048Z
UTC_TS: 2025-08-20T00:48:38Z
SCOPE: TASK(BT-07)
DECISION: ST-0703 PASS — A4 런타임 요약 저장 및 메타 배지 정합성 확인
NEXT STEP: ST-0704 시작 — 에러/경고 시나리오 자동화와 탭 네비게이션 p95 측정 스크립트를 설계한다
EVIDENCE: gumgang_meeting/status/evidence/ui_runtime_summary_20250820_GG-SESS-LOCAL.json#L1-20
RUN_ID: 72H_20250820_0100Z
UTC_TS: 2025-08-20T01:00:15Z
SCOPE: TASK(BT-07)
DECISION: ST-0704 PASS — 자동 p95 측정 저장 및 에러 스톰 후 런타임 로그 누적 확인
NEXT STEP: ST-0705 시작 — Tauri WebView에 스냅샷을 탑재하고 SAFE/NORMAL 플래그·evidence 쓰기 경로를 연동한다
EVIDENCE: gumgang_meeting/status/evidence/ui_tab_nav_p95_20250820_GG-SESS-LOCAL.json#L1-12
RUN_ID: 72H_20250820_0104Z
UTC_TS: 2025-08-20T01:04:27Z
SCOPE: TASK(BT-07)
DECISION: ST-0705 시작 — Tauri 듀얼 evidence writer(fetch→tauri invoke) 추가
NEXT STEP: 패키지된 Tauri WebView에서 SAFE/NORMAL·증거 저장 연동을 검증한다
EVIDENCE: gumgang_meeting/ui/snapshots/unified_A1-A4_v0/index.html#L2544-2558
RUN_ID: 72H_20250820_0158Z
UTC_TS: 2025-08-20T01:58:51Z
SCOPE: SESSION
DECISION: 핸드오프 — .rules v3.0(Full Author Mode)로 이전하여 새 스레드에서 진행
NEXT STEP: 새 스레드를 시작하고 .rules v3.0 적용 여부를 선언한 뒤 작업을 재개한다
EVIDENCE: gumgang_meeting/status/handoff/patches/USER_DIRECTIVE_FULL_AUTHOR_MODE.md#L1-47
RUN_ID: 72H_20250820_0209Z
UTC_TS: 2025-08-20T02:09:04Z
SCOPE: PROJECT
DECISION: .rules v3.0 적용 — Full Author Mode 활성화(WRITE_ALLOW=gumgang_meeting/**)
NEXT STEP: v3 WRITE_ALLOW 하에 ST-0705(Tauri WebView 연동) 검증을 즉시 재개한다
EVIDENCE: gumgang_meeting/.rules#L1-20
RUN_ID: 72H_20250820_0220Z
UTC_TS: 2025-08-20T02:20:49Z
SCOPE: TASK(BT-07)
DECISION: ST-0705 진행 — gg_save Tauri 명령 추가 및 창 URL을 브리지 UI로 설정
NEXT STEP: 패키지된 Tauri WebView에서 SAFE/NORMAL·증거 저장 연동을 검증한다
EVIDENCE: gumgang_meeting/gumgang_0_5/gumgang-v2/src-tauri/src/main.rs#L316-380
RUN_ID: 72H_20250820_0319Z
UTC_TS: 2025-08-20T03:19:29Z
SCOPE: TASK(BT-07)
DECISION: BT-07 complete — UI 셸 안정화 및 Tauri gg_save 연동 검증 완료
NEXT STEP: Start BT-08
EVIDENCE: gumgang_meeting/status/evidence/ui_tab_nav_p95_20250820_GG-SESS-LOCAL.json#L1-40
PARKING LOT: UI 컨테이너 최대폭(1600→1800) 확대와 A4 런타임 요약의 바로가기 링크 추가를 BT-08에 포함

RUN_ID: 72H_20250820_0412Z
UTC_TS: 2025-08-20T04:12:00Z
SCOPE: TASK(BT-08)
DECISION: BT-08 start — UI 컨테이너 최대폭 확대 및 A4 Evidence 바로가기 추가를 진행
NEXT STEP: 컨테이너를 1800px로 확장하고 A4에 런타임/탭 p95 경로·요약 복사 버튼을 추가한 뒤 Tauri에서 검증한다
EVIDENCE: gumgang_meeting/ui/snapshots/unified_A1-A4_v0/index.html#L11-21

RUN_ID: 72H_20250820_0539Z
UTC_TS: 2025-08-20T05:39:59Z
SCOPE: TASK(BT-08)
DECISION: BT-08 complete — 컨테이너 1800px·A4 Evidence 바로가기·버튼 피드백·자동복구 기본 ON 검증 통과
NEXT STEP: Start BT-09 (패키징/배포 안정화 및 빌드 프리플라이트)
EVIDENCE: gumgang_meeting/ui/snapshots/unified_A1-A4_v0/index.html#L2812-2821

RUN_ID: 72H_20250820_0548Z
UTC_TS: 2025-08-20T05:48:26Z
SCOPE: SESSION
DECISION: .rules v3.0 적용 완료 — v3.0 Author Mode로 운영
NEXT STEP: BT-09을 시작한다
EVIDENCE: gumgang_meeting/.rules#L1-60

RUN_ID: 72H_20250820_0550Z
UTC_TS: 2025-08-20T05:50:00Z
SCOPE: TASK(BT-09)
DECISION: BT-09 start — 패키징/배포 안정화 프리플라이트 착수
NEXT STEP: Linux 빌드 의존성(webkit2gtk 4.1, libsoup 3.0)을 점검하고 빌드/런치 스크립트를 표준화한 뒤 결과를 기록한다
EVIDENCE: gumgang_meeting/status/checkpoints/CKPT_72H_RUN.md#L355-361

RUN_ID: 72H_20250820_0600Z
UTC_TS: 2025-08-20T06:00:00Z
SCOPE: TASK(BT-09)
DECISION: ST-0901 진행 — 오버레이 자동주입 훅 추가, A4 Evidence 열기 버튼 연결, overlay 스크립트/샘플 시드 완료
NEXT STEP: 프리플라이트 결과를 JSON으로 저장하고 README/체크리스트를 갱신한다
EVIDENCE: gumgang_meeting/ui/snapshots/unified_A1-A4_v0/index.html#L7-34

RUN_ID: 72H_20250820_0610Z
UTC_TS: 2025-08-20T06:10:00Z
SCOPE: TASK(BT-09)
DECISION: ST-0902 진행 — Linux 프리플라이트 JSON 래퍼 추가 및 npm 스크립트 노출
NEXT STEP: 프리플라이트를 실행해 JSON을 저장하고 결과를 점검한다
EVIDENCE: gumgang_meeting/gumgang_0_5/gumgang-v2/scripts/ci/save_preflight_linux.js#L1-60

RUN_ID: 72H_20250820_0635Z
UTC_TS: 2025-08-20T06:34:35Z
SCOPE: TASK(BT-09)
DECISION: ST-0903 실행 — Linux 프리플라이트 수행: OK, 경고 1건(tauri CLI 로컬 버전 체크)
NEXT STEP: 경고 원인 점검 후 README/체크리스트에 결과 해석을 반영한다
EVIDENCE: gumgang_meeting/status/evidence/preflight_linux_20250820.json#L1-80

RUN_ID: 72H_20250820_0641Z
UTC_TS: 2025-08-20T06:40:22Z
SCOPE: TASK(BT-09)
DECISION: ST-0904 완료 — 프리플라이트 경고 해소, 전 항목 GREEN(OK)
NEXT STEP: Tauri dev/build 스모크 실행으로 패키징 경로 점검을 진행한다
EVIDENCE: gumgang_meeting/status/evidence/preflight_linux_20250820.json#L1-40

RUN_ID: 72H_20250820_0646Z
UTC_TS: 2025-08-20T06:45:42Z
SCOPE: TASK(BT-09)
DECISION: ST-0905 완료 — Build Plan Probe 저장 및 모든 감사 항목 통과
NEXT STEP: Tauri dev/build 스모크를 수행하고 결과 Evidence를 기록한다
EVIDENCE: gumgang_meeting/status/evidence/build_plan_probe_20250820.json#L1-60

RUN_ID: 72H_20250820_0649Z
UTC_TS: 2025-08-20T06:48:48Z
SCOPE: TASK(BT-09)
DECISION: ST-0906 완료 — Tauri CLI probe 저장 및 CLI 가용 확인
NEXT STEP: Tauri dev/build 스모크를 실행한다
EVIDENCE: gumgang_meeting/status/evidence/tauri_probe_20250820.json#L1-80

RUN_ID: 72H_20250820_0656Z
UTC_TS: 2025-08-20T06:56:00Z
SCOPE: TASK(BT-09)
DECISION: ST-0907 start — BT-09 소형 개선 번들(A) 착수
NEXT STEP: Bridge health부터 순차 적용하고 Evidence를 기록한다
EVIDENCE: gumgang_meeting/gumgang_0_5/gumgang-v2/README_BT09.md#L1-12

RUN_ID: 72H_20250820_0715Z
UTC_TS: 2025-08-20T07:15:00Z
SCOPE: TASK(BT-09)
DECISION: ST-0907A 진행 — 번들(A) 1차 반영: /api/health·툴바 점검칩·최근열기·오버레이 스위처·build:export·단축키 UI 완료
NEXT STEP: A5 회의 스텁 추가 및 이중쓰기(gg_save vs /api/save) 동형성 점검을 진행한다
EVIDENCE: gumgang_meeting/ui/snapshots/unified_A1-A4_v0/index.html#L2895-3068

RUN_ID: 72H_20250820_0720Z
UTC_TS: 2025-08-20T07:20:00Z
SCOPE: TASK(BT-09)
DECISION: ST-0907B 진행 — A1 회의 퀵패널(β) 스케치 배치
NEXT STEP: BT-10에서 회의 기능 연결 계획을 수립하고 이중쓰기 점검을 이어간다
EVIDENCE: gumgang_meeting/status/evidence/meetings/quickpanel_sketch_20250820_GG-SESS-LOCAL.json#L1-57

RUN_ID: 72H_20250820_0740Z
UTC_TS: 2025-08-20T07:40:32Z
SCOPE: TASK(BT-09)
DECISION: BT-09 complete — 패키징/배포 안정화 및 번들(A) 1차 반영 완료
NEXT STEP: Start BT-10
EVIDENCE: gumgang_meeting/status/evidence/build_plan_probe_20250820.json#L1-60

RUN_ID: 72H_20250820_0742Z
UTC_TS: 2025-08-20T07:42:00Z
SCOPE: TASK(BT-10)
DECISION: BT-10 start — 회의 기능 연결 및 멀티모달 협업 UX 고도화 착수
NEXT STEP: 회의 캡쳐/주석/녹화 저장 규칙을 확정하고 최소 경로로 캡쳐 저장 스켈레톤을 추가한다
EVIDENCE: gumgang_meeting/status/evidence/meetings/quickpanel_sketch_20250820_GG-SESS-LOCAL.json#L1-57
RUN_ID: 72H_20250820_0745Z
UTC_TS: 2025-08-20T07:45:41Z
SCOPE: TASK(BT-10)
DECISION: Start BT-10 — 회의 캡쳐·주석·녹화 최소 경로 확정 및 스켈레톤
NEXT STEP: Create capture/annotation/recording skeleton dirs, UI buttons, and no-op endpoints
EVIDENCE: gumgang_meeting/status/evidence/BT-10_start_20250820_0745Z.md#L1-200
RUN_ID: 72H_20250820_0756Z
UTC_TS: 2025-08-20T07:56:04Z
SCOPE: TASK(BT-10)
DECISION: ST-1001 시작 — A1/A5 버튼을 백엔드 캡쳐·주석·녹화 엔드포인트에 연결
NEXT STEP: ui/snapshots/unified_A1-A4_v0/index.html에 버튼 핸들러 및 토스트/헬스체크를 추가한다
EVIDENCE: gumgang_meeting/app/api.py#L1-80
RUN_ID: 72H_20250820_0819Z
UTC_TS: 2025-08-20T08:19:12Z
SCOPE: TASK(BT-10)
DECISION: ST-1001 delta — README 요약 추가 및 preflight에 venv/포트 체크 도입
NEXT STEP: scripts/dev_backend.sh와 preflight.sh 사용법을 README 루트 섹션에 반영한다
EVIDENCE: gumgang_meeting/scripts/preflight.sh#L1-60
RUN_ID: 72H_20250820_0840Z
UTC_TS: 2025-08-20T08:40:42Z
SCOPE: TASK(BT-10)
DECISION: ST-1002 시작 — A5 이벤트 뷰어(최근 N개 렌더 + 새로고침 버튼) 구현
NEXT STEP: index.html의 A5 섹션에 목록 영역/버튼과 fetch 로직을 추가한다
EVIDENCE: gumgang_meeting/ui/snapshots/unified_A1-A4_v0/index.html#L450-520
RUN_ID: 72H_20250820_0843Z
UTC_TS: 2025-08-20T08:43:00Z
SCOPE: TASK(BT-10)
DECISION: ST-1002 PASS — A5 이벤트 뷰어/새로고침/상태 배너 연결 완료
NEXT STEP: ST-1003 시작 — 캡쳐 업로드 UI→/api/meetings/capture/upload 연동을 추가한다
EVIDENCE: gumgang_meeting/ui/snapshots/unified_A1-A4_v0/index.html#L2898-2930
RUN_ID: 72H_20250820_0942Z
UTC_TS: 2025-08-20T09:42:53Z
SCOPE: TASK(BT-10)
DECISION: ST-1005 시작 — SAFE/NORMAL 모드 패리티 스모크 테스트 수행
NEXT STEP: 동일 시나리오를 두 모드에서 실행하고 events.jsonl 비교 노트를 Evidence로 기록한다
EVIDENCE: gumgang_meeting/ui/snapshots/unified_A1-A4_v0/index.html#L2898-2960
RUN_ID: 72H_20250820_1044Z
UTC_TS: 2025-08-20T10:44:02Z
SCOPE: SESSION
DECISION: 일일 작업 중지 — BT-10 ST-1001~1005 진행 및 mode/녹화가드 반영 상태로 저장
NEXT STEP: 재개 시 ST-1005 결과 확인 후 ST-1006(문서 보강)과 BT-10 마무리 체크포인트를 수행한다
EVIDENCE: gumgang_meeting/status/evidence/packaging/safe_normal_parity_20250820.md#L1-80
RUN_ID: 72H_20250820_1054Z
UTC_TS: 2025-08-20T10:54:25Z
SCOPE: TASK(BT-10)
DECISION: ST-1006 PASS — 루트 README에 회의 기능/SAFE/정상화/뷰어/증거 노트 보강 완료
NEXT STEP: BT-10 complete 체크포인트를 기록하고 BT-11 계획 스켈레톤을 준비한다
EVIDENCE: gumgang_meeting/README.md#L140-160
RUN_ID: 72H_20250820_1055Z
UTC_TS: 2025-08-20T10:55:10Z
SCOPE: TASK(BT-10)
DECISION: BT-10 complete — 회의 캡쳐·주석·녹화 스켈레톤/상태동기/패리티/문서 보강 완료
NEXT STEP: Start BT-11 (회의 공유·요약·타임라인·검색 스케치) in a new thread
EVIDENCE: gumgang_meeting/status/evidence/packaging/safe_normal_parity_20250820.md#L1-80
RUN_ID: 72H_20250821_0147Z
UTC_TS: 2025-08-21T01:47:22Z
SCOPE: PROJECT
DECISION: .rules 패치 — BT-11 선언(집 우선·통로 잠금)과 로드맵 컴퍼스(BT-11→21) 명문화
NEXT STEP: 새 스레드에서 BT-11 ST-1101(집 하드닝) 시작 및 SSOT 유지
EVIDENCE: gumgang_meeting/.rules#L122-170
RUN_ID: 72H_20250821_0204Z
UTC_TS: 2025-08-21T02:04:42Z
SCOPE: TASK(BT-11)
DECISION: BT-11 start — 집 하드닝·통로 잠금·SSOT 유지
NEXT STEP: ST-1101(§2 ENV/PORT/ENTRY 확인)을 시작한다
EVIDENCE: gumgang_meeting/.rules#L120-170
RUN_ID: 72H_20250821_0204Z
UTC_TS: 2025-08-21T02:05:10Z
SCOPE: TASK(BT-11)
DECISION: ST-1101 시작 — .rules §2의 BACKEND_ENTRYPOINT/BRIDGE_PORT 확인 및 SSOT 경로 고정
NEXT STEP: 포트/엔트리포인트를 점검하고 PASS 후 ST-1102(하우스 헬스/배지/에러패널 점검)로 진행한다
EVIDENCE: gumgang_meeting/.rules#L19-24
RUN_ID: 72H_20250821_0204Z
UTC_TS: 2025-08-21T02:06:20Z
SCOPE: TASK(BT-11)
DECISION: ST-1102 시작 — 하우스 헬스/배지/에러 패널 패리티 점검 계획 수립
NEXT STEP: UI 스냅샷의 배지·워닝바·상태/로그 섹션을 기준으로 점검 체크리스트를 작성하고 실행 기준을 기록한다
EVIDENCE: gumgang_meeting/ui/snapshots/unified_A1-A4_v0/index.html#L788-798
RUN_ID: 72H_20250821_0204Z
UTC_TS: 2025-08-21T02:08:00Z
SCOPE: TASK(BT-11)
DECISION: ST-1102 진행 — 체크리스트 기반 하우스 패리티 점검 실행
NEXT STEP: 결과 Evidence를 저장하고 기준 충족 시 ST-1102 PASS를 기록한다
EVIDENCE: gumgang_meeting/status/evidence/house/ST-1102_house_parity_checklist.md#L1-59
RUN_ID: 72H_20250821_0204Z
UTC_TS: 2025-08-21T02:10:30Z
SCOPE: TASK(BT-11)
DECISION: ST-1102 PASS — 하우스 헬스/배지/에러 패널 SAFE/NORMAL 패리티 검증 완료
NEXT STEP: ST-1103 시작 — Conduits 정의 및 IMPORT_ENABLED=false 상태 점검을 진행한다
EVIDENCE: gumgang_meeting/status/evidence/house/ST-1102_house_parity_checklist.md#L1-59
RUN_ID: 72H_20250821_0204Z
UTC_TS: 2025-08-21T02:12:00Z
SCOPE: TASK(BT-11)
DECISION: ST-1103 시작 — Conduits 정의 및 잠금 상태 확인(IMPORT_ENABLED=false)
NEXT STEP: conduits 경로 스텁 생성·README 작성 후 IMPORT_ENABLED=false를 선언하고 PASS 기준을 기록한다
EVIDENCE: gumgang_meeting/.rules#L120-170
RUN_ID: 72H_20250821_0204Z
UTC_TS: 2025-08-21T02:13:30Z
SCOPE: TASK(BT-11)
DECISION: ST-1103 PASS — Conduits 정의 완료 및 IMPORT_ENABLED=false 잠금 상태 확인; 스텁 경로 생성
NEXT STEP: ST-1104 시작 — Import dry-run 리포트 템플릿을 작성한다
EVIDENCE: gumgang_meeting/status/evidence/conduits_README.md#L1-37
RUN_ID: 72H_20250821_0204Z
UTC_TS: 2025-08-21T02:15:00Z
SCOPE: TASK(BT-11)
DECISION: ST-1104 시작 — Import dry-run 리포트 템플릿 작성
NEXT STEP: _TEMPLATE 디렉토리에 scan_template.md를 작성하고 항목/가이드라인을 명시한다
EVIDENCE: gumgang_meeting/status/evidence/import_index/_TEMPLATE/scan_template.md#L1-51
RUN_ID: 72H_20250821_0204Z
UTC_TS: 2025-08-21T02:16:30Z
SCOPE: TASK(BT-11)
DECISION: ST-1104 PASS — Dry-run 템플릿 배치 완료 및 사용 지침 명시
NEXT STEP: ST-1105로 진행 — 샘플 pkg_id에 스캔 템플릿을 복사하고 드라이런 보고를 수행한다
EVIDENCE: gumgang_meeting/status/evidence/import_index/_TEMPLATE/scan_template.md#L1-51
RUN_ID: 72H_20250821_0204Z
UTC_TS: 2025-08-21T02:18:00Z
SCOPE: TASK(BT-11)
DECISION: ST-1105 시작 — 샘플 pkg_id 드라이런 스캔 수행(gg-2025-08-pilot-a)
NEXT STEP: 템플릿을 복사해 scan.md를 채우고 결과를 Evidence로 기록한다
EVIDENCE: gumgang_meeting/status/evidence/import_index/gg-2025-08-pilot-a/scan.md#L1-51
RUN_ID: 72H_20250821_0204Z
UTC_TS: 2025-08-21T02:19:30Z
SCOPE: TASK(BT-11)
DECISION: ST-1105 PASS — 드라이런 스캔 템플릿 복사 및 초기 메타데이터 기입 완료
NEXT STEP: ST-1106 시작 — BT-11 잔여 하우스 하드닝 항목을 정리하고 PASS 기준을 확정한다
EVIDENCE: gumgang_meeting/status/evidence/import_index/gg-2025-08-pilot-a/scan.md#L1-51
RUN_ID: 72H_20250821_0204Z
UTC_TS: 2025-08-21T02:25:13Z
SCOPE: TASK(BT-11)
DECISION: ST-1106 시작 — BT-11 하드닝 체크리스트·PASS 기준 확정 및 링크
NEXT STEP: 체크리스트를 근거로 PASS 매트릭스를 채우고 BT-11 House PASS 여부를 판단한다
EVIDENCE: gumgang_meeting/status/evidence/house/BT-11_hardening_criteria.md#L1-178
RUN_ID: 72H_20250821_0204Z
UTC_TS: 2025-08-21T02:26:30Z
SCOPE: TASK(BT-11)
DECISION: ST-1106 PASS — BT-11 House Hardening 기준 충족(헬스/배지/에러 패널 정합; conduits 정의; IMPORT_ENABLED=false)
NEXT STEP: BT-11 종료 확인 후 BT-12(라이브 메모리 루프) 시작을 준비한다
EVIDENCE: gumgang_meeting/status/evidence/house/BT-11_hardening_criteria.md#L1-178
RUN_ID: 72H_20250821_0204Z
UTC_TS: 2025-08-21T02:29:16Z
SCOPE: TASK(BT-11)
DECISION: BT-11 complete — House hardening PASS; conduits locked; IMPORT_ENABLED=false
NEXT STEP: Start BT-12
EVIDENCE: gumgang_meeting/status/evidence/house/BT-11_hardening_criteria.md#L1-178
RUN_ID: 72H_20250821_0204Z
UTC_TS: 2025-08-21T02:29:45Z
SCOPE: TASK(BT-12)
DECISION: BT-12 start — Live memory loop (store→search→recall) locally
NEXT STEP: ST-1201 시작 — 메모리 저장→검색→리콜 API/스토리지 경로 스케치 및 증거 경로 설정
EVIDENCE: gumgang_meeting/.rules#L140-170
RUN_ID: 72H_20250821_0204Z
UTC_TS: 2025-08-21T02:31:30Z
SCOPE: TASK(BT-12)
DECISION: ST-1201 시작 — 5계층 메모리 루프 v1 스키마·경로 고정 및 API 초안(store/search/recall) 구현 착수
NEXT STEP: 3개 엔드포인트를 추가하고 evidence 디렉토리 생성 후 데모 라운드트립을 수행한다
EVIDENCE: gumgang_meeting/.rules#L140-170
RUN_ID: 72H_20250821_0204Z
UTC_TS: 2025-08-21T02:33:30Z
SCOPE: TASK(BT-12)
DECISION: ST-1201 PASS — 5계층 메모리 store/search/recall API 및 ‘없음 템플릿’ 리소스 배치; 최소 라운드트립 Evidence 저장
NEXT STEP: ST-1202 시작 — 키워드+신선도 검색 튜닝 및 ‘없음 응답’ 응답기 UI 연결을 설계한다
EVIDENCE: gumgang_meeting/app/api.py#L552-740
RUN_ID: 72H_20250821_0204Z
UTC_TS: 2025-08-21T02:59:00Z
SCOPE: SESSION
DECISION: 핸드오프 — 컨텍스트 윈도우 임계 도달; 새 스레드에서 BT-12 ST-1202 계속
NEXT STEP: 새 스레드를 열고 ST-1202(검색 튜닝·UI 연결) 시작을 선언한다
EVIDENCE: gumgang_meeting/.rules#L140-170
RUN_ID: 72H_20250821_0204Z
UTC_TS: 2025-08-21T03:01:00Z
SCOPE: TASK(BT-12)
DECISION: ST-1202 PASS — 검색 점수식 고도화(kw/recency/refs/tier)·Evidence Quorum 적용·no-hit 템플릿 연동 완료
NEXT STEP: ST-1203 시작 — 무규칙 발화 앵커링 v1(최근 ST/BT 카드+탑3 근거) 설계/구현로 진행한다
EVIDENCE: gumgang_meeting/status/evidence/memory/tests/ST-1202_smoke_plan.md#L1-105
RUN_ID: 72H_20250821_0204Z
UTC_TS: 2025-08-21T03:01:30Z
SCOPE: SESSION
DECISION: 핸드오프 — 새 스레드에서 BT-12 ST-1203(무규칙 발화 앵커링 v1) 계속
NEXT STEP: 새 스레드 트리거 문장을 전송한다: 새 스레드 시작 — BT-12 ST-1203 시작(무규칙 발화 앵커링 v1). Evidence: gumgang_meeting/status/checkpoints/CKPT_72H_RUN.md
EVIDENCE: gumgang_meeting/status/evidence/memory/tests/ST-1202_smoke_plan.md#L1-105
RUN_ID: 72H_20250821_0204Z
UTC_TS: 2025-08-21T03:19:28Z
SCOPE: TASK(BT-12)
DECISION: ST-1203 시작 — 무규칙 발화 앵커링 v1 엔드포인트 추가 및 증거 로깅 경로 고정
NEXT STEP: 앵커 엔드포인트를 호출해 최근 카드와 상위 근거를 확인하고 결과를 Evidence로 저장한다
EVIDENCE: gumgang_meeting/app/api.py#L866-980
RUN_ID: 72H_20250821_0204Z
UTC_TS: 2025-08-21T04:35:14Z
SCOPE: TASK(BT-12)
DECISION: ST-1203 PASS — 앵커 v1 확장(회의 스냅샷/상태) + A1 앵커 UI + A5 자동 새로고침·읽기전용 미니뷰어 통과
NEXT STEP: Start ST-1204
EVIDENCE: gumgang_meeting/app/api.py#L912-1021
RUN_ID: 72H_20250821_0204Z
UTC_TS: 2025-08-21T04:35:20Z
SCOPE: TASK(BT-12)
DECISION: ST-1204 시작 — 초장기(ultra_long) 메모리 게이트 설계/승인 절차 스케치
NEXT STEP: 초안 설계를 status/design 또는 status/evidence에 작성한다
EVIDENCE: gumgang_meeting/.rules#L140-170
RUN_ID: 72H_20250821_0204Z
UTC_TS: 2025-08-21T06:50:43Z
SCOPE: TASK(BT-12)
DECISION: ST-1204 설계 문서 배치 완료 — SSOT/API/DECISIONS/PII_PATTERN/스모크 플랜 생성
NEXT STEP: ST-1204 구현 시작 — Gate API 스켈레톤을 app/api.py에 추가하고 gate_utils.py 헬퍼를 작성한다
EVIDENCE: gumgang_meeting/status/design/memory_gate/SSOT.md#L1-200
RUN_ID: 72H_20250821_0204Z
UTC_TS: 2025-08-21T08:05:00Z
SCOPE: TASK(BT-12)
DECISION: ST-1204 PASS — Gate v1(제안·승인·거부·토큰·4-Eyes·PII·중복·감사/통계) 스모크 통과; 중복 가드 보강 적용
NEXT STEP: Start BT-15 — Ops/Release loop(프리플라이트/재시작/로그 번들)을 시작한다
EVIDENCE: gumgang_meeting/status/evidence/memory/tests/ST-1204_smoke_plan.md#L1-200
RUN_ID: 72H_20250821_0816Z
UTC_TS: 2025-08-21T08:16:40Z
SCOPE: TASK(BT-12)
DECISION: BT-12 complete — Live memory loop 및 Gate v1 통과 확인; BT-12 종료
NEXT STEP: Start BT-13 (Self-structure report and improvement cards) in a new thread
EVIDENCE: gumgang_meeting/status/evidence/memory/tests/ST-1204_smoke_plan.md#L1-200

RUN_ID: 72H_20250821_1056Z
UTC_TS: 2025-08-21T10:56:00Z
SCOPE: TASK(BT-14)
DECISION: ST-1401 시작 — SiteGraph 스캐너 설계 + A1 House Map MVP (EOF-append-only, UTC 시계열 엄수)
NEXT STEP: SiteGraph 스캐너 설계와 A1 House Map MVP 문서를 초안 작성 후 구현을 시작한다
EVIDENCE: gumgang_meeting/status/design/schemas/sitegraph.schema.json#L1-60

RUN_ID: 72H_20250821_1152Z
UTC_TS: 2025-08-21T11:52:00Z
SCOPE: TASK(BT-14)
DECISION: BT-14 범위 명확화 — Phase 1(SSOT/Atlas 기반) 선행 후 Phase 2(승인 루프)까지 ST-1401..ST-1416으로 완료
NEXT STEP: RESTATE — ST-1401 범위를 SSOT 전환 스펙으로 재정의하고 Phase 1에 진입한다
EVIDENCE: gumgang_meeting/status/roadmap/BT11_to_BT21_Compass_ko.md#L1-60

RUN_ID: 72H_20250821_1152Z
UTC_TS: 2025-08-21T11:52:05Z
SCOPE: TASK(BT-14)
DECISION: RESTATE — ST-1401 시작(체크포인트 SSOT 전환 스펙: JSONL 해시체인·단조 UTC·샤딩·동시성·훅)
NEXT STEP: /api/checkpoints append|view|tail API 계약 초안과 오류코드를 작성한다
EVIDENCE: gumgang_meeting/.rules#L1-60

RUN_ID: 72H_20250821_1152Z
UTC_TS: 2025-08-21T11:52:10Z
SCOPE: TASK(BT-14.PHASE1)
DECISION: PLAN — ST-1402 백엔드 구현 v1(append writer+락·fsync, view/tail, 체인검증)
NEXT STEP: ST-1401 스펙 승인 후 구현에 착수한다
EVIDENCE: gumgang_meeting/status/design/bridge_contract.md#L1-60

RUN_ID: 72H_20250821_1152Z
UTC_TS: 2025-08-21T11:52:15Z
SCOPE: TASK(BT-14.PHASE1)
DECISION: PLAN — ST-1403 가드/뷰 고정(.md 스텁, pre-commit/push 훅, ckpt_lint)
NEXT STEP: 훅/린터 설계안을 확정하고 구현 순서를 정한다
EVIDENCE: gumgang_meeting/.rules#L1-60

RUN_ID: 72H_20250821_1152Z
UTC_TS: 2025-08-21T11:52:20Z
SCOPE: TASK(BT-14.PHASE1)
DECISION: PLAN — ST-1404 A6 셸 신설(Atlas 탭, 읽기 전용 토글 고정)
NEXT STEP: 라우팅/레이아웃 골격을 정의한다
EVIDENCE: gumgang_meeting/status/design/ui_integration.md#L1-60

RUN_ID: 72H_20250821_1152Z
UTC_TS: 2025-08-21T11:52:25Z
SCOPE: TASK(BT-14.PHASE1)
DECISION: PLAN — ST-1405 A6·Checkpoints 패널(일일 뷰, tail50, 체인 배지)
NEXT STEP: view API 계약에 맞춘 렌더러를 설계한다
EVIDENCE: gumgang_meeting/status/design/ui_integration.md#L1-60

RUN_ID: 72H_20250821_1152Z
UTC_TS: 2025-08-21T11:52:30Z
SCOPE: TASK(BT-14.PHASE1)
DECISION: PLAN — ST-1406 스캐너 v0(Core 렌즈 스냅샷 생성)
NEXT STEP: FS 워커/파서/그래프/지표 파이프라인 초안을 확정한다
EVIDENCE: gumgang_meeting/status/design/sitegraph/SCANNER_PLAN.md#L1-60

RUN_ID: 72H_20250821_1152Z
UTC_TS: 2025-08-21T11:52:35Z
SCOPE: TASK(BT-14.PHASE1)
DECISION: PLAN — ST-1407 House Map MVP(Sigma 렌더, 앵커 고정, Top‑K)
NEXT STEP: 스냅샷 어댑터와 Sigma 매핑을 정의한다
EVIDENCE: gumgang_meeting/status/design/sitegraph/HOUSE_MAP_MVP.md#L1-60

RUN_ID: 72H_20250821_1152Z
UTC_TS: 2025-08-21T11:52:40Z
SCOPE: TASK(BT-14.PHASE1)
DECISION: PLAN — ST-1408 Docs 인덱서 v0(SSDV 상태/owner 인덱스)
NEXT STEP: 문서 프런트매터 스펙과 인덱싱 규칙을 정한다
EVIDENCE: gumgang_meeting/status/design/ux_charter.md#L1-60

RUN_ID: 72H_20250821_1152Z
UTC_TS: 2025-08-21T11:52:45Z
SCOPE: TASK(BT-14.PHASE1)
DECISION: PLAN — ST-1409 일일 루틴/크론(스냅샷→검증→일일뷰)
NEXT STEP: 실패 시 알림과 append-only 보장을 포함한 스크립트 설계를 한다
EVIDENCE: gumgang_meeting/status/design/test_plan.md#L1-60

RUN_ID: 72H_20250821_1152Z
UTC_TS: 2025-08-21T11:52:50Z
SCOPE: TASK(BT-14.PHASE1)
DECISION: PLAN — ST-1410 QA/안정화(성능/무결성/PII_STRICT/패리티)
NEXT STEP: 체크리스트와 측정 지표를 확정한다
EVIDENCE: gumgang_meeting/status/design/test_plan.md#L1-60

RUN_ID: 72H_20250821_1152Z
UTC_TS: 2025-08-21T11:52:55Z
SCOPE: TASK(BT-14.PHASE1)
DECISION: PLAN — ST-1411 종료 체크포인트(BT-14 Phase 1 완료 선언)
NEXT STEP: Phase 2 착수 조건을 명시한다
EVIDENCE: gumgang_meeting/status/checkpoints/CKPT_72H_RUN.md#L1-60

RUN_ID: 72H_20250821_1152Z
UTC_TS: 2025-08-21T11:53:00Z
SCOPE: TASK(BT-14.PHASE2)
DECISION: PLAN — ST-1412 Approval API v1(제안/승인/거부, 감사로그 연동)
NEXT STEP: 계약서와 에러코드, 인증/권한을 정의한다
EVIDENCE: gumgang_meeting/status/design/bridge_contract.md#L1-60

RUN_ID: 72H_20250821_1152Z
UTC_TS: 2025-08-21T11:53:05Z
SCOPE: TASK(BT-14.PHASE2)
DECISION: PLAN — ST-1413 Apply/Verify 실행기(적용/검증 파이프)
NEXT STEP: 롤백 안전장치와 증거 기록 방식을 정의한다
EVIDENCE: gumgang_meeting/app/api.py#L1-60

RUN_ID: 72H_20250821_1152Z
UTC_TS: 2025-08-21T11:53:10Z
SCOPE: TASK(BT-14.PHASE2)
DECISION: PLAN — ST-1414 Rollback/시뮬레이션 가드(사전 검증)
NEXT STEP: 실패 시 경로와 시뮬레이션 플로우를 설계한다
EVIDENCE: gumgang_meeting/status/design/risks.md#L1-60

RUN_ID: 72H_20250821_1152Z
UTC_TS: 2025-08-21T11:53:15Z
SCOPE: TASK(BT-14.PHASE2)
DECISION: PLAN — ST-1415 승인 패널(UI) 읽기전용 트리거/배지
NEXT STEP: A6에서 승인 상태를 뱃지로 표시하는 뷰를 설계한다
EVIDENCE: gumgang_meeting/status/design/ui_integration.md#L1-60

RUN_ID: 72H_20250821_1152Z
UTC_TS: 2025-08-21T11:53:20Z
SCOPE: TASK(BT-14.PHASE2)
DECISION: PLAN — ST-1416 E2E 데모 및 DONE 기준 검증
NEXT STEP: 승인 루프의 전체 왕복 데모 계획을 수립한다
EVIDENCE: gumgang_meeting/status/design/test_plan.md#L1-60

RUN_ID: 72H_20250821_1156Z
UTC_TS: 2025-08-21T11:56:00Z
SCOPE: TASK(BT-14.PHASE1)
DECISION: ST-1401 진행 — 체크포인트 SSOT 마이그레이션 스펙 초안 작성 완료
NEXT STEP: 스펙 리뷰·승인 후 ST-1402(백엔드 구현 v1)를 시작한다
EVIDENCE: gumgang_meeting/status/design/checkpoints/CKPT_SSOT_MIGRATION_SPEC.md#L1-60

RUN_ID: 72H_20250821_1158Z
UTC_TS: 2025-08-21T11:58:00Z
SCOPE: TASK(BT-14.PHASE1)
DECISION: ST-1401 진행 — 스펙 보강(append/view/tail API 계약·오류코드·정준화 세부) 완료
NEXT STEP: ST-1402(백엔드 구현 v1) 설계 착수 — append writer/락·fsync/view/tail/체인검증
EVIDENCE: gumgang_meeting/status/design/checkpoints/CKPT_SSOT_MIGRATION_SPEC.md#L1-200

RUN_ID: 72H_20250821_1200Z
UTC_TS: 2025-08-21T12:00:00Z
SCOPE: TASK(BT-14.PHASE1)
DECISION: ST-1402 시작 — 백엔드 구현 v1 착수(append/view/tail API 추가; 해시체인·UTC 단조·락·fsync)
NEXT STEP: 엔드포인트 스모크 테스트와 체인 상태 점검 응답을 Evidence로 기록한다
EVIDENCE: gumgang_meeting/app/api.py#L213-384

RUN_ID: 72H_20250821_1201Z
UTC_TS: 2025-08-21T12:01:00Z
SCOPE: TASK(BT-14.PHASE1)
DECISION: ST-1402 진행 — 스모크 테스트 플랜 작성 완료 및 Evidence 기록
NEXT STEP: append→view→tail 라운드트립 스모크를 실행하고 결과를 Evidence로 저장한다
EVIDENCE: gumgang_meeting/status/evidence/checkpoints/tests/ST-1402_smoke_plan.md#L1-40

RUN_ID: 72H_20250821_1209Z
UTC_TS: 2025-08-21T12:09:00Z
SCOPE: TASK(BT-14.PHASE1)
DECISION: ST-1402 PASS — append/view/tail 라운드트립 및 체인 무결성 검증 통과
NEXT STEP: ST-1403(가드/뷰 고정: .md 스텁, pre-commit/push 훅, ckpt_lint) 설계를 시작한다
EVIDENCE: gumgang_meeting/status/evidence/checkpoints/tests/out/tail_after.json#L1-40

RUN_ID: 72H_20250821_1210Z
UTC_TS: 2025-08-21T12:10:00Z
SCOPE: TASK(BT-14.PHASE1)
DECISION: ST-1403 시작 — 가드/뷰 스텁 작업 시작(.md 스텁, pre-commit/push 훅, ckpt_lint)
NEXT STEP: CKPT_72H_RUN.md 뷰 스텁을 생성하고 pre-commit 훅 초안을 추가한다
EVIDENCE: gumgang_meeting/scripts/ckpt_lint.py#L1-40

RUN_ID: 72H_20250821_1211Z
UTC_TS: 2025-08-21T12:11:00Z
SCOPE: TASK(BT-14.PHASE1)
DECISION: ST-1403 진행 — CKPT_72H_RUN.md 뷰 스텁 생성 및 훅/린터 문서화 완료
NEXT STEP: pre-commit/pre-push 샘플 훅을 배치하고 A6 Checkpoints 뷰 설계를 시작한다
EVIDENCE: gumgang_meeting/status/design/checkpoints/HOOKS_SETUP.md#L1-40

RUN_ID: 72H_20250821_1212Z
UTC_TS: 2025-08-21T12:12:00Z
SCOPE: TASK(BT-14.PHASE1)
DECISION: ST-1403 PASS — CKPT 뷰 스텁·훅 샘플·린터 구성 완료
NEXT STEP: ST-1404 시작 — A6 Atlas 셸(읽기 전용) 설계를 진행한다
EVIDENCE: gumgang_meeting/status/design/checkpoints/HOOKS_SETUP.md#L1-60

RUN_ID: 72H_20250821_1213Z
UTC_TS: 2025-08-21T12:13:00Z
SCOPE: TASK(BT-14.PHASE1)
DECISION: ST-1404 시작 — A6 Atlas 셸(SSV/SSDV/Checkpoints, 읽기 전용) 설계·와이어프레임 배치
NEXT STEP: A6.3 Checkpoints 패널에서 view/tail 연동 설계를 완료한다
EVIDENCE: gumgang_meeting/ui/proto/atlas_A6/README.md#L1-40

RUN_ID: 72H_20250821_1214Z
UTC_TS: 2025-08-21T12:14:00Z
SCOPE: TASK(BT-14.PHASE1)
DECISION: ST-1405 시작 — A6.3 Checkpoints 패널 설계 문서 작성 및 API 연동 계획 준비 완료
NEXT STEP: A6.3 패널에서 view/tail API 연동 스켈레톤을 구현하고 읽기 전용 렌더를 배치한다
EVIDENCE: gumgang_meeting/ui/proto/atlas_A6/CHECKPOINTS_PANEL.md#L1-40

RUN_ID: 72H_20250821_1226Z
UTC_TS: 2025-08-21T12:26:00Z
SCOPE: TASK(BT-14.PHASE1)
DECISION: ST-1405 진행 — A6.3 Checkpoints 프로토타입 HTML 셸 추가(checkpoints.html)
NEXT STEP: view/tail API 연동 스켈레톤을 구현하고 렌더를 연결한다
EVIDENCE: gumgang_meeting/ui/proto/atlas_A6/checkpoints.html#L1-40
