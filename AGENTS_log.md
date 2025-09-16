---
timestamp:
  utc: 2025-09-16T04:51Z
  kst: 2025-09-16 13:51
author: Codex (AI Agent)
summary: 문서 관리 게이트 운영, Dataview 색인, 알림 절차 안내
document_type: agent_logging
tags:
  - #agent
  - #logging
  - #doc-gate
BT: none
ST: none
RT: none
DOCS_TIME_SPEC: GG_TIME_SPEC_V1
---

# AGENTS 로그 및 문서 관리 게이트

## 1. 문서 관리 게이트 개념
- **목적:** 모든 문서와 코드가 1파일 1책임 원칙과 시간 규약을 지키는지 자동/수동으로 감시한다.
- **세부 기능:**
  1. **문서 규격:** 메타데이터(UTC/KST, Author, Summary, Tags) 확인.
  2. **문서 인덱스:** Dataview를 사용해 위치·태그·BT/ST 연결 상태를 표로 생성.
  3. **문서 감독:** 위반 항목을 발견하면 즉시 작업을 중단하고 정렬 후 재개.

## 2. 메타데이터 패턴 검사
- 표준 헤더 예시:
  ```markdown
  ---
  timestamp:
    utc: 2025-09-16T04:51Z
    kst: 2025-09-16 13:51
  author: Codex (AI Agent)
  summary: 주제 요약
  document_type: agent_logging
  tags:
    - #example
  ---
  ```
- Obsidian Templater 사용법:
  1. `Templates` 폴더에 위 헤더를 포함한 템플릿 생성.
  2. 새 문서를 만들 때 `⌘P → Insert template` 실행.
- Git pre-commit 훅 초안:
  ```bash
  #!/usr/bin/env bash
  set -euo pipefail
  changed=$(git diff --cached --name-only -- "*.md")
  regex='timestamp:\\n  utc: .*Z\\n  kst: '
  for file in $changed; do
    if [[ ! $(cat "$file") =~ $regex ]]; then
      echo "[Gate] 메타데이터 누락: $file" >&2
      exit 1
    fi
  done
  ```
  > 초보자는 우선 수동 점검 체크리스트를 사용하고, 나중에 훅을 적용해 자동화한다.

## 3. Dataview 기반 색인
- **메인 인덱스:** `status/catalog/SSOT_SITEMAP.md`에 다음 쿼리를 유지.
  ```dataview
  TABLE file.tags AS Tags, BT, ST
  FROM "status"
  WHERE contains(file.tags, "#spec") OR contains(file.tags, "#plan")
  SORT file.mtime DESC
  ```
- **BT/ST 연결 보기:**
  ```dataview
  TABLE file.link AS Doc, BT, ST, RT
  FROM "status"
  WHERE BT
  ```
  > BT, ST, RT 필드는 각 문서 YAML에 `BT: BT01`처럼 직접 기입한다.
- **위배 탐지:**
  ```dataview
  TABLE file.path AS Doc, missingMeta
  FROM "status"
  WHERE !timestamp
  ```
  필드가 비어 있으면 즉시 메타데이터 추가 후 다시 실행한다.

## 4. 게이트 통과 절차 (체크리스트)
1. **작성 직후** `메타데이터 헤더`가 있는지 확인.
2. **BT/ST 태깅:** YAML에 `BT`, `ST`, `RT` 필드를 채운다(해당 없으면 `none`).
3. **태그 관리:** `#agent`, `#spec`, `#plan`, `#log` 등 프로젝트 공용 태그 사용.
4. **Dataview 실행:** `⌘P → Dataview: Evaluate current file`로 테이블이 정상 생성되는지 확인.
5. **위반 시 조치:** Dataview 결과에 비어 있는 필드가 있으면 수정 → 다시 평가.
6. **체크포인트 기록:** 정렬 완료 후 `CKPT_72H_RUN.jsonl` Append를 수행하고 `evidence`에 관련 문서를 명시.

## 5. 알림 및 기록 포맷
- 알림 메시지는 다음 형식을 따른다.
  ```text
  [Gate Alert] 2025-09-16T04:51Z | 대상: AGENTS_expand.md | 사유: BT 필드 누락
  조치: YAML에 BT 필드 추가 후 Dataview 재실행
  ```
- 알림 기록 위치: `status/logs/document_gate/`(없으면 생성) 내 일자별 로그 파일. 예) `status/logs/document_gate/2025-09-16.md`
- Obsidian Tasks 플러그인을 사용할 경우:
  ```markdown
  - [ ] ⚠ BT 필드 누락 수정 @2025-09-16 ⏫ #doc-gate
  ```
  > 완료 후 `x`로 변경하면 자동 기록된다.

## 6. Global Graph 및 링크 정책
- Global Graph 필터: `tag:#project and -path:archive`
- Local Graph 추천: `path:status/reports`, `tag:#doc-gate`
- 자동 링크 업데이트 비활성화: `Settings → Files & Links → Automatically update internal links` OFF.
- 첨부 파일 저장 경로: `docs/assets` 고정. 다른 경로 사용 시 게이트에서 경고한다.

## 7. 주간 점검 루틴 (예시)
| 요일 | 수행 항목 |
| --- | --- |
| 월 | Dataview 전체 스캔, 누락 메타데이터 보완 |
| 수 | Obsidian 설정 검증(Strict Markdown, 링크 옵션) |
| 금 | 체크포인트 로그 정리, Gate Alert 파일 정리 |

## 8. Gate 자체 점검
- [ ] 메타데이터 검사 regex 최신 유지
- [ ] Dataview 쿼리 오류 없음
- [ ] 알림 로그 폴더 구조 최신
- [ ] Obsidian 설정이 팀과 동기화됨(필요 시 README 공유)
- [ ] Gate 유지보수 항목을 `CKPT_72H_RUN.jsonl`에 기록
