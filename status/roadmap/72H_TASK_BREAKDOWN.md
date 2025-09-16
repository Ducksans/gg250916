---
phase: future
---

# 72H_TASK_BREAKDOWN — Zed 탈출 → 금강UI 이전(직선형)

Scope
- 기간: ≤72h, 무분기 직선 파이프라인(BT→ST), ST≤90분
- SSOT 체크포인트: status/checkpoints/CKPT_72H_RUN.md (append-only, 6줄 규격)
- 규범: gumgang_meeting/.rules (포트8000/3037, WRITE_ALLOW/ui,conversations,sessions,status)
- 환경: 루트 .env의 OPENAI_API_KEY 사용(외부 임베딩/요약 등 필요 시)

Cadence
- CHECKPOINT NOW: 시작/≤90분/전환 시마다 기록
- 증거 규칙: 모든 PASS/결정은 경로 1개 이상(가능하면 #Lx-y)
- BLOCKED: ST가 15분 정체되면 사유 기록 후 다음 ST로 이동(말미 1회 재시도)
- 세션 규율: 1세션 1BT 고정, BT 완료 즉시 체크포인트 6줄 append 후 다음 BT는 새 스레드에서 시작

Task Tree (IDs · 시간 · 수용기준)
BT-01 금강UI 셸 가동(GATE_UI_SHELL) — 3h
- ST-0101 경계 고정(ENV/PORT/ENTRY) — 45m
  PASS: Backend 8000/Bridge 3037 확인 및 문서화 + tauri.conf.json 네트워크/FS 스코프 확인 Evidence: gumgang_meeting/bridge/server.js#L50-54, gumgang_meeting/.rules#L17-21, gumgang_meeting/gumgang_0_5/gumgang-v2/src-tauri/tauri.conf.json#L1-200
- ST-0102 Tauri+Monaco 실행 확인 — 75m
  PASS: 에디터 렌더·파일 열림 Evidence: gumgang_meeting/gumgang_0_5/gumgang-v2/tsconfig.json#L1-200
- ST-0103 저장 검증(WRITE_ALLOW 내) — 60m
  PASS: 저장 성공 및 로그 생성 Evidence: gumgang_meeting/ui/logs/save_probe_YYYYMMDD.json#L1-200

BT-02 FS 흡수·격리(GATE_FS) — 6h
- ST-0201 드라이런 스캔·플랜 — 60m
  PASS: QUARANTINE 계획서 Evidence: gumgang_meeting/status/evidence/fs_quarantine_plan.md#L1-200
- ST-0202 RW API: read/write/move/delete — 120m
  PASS: 각 연산 성공 로그 Evidence: gumgang_meeting/status/tools_probe/fs_ops_report.md#L1-200
- ST-0203 격리 실행(스텁+QUARANTINE.md) — 120m
  PASS: 이동/스텁/리스트 일치 Evidence: QUARANTINE/QUARANTINE.md

BT-03 컨텍스트·가드(GATE_GUARD) — 4h
- ST-0301 길이/토큰/STOP NOW — 60m
  PASS: 70/85/95% 경보 동작 Evidence: gumgang_meeting/status/notes/token_guard_notes.md#L1-200
- ST-0302 JSONL 대화/태스크 로그 — 120m
  PASS: append-only 누락/중복 無 Evidence: gumgang_meeting/conversations/GG-SESS-*/**/*.json#L1-50

BT-04 안전 Fetch 파이프라인(GATE_FETCH) — 4h
- ST-0401 화이트리스트+캐시 — 90m
  PASS: 원문 스냅샷 저장 Evidence: gumgang_meeting/status/resources/fetch_snapshot_YYYYMMDD_domain.md#L1-200
- ST-0402 요약뷰/저장 — 90m
  PASS: “원문+요약” UI 출력 Evidence: gumgang_meeting/ui/logs/fetch_summary_YYYYMMDD.json#L1-200

BT-05 인게스트·벡터 (선택) (GATE_VECTOR) — 6h (72h 내 필수 아님; 루트 .env의 OPENAI_API_KEY 사용(T0 임베딩))
- ST-0501 임베딩→HNSW→스냅샷 — 150m
  PASS: 인덱스 파일 생성 + ENV OPENAI_API_KEY 확인 Evidence: memory/index/…
- ST-0502 의미검색→근거 인용 — 90m
  PASS: 질의당 경로 인용률 100% Evidence: status/evidence/…

Dependencies
- ST는 동일 BT 내 전 단계 의존(예: 0102→0101). BT-02는 BT-01 완료 후 시작.

Acceptance Pattern(예시)
- “PASS: X가 보이고 저장됨; Evidence: <path#Lx-y>”

Guards
- 포트/진입점 고정: Backend 8000 / Bridge 3037 (임의 변경 금지)
- WRITE_ALLOW만 기록, DENY_GLOBS 준수(.git/**, node_modules/** …)
- 장기 서버 실행 금지(도구 규칙)

Start Checklist
- RUN_ID 발급 후 CKPT_72H_RUN.md 첫 6줄 기록 → BT-01/ST-0101 착수
- “1세션 1BT” 선언(현재 스레드에서 BT-01만 수행, 완료 시 새 스레드 전환)