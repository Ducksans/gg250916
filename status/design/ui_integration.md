---
timestamp:
  utc: 2025-09-16T20:02Z
  kst: 2025-09-17 05:02
author: Codex (AI Agent)
summary: BT-06 ST-0606을 위한 Dev UI 통합 UX/명령 정의 초안
document_type: design_spec
tags:
  - #design
  - #bt-06
  - #st-0606
phase: present
DOCS_TIME_SPEC: GG_TIME_SPEC_V1
---

# UI Integration (Draft)

```dataviewjs
const D = dv.luxon.DateTime;
dv.paragraph(`(as of ${D.utc().toFormat("yyyy-LL-dd HH:mm'Z'")})`);
```

## 목적
시맨틱 검색 UX를 UI 셸에 통합하기 위한 표면, 명령, 키맵, 패널, 저장 정책 정의.
본 문서는 status/design/ux_charter.md의 원칙과 정합해야 한다.

## 런타임(단일 관문)
- Backend: FastAPI(`/api/*`) 고정
- Source: DB(v2) 고정 — 목록: `/api/v2/threads/recent`, 읽기: `/api/v2/threads/read?id=`

플래그(운영 기본)
- `GG_THREAD_SOURCE = db` 고정
- `GG_CHAT_BACKEND = fastapi` 고정

## Thread Import & 목록 동작
- Import Threads(TopToolbar) → Source에 따라 v1/v2 recent/read 호출.
- 좌측 목록 무한스크롤: IntersectionObserver(root=`#gg-threads`, rootMargin=600px). 페이지 크기 기본 20.
- URL↔스토어 동기화: 라우트에 threadId가 있을 때는 스토어만 전환, 없을 때만 URL을 갱신(깜빡임 방지).

Evidence
- `status/evidence/ui/thread_import_*.{log,json}` — 러너/수동 임포트 로그
- `status/evidence/ui/ST0103_UI_PASS_*.md` — UI PASS 요약

수용 기준(Threads)
- Source=DB에서 Import/무한스크롤 정상(20→40→… 증가), 임의 스레드 진입 시 turns 렌더.
- 새로고침 후 URL이 유지되고 깜빡임 없음.

## 명령 (Command Palette)
- Semantic Search: Query (id: cmd.semantic.search)
- Open File at Line (id: cmd.file.openAtLine)
- Toggle Search Panel (id: cmd.panel.search.toggle)
- Tab: Next (id: cmd.tab.next)
- Tab: Prev (id: cmd.tab.prev)
- Screenshot: Annotate (id: cmd.annotate.screenshot)
- Share Artifact (id: cmd.share.artifact)

## 키바인딩 (Keybindings; 제안)
- Ctrl+K S → Semantic Search: Query
- Ctrl+Shift+F → Toggle Search Panel
- Ctrl+G → Open File at Line
- Ctrl/Cmd+→ → Tab: Next
- Ctrl/Cmd+← → Tab: Prev
- Ctrl+Alt+A → Screenshot: Annotate
- Ctrl+Alt+S → Share Artifact

## 패널 (Panels)
- Search Results Panel: 리스트(순위, 경로, Lx-y, 스니펫), 더블클릭 시 파일/라인 오픈.
- Annotation Panel: 도형(선/원/박스)·텍스트 도구, 내보내기/공유 버튼, Evidence 자동 기록(파일 경로·라인 포함 오버레이).

## 저장 정책 (Write Policy)
- 결과 캡처/로그: status/evidence/* 에 저장.
- 사용자 편집 저장: WRITE_ALLOW 내 경로만 허용.

## 증거 규칙
- 모든 결과는 path#Lx-y 인용 100%.

## 증거 훅 (Evidence Hooks)
- openAtLine 실행 시: status/evidence/ui_open_navigation.log

## Session Updates — 2025-09-17 (UTC)
- Lint errors resolved to zero for A1 Dev UI; targeted fixes:
  - ChatTimeline.jsx — hooks unconditional call; removed conditional hook errors.
  - Message.jsx — ensure useState called unconditionally.
  - A1Dev.jsx — stream loop guard; memory/store refs now use normRefs.
  - EdgeToggles.jsx — empty catch blocks documented.
- Threads v2 import/read confirmed via Bridge proxy; UI Import operates with `Source=DB` flag.
- Evidence: `status/evidence/bridge/V2_PROXY_SMOKE_20250917T0441Z.md`, `status/evidence/ui/lint_final_20250917T0502Z.log`.
- 파일 저장 이벤트: status/evidence/ui_save.log (경로, 바이트 수, 시간)
- 검색 결과 캡처: status/evidence/ui_search.json (query, top_k, results[*].path,line_start,line_end,snippet)
- 주석 내보내기: status/evidence/ui_annotation_<YYYYMMDD_HHMM>.png
- 공유 수행 로그: status/evidence/ui_share.log (대상, 아티팩트 경로)
- 네이밍 규칙: <YYYYMMDD_HHMM>_<scenario>.{json|log|png}
- 모든 아티팩트는 문서에서 path#Lx-y로 인용 가능해야 한다.

## SGM(엄격 게이트) 운영 방침
- 개발: `GG_STRICT_GATE=soft|hard` 토글 제공(DevTools/설정). soft에서 품질 지표(무응답률↓, 인용률↑)가 기준을 충족하면 운영 기본으로 채택.
- 운영: 기본 soft(또는 자동 판단). 토글은 UI에서 숨김, 설정값/환경변수로만 변경 가능.

## 툴/대화 API 표준
- 자동 툴콜: `/api/chat/toolcall`
- 스트림: `/api/chat/stream`(필요 시)
- 단일 응답: `/api/chat`

## UX 플로우 (30초 챌린지)
- 검색 → 결과 더블클릭 오픈 → 편집 → 저장 → 스크린샷 주석 → 공유 ≤ 30초
  - Evidence: ui_search.json, ui_open_navigation.log, ui_save.log, ui_annotation_*.png, ui_share.log
- 탭 네비게이션: Ctrl/Cmd+←/→로 탭 전환 p95 ≤ 50ms, 실패 0
  - Evidence: status/evidence/ui_tab_nav.log (전환 이벤트 타임스탬프/지연)

## 유지보수
- 각 변경 시 CKPT 6줄 기록 + 본 문서 상단의 변경일 또는 하단 '변경 기록' 섹션에 항목 추가.

## 긴급 복구 계획 (Rust/Tauri UI)
- 원칙: 미니멀 셸부터 살리고(빈 창+메뉴), 기능은 단계적으로 재활성화.
- 1) 버전/환경 고정: Rust toolchain, Cargo deps, Tauri 설정을 명시 고정(semver 범위 제거).
- 2) SAFE MODE: SAFE_MODE=1 시 Monaco/플러그인 비활성, 빈 HTML 로드로 스모크. 실패 시 status/evidence/ui_crash.log 기록.
- 3) Monaco 지연 로드: dynamic import, 실패 시 textarea 폴백. 재시도 버튼 제공.
- 4) 런타임 가드: panic hook/console error 수집 → status/evidence/ui_runtime.log (OS/버전/스택 포함).
- 5) 단계적 복구 순서: Open→Save(WRITE_ALLOW 확인)→Search Panel→단축키. 각 단계 후 CKPT 6줄 기록.
- 6) 시스템 의존성 점검(Linux): WebKit2GTK 등 런타임 패키지 확인, Node/패키지 매니저 버전 고정(해당 시).
- 7) 롤백 전략: ui_stable_baseline 태그 기준 롤백; 기능 토글은 플래그로 뒤집기 가능하게 유지.

완료 기준
- 앱 실행/파일 열기/저장(WRITE_ALLOW) 성공, 흰 화면/크래시 0회(SAFE/NORMAL 모두). 에러 로그가 status/evidence/*에 남을 것.

산출물
- status/evidence/ui_crash.log, status/evidence/ui_runtime.log, 본 문서 업데이트, 관련 CKPT 엔트리.

## 변경 기록
- BT-06 ST-0606(2025-09-16): Backend×Source 매트릭스, v1/v2 엔드포인트/플래그, Import/무한스크롤/라우팅 정합성 반영.
- BT-06 ST-0610: Rust/Tauri UI 긴급 복구 계획 추가; 유지보수 규칙 보강.
- BT-06 ST-0611: UX 대헌장 연결(명령/단축키 확장, UX 플로우·Evidence 훅 추가).
