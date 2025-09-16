---
phase: present
---

---
timestamp:
  utc: 2025-09-16T06:57Z
  kst: 2025-09-16 15:57
author: Codex (AI Agent)
summary: 금강 문서들을 과거/현재/미래 구간으로 재정렬한 인덱스
document_type: catalog_index
tags:
  - #catalog
  - #phase
  - #ssot
DOCS_TIME_SPEC: GG_TIME_SPEC_V1
---

# DOCS_PHASE_INDEX — 금강 문서 시계열 인덱스

> Dataview 플러그인이 있으면 아래 표가 자동으로 생성됩니다. 문서의 `phase` 필드를 past/present/future 로 설정하면 이 인덱스에 즉시 반영됩니다.

## 1. 과거(PAST)
```dataview
TABLE file.link AS Doc, file.folder AS Folder, phase, summary
FROM "status"
WHERE phase = "past"
SORT file.name ASC
```

## 2. 현재(PRESENT)
```dataview
TABLE file.link AS Doc, file.folder AS Folder, phase, summary
FROM "status"
WHERE phase = "present"
SORT file.name ASC
```

## 3. 미래(FUTURE)
```dataview
TABLE file.link AS Doc, file.folder AS Folder, phase, summary
FROM "status"
WHERE phase = "future"
SORT file.name ASC
```

---

## 4. ST/BT 재매핑 가이드
- 2025-09-16 이후 새 작업은 `BT11~BT21` 로드맵에 맞춰 `ST11xx` 번호부터 시작합니다.
- 과거 작업은 `phase: past` 로 표시하고, 필요 시 별도 표에 옛 ST 번호를 보관합니다.

## 5. 유지 관리 팁
- 새 문서를 만들 때 YAML 헤더에 `phase` 필드를 꼭 넣으세요.
- 기존 문서를 분류할 때는 Obsidian의 Dataview 테이블에서 클릭 → 헤더 수정으로 처리하면 편합니다.
- 월 1회 이 인덱스를 열어 미분류 문서가 없는지 확인하세요.
