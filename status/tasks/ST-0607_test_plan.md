---
timestamp:
  utc: 2025-09-17T05:26Z
  kst: 2025-09-17 14:26
author: Codex (AI Agent)
summary: v2 Threads(backend/bridge/UI) 통합 테스트 계획 및 증적 규약
document_type: task_instruction
tags: [tasks, #tasks]
BT: BT-06
ST: ST-0607
phase: done
DOCS_TIME_SPEC: GG_TIME_SPEC_V1
---

# ST-0607 — Test Plan (Threads v2 + UI)

- 목적: SQLite 기반 Threads v2(recent/read/append/import)와 Bridge 프록시, UI Import/타임라인을 일관되게 검증한다.
- 선행: 서버 4종 동작(8000/3037/5173/5175), DB 준비(`db/gumgang.db`), 브라우저 Origin 고정(127.0.0.1 권장).

## 상태 체크리스트
- [x] v2 recent/read 스모크 PASS(브릿지/백엔드 동일)
- [x] UI Import Threads PASS(좌측 목록/타임라인 반영)
- [x] send 파이프라인 PASS(placeholder → final patch)
- [x] 성능 측정 기록(각 3회 평균 ms)
- [x] 증적 저장(status/evidence/**)
- [x] CKPT Append 완료

## 1) 스모크 (CLI)
- recent: `curl -s 'http://127.0.0.1:3037/api/v2/threads/recent?limit=5' | jq`
- read: `id=$(curl -s 'http://127.0.0.1:3037/api/v2/threads/recent?limit=1' | jq -r '.data.items[0].id // .data.items[0].convId'); curl -s "http://127.0.0.1:3037/api/v2/threads/read?id=${id}" | jq '.data | {id,title,turns: (.turns|length)}'`
- backend 직접: `curl -s 'http://127.0.0.1:8000/api/v2/threads/recent?limit=1' | jq`

검증 기준: `ok:true`, 동일 id/DB 경로, read.turns ≥ 1.

## 2) UI 시나리오
- Dev(5173)와 Preview(5175) 각각에서:
  - Source=DB 설정 → TopToolbar Import Threads 실행 → 좌측 목록 수(≥ 1)와 타임라인 렌더 확인
  - 임의 스레드 열기 → 스크롤/점프 버튼 동작 → 메시지 복사/핀 고정 동작
  - 새 메시지 전송(send) → 자리표시자(…) → 본문 패치 → memory/store POST 무오류

## 3) 에러 케이스
- read 404: `curl -s 'http://127.0.0.1:3037/api/v2/threads/read?id=not_exist' | jq` → 404 or `{ok:false}`
- recent 경계: `limit=0`, `limit=10001` → 서버에서 안전 범위로 클램프됨을 확인

## 4) 성능(경량)
- recent/read 각각 time 측정(ms) 3회 평균 기록(목표 < 100ms 로컬)

## 5) 증적 규약
- 경로: `status/evidence/ui/` 및 `status/evidence/bridge/`
- 파일명 예: `V2_PROXY_SMOKE_<UTC>.md`, `ui_import_<UTC>.png`, `send_pipeline_log_<UTC>.md`

### 이번 실행 증적(2025-09-17 UTC)
- Bridge v2 recent/read: `status/evidence/bridge/V2_PROXY_SMOKE_20250917T060839Z.json`, `status/evidence/bridge/V2_PROXY_READ_20250917T060839Z.json`
- UI Import Threads 캡처: `status/evidence/ui/ui_import_20250917T060845Z.png`
- CKPT Append: `status/checkpoints/CKPT_72H_RUN.jsonl` (run_id: `ST-0607_TEST_PLAN_RUN_20250917`)
  
추가 확인(사용자 세션)
- Jump 버튼(하단 우측 상/하 화살표) Top/Bottom 스크롤 동작 PASS
- URL 유지(새로고침 후 동일 threadId) PASS
- Send 흐름: user 추가 → assistant "…" → 본문 패치 PASS
- 권장 증적 파일: `status/evidence/ui/ui_send_<UTC>.png`(전송 흐름 캡처)

실제 저장된 추가 증적
- UI Send 흐름 캡처: `status/evidence/ui/ui_send_20250917T062913Z.png`
- v2 Proxy 성능(3회 평균): `status/evidence/bridge/V2_PROXY_PERF_20250917T062930Z.md`

참고: UI Import는 Source=DB 플래그로 동작 확인(5173). 목록/타임라인 정상 렌더.

## 6) 완료 조건(AC)
- v2 recent/read PASS(브릿지/백엔드 동일) + UI Import/타임라인 PASS + send 파이프라인 정상.

## 7) 체크포인트 예
```json
{
  "run_id": "ST-0607_TEST_PLAN_RUN",
  "scope": "BT-06.ST-0607",
  "decision": "Test plan executed — all smokes PASS",
  "next_step": "Document risks (ST-0608) and schedule periodic smoke",
  "evidence": "status/evidence/bridge/V2_PROXY_SMOKE_<UTC>.md,status/evidence/ui/lint_final_<UTC>.log"
}
```

### CKPT Append 템플릿
```bash
UTC=$(date -u +%Y-%m-%dT%H:%M:%SZ)
echo '{"run_id":"ST-0607_TEST_PLAN_RUN","scope":"BT-06.ST-0607","decision":"Test plan executed — all smokes PASS","next_step":"Document risks (ST-0608) and schedule periodic smoke","evidence":"status/evidence/bridge/V2_PROXY_SMOKE_YYYYMMDDThhmmZ.md","utc_ts":"'"$UTC"'","writer":"agent"}' >> status/checkpoints/CKPT_72H_RUN.jsonl
```
