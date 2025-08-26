# Roadmap — BT-07 .. BT-10 (Draft)

목적: BT-05(벡터) 완료 이후 운영화를 위한 선형 큰 과제 정의.
포트/엔트리포인트 고정: BACKEND 8000, BRIDGE 3037 (변경 금지, 체크포인트 승격 전까지)

## BT-07 — UI Shell 안정화
- Scope: Tauri+Monaco 셸 완결(열기/편집/저장), 명령 팔레트/단축키, 에러 핸들링.
- Gates:
  - GATE_UI_SHELL_PASS: 셸 렌더, 파일 열기, 저장이 WRITE_ALLOW 내에서 동작. Evidence 경로 기록.
  - GATE_SHORTCUTS_DOC: keymap/명령 일람이 문서화(status/design/ui_integration.md 참조).
  - FAIL_UI_SHELL_CRASH: 렌더/네비게이션 중 크래시·패닉 발생 시 실패.
  - FAIL_SAVE_OUTSIDE_SCOPE: WRITE_ALLOW 외 경로 저장 시도/성공 시 실패.
- KPIs:
  - 탭 전환 p95 ≤ 50ms(Ctrl/Cmd+←/→), SAFE_MODE 부팅 성공(흰 화면 0)
  - 저장 성공률 100%(WRITE_ALLOW 내), 크래시 0
- UX Flows:
  - 새 탭 열기 → Ctrl/Cmd+←/→ 전환 → 편집 → 저장(≤30초)

## BT-08 — FS + Quarantine 운영화
- Scope: 흡수/검역 드라이런 리포트, 이동/복원, 스텁 노트, QUARANTINE/QUARANTINE.md 자동화.
- Gates:
  - GATE_FS_DRYRUN: 드라이런 리포트 산출(status/evidence/quarantine_dryrun.md) 및 CKPT 인용.
  - GATE_FS_MOVE_RESTORE: 표본 경로 이동→복원 검증, 외부 쓰기 없음.
  - FAIL_FS_WRITE_OUTSIDE: WRITE_ALLOW 밖 쓰기/이동 발생 시 실패.
  - FAIL_QUARANTINE_NO_STUB: 격리 시 스텁 노트 또는 QUARANTINE 목록 미작성 시 실패.
- KPIs:
  - 드라이런 리포트 100% 생성, 외부 쓰기 0, 표본 이동→복원 성공률 100%
- UX Flows:
  - 드라이런 실행 → 리포트 열람 → 표본 이동 → 스텁/QUARANTINE 확인 → 복원

## BT-09 — Bridge/API 통합
- Scope: UI↔Bridge(3037)↔Backend(8000) 왕복; 검색 API 계약(backend_semantic_search_api.yaml) 준수.
- Gates:
  - GATE_CONTRACT_MATCH: 요청/응답 스키마가 설계와 일치(샘플 캡처 증거).
  - GATE_ROUND_TRIP: 샘플 쿼리 왕복 성공 로그/증거.
  - FAIL_CONTRACT_DRIFT: 실제 요청/응답이 backend_semantic_search_api.yaml과 불일치 시 실패.
  - FAIL_TIMEOUT: 샘플 왕복의 응답 시간이 2초 초과가 지속적으로 재현되면 실패.
- KPIs:
  - 왕복 p95 ≤ 1500ms, 계약 적합성 100%, 하트비트 누락 시 60s 내 재연결 로그
- UX Flows:
  - 검색 요청 전송 → 응답 수신 → 오류 시 친절 메시지 + 원클릭 재시도

## BT-10 — E2E 시맨틱 검색 UX
- Scope: UI 검색 입력→Top-K 결과(라인 범위 인용) 표시→클릭 시 파일/라인 열기.
- Gates:
  - GATE_E2E_DEMO: 데모 캡처(status/evidence/e2e_search.png) 또는 로그 증거.
  - GATE_CITATION_100: 결과마다 path#Lx-y 인용 100% 보장.
  - FAIL_MISSING_CITATION: 결과 중 path#Lx-y 누락 항목이 하나라도 존재하면 실패.
  - FAIL_OPEN_NAV: 결과 클릭 시 파일/라인 오픈 실패가 재현되면 실패.
- KPIs:
  - 검색→편집→저장→스크린샷 주석→공유 ≤ 30초, 클릭 열기 실패 0, 인용 100%
- UX Flows:
  - 검색 → Top-K → 결과 더블클릭 → 파일/라인 오픈 → 주석 도구로 표시 → 즉시 공유

참고: 모든 게이트는 체크포인트 6줄 포맷과 Evidence 경로 인용을 동반한다. 본 로드맵은 UX 대헌장(status/design/ux_charter.md)과 정합해야 한다.
