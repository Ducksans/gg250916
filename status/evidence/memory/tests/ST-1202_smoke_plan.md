# ST-1202 — Memory Search Tuning Smoke Test Plan
Status: draft
Owner: Gumgang (AI)
Scope: BT-12 ST-1202 — 검색 점수식 고도화 + Evidence Quorum 적용 확인

1) Purpose
- 키워드·신선도·인용수·티어 가중을 합성한 점수식으로 상위 결과를 선정하고, 최소 1개(가능 시 3개) 근거 인용을 보장함을 스모크 수준에서 검증한다.
- 근거 부재(no-hit) 시 템플릿 응답 동작과 Evidence 로그 기록을 확인한다.

2) In Scope
- API: GET /api/memory/search, GET /api/memory/recall
- Evidence: status/evidence/memory/search_runs/YYYYMMDD/run_*.json
- Threshold/Weights: 내부 상수 (k, half_life_days, score_min, weights)

3) Preconditions
- Backend running: uvicorn app.api:app --port 8000
- BT-12 ST-1201 완료(메모리 API/디렉토리/템플릿 배치)
- 최소 2건 이상의 데모 메모리가 기록되어 있음(ultra_short/short 등)

4) Parameters (reference, expected defaults)
- MEM_K = 5
- MEM_HALFLIFE_DAYS = 7
- MEM_WEIGHTS = { kw:1.0, recency:0.6, refs:0.4, tier:0.2 }
- MEM_TIER_WEIGHT = { ultra_short:1.0, short:0.8, medium:0.6, long:0.4, ultra_long:0.2 }
- MEM_SCORE_MIN = 0.25
- QUORUM_MIN = 1
- QUORUM_TARGET = 3

5) What to Verify (Checklist)
- [ ] 점수식 반영: reasons.kw/recency/refs/tier_weight가 응답에 포함
- [ ] 쿼럼: results 존재 시 quorum.required=1, quorum.returned ≥1 (충분하면 3까지)
- [ ] dedup: 동일 path 중복 제거(서로 다른 파일 우선)
- [ ] threshold: 상위 k 점수 < 0.25이면 no_hit=true
- [ ] Evidence: search_runs/YYYYMMDD/run_*.json 생성, 쿼리/가중치/선정 근거 기록
- [ ] SAFE/NORMAL 모드에서 결과/로그 동일(모드 필드 외)

6) Smoke Tests
6.1 히트 케이스(최소 3개 인용 가능성)
- Query: 최근 ST/BT 관련 키워드(예: "ST-1201", "BT-12")
- Expect:
  - no_hit=false
  - quorum.returned ≥ 1 (데이터 충분 시 3)
  - items[].reasons 합리적(kw 높은 항목 우선, 최신 항목 recency↑)
  - evidence_path가 search_runs/YYYYMMDD/run_*.json 가리킴

6.2 no-hit 임계 동작
- Query: 생소한 토픽(예: "초광대역양자고양이")
- Expect:
  - no_hit=true
  - suggestion.text 존재(ko 템플릿), evidence_path=search_runs/.../run_*.json
  - items 길이 0

6.3 신선도 우선순위 검증
- Query: 과거·최근 모두 존재하는 키워드(예: "memory")
- Expect:
  - 최신 ts 레코드가 상위(동점은 최신순 tie-break)

6.4 티어 가중 검증
- Query: 공통 키워드(ultra_short vs long)
- Expect:
  - ultra_short 항목이 long보다 상위 경향

6.5 PII_STRICT 스니펫 가드(간단)
- Query: 이메일/전화 패턴(테스트 데이터에 없다는 전제)
- Expect:
  - snippets가 비어있거나 마스킹된 형태(민감 토큰 노출 없음)
  - search_runs 로그에 원문 저장 없음(요약/경로/점수만)

7) Example Requests (manual)
- Search (hit expected):
  curl -s "http://127.0.0.1:8000/api/memory/search?q=ST-1201&k=5"
- Search (no-hit expected):
  curl -s "http://127.0.0.1:8000/api/memory/search?q=초광대역양자고양이&k=5"
- Recall (sanity):
  curl -s "http://127.0.0.1:8000/api/memory/recall?scope=ST-1201&per_tier=3"

8) Evidence to Capture (append-only)
- status/evidence/memory/tests/ST-1202_smoke_run_1.json  (히트 결과 응답 원본)
- status/evidence/memory/tests/ST-1202_smoke_run_2.json  (no-hit 결과 응답 원본)
- status/evidence/memory/tests/ST-1202_smoke_observations.md (체크리스트 결과/비고)

9) Acceptance Criteria
- (필수) 응답이 최소 1개 path 인용(quorum.returned ≥ 1), no-hit 시 템플릿/로그 정상
- (필수) search_runs에 각 실행 로그 기록
- (필수) SAFE/NORMAL 패리티 유지
- (권장) 충분 데이터 시 3개 인용 달성률 ≥ 80%

10) Risks & Mitigations
- 과도 신선도 편향 → half_life_days↑ 또는 w_rec↓ 튜닝 가이드
- refs 조작(동일 파일 반복) → dedup로 상이 파일 우선, 동일 경로 중복 제거
- 성능 → k=5 유지, 필요 시 파일 스캔 캐시 도입(후속 과제)

11) Completion
- 체크리스트 통과 후 CKPT(6줄 포맷)로 ST-1202 PASS 기록
- 다음 단계:
  - ST-1203: 무규칙 발화 앵커링 v1(최근 ST/BT 카드 + 탑3 근거)
  - ST-1204: Layer5 승인 게이트(안정지식 편입 제안→CKPT 승인→ultra_long 기록)

Appendices
A) Paths
- Search run logs: status/evidence/memory/search_runs/YYYYMMDD/run_*.json
- Daily summary: status/evidence/memory/search/results_YYYYMMDD.json
- Tests: status/evidence/memory/tests/
B) Notes
- 결과·스니펫은 사실/경로 중심. 요약은 선택 사항이며 기본은 비노출(추론 억제).