---
timestamp:
  utc: 2025-09-17T12:58Z
  kst: 2025-09-17 21:58
author: Codex (AI Agent)
summary: Evidence 링크 유효성 필터 추가(/api/files/exists 기반, legacy는 v2 viewer로 리라이트 유지)
document_type: task_instruction
tags: [tasks, ui, evidence]
BT: BT-06
ST: ST-0612
phase: past
DOCS_TIME_SPEC: GG_TIME_SPEC_V1
---

# ST-0612 — Evidence 링크 유효성 필터

목적
- 깨진 파일 링크(conversations/threads/… 등 실파일 부재)를 UI에 노출하지 않고, 가능한 경우 v2 viewer로 자동 대체한다.

수용 기준(AC)
- 클릭 전 `/api/files/exists?path=…`로 HEAD 검사를 수행해 존재하지 않는 파일은 숨김/대체.
- legacy `conversations/threads/*.jsonl#Lx-y`는 `/api/v2/threads/view?id=…#Lx-y`로 리라이트.
- 리스트/타임라인 모두에서 깨진 링크 0, 대체 동작은 캡처로 증적.

증적
- status/evidence/ui/sgm_runs/EV_LINK_FILTER_<UTC>.{json,png}

리스크/가드
- exists API가 404→UI 숨기기까지 왕복 지연이 크지 않도록 비동기 처리 + UI 캐시 사용.

결과(2025-09-17)
- UI에 링크 유효성 필터 적용: /api/files/exists로 실재 확인 후 노출, legacy는 v2 viewer 리라이트 유지.
- 요약행 실제 노출 개수와 원본 병기 표기가 분리되는 문제는 ‘원본 병기/간략’ 토글로 해결(기본=간략).
- 증적: ui/dev_a1_vite/src/components/chat/messages/Message.jsx, status/evidence/ui/sgm_runs/* 캡처
