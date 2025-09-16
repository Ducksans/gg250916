---
phase: present
---

# GG Time Spec v1 — KST/UTC 병기·표준 타임스탬프 규약

## 목표
- 모든 기록(이벤트/런/체크포인트/문서/아티팩트)에 일관된 시간 필드와 포맷을 적용해 맥락 휘발/드리프트를 방지한다.

## 표준 포맷
- 저장 기준: UTC(ISO 8601, Z 접미)
  - 예: `2025-09-15T12:34:56Z`
- 병기 표시: KST(Asia/Seoul)
  - 예: `2025-09-15 21:34:56 KST`
- UI 표기: `UTC / KST` 병기 + 도구팁에 상대시간(예: "12분 전")

## 공통 필드(권장)
- `ts_utc`: ISO8601 UTC 문자열
- `ts_kst`: `YYYY-MM-DD HH:MM:SS KST`
- `created_at_ms`, `updated_at_ms`: epoch milliseconds(UTC)
- `monotonic_id`: ULID/KSUID 등 단조 증가식 ID(정렬 안정성)
- `prev_hash`, `this_hash`: 연속 기록 체인 무결성 보강(옵션)

## 문서 메타(정적/동적)
- 문서 상단 메타 블록(또는 YAML front‑matter)에 다음 항목을 포함:
  - `Created: <UTC> / <KST>`
  - `Updated: <UTC> / <KST>`
  - `Hash: sha256:<digest>`
- 동적 블록(DYN) 내부에도 생성/갱신 시각과 해시를 병기한다.

## 유틸(설계 스케치)
### Node (scripts/utils/time_util.mjs)
```js
export function nowUtcIso(){ return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'); }
export function toKst(iso){ const d=new Date(iso); return d.toLocaleString('ko-KR',{timeZone:'Asia/Seoul',hour12:false}).replace(',', '')+' KST'; }
export function dualStamp(){ const u=nowUtcIso(); return { ts_utc:u, ts_kst:toKst(u) }; }
```

### Python (scripts/utils/time_util.py)
```py
from datetime import datetime, timezone
import zoneinfo
def now_utc_iso():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace('+00:00','Z')
def to_kst(iso:str):
    d=datetime.fromisoformat(iso.replace('Z','+00:00')).astimezone(zoneinfo.ZoneInfo('Asia/Seoul'))
    return d.strftime('%Y-%m-%d %H:%M:%S KST')
def dual_stamp():
    u=now_utc_iso();
    return {'ts_utc':u,'ts_kst':to_kst(u)}
```

## DB 권장
- 저장: epoch ms(UTC) 필드(`created_at_ms`, `updated_at_ms`)
- 조회용 뷰/함수: `*_kst` 생성(표시 전용)
- 트리거: `updated_at_ms` 자동 갱신(SQLite/PG)

## 검증/운영
- 센트리 체크: 미래시각/역행/누락/표준 외 포맷 탐지 시 `PAUSE` → 복구 체크리스트
- NTP 오차 점검(허용 초과 시 경고)

