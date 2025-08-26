# Memory‑5 Spec — v0 Scaffold (자리표시자)
Status: Draft scaffold (빈 골격). 이 문서는 로드맵 AC(수용 기준) 링크를 만족하기 위한 최소 자리표시자입니다. 세부 규격·예시는 후속 커밋에서 채움.

목적
- 대화·회의·코드·문서·증거를 “한 가지 방식”으로 저장→검색→회상하는 5계층 메모리(FACTS / EVENTS / TASKS / DECISIONS / ANCHORS)의 기준점 제시
- BT‑12 DONE/AC에서 요구하는 인덱싱 파이프·회상 API·하프라이프/승격 규칙의 토대 제공
- SSV(Atlas)·Playbook Runner와 계약(SSOT 호환 앵커)을 명문화

범위(Scope)
- 포함: 5계층 정의, 공통 필드, 최소 스키마(자리표시자), 인덱싱 파이프, 회상 API 개요, 하프라이프·승격 규칙, RAG 통합 가이드, 관측/보안 원칙
- 제외: 구체 구현/스토리지 엔진 선택, 실제 라우트/핸들러 코드, 모델/키

비범위(Non‑Goals)
- 이 버전은 “문서 링크가 열리도록” 하는 자리표시자이며 규격의 구속력은 다음 버전에서 확정

---

## 1) Memory‑5 계층 모델

- FACTS: 검증/정규화된 사실·지식(스펙/정의/핵심 문서 요약). 장수명, 안정적.
- EVENTS: 시간열 기록(회의 캡처/로그/스냅샷/측정치). 단수명, 고빈도.
- TASKS: 해야 할 일/계획/제안(상태·우선순위 포함). 중수명.
- DECISIONS: 의사결정/체크포인트(원장과 일치). 영구.
- ANCHORS: 경로/위치/링크(파일·문서·코드·노드·URL)와 라인 범위. 영구.

공통 필드(초안)
```json
{
  "schema": "memory.item.v1",
  "kind": "fact|event|task|decision|anchor",
  "id": "M5_<ULID>",
  "ts": "2025-01-01T00:00:00Z",
  "owner": "local|user|system",
  "source": {"type":"path|api|ui","ref":"gumgang_meeting/..."},
  "text": "summary or normalized text",
  "anchors": ["path#L10-20"],
  "hash": {"algo":"sha256","value":"..."},
  "pii": {"present": false, "redaction": []},
  "metrics": {"size": 0, "tokens": 0}
}
```

각 계층 스키마(자리표시자)

FACTS
```json
{"schema":"memory.fact.v1","kind":"fact","confidence":0.0,"ttl_days":null,"tags":["spec","definition"]}
```

EVENTS
```json
{"schema":"memory.event.v1","kind":"event","topic":"meeting|log|snapshot","seq":123,"ttl_days":14}
```

TASKS
```json
{"schema":"memory.task.v1","kind":"task","status":"todo|doing|done","priority":"L|M|H","due":null}
```

DECISIONS
```json
{"schema":"memory.decision.v1","kind":"decision","ckpt_ref":"status/checkpoints/CKPT_72H_RUN.jsonl","run_id":"72H_..."}
```

ANCHORS
```json
{"schema":"memory.anchor.v1","kind":"anchor","href":"path#L1-20","open_action":"file|url|code|board","label":"..."}
```

---

## 2) 인덱싱 파이프라인(ingest → normalize → index → snapshot → recall)

소스
- 파일트리(코드/문서), SiteGraph 스냅샷, 체크포인트·이벤트 로그, UI 캡처

단계(초안)
1) Ingest: 파일/JSONL/HTTP 읽기, MIME/크기 필터, PII 스캐닝
2) Normalize: 계층(kind) 판정, 텍스트 추출/요약, 앵커 추출
3) Index: 키워드(BM25)/임베딩(벡터) 하이브리드 인덱스 구축
4) Snapshot: 주기 스냅샷(증거 경로와 해시), SSOT 링크
5) Recall: 질의→선별→결합→요약(승격/감쇠 규칙 반영)

메트릭(초안)
- ingest_latency_ms, index_size, m5_counts_by_kind, recall_hit@k, mrr, freshness_score

---

## 3) 회상 API(Recall API) 개요

내부 인터페이스(자리표시자)
```ts
type RecallQuery = {
  q: string;                    // NL or keyword
  kinds?: Array<'fact'|'event'|'task'|'decision'|'anchor'>;
  k?: number;                   // top-k
  time_range?: {from?:string,to?:string};
  boost?: {recency?:number, centrality?:number, role?:string[]};
  need_fresh?: boolean;         // freshness gate
};

type RecallItem = {
  kind: string;
  id: string;
  score: number;
  text: string;
  anchors?: string[];
  source?: any;
};

declare function recall(q: RecallQuery): Promise<RecallItem[]>;
```

정책
- “필요 시에만 검색”(gating) 기본, Self‑RAG류 다중 호출·자기평가 옵션
- 하이브리드 검색(키워드+임베딩)과 신선도 보정(Recency/Decay)

---

## 4) 하프라이프·승격/감쇠 규칙(초안)

기본 반감기(가이드)
- FACTS: ∞ 혹은 ≥ 180d (감쇠 없음, 개정 시 버전)
- EVENTS: 14d (강한 감쇠)
- TASKS: 30–90d(상태 의존)
- DECISIONS: ∞ (원장 보존)
- ANCHORS: ∞ (경로 안정, 리네이밍 추적 별도)

승격(Promote)
- EVENT → FACT: 반복 관측·참조·검증 통과 시 요약 승격(증거 링크 유지)
- TASK → DECISION: 승인·체크포인트로 확정 시

감쇠(Demote/Decay)
- 시간 경과·오류율·반박 증거 발생 시 가중치 감소

---

## 5) SSV/SSOT 계약(앵커 & 증거)

- 앵커는 `path#Lx-y` 또는 URL, open_action 포함(SSV 단일 클릭 오픈 규약과 일치)
- Evidence는 append‑only로 status/evidence/*에 저장하고, 메모리 항목에 역링크(anchors[])를 유지
- 체크포인트(run_id)와 메모리 항목 연결(DECISIONS는 원장 참조 필수)

---

## 6) RAG 최적화 가이드(자리표시자)

검색 전략
- 하이브리드(BM25+cosine) + 역할/레이어 부스팅(예: C/M 우선)
- 창 슬라이싱(chunking)·문맥 윈도우 간 상호보완

Self‑RAG 옵션
- 다중 호출→자기평가→재선택 루프
- 부정확/저신뢰 결과 감지 시 재탐색

신선도
- FreshQA/FreshLLMs류 벤치로 신선도 회귀 테스트(주기)
- created_at/mtime·halflife 기반 recency_boost

---

## 7) 보안·PII·거버넌스

- PII_STRICT: 발견 시 마스킹/격리(QUARANTINE) + Evidence 사유 기록
- 키/비밀: 서버 측 주입, 클라이언트 노출 금지
- 감사성: store/recall/emitEvidence 호출 로그를 SSOT에 append‑only
- ACL(초안): kind/경로/작업(읽기/쓰기/승격) 단위 최소권한

---

## 8) Observability(GenAI/OTel 세만틱)

스팬 이름(초안): m5.ingest, m5.normalize, m5.index, m5.snapshot, m5.recall  
필수 속성: run_id, kind, bytes, latency_ms, items, success, pii.present

대시보드(최소)
- ingest/index 지연/규모, recall 품질(hit@k/MRR), freshness, 에러율

---

## 9) 수용 기준(AC) 체크리스트(링크용)

- 5계층 정의 및 공통 필드 제시
- 각 계층의 자리표시자 스키마(JSON 예시) 포함
- 인덱싱 파이프라인 단계 정의
- Recall API 타입/파라미터/정책(가이드) 제시
- 하프라이프·승격/감쇠 규칙 기술
- SSV/SSOT 앵커·증거 계약 명시
- RAG 최적화(하이브리드·Self‑RAG·신선도) 언급
- Observability 스팬/속성·대시보드 최소 항목 제시
- 보안/PII/감사 원칙 명시

---

## 10) Open Questions

- 승격 임계(반복 인용 수/신뢰도) 수량 기준?
- 이벤트 감쇠와 회상 품질 간 트레이드오프 최적점?
- 앵커의 리네이밍/리팩터 자동 추적(코드 이동 감지) 방식?
- 문서·코드 혼합 검색의 디폴트 k·비율(키워드 vs 임베딩)?

---

개정 이력
- v0 (scaffold): 5계층 모델·공통 필드·스키마 자리표시자·파이프라인·Recall API·하프라이프/승격 규칙·SSV/SSOT 계약·RAG 가이드·관측/보안 섹션 뼈대 작성