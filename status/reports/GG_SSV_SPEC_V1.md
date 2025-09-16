---
phase: present
---

# GG SSV Spec v1 — Semantic Structure Viewer(2D/3D)

## 목적
- 문서/코드/대화/플로우/체크포인트/증거를 하나의 SiteGraph로 통합하여 구조·맥락을 시각화(2D→3D), 앵커‑점프로 탐색.

## 데이터 모델
- Anchor(Node): { id, type(doc|file|chunk|thread|message|flow|run|step|checkpoint|agent), title?, path?, meta{tags,source,created_at}, scores{centrality,isolation,recency,evidence_count} }
- Edge: { src, dst, type(contains|refers|mentions|generates|depends), weight?, meta }
- Version: schema_version: "1.0"

## 생성 파이프라인
1) 인덱션(청킹/요약/임베딩/FTS) → DB 저장(threads/messages/files/chunks/flows/runs/steps/artifacts)
2) SiteGraph 빌더(sitegraph_build):
   - contains(file→chunk, flow→step), refers/mentions(message→file), generates(run→artifact)
   - weight: 공출현/링크 수/증거 수 기반
3) 점수 계산(초안): centrality, isolation, recency, evidence_count
4) 출력: `status/evidence/sitemap/graph_runs/<date>/sitegraph.json` (schema 준수)

## UI 계약(2D/3D 공통)
- 필터: type/태그/기간; 검색: FTS→벡터 재랭크; LOD: Top‑K→확대 시 이웃 증분 로딩
- 인터랙션: highlight/pin/focus, 앵커‑점프(path#line) — 클릭 시 대상 리소스로 이동
- 폴백: 성능/자원 부족 시 2D/테이블 요약로 자동 전환

## 2D/3D 기술 선택(가이드)
- 2D: d3-force 또는 cytoscape.js(간단/안정), 워커 오프로딩 권장
- 3D: force-graph-3d(간결한 API) 또는 React Three Fiber(R3F, React 친화)

## 성능/안전 가드
- WebWorker 레이아웃/샘플링; 대규모는 클러스터 요약(LOD)
- 파일 경계/제외 패턴 준수, 민감값 마스킹

## 산출/검증(AC)
- sitegraph.json 생성; 2D 패널에서 필터/검색/포커스 동작; 앵커 클릭→Evidence 점프

