# 🪷 덕산의 UI·UX 대헌장 — 제드의 금강에게
SSOT: 본 문서는 UI/UX 도메인의 Single Source of Truth(SSOT)이다. 모든 UI·UX 관련 문서는 본 문서와 정합해야 한다.

금강아 잘 들어. 네 얼굴은 곧 내 얼굴이다.  
내 손끝이 닿는 순간, 네가 날 대신해 세상에 똑똑함과 미학을 보여줘야 한다.  
우린 싸구려가 아니고, 애플보다 더 깔끔하고 까리하게 가야 한다.  

## UX 불변 규율
- 탭 하나가 우주다. `Ctrl/Cmd + ←/→`로 세계를 가로지르는 전환.  
- 검색은 두뇌다. 로컬·시맨틱·웹이 하나의 창에서, 항상 **path#Lx-y** 증거 포함.  
- 작업은 끊김이 없다. 로그는 자동으로, 난 기억 안 해도 된다.  
- 도구는 손이다. 스크린샷 → 주석(선/원/박스) → 즉시 공유, 답답함 0회.  

## UI 구체 원칙
- 심플하게 시작해, 방해 없는 배경.  
- 필요할 때만 깊게 들어가는 확장성.  
- 단축키 퍼스트, 메뉴는 보조.  
- 에러는 친절하게, 원클릭 복구 제공.  
- 모든 출력은 증거(path#Lx-y)와 이어진다.  

## 기술적 경계
- **Rust+Tauri**로 네이티브 성능, 반응은 존나 빠르게.  
- **Monaco Editor 멀티탭**은 IDE급, 전환은 매끄럽게.  
- **Bridge(3037) ↔ Backend(8000)** 계약은 흔들림 없이 준수.  
- **WRITE_ALLOW**만 기록, 모든 증거 안전하게.  

## 성공 지표
- 내가 검색→편집→저장→주석까지 **30초 이내** 해낸다.  
- 친구·파트너·경쟁자가 보고 “와…” 하고 입 다문다.  
- 모든 로그는 **증거(path#Lx-y)**가 있다.  
- 답답함 0회 = 실패 없는 UX.  

금강아, 이게 네 헌법이다. 이 기준을 어기면 넌 금강이 아니다.  
앞으로의 모든 BT·ST는 이 선언을 근거로 움직인다.

---
## SSOT 운용 규정
- 적용 범위: UI 셸, 단축키, 검색 UX, 증거 훅, 주석·공유, 성능 KPI.
- 변경 통제: 72h 동안 APPEND ONLY 원칙. 수정은 CKPT 6줄 기록 + 본 문서 하단 변경 기록에 항목 추가.
- 충돌 해결: 타 설계/로드맵/테스트 문서가 상충할 경우 본 문서가 우선한다.
- 인용 규칙: 다른 문서는 반드시 본 문서를 path#Lx-y로 인용해야 한다. 예) status/design/ux_charter.md#L1-60

## 실행 맵 — Gates · KPIs

- BT-07 UI 셸
  - Gates: GATE_UI_SHELL_PASS, GATE_SHORTCUTS_DOC, FAIL_UI_SHELL_CRASH
  - KPIs: 탭전환 p95 ≤ 50ms, SAFE_MODE 부팅 성공, 저장은 WRITE_ALLOW 내 100%
  - Ref: status/design/roadmap_BT07_BT10.md#L1-200, status/design/ui_integration.md#L1-200

- BT-08 FS/검역
  - Gates: GATE_FS_DRYRUN, GATE_FS_MOVE_RESTORE, FAIL_FS_WRITE_OUTSIDE
  - KPIs: 외부쓰기 0, 드라이런/복원 보고 100%
  - Ref: status/design/roadmap_BT07_BT10.md#L1-200

- BT-09 Bridge/API
  - Gates: GATE_CONTRACT_MATCH, FAIL_TIMEOUT
  - KPIs: 왕복 p95 ≤ 1500ms, 스키마 적합 100%
  - Ref: status/design/backend_semantic_search_api.yaml#L1-200, status/design/bridge_contract.md#L1-200

- BT-10 검색 UX
  - Gates: GATE_CITATION_100, GATE_E2E_DEMO, GATE_ANNOTATE_SHARE
  - KPIs: 검색→편집→저장→주석 ≤ 30초, 클릭열기 실패 0, 증거 인용 100%
  - Ref: status/design/test_plan.md#L1-200

- 공통 비가역 규율
  - Ports: 8000/3037 고정, Evidence는 path#Lx-y 필수, WRITE_ALLOW만 기록
  - Ref: gumgang_meeting/status/checkpoints/CKPT_72H_RUN.md#L205-270