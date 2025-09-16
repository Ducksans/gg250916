---
phase: present
---

# GG UI Run Card Spec — 카드/타임라인/아티팩트 패널

## 카드 필드 매핑
- title: entity_type + id (또는 sha/slug)
- sub: domain(dev|content) + status 색상(초록/노랑/빨강/회색)
- right: ts/duration
- body: metrics_json 요약, owner, links, evidence(파일/라인 링크)

## 타임라인
- steps: {id, name, status, duration, logs_link}
- checkpoints: ckpt tail 일부를 병합(해당 run에 매핑되는 경우)

## 아티팩트 패널
- artifacts_root를 기준으로 파일/폴더 나열, 미리보기/다운로드 링크

## 색상 정책(권장)
- succeeded: #22c55e, running: #06b6d4, failed: #ef4444, queued: #9ca3af

## 링크 규약
- 내부: path#line(anchor), 외부: run_url/ci_url

