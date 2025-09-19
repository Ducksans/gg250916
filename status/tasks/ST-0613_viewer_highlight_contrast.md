---
timestamp:
  utc: 2025-09-17T12:59Z
  kst: 2025-09-17 21:59
author: Codex (AI Agent)
summary: v2 스레드 뷰어/파일 뷰어 하이라이트(.hl) 대비 상향(가독성)
document_type: task_instruction
tags: [tasks, ui, viewer]
BT: BT-06
ST: ST-0613
phase: past
DOCS_TIME_SPEC: GG_TIME_SPEC_V1
---

# ST-0613 — 뷰어 하이라이트 대비 상향

목적
- /api/v2/threads/view, /api/files/view에서 #Lx-y 강조 가독성을 높인다.

수용 기준(AC)
- .hl 색상/투명도 조정으로 다크 테마에서도 명확히 구분(색맹 친화 팔레트 고려).
- 단일 줄(#Lx)·범위(#Lx-y) 모두 동일 룩앤필.
- 캡처 증적 2장(threads/file) 기록.

증적
- status/evidence/ui/sgm_runs/VIEWER_HL_CONTRAST_<UTC>_{threads,file}.png

리스크/가드
- 접근성 확인(명도 대비 AA 기준)

결과(2025-09-17)
- v2 스레드 뷰어의 .hl 강조를 한 톤 밝히고 border-left를 추가해 다크 테마에서 가독성 개선.
- 파일 뷰어(/api/files/view)와 일관된 줄/범위 강조 확인.
- 증적: app/api.py(v2_threads_view CSS), status/evidence/ui/sgm_runs/* 캡처
