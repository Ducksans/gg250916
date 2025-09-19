---
timestamp:
  utc: 2025-09-18T05:50Z
  kst: 2025-09-18 14:50
author: Codex (AI Agent)
summary: README 및 Control Tower 문서 갱신 내역 요약
document_type: log
DOCS_TIME_SPEC: GG_TIME_SPEC_V1
---

# README & Control Tower Changelog — 2025-09-18

- 도입
  - North Star, Timeline, Runbook 구조 정리 및 README Control Tower 순서 갱신
- Stage 1 진척
  - PG 인게스트 → DB import, Evidence fallback 개선, Toolbar 잠금
  - Legacy thread DB merge, Stage 2 Outline, Evidence QA 완료
- PySpark 환경 준비
  - `tools/java/jdk-17.0.11+9` 로컬 JDK 추가, README 명령 모음에 PySpark 실행 절차 기록

## Tauri Desktop 통합(2025-09-18)
- `ui/dev_a1_vite/src-tauri/tauri.conf.json`를 Tauri v2 스키마로 정비
- DevPath: `app.windows[0].url = http://localhost:5173` (Vite dev 사용)
- README에 Desktop Quickstart/Editor 모드 사용법 추가
- Editor 3분할: 파일 트리/멀티탭 Monaco/채팅 + 좌우 리사이즈, 중복 탭 방지, 중클릭 닫기

## IDE 모드 스펙/런북 반영(2025-09-18)
- 스펙: `status/reports/GG_IDE_SHELL_SPEC_V1.md` 신규
- README: IDE 모드 Quickstart(라우트/단축키/프리셋/전고 정책) 추가
- Runbook/Timeline: IDE Shell Phase 1 작업 등록

## IDE 모드 확장 계획(2025-09-19)
- Home=IDE 전역 메뉴 정책 수립, Chat/IDE 전환 단축키(1/2) 계획 반영
- Explorer/Chat 토글 단축키(B/J), 프리셋(채팅만/편집만/적당 비율) 추가 계획
- Task History(스레드 히스토리) 팝오버 UX 정의

## 로그
- CKPT: `LEGACY_THREADS_IMPORT_20250918T0910Z`, `STAGE2_OUTLINE_20250918T0942Z`, `EVIDENCE_FALLBACK_QA_20250918T0948Z`
- Evidence: `status/evidence/ui/ingest/legacy_threads_import_result_20250918T0910Z.json`, `status/logs/rag_injection_summary_20250918T0945Z.txt`
