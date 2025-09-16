---
phase: present
---

# GG Context Registry Spec v1 — 공통 이벤트/런 카드 & 도메인별 프로젝션

## 목적
- Dev/Content 활동을 동일 스키마로 기록하고, 각 도메인에 맞는 프로젝션 뷰를 제공하여 맥락 보존과 리포팅을 단순화.

## 이벤트/런 카드(표준)
```json
{
  "id": "run_20250915_1015Z_a1",
  "domain": "dev",
  "entity_type": "build",
  "entity_id": "ci#12345",
  "status": "succeeded",
  "ts_utc": "2025-09-15T10:15:00Z",
  "ts_kst": "2025-09-15 19:15:00 KST",
  "created_at_ms": 1757931300000,
  "updated_at_ms": 1757931428000,
  "duration": 128,
  "owner": "duksan",
  "links": ["https://github.com/.../runs/12345"],
  "evidence": "status/evidence/ops/.../log.txt",
  "metrics_json": {"warnings": 0},
  "monotonic_id": "01J9...ULID",
  "prev_hash": "...",
  "this_hash": "...",
  "version": 1
}
```

## 도메인별 프로젝션
- Dev Board: dev_runs/dev_steps 전용 인덱스/보존 정책.
- Content Board: content_items/content_runs/content_metrics(성과·채널 단위).
- Atlas/SSV: 앵커 규약으로 점프(path#line, ids).

## 정적 내 동적 블록
- 문서 내 마커:
```
<!-- DYN:ID=builds.latest HASH=... UTC=2025-09-15T10:20:00Z KST=2025-09-15 19:20:00 KST -->
... (자동 생성 영역: 도구만 수정)
<!-- /DYN -->
```
- manifest: `status/catalog/dynblocks.manifest.json`에 id/path/hash 기록.

## 무결성/버저닝
- event_version, run_schema_version로 상향 시 파서 테스트 필수.
