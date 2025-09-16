---
phase: present
---

# GG Dynamic Blocks Spec — 정적 문서 내 자동 갱신 영역 규약

## 마커 형식
```
<!-- DYN:ID=builds.latest HASH=<sha256> UTC=2025-09-15T10:20:00Z KST=2025-09-15 19:20:00 KST -->
... (도구가 생성/갱신하는 영역: 수동 편집 금지)
<!-- /DYN -->
```

## 매니페스트
- 경로: `status/catalog/dynblocks.manifest.json`
- 필드: [{"id":"builds.latest","path":"status/reports/EXEC_PLAN_MIGRATION_AND_CHAT_RESTORE.md","hash":"...","updated_at_utc":"...","updated_at_kst":"..."}]

## 갱신 절차
1) 도구가 블록 내용을 생성 → sha256 계산 → 문서 삽입
2) manifest에 (id,path,hash,updated_at) 기록
3) 센트리가 문서 해시와 manifest를 비교하여 수동 변경/손상 탐지

## AC
- 블록 무결성 위반 시 PAUSE 및 복구 체크리스트 출력
