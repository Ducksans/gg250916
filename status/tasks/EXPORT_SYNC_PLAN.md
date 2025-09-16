---
timestamp:
  utc: 2025-09-16T08:05Z
  kst: 2025-09-16 17:05
author: Codex (AI Agent)
summary: exports/gumgang_meeting_core를 최신 설계 문서와 동기화하기 위한 안전 절차
document_type: task_plan
tags:
  - #tasks
  - #sync
BT: BT01_DevUI_채팅복원
ST: ST0103_sync_plan
phase: present
DOCS_TIME_SPEC: GG_TIME_SPEC_V1
---

# EXPORT_SYNC_PLAN — 산출물 동기화 절차

## 1. 사전 점검
- `git status`가 깨끗한 상태인지 확인. 커밋되지 않은 변경분은 우선 `git stash` 또는 별도 브랜치에 백업.
- `exports/` 하위의 과거 백업(`*_last_green*`)은 `.gitignore` 또는 `exports/archive/`로 이동.
- 동기화 대상 범위를 확정: 문서(`docs/`, `status/**`)와 Runner 관련 스크립트 위주.

## 2. 비교 및 Dry-Run
```bash
rsync -av --dry-run status/ exports/gumgang_meeting_core/status/
rsync -av --dry-run docs/ exports/gumgang_meeting_core/docs/
```
- Dry-run 결과를 검토하여 덮어쓸 파일과 신규 추가 파일을 목록화한다.
- 차이가 큰 파일은 diff 확인 후 필요 시 `exports/gumgang_meeting_core/docs/archive/`에 보관.

## 3. 실제 동기화
- Dry-run 결과에 문제 없으면 `--dry-run`을 제거하고 실행.
- 실행 후 `git status`로 변경 사항을 확인하고, 예상과 다르면 즉시 되돌린다.

## 4. 검증
- 동기화된 `exports/` 구조에서 CI Runner가 사용하는 파일이 최신인지 `npm run build` 등 간단 빌드로 확인.
- 필요 시 `exports/gumgang_meeting_core/docs/README.md`에 "동기화 일시"를 기록.

## 5. 체크포인트
- 동기화 완료 후 `CKPT_72H_RUN.jsonl`에 `run_id: EXPORT_SYNC` 등으로 기록.
- MASTER_RUNBOOK "오늘의 상태" 섹션에 동기화 완료 여부를 표시.

## 6. 후속
- 클라우드 Codex 사용 시 해당 폴더를 기준으로 문서를 읽도록 안내.
- 다음 Runner 실행 전 `exports/` 상태를 다시 확인.
