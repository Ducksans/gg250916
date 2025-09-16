---
phase: past
---

# Start Guide — Read‑Only Runtime (RO)

목표
- 쓰기 금지(READ_ONLY) 상태에서 안전하게 파일을 열람·미리보기.
- 혼란 방지: .env, 진입점, 포트 규칙을 “하나”로 고정.

핵심 원칙(외워둘 3가지)
- .env는 gumgang_meeting/.env “한 곳만” 사용
- 진입점(백엔드 필요 시): uvicorn app.api:app
- 포트: UI 3037, 백엔드 8000

--------------------------------
빠른 시작(60초)

1) .env 확인(gumgang_meeting/.env)
   - READ_ONLY_MODE=true
   - FS_ALLOWLIST='[{"id":"ws","path":"/home/duksan/바탕화면/gumgang_0_5"}]'
   - (중요) 한 줄 JSON, 따옴표·쉼표 오류 금지
   - 쉘에 이전 FS_ALLOWLIST가 export 되어 있지 않은지 확인(있다면 unset)

2) 브리지(UI) 실행(프로젝트 루트에서)
    node bridge/server.js
   - 기본 포트: 3037

3) 접속
   - UI 스냅샷: http://localhost:3037/ui
   - Memory Inspector(RO): http://localhost:3037/ui/snapshots/unified_A1-A4_v0/memory_inspector.html
   - rootId 드롭다운에서 ws 선택 → 목록/미리보기 사용

4) (선택) 백엔드가 필요할 때만
    uvicorn app.api:app --host 0.0.0.0 --port 8000
   - 혼선을 막기 위해 main.py, main_legacy.py는 사용하지 않음

--------------------------------
환경 변수 키(.env, 루트에만)

- READ_ONLY_MODE=true
  • /api/chat 등 “쓰기” 계열 차단
- FS_ALLOWLIST='[{"id":"ws","path":"/abs/path"}]'
  • Memory Inspector가 루트 드롭다운에 표시할 허용 경로
  • 한 줄 JSON 필수
- (선택) OPENAI_API_KEY, OPENAI_MODEL
  • /api/chat 사용할 때만 필요(RO 모드에선 보통 미사용)

주의
- process.env 값이 .env보다 우선합니다. 이전 셸 export가 있으면 .env가 무시될 수 있습니다 → unset 권장.
- gumgang_meeting/gumgang_0_5 내부 .env는 사용하지 않습니다(이전 키/환경은 폐기됨).

--------------------------------
진입점·포트 규칙

- UI 브리지: node bridge/server.js → 3037
- 백엔드(필요 시): uvicorn app.api:app → 8000
- 그 외 포트/우회 스크립트/레거시 진입점은 “무시”

--------------------------------
보안/운영 기본값(RO)

- 쓰기 금지
  • /api/chat POST 등 쓰기/변경 유발 요청은 차단
- 파일 시스템
  • FS_ALLOWLIST 밖은 접근 불가
  • 대용량 미리보기는 128KB 페이징
  • server-side exclude(node_modules, .git 등) 적용
- CORS/도메인
  • 로컬 개발 기본 허용
  • 운영 시 필요한 도메인만 최소 화이트리스트

--------------------------------
체크리스트

- 환경
  [ ] gumgang_meeting/.env에 READ_ONLY_MODE=true
  [ ] FS_ALLOWLIST 한 줄 JSON, id=ws 경로 정확
  [ ] 셸에 남은 FS_ALLOWLIST export 해제(unset)

- 기동
  [ ] node bridge/server.js (3037 떠 있는지)
  [ ] http://localhost:3037/api/fs/roots 에서 roots 확인(ws 표시)
  [ ] Memory Inspector에서 ws 선택 시 목록 표시

- 사용
  [ ] sort/검색/페이지 정상
  [ ] 프리뷰 128KB Prev/Next 정상
  [ ] Orchestrator는 ECHO 스텁(쓰기 없음)

--------------------------------
문제 해결(Troubleshooting)

- 드롭다운에 ws가 안 보임
  • /api/fs/roots로 먼저 확인
  • .env의 FS_ALLOWLIST JSON 문법/경로/권한 확인
  • 셸 export 해제 후 서버 재시작

- 프리뷰가 중간에서 끊김
  • 128KB 페이징이 정상 동작인지 Next/Prev로 확인
  • 바이너리 파일은 미리보기 비활성(문자 대신 안내 문구)

- 예상치 못한 쓰기 시도
  • READ_ONLY_MODE=true 여부 확인
  • 브리지 로그에 차단 메시지(403) 확인

--------------------------------
샘플 .env(루트)

  READ_ONLY_MODE=true
  FS_ALLOWLIST='[{"id":"ws","path":"/home/duksan/바탕화면/gumgang_0_5"}]'
  # (선택) OPENAI_API_KEY=...
  # (선택) OPENAI_MODEL=gpt-4o-mini

--------------------------------
DO / DON’T

- DO
  • 루트 .env만 관리
  • 3037 UI로 열람/미리보기
  • 필요 시에만 백엔드(app.api:app) 8000 사용

- DON’T
  • gumgang_0_5 내부 .env 사용/복구
  • 다른 진입점(main.py 등)으로 기동
  • 임의 포트/과거 우회 스크립트 사용

이 문서는 “읽기 전용 조사”를 위한 최소 가이드입니다. 더 고급 기능(북마크/태그/노트, 페이지 점프, 성능 지표)은 이후 단계에서 추가할 수 있습니다.