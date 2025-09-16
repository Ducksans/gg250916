---
phase: present
---

---
timestamp:
  utc: 2025-09-16T04:51Z
  kst: 2025-09-16 13:51
author: Codex (AI Agent)
summary: 금강 프로젝트 핵심 문서 색인 및 Dataview 쿼리 모음
document_type: catalog_index
tags:
  - #catalog
  - #ssot
  - #dataview
---

# SSOT Sitemap — 금강 문서 색인(Obsidian Dataview)

> Dataview 플러그인 설치 시 표가 자동 생성됩니다. 없더라도 링크는 수동으로 사용할 수 있습니다.

## 0) 에이전트 허브 링크
- [[AGENTS.md|AGENTS Core]] · [[AGENTS_expand.md|AGENTS 확장]] · [[AGENTS_log.md|문서 관리 게이트]]
- [[status/reports/EXEC_PLAN_MIGRATION_AND_CHAT_RESTORE.md|EXEC_PLAN]] · [[status/reports/GG_TIME_SPEC_V1.md|GG_TIME_SPEC_V1]]

## 1) 핵심 문서(고정 링크)
- [[status/reports/EXEC_PLAN_MIGRATION_AND_CHAT_RESTORE.md|EXEC_PLAN]]
- [[status/reports/GG_DB_SPEC_V1.md|DB Spec]] · [[status/reports/GG_ORCH_SPEC_V1.md|Orchestrator]] · [[status/reports/GG_MEMORY_5_LAYER_SPEC.md|Memory‑5]] · [[status/reports/GG_SSV_SPEC_V1.md|SSV]]
- [[status/reports/GG_CONTENT_PIPELINE_V1.md|Content Pipeline]] · [[status/reports/GG_SCHEDULER_SPEC_V1.md|Scheduler]] · [[status/reports/GG_CONTEXT_SENTRY_SPEC_V1.md|Context Sentry]]
- [[status/reports/GG_CONTEXT_REGISTRY_SPEC_V1.md|Context Registry]] · [[status/reports/GG_API_CONTEXT_SUMMARY.md|Context API]] · [[status/reports/GG_DYNAMIC_BLOCKS_SPEC.md|Dynamic Blocks]] · [[status/reports/GG_TIME_SPEC_V1.md|Time Spec]]
- [[status/reports/GG_UI_RUN_CARD_SPEC.md|Run Card UI]] · [[status/reports/GG_DAILY_OPS_V1.md|Daily Ops]]

---

## 2) 태그별 인덱스(있으면 표시)

```dataview
TABLE file.mtime as Updated
FROM "status/reports"
WHERE contains(file.tags, "SSOT") OR contains(file.tags, "ExecPlan")
SORT file.mtime DESC
```

```dataview
TABLE file.mtime as Updated, file.tags
FROM "status/reports"
WHERE contains(file.tags, "DB") OR contains(file.tags, "Orchestrator") OR contains(file.tags, "SSV")
SORT file.mtime DESC
```

```dataview
TABLE file.link AS Doc, BT, ST, RT
FROM "status"
WHERE BT OR ST OR RT
SORT file.mtime DESC
```

---

## 3) 경로별 인덱스(태그가 없어도 동작)

```dataview
TABLE file.mtime as Updated
FROM "status/reports"
WHERE file.name != "SSOT_SITEMAP"
SORT file.mtime DESC
```

```dataview
TABLE file.mtime as Updated
FROM "status/design/schemas"
SORT file.mtime DESC
```

```dataview
TABLE file.mtime as Updated
FROM "status/catalog"
SORT file.mtime DESC
```

---

## 4) 최근 변경 Top‑20(전체)
```dataview
TABLE file.path as File, file.mtime as Updated
FROM "status"
SORT file.mtime DESC
LIMIT 20
```

---

## 5) 시간 규약 체크용 쿼리
```dataview
TABLE file.mtime AS Updated, DOCS_TIME_SPEC
FROM "status"
WHERE DOCS_TIME_SPEC
SORT file.mtime DESC
```
> `DOCS_TIME_SPEC` 필드는 문서 YAML에 `DOCS_TIME_SPEC: GG_TIME_SPEC_V1`처럼 기록한다.
