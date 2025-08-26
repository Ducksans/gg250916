# ST-1204 — Memory Gate SSOT (Single Source of Truth)

문서 버전: v1.0  
적용 범위: gumgang_meeting/ (BT-12 ST-1204 — 초장기(ultra_long) 메모리 게이트)  
권위: 본 문서가 Gate 절차·규칙·임계·에러코드·수용 기준(AC)의 단일 SSOT입니다.

## 0) 목적
- 초장기(ultra_long) 메모리는 승인 기반으로만 편입한다.
- “제안 → 승인(SSOT 연계) → L5 편입” 절차를 기술적 가드와 함께 고정한다.
- 감사 가능성(무결성 체인)과 안전(PII/중복/유사도/출처 다양성)을 보장한다.
- 승인 즉시 검색 품질(문헌/앵커)을 높이기 위해 인덱스 후처리를 자동화한다.

## 1) 용어/범위
- L5, ultra_long: 가장 안정적인 지식 저장 계층
- 제안자(proposer), 승인자(approver): 4-Eyes(서로 달라야 함)
- gate_token: 승인 ID 기반의 내부 쓰기 토큰(HMAC 포함)
- source_root: 경로 루트(리포지토리/상위 세그먼트) 단위의 출처 구분

## 2) 절차(Procedure)
1) Propose
   - 제안자가 안정지식 후보를 제출(text/refs/rationale 등)
   - 자동체크 수행: PII/정족수/다양성/중복/유사도
   - 결과를 pending 큐에 JSON(append-only)로 저장 + 감사 로그 JSONL 1행 기록

2) Approve
   - 승인자는 4-Eyes 조건 하에 심사
   - SSOT 체크포인트 연계: 최신 RUN_ID 및 checkpointEvidence 경로 포함
   - gate_token 발급(approved.id, approved_sha256, ts 기반 HMAC)
   - L5 편입(write)은 “서버 내부 호출+gate_token 검증” 통과 시에만 수행
   - 승인본 저장(approved), 감사 로그 append

3) Reject
   - 사유(reject_code, reason)와 함께 기각본 저장(rejected), 감사 로그 append

4) Patch (경미 수정/리다크션 적용만)
   - pending에 한해 redacted_text/오타 등 경미 수정
   - 승인 후에는 불가(새 제안으로)

5) Withdraw
   - 제안자가 스스로 취하, 감사 로그 append

6) Stats
   - 큐 길이, 평균 대기시간, 승인율, PII 경고율 등 집계 반환
   - 스냅샷을 주기적으로 status/evidence/memory/gate/audit/stats_YYYYMMDD.json 에 저장(선택)

## 3) 서버 가드(Server Guards)
- memory_store(tier='ultra_long')는 외부 직접 호출 금지(내부 전용)
- gate_token(=approved id 기반 HMAC) 없으면 403 GATE_REQUIRED
- gate_token 검증(HMAC + approved 레코드 존재 + 무결성 해시 일치) 실패 시 거부
- proposer == approver → 403 FOUR_EYES

## 4) 규칙/임계(Thresholds & Policy)
- 정족수: refs ≥ 3
- 출처 다양성: source_root ≥ 2
  - 하우스-only(단일 레포) 상황에서는 완화: refs ≥ 4 AND 서로 다른 “서브루트”
- 중복/유사도:
  - sha256 동일: 409 DUPLICATE (차단)
  - cosine 유사도: ≥ 0.98 차단 / 0.95 ~ 0.98 경고
  - embedding_version 필수 기록
- PII_STRICT → 리다크션 레이어:
  - PII 탐지 시 즉시 거부 대신 redaction_suggested=true로 제안 유지
  - redacted_text 기준으로만 승인 가능
  - 원문은 콜드 영역 암호화 저장(선택) 또는 미보관
- review_at: 기본 12개월 후 재검토(큐 편성)

## 5) 인덱스 후처리(승인→L5 편입 시 자동)
- 역색인(inverted index) 업데이트
- 벡터 인덱스 upsert(embedding_version 포함)
- “근거 역링크” 생성(approved_id ↔ refs[*])
- 결과 요약 라인: status/resources/vector_index/gate_upserts_YYYYMMDD.jsonl

## 6) 데이터 모델(요약)
- proposal.json (pending)
  - id(ULID), created_at, proposer, scope_id?, session_id?, text, redacted_text?
  - refs[], rationale, sha256(text), pii_flags[], source_diversity_ok:boolean
  - dup_candidates[] (hash/유사도 후보), auto_checks{...}, embedding_version?
- approved.json
  - id, approved_at, approver, run_id, checkpoint_evidence
  - approved_sha256, gate_token, prev_hash, review_at
- rejected.json
  - id, rejected_at, approver, reject_code(enum: PII, DUPLICATE, WEAK_EVIDENCE, OTHER), reason, prev_hash
- audit.jsonl (append-only; 체인)
  - ts, actor, action(PROPOSE|APPROVE|REJECT|WITHDRAW|PATCH), id, prev_hash, this_hash, meta{}

## 7) 무결성 해시 & 체인 로그
- 모든 레코드에 sha256 저장
- 감사 로그 JSONL은 prev_hash→this_hash 체인으로 변조 탐지
- 체인 단절 발생 시 에러/경고로 고정(승인 불가) 및 증거 기록

## 8) Gate 토큰
- gate_token = HMAC(secret, id | approved_sha256 | ts)
- .env 키: GATE_HMAC_SECRET (필수), 회전(rotate) 정책 문서화
- 검증: id 존재, sha256 일치, ts 유효범위(선택) + HMAC 검증

## 9) Source Root 규칙(예시)
- status/evidence/meetings/** → meetings
- status/evidence/memory/tiers/** → memory_tiers
- status/resources/vector_index/** → vector_index
- 그 외 최상위 세그먼트 2단계까지를 루트로 간주
- 하우스-only 완화 시 “서로 다른 서브디렉터리”로 다양성 판정

## 10) API 개요(세부 스키마는 API.yaml)
- POST /api/memory/gate/propose
  - body: { id?, text, refs[], rationale, scope_id?, sessionId?, proposer, redacted_text? }
  - server adds: sha256, pii_flags[], source_diversity_ok, dup_candidates[], embedding_version?, auto_checks
  - result: pending path, audit_line
- PATCH /api/memory/gate/propose/{id}
  - body: { redacted_text?, typo_fixes? }
- POST /api/memory/gate/withdraw
  - body: { id, actor }
- POST /api/memory/gate/approve
  - body: { id, approver, runId, checkpointEvidence, override_reason? }
  - server: 4-Eyes 검증, gate_token 발급, L5 내부 write(+token 검증), approved 저장, 인덱스 후처리, 감사 로그
  - adds: gate_token, approved_sha256, prev_hash, review_at
- POST /api/memory/gate/reject
  - body: { id, approver, reject_code, reason, runId }
  - adds: prev_hash
- GET /api/memory/gate/list?state=pending|approved|rejected&limit=50
- GET /api/memory/gate/item/{id}
- GET /api/memory/gate/stats

## 11) 에러 코드(요약)
- 403 GATE_REQUIRED: L5 저장 시 gate_token 없음/검증 실패
- 403 FOUR_EYES: proposer=approver
- 409 DUPLICATE: sha256 동일
- 422 WEAK_EVIDENCE: refs<3 또는 source_root<2(완화 케이스 불충족)
- 422 PII: PII 발견(리다크션 경로 안내)
- 400/500: 파라미터/서버 내부 오류

## 12) 수용 기준(AC)
- 승인 없이 ultra_long 쓰기 시도 → 403 GATE_REQUIRED
- refs < 3 또는 단일 소스 편중 → APPROVE 422(WEAK_EVIDENCE)
- proposer=approver → 403(FOUR_EYES)
- PII 포함 → APPROVE 422(PII), redaction 경로 제공
- 승인 성공 시 응답에 L5 경로 + gate_token + approved_sha256 + checkpointEvidence 포함
- 승인 후 인덱스 3종(역색인/벡터/역링크) 갱신 확인
- 감사 로그 체인 단절 없음(연속성 검증 PASS)

## 13) 스모크 테스트(최소 8)
1) 정상 승인: refs=3(2 소스 이상), PII 없음 → PASS, 인덱스 반영 확인  
2) 정족수 부족: refs=2 → APPROVE 422  
3) 단일 소스 편중: 3개 모두 동일 루트 → APPROVE 422  
4) PII 포함: 전화/이메일 포함 → redaction 유도 → redacted 승인 PASS  
5) 중복 텍스트: 기존 승인과 sha256 동일 → APPROVE 409  
6) 4-Eyes 위반: 같은 계정 승인 → 403  
7) Gate 토큰 누락 저장 시도: 직접 L5 write → 403  
8) 감사 체인 연속성: 로그 10건 연쇄 후 prev_hash/this_hash 검증 PASS

## 14) 운영/UX 메모
- A1 제안 모달: “서로 다른 경로에서 3개 이상” 힌트, PII 경고 배지
- A4 Gate 탭: pending/approved/rejected 리스트, 근거 미리보기, 체크포인트 링크
- 승인 다이얼로그 체크박스: 4-Eyes, refs≥3, PII 없음, 중복 아님
- stats 스냅샷: audit/stats_YYYYMMDD.json 저장(선택)

## 15) ENV/구성
- .env
  - GATE_HMAC_SECRET (필수)
  - EMBEDDING_VERSION (예: e5-large-v2@384)
  - GATE_REVIEW_MONTHS=12 (기본)
- .rules v3.0: SSOT·포트·WRITE_ALLOW 준수, IMPORT_ENABLED=false 유지

## 16) 경로 구조(요약)
- status/design/memory_gate/
  - SSOT.md (본 문서), API.yaml, DECISIONS.md, PII_POLICY.md
- status/evidence/memory/gate/
  - _TEMPLATE/, pending/, approved/, rejected/, audit/
- status/resources/memory/pii/patterns_v1.json
- status/evidence/memory/tests/ST-1204_smoke_plan.md
- app/api.py (Gate API & 내부 L5 write), app/gate_utils.py (해시/HMAC/체인/PII/유사도)
- ui/snapshots/unified_A1-A4_v0/index.html (A1 제안 모달, A4 Gate 탭)

## 17) 보안/정책
- gate_token은 응답·로그에 과도 노출 금지(필요 최소 범위)
- 감사 로그는 append-only, 체인 검증 실패 시 즉시 경보
- PII 원본 저장을 피하고, 불가피 시 콜드/암호화/격리+접근통제

## 18) 변경통제
- 변경은 DECISIONS.md(ADR)로 기록(항목, 근거, 임계값 출처)
- 문서/스펙/코드 간 참조 일치(SSOT 우선)

— 끝 —