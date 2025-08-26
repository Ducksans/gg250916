# RULES_KR_CHEATSHEET — 72시간 표류 탈출 한눈에 보기

목적
- 72시간 안에 “Zed → 금강UI”로 안전 이전. 규칙은 “간단·강제·증거우선”.

핵심 5줄 요약
1) SSOT: 체크포인트 단일 파일만 사용 → status/checkpoints/CKPT_72H_RUN.md (append-only)
2) 쓰기 경계: 다음 4곳만 쓰기 허용 → ui/, conversations/, sessions/, status/
3) 포트·진입점 고정: Backend uvicorn app.api:app:8000, Bridge 3037
4) 턴 규칙: Echo→Delta→Execute, 한 턴 ≤1,200자, Evidence(파일 경로) 1개 필수
5) 태스크 선형화: BT(큰일)→ST(작은일), ST≤90분, 15분 막히면 BLOCKED 기록 후 다음 ST

세션 규율(아주 중요)
- 1세션 1BT: 스레드(세션)마다 BT 하나만 처리
- 완료 전환: BT 완료 즉시 체크포인트 6줄 추가 → 현재 스레드 종료 → 다음 BT는 새 스레드로 시작
- 부트스트랩: 새 스레드는 “마지막 체크포인트의 DECISION/NEXT STEP + Evidence 1개”로 시작

체크포인트 6줄 포맷(그대로 사용)
- RUN_ID: 72H_YYYYMMDD_HHMMZ
- UTC_TS: 2025-..T..Z
- SCOPE: {CONV|UNIT|TASK|SESSION|PROJECT}
- DECISION: (오늘 확정 1문장)
- NEXT STEP: (동사로 시작 1문장)
- EVIDENCE: path#Lx-y
- (옵션) PARKING LOT: 지금 안 하는 요청

체크포인트 기록 시점
- 시작할 때, 전환할 때(BT/ST), 90분마다 “CHECKPOINT NOW”

파일·폴더 경계
- WRITE_ALLOW: gumgang_meeting/ui, conversations, sessions, status
- DENY_GLOBS(격리대상): **/.git/**, **/node_modules/**, **/.venv/**, **/.next/**, **/target/**, **/__pycache__/**, **/.cache/**, **/dist/**, **/build/**
- FS 흡수/격리: QUARANTINE/ 아래로 이동(드라이런 보고 → 실행), 원위치에 스텁 노트 남김

네트워크/Fetch(최소 안전 모드)
- 화이트리스트: docs.rs, crates.io, tauri.app, github.com, 공식 벤더 문서
- 출력: “원문 발췌(짧게) + 요약(짧게)”만, 스냅샷(파일) 경로 Evidence로 기록

MVP 게이트(통과기준)
- GATE_UI_SHELL: Tauri+Monaco 렌더, 파일 열기·저장(WRITE_ALLOW 내) 동작
- GATE_FS: read/write/move/delete 정상 + 격리 정책 보고서 남김
- GATE_FETCH: 화이트리스트 fetch→캐시→요약, 스냅샷 경로 기록
- GATE_GUARD: 길이/토큰 경보(70/85/95%)·STOP NOW 작동
- GATE_VECTOR(선택): 인게스트→검색→경로 근거 인용 100%

턴 운영(습관)
- 매 턴 산출: “Next Step 1문장 + Evidence 1경로”
- 토큰/길이 가드: 70% 요약 제안 → 85% 강제 요약+체크포인트 → 95% 최소 컨텍스트
- STOP NOW: 즉시 최소 컨텍스트 모드(시스템/현재태스크/결정/NextStep만)

새 스레드 부트스트랩(붙여넣기 템플릿)
- SSOT: status/checkpoints/CKPT_72H_RUN.md
- SCOPE: TASK(BT-0X)
- DECISION: BT-0X를 선형 파이프라인으로 수행한다
- NEXT STEP: ST-0X01을 시작한다
- EVIDENCE: status/roadmap/72H_TASK_BREAKDOWN.md#L1-59
- TURN: Echo→Delta→Execute, ≤1,200자, Evidence 필수
- GUARDS: [ALERT70/85/95], STOP NOW 적용
- WRITE_ALLOW: ui/, conversations/, sessions/, status/

오늘 시작 체크리스트(3개)
- CKPT_72H_RUN.md에 첫 6줄 기록(RUN_ID 발급)
- BT-01/ST-0101 착수 선언(증거 경로 포함)
- 90분 타이머 설정(“CHECKPOINT NOW” 알림)

자주 하는 실수(피하기)
- 허용 폴더 밖에 쓰기, 체크포인트 덮어쓰기, 포트 임의 변경, BT를 같은 스레드에서 연달아 시작, 길이 초과·증거 누락

참고 경로
- 규칙 원문: gumgang_meeting/.rules
- 태스크 표: status/roadmap/72H_TASK_BREAKDOWN.md