---
phase: past
---

# A1 Unified Search — Phase 1~3 구현 계획(설계·검증) — ST-1205

문서버전: v0.1 (draft)  
스코프: BT-12/R2.5 → R3(ST-1205 Strict Grounded Mode 정합), BT-15 관측 훅 선심기  
목표(요약)
- SGM_v1 “근거 없으면 호출 금지”를 유지하면서 통합 검색 계층(memory+files)을 안전판으로 도입.
- A1 채팅에서 스레드 열람/이어가기 UX를 가능하게 하고, 모든 응답은 근거(메모리 경로+파일 경로)와 로그를 남김.
- R2.5: 메모리 채널은 현행 유지, 파일 채널은 화이트리스트+키워드/mtime 기반 v0로 시작(기본 OFF).  
- R3: 조건부 Self‑RAG 재랭크(0.92/0.08, refs 보너스+0.05, kw 캡+0.02) 적용.

참고(현행 근거)
- Backend: /api/memory/store, /api/memory/search 존재(신선도/자체 RAG 로그 기록).
- A1: 메모리 검색 호출 및 근거 인용, 세션 저장 흐름 기 구현.
- Bridge: /api/save, /api/open, /api/fs/* 제공(증거 쓰기/열기 및 스레드 파일 열람에 활용).

---------------------------------------------
1) 요구사항(Requirements)
---------------------------------------------
- 기능
  - 통합 검색 API: GET /api/search/unified
    - 입력: q, k, half_life_days, fresh_weight, self_rag(0|1), strict(0|1)
    - 출력: { pre: Evidence[], post: Evidence[], logs, source_mix, evidence_path }
  - Router: memory+file 병렬 호출 → 후보 결합 → 신선도 가중 → 조건부 Self‑RAG 재랭크 → Top‑K
  - SGM 게이트: strict=1이고 Top‑K=0이면 204 + hint(JSON) 또는 200 + suggestion 텍스트(프런트 없음 템플릿)
  - 스레드 UX: convId 기반 “최근 스레드 목록/열람/이어가기”
- 비기능
  - 기본값 안전: file_retriever.enabled=false
  - 화이트리스트 경로/확장자만 인게스트(PII_STRICT 옵션 훗날 연동)
  - 로그: status/evidence/memory/unified_runs/YYYYMMDD/run_*.json
  - 성능: 병렬 호출, Top‑K 도달 시 조기 종료(early-return)
  - 회귀/관측: source_mix, grounded, latency_ms 기록(BT‑15에서 OTEL 연계)

---------------------------------------------
2) 데이터 모델 & 인터페이스
---------------------------------------------
- Evidence (공통)
  - source: 'memory' | 'file'
  - path: string         // 파일경로 혹은 JSONL#line
  - snippet: string
  - ts?: string          // ISO
  - score: number        // raw score
  - reason: { kw:number; recency:number; refs:number; tier?:number }

- Retriever
  - (q: string, opts: { k: number }) => Promise<Evidence[]>

- UnifiedSearch
  - (q: string, opts: { k:number; half_life_days:number; fresh_weight:number; self_rag?:0|1; strict_grounded?:boolean })
  - 반환: { pre: Evidence[]; post: Evidence[]; logs: any }

---------------------------------------------
3) API 설계(Phase 1~3 동일 엔드포인트)
---------------------------------------------
GET /api/search/unified
- Query
  - q: string (필수), k: int(<=10 권장, 기본 5)
  - half_life: float(기본 7.0), fresh: float(기본 0.6)
  - self_rag: 0|1 (기본 1), strict: 0|1 (기본 1)
- Response 200
  {
    ok: true,
    data: {
      pre: Evidence[],         // rerank 전(가중 후)
      post: Evidence[],        // 최종 Top‑K
      source_mix: { memory:int, file:int },
      grounded: boolean,       // post.length>0
      evidence_path: "status/evidence/memory/unified_runs/2025.../run_xxx.json",
      logs: { params, timing_ms, rerank_policy, reasons[] }
    },
    meta: { ts: ISO }
  }
- Response 204 (strict=1 && post.length==0)
  {
    ok: false,
    hint: { suggestion: "...", evidence_path: "..." }
  }

---------------------------------------------
4) 구현 단계(Phase Plan)
---------------------------------------------
Phase 1 — Unified API 스텁(memory‑only)
- app/api.py
  - GET /api/search/unified 추가: 내부에서 현행 memory_search 호출 → items→Evidence 변환
  - logs: unified_runs/YYYYMMDD/run_*.json에 params/pre/post/source_mix 기록
  - strict=1 && post=0 → 204 + hint(JSON) (메모리 템플릿 재사용)
- ui/proto/chat_view_A1
  - 호출 경로를 unified로 우선 사용, 실패/비활성 시 기존 memory_search로 폴백
  - 배지 텍스트 “SGM ON · sources: memory” (Phase 3에서 “memory+files”로 업데이트)
- 플래그/ENV
  - UNIFIED_ENABLED=true (서버), FILE_RETRIEVER_ENABLED=false

Phase 2 — FileRetriever v0(안전판)
- app/search/file_retriever_v0.py (신규)
  - 입력 경로 화이트리스트: docs/, projects/, status/evidence/logs/ 등
  - 파일 유형: .md .txt .json .py .ts .js .html .css (초기 제한)
  - 스코어: kw(토큰 교집합 비율) + recency(파일 mtime) 조합
  - 오염 필터: 시스템 텍스트/증거 생성물 제외 규칙 적용
- app/api.py
  - FILE_RETRIEVER_ENABLED=true일 때만 병렬 호출에 포함
- ui/proto/chat_view_A1
  - 배지/상태라인 유지, evidence 표시에 파일 경로 포함

Phase 3 — Router + Self‑RAG v0.5
- app/search/unified.py (신규)
  - 병렬 호출(Promise.all/asyncio.gather)
  - 신선도 가중 적용(half_life_days, fresh_weight)
  - 조건부 재랭크: recency<0.2 && refs<0.2에서 0.92*base + 0.08*rubric, refs≥0.2 보너스+0.05, kw≥0.9 캡+0.02
  - Top‑K 선택 후 반환
- ui/proto/chat_view_A1
  - 배지 “SGM ON · wait≤5.0s · sources: memory+files”
  - 상태라인: “리콜 대기/충족/근거 부족” → 기존 그대로

---------------------------------------------
5) A1 스레드 UX(동시 진행, 최소 패치)
---------------------------------------------
- 저장: 각 턴을 status/evidence/ui_runtime/threads/YYYYMMDD/<convId>.jsonl 에 append
- 캐시: localStorage.gg_a1_<convId> (최근 N턴)
- 회복: gg_last_conv 로드 → 캐시 복구 → JSONL 대조 후 확정
- 목록: “최근 스레드”(첫 user 메시지 요약을 제목으로) → 클릭 시 해당 convId 로드
- 이어쓰기: 동일 convId로 저장·검색 수행(배지 노출: Thread:<convId>)

---------------------------------------------
6) 검증·테스트(Validation & Tests)
---------------------------------------------
Unit
- file_retriever_v0
  - kw 스코어 정합(정규화), mtime 기반 recency 변환 함수
  - 화이트리스트/확장자 필터, 오염 필터 정상 작동
- unified router
  - 파라미터(half_life_days, fresh_weight) 반영
  - 조건부 재랭크 정책(보너스/캡) 적용 여부
- API 파라미터 검증 및 204 경로

Integration
- Case A: refs=3 within ~1s → 200, post.length>=1, grounded=true, evidence_path 생성
- Case B: refs=1~2 at ~3s → 동일
- Case C: refs=0 at 5s(strict=1) → 204 + hint, 프런트 없음 템플릿 출력
- memory-only vs unified 비교: source_mix, latency, grounded 비율 로그 차이 확인
- 폴백: unified 비활성/오류 시 memory_search 사용

Manual (A1)
- 배지/상태라인 노출, 증거(메모리+파일) 접힘 블록 확인
- 스레드 목록/열람/이어쓰기, 새 스레드 발급/배지 확인
- 새로고침/리사이즈 후 복구 버튼 동작

API 시나리오(샘플)
- /api/search/unified?q=hello&k=5&self_rag=1&strict=1
  - 200 ok:true … 또는 204 ok:false, hint.evidence_path 존재

수용 기준(DoD)
- /api/search/unified가 pre/post와 source_mix, evidence_path를 반환
- strict=1에서 5초 내 근거 0건 시 204/없음 템플릿 동작
- A1에서 메모리 경로+파일 경로가 함께 노출
- unified_runs 로그에 grounded, source_mix, latency_ms 기록
- 스레드 목록/열람/이어가기 동작(append-only JSONL)

---------------------------------------------
7) 구성/플래그
---------------------------------------------
- 서버
  - UNIFIED_ENABLED=true
  - FILE_RETRIEVER_ENABLED=false (Phase 2부터 opt‑in)
  - FILE_WHITELIST=docs,projects,status/evidence/logs
- 클라이언트(A1)
  - gg_backend, gg_unified_enabled(옵션), gg_strict_wait_ms(<=5000)

---------------------------------------------
8) 위험 & 완화
---------------------------------------------
- 지연 증가: 병렬 호출 + Top‑K 도달 시 조기 종료
- 품질 변동: 조건부 재랭크로 보수적 상향, SGM 게이트로 잘못된 호출 차단
- 용량/인덱싱: 확장자·경로 화이트리스트, v0는 임베딩 미도입
- 보안/PII: PII 스캔 옵션 준비(차단/마스킹), 로그에는 근거 경로만

---------------------------------------------
9) 작업 분해(파일 경로 기준)
---------------------------------------------
- app/api.py: GET /api/search/unified 추가(Phase 1), file 채널 통합/strict 204(Phase 2~3)
- app/search/unified.py: 라우터+재랭크(Phase 3)
- app/search/file_retriever_v0.py: 화이트리스트 키워드/mtime(Phase 2)
- ui/proto/chat_view_A1/index.html: unified 호출/배지/증거 라벨/스레드 UX(동시)
- scripts/run_st1205_eval.sh: unified ON/OFF A/B 비교 로그 저장
- status/evidence/memory/unified_runs/YYYYMMDD/run_*.json: 실행 로그

권장 커밋 메시지 예
- feat(api): add /api/search/unified (memory-only stub, logs)
- feat(search): file_retriever v0 with whitelist and kw+mtime scoring (flagged)
- feat(search): unified router + conditional Self‑RAG rerank + strict gate
- feat(A1): SGM badge/labels, unified fallback, thread list/open/continue

---------------------------------------------
10) 일정(가늠)
---------------------------------------------
- Phase 1: 0.5일 (API 스텁+로그+A1 폴백)
- Phase 2: 0.5~1일 (파일 v0, 플래그/화이트리스트, 테스트)
- Phase 3: 0.5일 (라우터+재랭크, 배지 업데이트)
- Thread‑UX 패치: 0.5일 (목록/열람/이어쓰기/복구)

---------------------------------------------
부록 A — 의사코드
---------------------------------------------
unifiedSearch(q, o):
  const [mem, fil] = parallel(
    memoryRetriever(q, {k:o.k}),
    o.file_enabled ? fileRetriever(q, {k:o.k}) : []
  )
  const candidates = concat(mem, fil)
  const pre = freshnessWeight(candidates, o.half_life_days, o.fresh_weight)
  const post = o.self_rag ? conditionalSelfRerank(pre) : pre
  const top = takeTopK(post, o.k)
  if (o.strict_grounded && top.length===0) return NoEvidence(204)
  return { pre, post: top, logs }

부록 B — Evidence JSONL(스레드 턴) 한 줄 예
{ ts, role, text, grounded:{ grounded:true, refs:[...], reason }, recall:{ items_top3:[], elapsed_ms }, usage:{...}, ui_state:{...}, convId }

---------------------------------------------
승인·시작(제안)
---------------------------------------------
- 지금 턴에서 Phase 1 착수 → 체크포인트 기록 → API/로그 완료 후 A1 연동 테스트 → Phase 2로 진행.