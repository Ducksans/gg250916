---
timestamp:
  utc: 2025-09-18T14:35Z
  kst: 2025-09-18 23:35
author: Codex (AI Agent)
summary: 금강 코딩 에이전트 IDE 셸(v1) — VS Code 스타일 3분할 레이아웃/단축키/리사이저/전고 정책
document_type: spec
stage: stage2
DOCS_TIME_SPEC: GG_TIME_SPEC_V1
---

# GG_IDE_SHELL_SPEC_V1 — IDE Shell (Editor Mode)

## 목적
- VS Code 계열 UX를 채택한 전용 IDE 셸을 제공한다. A1 채팅 가드레일(ST‑1206)과 분리된 독립 레이아웃·스크롤·컴포저를 사용한다.

## 라우트
- Home: 전역 메뉴 Home를 IDE로 매핑(`/ui-dev/ide`)
- Dev/브라우저: `/ui-dev/ide`
- Tauri: 동일(전역 메뉴로 항상 진입 가능)

## 레이아웃
- 3분할 그리드(좌: Explorer, 중: Editor, 우: Chat)
- 각 컬럼은 자체 스크롤(상·하단 고정 없음)
- 전고: `calc(--vh - headerH)` — WebKitGTK/Tauri 보정을 위해 `--vh` 변수를 사용
- 우측 패널 기본 폭: 480px

## 리사이저
- 좌/중, 중/우 사이에 세로 리사이저(8px)
- 드래그 중 `user-select: none`, 커서 `col-resize`, pointer capture
- 최소 폭 제약: `left≥240`, `center≥560`, `right≥320`
- 더블클릭 프리셋: 접힘 → 280 → 480 순환(우측 패널)
- 상태 복원: localStorage(`GG_IDE_LEFT_W`, `GG_IDE_RIGHT_W`)

## 단축키
- 전역 전환: `Ctrl/Cmd+1` Chat, `Ctrl/Cmd+2` IDE
- 패널 토글: `Ctrl/Cmd+B` Explorer(파일 트리), `Ctrl/Cmd+J` Chat
- 빠른 열기: `Ctrl/Cmd+P` (경로 입력/최근 파일)
- 탭: `Ctrl/Cmd+W` 활성 탭 닫기(중복 탭 방지 유지), `Ctrl/Cmd+Shift+T` 닫힌 탭 복구(Phase 2)
- 프리셋: 우측 리사이저 더블클릭(접힘→280→480)

## 파일 I/O(Phase 1)
- 읽기: `GET /api/files/read?path=/…`
- 저장: 후속 Phase(Tauri FS/다이얼로그)

## 채팅 UX(IDE 전용)
- Chat 패널 고정(우측). 컴포저 항상 표시.
- Task History(스레드 히스토리) 버튼 제공: 과거/최근/즐겨찾기 스레드 빠른 전환(우측 상단 팝오버)

## 수용 기준(AC)
- 어떤 창 크기/리사이즈에서도 겹침/깨짐/되돌림 불가 현상 없음
- 좌/우 리사이저 가역(줄였다가 넓히기 가능), 프리셋/접힘 정상동작
- 우측 Chat 컴포저 항상 표시, 단축키 동작
- 동일 파일 탭 중복 생성 방지, 탭 중클릭 닫기 동작
- 브라우저/Tauri 동일 UX

## 구현 파일(Phase 1)
- `ui/dev_a1_vite/src/ide/IdeShell.jsx` — 헤더/그리드/리사이저/단축키
- `ui/dev_a1_vite/src/ide/IdeExplorer.jsx` — 파일 트리(재사용)
- `ui/dev_a1_vite/src/ide/IdeEditor.jsx` — 멀티탭 모나코(중복 방지/중클릭 닫기)
- `ui/dev_a1_vite/src/ide/IdeChat.jsx` — 타임라인+컴포저
- `ui/dev_a1_vite/src/ide/ide.css` — IDE 전용 스타일(네임스페이스 `.gg-ide`)
- 라우트: `ui/dev_a1_vite/src/main.jsx` `/ide` 매핑

> Phase 1.5(헤더/전환/프리셋):
> - Global Home=IDE 고정, Chat/IDE 전환 단축키(1/2), Explorer/Chat 토글(B/J)
> - "채팅만 최대/편집만 최대/적당 비율" 프리셋 추가
> - Task History 팝오버 골격
>
> Phase 2(완성도): 분할 에디터/세션 복원/프리셋 확장/키맵 강화/Save(Tauri FS)
