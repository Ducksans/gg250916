# Memory Gate — DECISIONS (ADR Log)
Version: v1.0
Scope: BT-12 ST-1204 — ultra_long (L5) Memory Gate
SSOT: status/design/memory_gate/SSOT.md
API: status/design/memory_gate/API.yaml
Date (first entries): 2025-08-21
Change policy: Append-only; newest entries at top.

---

## ADR-0018 — SSOT Checkpoint Coupling (RUN_ID + Evidence)
- Date: 2025-08-21
- Status: Accepted
- Context
  - 승인(approve/reject)은 운영적 사건이므로 프로젝트 SSOT(CKPT_72H_RUN.md)와 결합되어야 함.
- Decision
  - Approve/Reject 요청은 runId와 checkpointEvidence(path#Lx-y)를 필수로 포함한다.
  - 서버는 runId가 CKPT_72H_RUN.md의 최신 RUN_ID 패턴과 일치함을 확인한다.
- Consequences
  - 모든 승인 기록은 체계적으로 회계 가능.
  - 승인 흐름의 외부화/재연성이 향상.
- References
  - status/checkpoints/CKPT_72H_RUN.md
  - SSOT.md §2, §10

## ADR-0017 — Source Root Rules (House-only Relaxation)
- Date: 2025-08-21
- Status: Accepted
- Context
  - 출처 다양성 판정의 일관성 필요.
- Decision
  - 기본: source_root는 상위 세그먼트(최대 2단계)로 추출.
  - 예: status/evidence/meetings → meetings, status/evidence/memory/tiers → memory_tiers.
  - House-only(단일 레포)일 땐 완화: refs ≥ 4 AND 서로 다른 “서브루트”.
- Consequences
  - 편중 증거를 제도적으로 억제.
- References
  - SSOT.md §4, §9

## ADR-0016 — gate_token Security (Minimal Exposure)
- Date: 2025-08-21
- Status: Accepted
- Context
  - L5 쓰기 권한을 토큰 기반으로 제한.
- Decision
  - gate_token = HMAC(secret, id | approved_sha256 | ts).
  - 응답/로그에는 필요 최소 범위로만 노출; 장기 저장 금지.
  - 회전(rotate) 정책은 .env + 운영 문서에 기록.
- Consequences
  - 토큰 탈취 리스크 최소화.
- References
  - SSOT.md §8, §17
  - .env: GATE_HMAC_SECRET

## ADR-0015 — Migration/Backfill Policy
- Date: 2025-08-21
- Status: Accepted
- Context
  - 기존 L5 항목이 없거나 미비한 환경에서의 역이관/보강.
- Decision
  - 기존 안정지식 역이관은 별도 승인 파이프라인로 처리(일괄 import 금지).
  - Gate 규칙(정족수/유사도/PII)을 동일하게 적용.
- Consequences
  - 회귀 오류/부정합 방지.
- References
  - SSOT.md §0, §12

## ADR-0014 — ENV Keys (Gate/Embedding/Review)
- Date: 2025-08-21
- Status: Accepted
- Decision
  - GATE_HMAC_SECRET (필수), EMBEDDING_VERSION, GATE_REVIEW_MONTHS=12.
- References
  - SSOT.md §15

## ADR-0013 — Stats Endpoint & Snapshots
- Date: 2025-08-21
- Status: Accepted
- Decision
  - GET /api/memory/gate/stats 제공(큐 길이/대기/승인율/PII율 등).
  - 일일 스냅샷: status/evidence/memory/gate/audit/stats_YYYYMMDD.json.
- Consequences
  - 운영 관측성 강화, 회고·튜닝 근거 확보.
- References
  - API.yaml /gate/stats
  - SSOT.md §6

## ADR-0012 — Error Codes (Standardized)
- Date: 2025-08-21
- Status: Accepted
- Decision
  - FOUR_EYES, GATE_REQUIRED, DUPLICATE, WEAK_EVIDENCE, PII, NOT_FOUND, BAD_REQUEST, INTERNAL.
- Consequences
  - UI/테스트/운영 로그 해석 용이.
- References
  - API.yaml ErrorResponse
  - SSOT.md §11

## ADR-0011 — UI Surfaces (A1/A4)
- Date: 2025-08-21
- Status: Accepted
- Decision
  - A1: “안정기억 제안” 모달(힌트/PII 배지).
  - A4: Gate 탭(pending/approved/rejected 리스트, 근거 미리보기, 체크박스).
- References
  - SSOT.md §14
  - ui/snapshots/unified_A1-A4_v0/index.html

## ADR-0010 — Storage Layout (Queues & Audit)
- Date: 2025-08-21
- Status: Accepted
- Decision
  - status/evidence/memory/gate/{pending,approved,rejected,audit}/
  - _TEMPLATE 제공(예시 JSON/JSONL).
- Consequences
  - 증거 우선·감사 용이.
- References
  - 구조 트리 제안, SSOT.md §16

## ADR-0009 — Index Post-Processing Pipeline
- Date: 2025-08-21
- Status: Accepted
- Decision
  - 승인 후 자동: inverted index 업데이트, vector upsert(EMBEDDING_VERSION 기록), refs 역링크 생성.
  - 요약 라인: status/resources/vector_index/gate_upserts_YYYYMMDD.jsonl.
- Consequences
  - ST-1202/1203 검색·앵커 품질 즉시 향상.
- References
  - SSOT.md §5

## ADR-0008 — review_at (12 Months)
- Date: 2025-08-21
- Status: Accepted
- Decision
  - 기본 review_at = now + 12개월(GATE_REVIEW_MONTHS 환경값 지원).
- Consequences
  - 안정지식의 주기적 재검토 내재화.

## ADR-0007 — Duplicate/Similarity Guard
- Date: 2025-08-21
- Status: Accepted
- Decision
  - sha256 동일: 409 차단.
  - cosine ≥ 0.98 차단, 0.95 ≤ cosine < 0.98 경고.
  - embedding_version 필수 기록.
- Consequences
  - 중복/유사 항목 유입 방지, 컬렉션 품질 보장.
- References
  - SSOT.md §4, §6

## ADR-0006 — PII Redaction Layer
- Date: 2025-08-21
- Status: Accepted
- Decision
  - PII 발견 시 redaction_suggested=true로 제안 유지.
  - redacted_text 기준으로만 승인 가능.
  - 원문은 콜드/암호화/미보관 정책 중 선택.
- References
  - SSOT.md §4, §17
  - status/resources/memory/pii/patterns_v1.json

## ADR-0005 — Evidence Quorum & Diversity
- Date: 2025-08-21
- Status: Accepted
- Decision
  - 기본: refs ≥ 3 AND source_root ≥ 2.
  - House-only 완화: refs ≥ 4 AND 서로 다른 서브루트.
  - 위반 시 APPROVE 422(WEAK_EVIDENCE).
- References
  - SSOT.md §4

## ADR-0004 — Integrity Hash & Chain Audit
- Date: 2025-08-21
- Status: Accepted
- Decision
  - proposal/approve/reject/audit 모두 sha256 저장.
  - audit.jsonl prev_hash→this_hash 체인으로 연속성 보장.
- Consequences
  - 변조 탐지·감사 내구성 확보.
- References
  - SSOT.md §7

## ADR-0003 — Gate Token + Server-Internal L5 Writes
- Date: 2025-08-21
- Status: Accepted
- Decision
  - memory_store(tier='ultra_long')는 서버 내부 호출만 허용.
  - gate_token 필수(검증 실패 시 403 GATE_REQUIRED).
- References
  - SSOT.md §3, §8
  - API.yaml ApproveResponse.gate_token

## ADR-0002 — 4-Eyes Enforcement
- Date: 2025-08-21
- Status: Accepted
- Decision
  - proposer ≠ approver 강제. 위반 시 403 FOUR_EYES.
- Consequences
  - 승인 편향·오류 리스크 감소.
- References
  - SSOT.md §3, §11

## ADR-0001 — Adopt Memory Gate SSOT (L5 Approval)
- Date: 2025-08-21
- Status: Accepted
- Context
  - ultra_long(L5) 안정지식은 신뢰·감사·보안이 핵심.
- Decision
  - ST-1204 SSOT를 채택하고 모든 규칙/임계를 단일 문서로 관리.
- Consequences
  - 구현/운영/감사 간 정합성 확보.
- References
  - SSOT.md

---

## ADR Template (for future entries)

- ID: ADR-XXXX — Title
- Date: YYYY-MM-DD
- Status: Proposed | Accepted | Superseded
- Context
- Decision
- Consequences
- References
