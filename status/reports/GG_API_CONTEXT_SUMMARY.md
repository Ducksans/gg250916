---
phase: present
---

# GG API — /api/context/summary

## 목적
- UI가 한 번의 호출로 Roadmap/Builds/Checkpoints/Recent Runs/Content Metrics를 읽어 맥락을 유지.

## 응답 스키마(초안)
```json
{
  "ts_utc": "2025-09-15T10:25:00Z",
  "ts_kst": "2025-09-15 19:25:00 KST",
  "roadmap": [{"id":"today","items":[...]}, {"id":"3days","items":[...]}, {"id":"7days","items":[...]}],
  "builds": [{"sha":"...","status":"succeeded","run_url":"...","ts":"..."}],
  "checkpoints": {"last": {"run_id":"...","scope":"...","ts_utc":"...","ts_kst":"..."}},
  "recent_runs": [{"id":"...","domain":"dev","entity_type":"build","status":"...","ts":"..."}],
  "content_metrics": [{"content_id":"...","views":1234,"ctr":0.12,"period":"day","collected_at":"..."}]
}
```

## 캐시/오류 처리
- dev 모드: 5–10초 폴링, 서버는 2–5초 캐시.
- 오류: `{"ok":false,"error":"..."}` + ckpt에 PAUSE 기록(센트리에 위임).

## 출처
- checkpoints: CKPT JSONL tail(UTC/KST 병기)
- builds: CI write_result_json 요약
- recent_runs: SQLite runs/steps
- content_metrics: content_metrics 파티션 테이블 집계
