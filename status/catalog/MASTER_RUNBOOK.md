---
timestamp:
  utc: 2025-09-18T05:25Z
  kst: 2025-09-18 14:25
author: Codex (AI Agent)
summary: 하루 시작/마감 루틴과 오늘의 3대 작업을 관리하는 금강 일일 런북
document_type: daily_runbook
tags:
  - #runbook
  - #daily
DOCS_TIME_SPEC: GG_TIME_SPEC_V1
phase: present
---

# MASTER_RUNBOOK — Daily Ops Board

> 순서는 항상 README → North Star → Timeline → Runbook 입니다. 이 런북은 “오늘 무엇을 할 것인가”만 담습니다. 필요한 세부 스펙은 SSOT_SITEMAP에서 열람하세요.

## 1. Daily Checklist
- [x] Control Tower 동기화(README, PROJECT_NORTH_STAR, MASTER_EXECUTION_TIMELINE, SSOT_SITEMAP, AGENTS*)
- [x] 오늘의 3대 작업 상태 업데이트(아래 표)
- [x] 체크포인트 기록 완료(`status/checkpoints/CKPT_72H_RUN.jsonl`)
- [x] 문서 업데이트 반영(README, Timeline, SSOT, AGENTS_log)
- [x] 세션 종료 전 서버 정리(`tmux kill-session -t gg_dev`)

## 2. 오늘의 3대 작업 (다음 라운드 준비)
| 작업 | 세부 내용 | 근거/링크 | 상태 |
| --- | --- | --- | --- |
| Evidence fallback 모니터링 자동화 | 지표/경보 기준 정리 및 로그 요약 자동화 초안 | `status/plans/evidence_fallback_monitoring.md`, `scripts/monitor/evidence_fallback_check.py`, `status/logs/evidence_monitor_*.json` | ☑ |
| Stage 2 Kickoff 자료 패키징 | 회의 자료/증거 링크 정리, 공유 준비 | `status/plans/stage2_kickoff_package.md`, `status/reports/STAGE2_KICKOFF.md` | ☑ |
| MCP PySpark 래퍼 초안 | `scripts/mcp/pyspark_execute.py` 작성 및 README 연동 | `status/plans/pyspark_integration_scenario.md`, `scripts/mcp/pyspark_execute.py` | ☑ |
| IDE Shell Phase 1 | /ui-dev/ide 라우트 추가, 3분할 셸·리사이저·단축키·컴포저, 브라우저/Tauri 리사이즈 검증 | `status/reports/GG_IDE_SHELL_SPEC_V1.md`, `README.md` | ☑ |
| IDE Shell Phase 1.5 | Global Home=IDE, 전환 단축키(1/2), Explorer/Chat 토글(B/J), 프리셋(채팅만/편집만/적당비율), Task History 골격 | `status/reports/GG_IDE_SHELL_SPEC_V1.md` | ☐ |

> 작업이 끝나면 상태 칸을 ☑로 바꾸고, CKPT에 run_id를 Append하십시오.

## 3. 진행 메모
- **AM Sync:** 14:45 KST — Control Tower 확인 완료, 서버/PG 헬스 OK
- **Update:** PG 인게스트 완료, Evidence fallback/Toolbar 잠금 배포 → CKPT 기록
- **Progress:** legacy import·Stage2 outline·PySpark 시나리오·Evidence 모니터링 스크립트 완료
- **Blocking Issues:** MCP PySpark 래퍼 UI 연동 (Planner/Agent Studio)
- **End of Day 목표:** IDE Shell Phase 1.5 UX(아이콘/프리셋) 및 키맵/팔레트 2차 정렬

## 4. 다음 행동 큐 (Tomorrow Queue)
- Evidence fallback 모니터링 자동화(지표·경보 정의)
- Stage 2 Kickoff 자료 패키징 및 공유(슬라이드/증거 링크)
- MCP Spark 실행 래퍼 초안(`scripts/mcp/pyspark_execute.py`) 작성

> 모든 항목을 채운 뒤 README 체크리스트에 복귀하고, 다음날 아침에는 이 표의 상태를 먼저 확인하세요.
