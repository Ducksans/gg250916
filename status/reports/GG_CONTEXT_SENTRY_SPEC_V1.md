---
phase: present
---

# GG Context Sentry Spec v1 — 타이머/무결성/자동 PAUSE

## 주기/예외
- 기본: 1시간 주기. Quiet hours/ACTIVE_JOB(집중 모드) 시 2–4시간까지 허용.

## 체크 항목
- ckpt 신선도(최근 N분/시간 안에 기록 존재)
- 동적 블록 해시 검증(manifest vs 문서 실제)
- 5175 헬스(포트/리다이렉트/정적)
- CI 최근 상태(last-green 태그/최근 5개 빌드)
- sitegraph 스냅샷 신선도(최근 생성 시각)
- DB FTS 건전성(샘플 질의 성공 여부)

## 위반 처리
- 즉시 `ckpt.append(PAUSE)` + `.suspend` 생성 → 런처는 안전모드.
- 복구 체크리스트(자동 생성)를 수행 후 `ckpt.append(RESUME)` → `.suspend` 제거.

## 알림
- VS Code/시스템 알림(선택), 로그 기록(JSONL)。

## 무결성 규약
- 동적 블록: `<!-- DYN:ID=... HASH=... --> ... <!-- /DYN -->`
- manifest: `status/catalog/dynblocks.manifest.json` (id,path,hash,updated_at)

