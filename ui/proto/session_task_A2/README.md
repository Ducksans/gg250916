# Session/Task View A2 — Minimal Prototype Spec & Plan
목적: A2 핵심 테스트(A2-T1 세션 생성, A2-T2 세션 삭제, A2-T3 태스크 생성, A2-T4 태스크 상태 토글)의 PASS 증거(스크린샷·간단 로그)를 “가장 빠르게” 수집한다.  
원칙: 즉시 판별성(Immediate Verifiability), 정적(Static) HTML/CSS/JS 한 파일 세트, 15~20분 타임박스.

---

## 1) 범위(Scope)
- 포함:
  - Session List(세션 목록) + “New Session” 버튼 + “Delete” 버튼
  - Session 선택 시 해당 Session의 Task List 표시
  - Task 생성 입력창 + “Add Task” 버튼
  - Task 상태 토글(진행↔완료) 체크박스 + 시각 상태(예: 취소선/아이콘)
- 제외: 영구 저장(파일/서버), 백엔드 연동, 라우팅. 브라우저에서 열면 동작(메모리 유지).

파일 배치(권장):
- gumgang_meeting/ui/proto/session_task_A2/index.html
- gumgang_meeting/ui/proto/session_task_A2/styles.css (선택)
- gumgang_meeting/ui/proto/session_task_A2/app.js (선택)

---

## 2) Acceptance Criteria (즉시 판별 기준)
A2-T1 — 세션 생성(New Session)
- 클릭 즉시(≤1000ms) 세션 항목이 목록(.sessions)에 추가됨
- 신규 세션이 자동 선택(.session-item.selected)되고, 우측 Task View 초기화됨
- 세션 명명 규칙(예): “Session 1”, “Session 2” … 또는 타임스탬프
- Evidence:
  - Screenshot: gumgang_meeting/ui/logs/ui_mvp_gate_20250816/screenshots/A2-T1.png
  - DOM: .sessions .session-item:last-child.selected
  - Note: created_at(HH:MM), tasks_count=0

A2-T2 — 세션 삭제(Delete Session)
- 선택된 세션에 대해 “Delete” 수행 시 목록에서 제거됨
- 목록/선택 상태 동기화(이전/다음 항목 중 하나가 선택되거나, 없으면 빈 상태)
- Task View도 해당 세션의 컨텍스트에 맞게 갱신(선택 세션 기준)
- Evidence:
  - Screenshot: gumgang_meeting/ui/logs/ui_mvp_gate_20250816/screenshots/A2-T2.png
  - DOM: .sessions .session-item:not(.deleted) && 우측 패널 상태 변동
  - Note: after_delete_selected_session_id

A2-T3 — 태스크 생성(Add Task)
- 현재 선택된 세션에서 Task 입력 → “Add Task” 클릭(또는 Enter) 즉시(≤1000ms) 리스트(.tasks)에 추가
- Task 항목에는 제목, 상태(기본 진행중), 생성 시간 표시 가능
- Evidence:
  - Screenshot: gumgang_meeting/ui/logs/ui_mvp_gate_20250816/screenshots/A2-T3.png
  - DOM: .tasks .task-item:last-child .title
  - Note: session_id, task_title, tasks_count_after

A2-T4 — 태스크 상태 토글(Toggle Status)
- 체크박스 클릭 시 진행↔완료 즉시 전환
- 완료 상태 시 .task-item.completed 클래스 부여(예: 텍스트 취소선, 아이콘/색상 변경)
- 현재 세션을 벗어나지 않는 한 상태는 메모리에 유지
- Evidence:
  - Screenshot: gumgang_meeting/ui/logs/ui_mvp_gate_20250816/screenshots/A2-T4.png
  - DOM: .tasks .task-item.completed .title
  - Note: toggled_task_id, completed=true|false

---

## 3) UI 구성(Selectors/Layout)
- 레이아웃(2열)
  - 좌측: 세션 사이드바(.sessions-panel)
    - 목록: .sessions
    - 항목: .session-item[ data-id="…" ]
    - 선택 상태: .session-item.selected
    - 버튼: #newSessionBtn, #deleteSessionBtn
  - 우측: 태스크 패널(.tasks-panel)
    - 입력: #taskInput, 버튼: #addTaskBtn
    - 목록: .tasks
    - 항목: .task-item[ data-id="…" ] (체크박스 .toggle, 제목 .title)
    - 완료 상태: .task-item.completed

권장 초기 상태:
- 세션 1개 자동 생성 + 선택
- 작업(태스크) 목록은 빈 상태

---

## 4) 동작(Behavior)
- New Session
  - 클릭 시 새로운 세션 객체를 메모리에 생성 → 목록에 추가 → 자동 선택 → Task View 리셋
- Delete Session
  - 선택된 세션을 제거 → 인접 세션 자동 선택(없으면 비선택 상태 + 빈 Task View)
- Add Task
  - 현재 선택된 세션의 tasks 배열에 push → 목록 렌더 → 입력창 초기화/포커스 유지
- Toggle Task
  - task.completed = !task.completed → CSS 클래스 토글(.completed)

데이터 구조(예시, 메모리):
- sessions: Array<{
    id: string;
    name: string;
    createdAt: string; // HH:MM
    tasks: Array<{ id: string; title: string; completed: boolean; createdAt: string; }>;
  }>
- selectedSessionId: string | null

---

## 5) 수동 테스트 절차(≤10줄)
1) index.html 브라우저로 열기(file://)  
2) “New Session” 클릭 → 목록/선택/우측 패널 초기화 확인 → A2-T1.png 캡처  
3) “Delete” 클릭 → 현재 선택 세션 제거/선택 상태 갱신 확인 → A2-T2.png 캡처  
4) Task 입력란에 제목 입력 → “Add Task” → 리스트 즉시 추가 확인 → A2-T3.png 캡처  
5) 생성된 Task의 체크박스 클릭 → 완료 스타일(취소선/아이콘) 확인 → A2-T4.png 캡처

---

## 6) Evidence(증거) 기록 최소안
- 스크린샷(필수)
  - gumgang_meeting/ui/logs/ui_mvp_gate_20250816/screenshots/A2-T1.png
  - gumgang_meeting/ui/logs/ui_mvp_gate_20250816/screenshots/A2-T2.png
  - gumgang_meeting/ui/logs/ui_mvp_gate_20250816/screenshots/A2-T3.png
  - gumgang_meeting/ui/logs/ui_mvp_gate_20250816/screenshots/A2-T4.png
- 간단 로그(선택)
  - 경로 예: gumgang_meeting/ui/logs/ui_mvp_gate_20250816_A2.json
  - 필드 예:
    - T1: created_session_name, selected=true
    - T2: deleted_session_id, new_selected_session_id
    - T3: session_id, task_title, tasks_count_after
    - T4: task_id, completed=true|false

---

## 7) DoR/DoD
- Definition of Ready
  - index.html에서 양 패널 레이아웃이 보이고, 버튼/입력/리스트 영역이 존재
- Definition of Done
  - A2-T1~T4 PASS 기준 충족
  - 스크린샷 4장 확보
  - (선택) 간단 로그 작성

---

## 8) 리스크/완화
- 선택 상태 동기화 혼동 → selectedSessionId 단일 소스로 관리, 렌더 시 명확히 반영
- 삭제 후 선택 대상 → 직전/직후 항목 또는 null 처리 규칙 고정
- 스타일 일관성 → 시스템 폰트/간단 팔레트, 다크/라이트 모드 옵션은 A1과 유사 구조 권장

---

## 9) Next
- A2 확정 후, A1(Chat View)과 통합한 단일 화면 목업 정리
- Tools/Status 패널(A3/A4) 미니 프로토타입으로 확대