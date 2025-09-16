---
phase: present
---

# GG Content Pipeline v1 — 금강 UI 기반 자동화 파이프라인(MVP)

## 목표
- 금강UI에서 생성/배포/관찰/관리/개선의 선순환을 자동화.
- 모든 산출물과 로그는 재현 가능하게 보관(SSOT 준수).

## 플로우(MVP)
1) Sources: `status/content_sources/**` or 입력 텍스트
2) Chunk: 길이/문단/헤더 기준 분할
3) Summarize: 요약/핵심 키워드/메타 생성(LLM)
4) SEO Decorate: 제목/설명/태그 생성
5) Render: MD/HTML 산출
6) Publish: 프로젝트 내부 배포 디렉토리
7) Index/Sitemap: 색인·사이트맵 업데이트

## 산출물
- `status/evidence/pipelines/<run_id>/artifacts/*` (md, html, json)
- `status/evidence/pipelines/<run_id>/logs.jsonl`

## VS Code Tasks(예)
- `content:run` → 백엔드 Orchestrator 호출로 플로우 실행
- `content:report` → 산출물 요약/통계 출력

## CI 스모크(후속)
- content-smoke: 짧은 샘플 소스로 end-to-end 그린 유지

