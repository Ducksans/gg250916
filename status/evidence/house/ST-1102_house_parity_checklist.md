# BT-11 ST-1102 — House Parity Checklist (헬스/배지/에러 패널)

Purpose
- 하우스(UI) 핵심 신호의 SAFE/NORMAL 패리티를 검증한다: 백엔드 헬스, 녹화 배지 동기화, 경고/에러 패널, A4 로그.

Scope
- 대상 UI: gumgang_meeting/ui/snapshots/unified_A1-A4_v0/index.html
- 대상 백엔드: FastAPI /api/health, /api/meetings/*
- 모드: SAFE, NORMAL (동일 시나리오 결과 동형성 확인)

Preconditions
- 포트/엔트리포인트: backend 8000, bridge 3037 (Evidence: gumgang_meeting/.rules#L19-24)
- 헬스 API: GET /api/health (Evidence: gumgang_meeting/app/api.py#L235-246)
- UI 배지/워닝바/A4 섹션 존재 (Evidence: gumgang_meeting/ui/snapshots/unified_A1-A4_v0/index.html#L350-366, #L441-467, #L788-798)
- UI 런타임 로그 저장 로직 (Evidence: gumgang_meeting/ui/snapshots/unified_A1-A4_v0/index.html#L2918-2928)

Checklist — run per mode (SAFE → NORMAL)

1) Backend Health Badge
- [ ] UI A1 진입시 backend-badge가 OK로 전환
- [ ] 백엔드 중단 시 OFF로 전환 및 토스트 경고
- Evidence: status/evidence/house/backend_badge_probe_<date>_<mode>.json

2) Recording Badge Sync
- [ ] A1/A5 녹화 토글 시 badge(ON/OFF) 동기화
- [ ] record/status 호출 후 UI 상태 일치
- [ ] events.jsonl에 record_start/stop 이벤트 기록
- Evidence: status/evidence/meetings/<session>/events.jsonl, status/evidence/house/record_sync_probe_<date>_<mode>.json

3) Warn Bars (Global/Panel)
- [ ] Sim ERROR 버튼으로 에러 배너 표출 (A1/A3/global)
- [ ] 해제 후 숨김 동작 정상
- Evidence: status/evidence/house/warnbar_probe_<date>_<mode>.json
- Ref: gumgang_meeting/ui/snapshots/unified_A1-A4_v0/index.html#L711-718

4) A4 상태/로그
- [ ] A4 패널 렌더 및 최신 로그 표시
- [ ] UI 런타임 JSONL가 status/evidence/ui_runtime_<date>_<session>.jsonl로 저장
- Evidence: status/evidence/ui_runtime_<date>_<session>.jsonl

5) SAFE/NORMAL Parity
- [ ] 동일 시나리오의 이벤트 타입/필드 구조 동형성(OK/WARN/ERROR 의미적 동치)
- [ ] 배지/워닝바 표출 타이밍 동등(±합리적 지연 허용)
- Evidence: status/evidence/house/parity_diff_<date>.md

Execution Notes
- 세션 ID 기본값: GG-SESS-LOCAL
- 파일 업로드 캡쳐 기능으로 첨부 이벤트 1건 생성 권장
- 브릿지가 Evidence 파일을 저장하도록 UI 기본 동작 사용 (ref: #L2918-2928)

Result Matrix (mark OK/WARN/FAIL)
- Backend Badge: SAFE [ ] NORMAL [ ]
- Recording Badge: SAFE [ ] NORMAL [ ]
- Warn Bars: SAFE [ ] NORMAL [ ]
- A4 상태/로그: SAFE [ ] NORMAL [ ]
- Parity (aggregate): PASS [ ] PARTIAL [ ] FAIL [ ]

Append-only Log
- 실행 로그/스크린샷 경로를 본 파일 하단에 추가 기입(수정 금지, 추가만)