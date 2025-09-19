---
phase: past
---

# recall_runs — Self‑RAG/신선도 회귀 Evidence README
Last-Updated: 2025-08-25
Scope: ST-1205(Self‑RAG/신선도 회귀) 증거 기록 포맷과 사용 가이드

본 디렉터리는 Recall 품질 개선 실험의 “전/후 비교(before/after)” 증거를 JSON 파일로 보관합니다. 파일은 검색 API 실행 시 자동으로 생성되며, append-only 원칙을 따릅니다.

- 경로: gumgang_meeting/status/evidence/memory/recall_runs/YYYYMMDD/run_<epoch_ms>.json
- 생성 트리거: GET /api/memory/search 실행 시(need_fresh 또는 self_rag와 무관하게 always 기록)
- 시간대: UTC(ISO8601Z). 날짜 파티션 YYYYMMDD 역시 UTC 기준

## 파일 포맷(JSON Schema 개요)

필드:
- query: string — 입력 쿼리 원문
- params: object — 실행 파라미터 스냅샷
  - k: number — 상위 후보 개수
  - need_fresh: 0|1 — 신선도 가중을 활성화 요청했는지
  - half_life_days: number — half-life(일 단위); recency 계산에 사용
  - fresh_weight: number — 종합점수에서 recency 가중치(W_REC) 오버라이드
  - self_rag: 0|1 — Self‑RAG 1회 재랭크 적용 여부
  - tiers: string[] — 검색에 포함된 tier 집합
- pre_items: Hit[] — 재랭크 적용 전 상위 k 후보
- post_items: Hit[] — 재랭크 적용 후 상위 k 후보(=pre_items if self_rag=0)
- ts: string — 생성 시각(UTC ISO8601Z)

Hit:
- tier: "ultra_short"|"short"|"medium"|"long"|"ultra_long"
- score: number — 1차 점수(kw+recency+refs+tier 가중 합)
- ts: string — 해당 메모의 타임스탬프(ISO8601)
- scope_id: string|null — 연관 ST/BT id 힌트(있을 수 있음)
- text: string — 본문 스니펫(최대 400자)
- path: string — 원본 jsonl 파일 상대 경로
- line_from, line_to: number — 해당 라인의 파일 내 위치
- reasons: object — 점수 기여 요인
  - kw, recency, refs, tier_weight: number ∈ [0..1]
- rerank?: object — self_rag=1일 때만 존재
  - rubric: number ∈ [0..1] — 간단 루브릭 점수
  - new_score: number — 2차 종합점수

참고: self_rag=0이면 post_items에는 rerank 필드가 없고 pre_items와 동일 순서일 수 있습니다.

## 스코어링(요약)

1) 1차(베이스) 점수
- total = W_KW*kw + W_REC*recency + W_REFS*refs + W_TIER*tier_weight
- 기본값: W_KW=1.0, W_REC=0.6, W_REFS=0.4, W_TIER=0.2, half_life_days=7.0
- need_fresh=1이면:
  - half_life_days → 요청값으로 덮어씀
  - W_REC → fresh_weight로 덮어씀
- recency(age_days) = 1 / (1 + age_days/half_life_days)

2) Self‑RAG 1회 재랭크(self_rag=1)
- rubric = min(1.0, 0.5*kw + 0.3*recency + 0.2*refs)
- new_score = 0.7*score + 0.3*rubric
- new_score 기준으로 재정렬하여 post_items 생성

## 사용법(실행 예시)

1) 쿼리 실행(신선도+Self‑RAG on)
- curl:
  curl -s "http://127.0.0.1:8000/api/memory/search?q=ST-1205%20증거&k=5&need_fresh=1&halflife_days=7&fresh_weight=0.9&self_rag=1" | jq .meta

2) 생성된 recall_runs 파일 확인(UTC 날짜 주의)
- 최신 파일 경로 찾기 예시(bash):
  ls -1 gumgang_meeting/status/evidence/memory/recall_runs/$(date -u +%Y%m%d)/*.json | tail -n1

3) 전/후 비교 요약(jq)
- 상위 3개 before:
  jq '.pre_items[:3] | map({tier,score,kw:.reasons.kw,recency:.reasons.recency,refs:.reasons.refs,text})' <run_file.json>
- 상위 3개 after:
  jq '.post_items[:3] | map({tier,base:.score,new:(.rerank.new_score // .score),rubric:(.rerank.rubric // null),text})' <run_file.json>

4) 전/후 평균 점수 향상량 계산(Python)
```python
import json, sys
d=json.load(open(sys.argv[1]))
pre=[x["score"] for x in d["pre_items"][:3]]
post=[(x.get("rerank",{}) or {}).get("new_score", x["score"]) for x in d["post_items"][:3]]
lift=(sum(post)/len(post) - sum(pre)/len(pre)) if pre and post else 0.0
print({"avg_pre":sum(pre)/len(pre) if pre else 0, "avg_post":sum(post)/len(post) if post else 0, "lift":lift})
```

## 수용 기준(AC) 점검 가이드

- 동일 쿼리 ≥2건에서 상위 1~3개 후보가 정성/정량 모두 개선
  - 정량: 평균점수(avg new_score) 상승 또는 상위권 내 더 관련도 높은 항목 진입
  - 정성: 신선도/인용/스코프 합치 사유가 reasons와 rerank.rubric로 설명됨
- params에 need_fresh/half_life_days/fresh_weight/self_rag가 기록되어 재현 가능
- 여러 실행(run_*.json)의 결과를 비교해도 경향이 안정적(회귀 가능성 확보)

## 운영 노트

- append-only: 파일을 직접 수정/삭제하지 마세요. 새로운 실행으로 누적 기록을 만듭니다.
- 보완 Evidence:
  - search_runs: gumgang_meeting/status/evidence/memory/search_runs/YYYYMMDD/run_*.json
  - recall 카드 스냅샷: gumgang_meeting/status/evidence/memory/recall/cards_YYYYMMDD.json
- A8 Roadmap(선택): ST-1205 라인의 “증거 모두 보기” 팝업에서 본 디렉토리를 탐색하도록 확장 예정.
- PII_STRICT: 민감정보 발견 시 QUARANTINE 정책을 따르세요(.rules 참조).

## FAQ

- Q: evidence_path는 어디에 리턴되나요?
  - A: /api/memory/search 응답의 data.evidence_path는 search_runs의 경로입니다. recall_runs는 별도 파일이며 위 경로 규칙에 따라 저장됩니다.

- Q: 날짜 폴더가 로컬 시간과 다릅니다.
  - A: 모든 날짜/시간은 UTC 기준입니다(now_iso()의 Z). 일자 경계가 현지와 다를 수 있습니다.

- Q: self_rag=0일 때 post_items가 pre_items와 같은가요?
  - A: 네. rerank가 적용되지 않으므로 동일하거나 거의 동일합니다(디버깅 일관성 위해 post_items도 기록).

참조 코드: `app/api.py` — `memory_search()` (Self‑RAG/신선도 파라미터 처리 및 evidence 기록)

## Runbook — ST‑1205 ON/OFF Quickstart

- Baseline(OFF) — 신선도/셀프RAG 비활성
```
curl -s "http://127.0.0.1:8000/api/memory/search?q=ST-1205%20증거&k=5" \
 | jq -r '.data.evidence_path'
```

- Fresh+Self‑RAG(ON) — 신선도 가중 + 1회 재랭크
```
curl -s "http://127.0.0.1:8000/api/memory/search?q=ST-1205%20증거&k=5&need_fresh=1&halflife_days=7&fresh_weight=0.9&self_rag=1" \
 | jq -r '.data.evidence_path'
```

- 최신 recall_runs 전/후 확인(UTC 날짜 주의)
```
RUN=$(ls -1 gumgang_meeting/status/evidence/memory/recall_runs/$(date -u +%Y%m%d)/run_*.json | tail -n1)
echo "$RUN"
jq '.pre_items[:3] as $a | .post_items[:3] as $b | {pre:$a, post:$b}' "$RUN"
```

Note
- 동일한 q(쿼리)로 OFF→ON 순서로 실행하여 비교하세요.
- halflife_days, fresh_weight는 실험값입니다(예: 7, 0.9).
- search_runs 경로는 API 응답 .data.evidence_path에서 확인 가능합니다.