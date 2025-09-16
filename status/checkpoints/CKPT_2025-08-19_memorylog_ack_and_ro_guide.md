---
phase: past
---

# Checkpoint — Memory Log Acknowledgement + RO Guide

RUN_ID: CKPT_2025-08-19_memorylog_ack_and_ro_guide
DATE_UTC: 2025-08-19T09:38:09Z
SCOPE: Memory logging status, RO(읽기 전용) 운용 체계, 정리 현황 기록
APPEND_POLICY: 이 문서는 체크포인트로 보존. 향후 변경은 새로운 체크포인트 생성.

## 1) 인지(Ack)
- 대상 파일: gumgang_meeting/memory/memory.log
- 현재 상태: 사실상 갱신 중단(내용 없음/관리 부재로 확인)
- 원인(추정 및 확인):
  - READ_ONLY_MODE=true로 서버가 “쓰기” 계열을 차단하는 운용이 장기화됨
  - memory.log에 기록을 남기는 쓰기 파이프가 비활성화 또는 의도적으로 사용 중단
  - 운영 기록이 status/checkpoints/*와 구두(대화) 중심으로 분산 기록됨

결론: memory.log는 현재 정책(RO) 하에서 “기본 비활성”이며, 로그의 단일 파일 집약이 깨진 상태를 공식적으로 인정함.

## 2) 증거(Evidence)
- UI/브리지는 READ_ONLY_MODE를 강제 → /api/chat 등 쓰기/변경 요청 차단
- memory.log 내용 없음
- 최근 기록은 status/checkpoints/* 및 대화 스레드에 산재

## 3) 이미 수행한 조치(Action Taken)
- “묶음 A” 완결: Memory Inspector v0 개선(루트 드롭다운, 탭별 상태, Compact 기본)
- /api/fs/roots 추가: 허용 루트(FS_ALLOWLIST) 목록을 UI에 안전 노출
- gumgang_0_5 전체 복사본 정리:
  - 대용량/불필요 산출물·캐시 삭제(.git pack, node_modules/.next, venv/.venv, 대형 압축/백업 등)
  - 16GB → 약 617MB로 축소
- 보안 점검(빠른 스캔): 실제 비밀키 노출 없음(예시/CI 참조만 존재)
- .env 정책 확정:
  - 루트 .env만 사용(gumgang_meeting/.env)
  - gumgang_0_5/backend/.env 삭제(사용 중지)
- 진입점·포트 통일(운용 기준):
  - 백엔드 필요 시: uvicorn app.api:app --port 8000
  - 브리지/UI: node bridge/server.js (3037)
- 운용 가이드 작성:
  - status/resources/START_GUIDE_READONLY_RUNTIME.md 생성

## 4) 정책(현재 확정)
- 기록 보존 SSOT: /docs(변경 없음, 읽기 전용)
- 운영 기록: status/checkpoints/*를 1차 매체로 사용(append-only 철학)
- memory.log: RO 모드에서는 비활성(쓰기가 필요하므로)
- 키/환경: 루트 .env만 신뢰, 저장소 내 예시(.env.example) 외 실키 금지
- 진입점: app.api:app만 공식. 레거시(main.py, main_legacy.py 등)는 무시 대상으로 분류

## 5) 향후 계획(Logging 운영안)
단계 없이 “간단·명확” 2안 병행:
- A) 현재(RO 유지): 체크포인트 방식 고정
  - 의미 있는 사건은 status/checkpoints/CKPT_YYYY-MM-DD_*.md로 남김
  - 장점: RO 모드와 충돌 없음, 추적성 높음
- B) 추후(RO 해제에 동의 시): memory.log 재가동
  - append-only 포맷 확정(JSON Lines 권장): ts, run_id, actor, scope, action, details
  - 쓰기 시나리오와 임계치(rate, 파일 회전) 최소 규칙 추가

승인 문구 예시:
- RO 유지 고정: “메모리로그는 체크포인트만 사용”
- RO 해제 후 로그 병행: “메모리로그 쓰기 허용”

## 6) 체크리스트
- [x] 루트 .env만 사용 확정
- [x] gumgang_0_5/backend/.env 삭제
- [x] 진입점 통일: app.api:app(문서로 확정)
- [x] RO 운용 가이드 배포(START_GUIDE_READONLY_RUNTIME.md)
- [ ] memory.log 포맷 시안 작성(JSONL) — (RO 해제 동의 시에만)
- [ ] 라벨/태그 기반 이벤트 요약 템플릿 — (체크포인트 편의성 개선)

## 7) 최근 타임라인(요지)
- 2025-08-19: gumgang_0_5 대정리(16GB→617MB), .env 단일화, 시작가이드 작성
- 2025-08-18: Memory Inspector 탭 루트/Compact 등 “묶음 A” 마무리
- (이전) memory.log 갱신 중단 시점 미상 — RO 모드 도입 이후 점진적 정지로 추정

## 8) 요청(Request)
- 현재처럼 RO 운용+체크포인트만으로 기록을 이어갈지(기본안) 알려주시기 바랍니다.
- memory.log 직접 쓰기를 재개하려면, “메모리로그 쓰기 허용”이라고 명시해 주세요(RO 해제 범위 합의 포함).

— end —