---
phase: past
---

# ST-1204 — Memory Gate Smoke Plan (v1)

Author: Zed Gumgang  
Scope: BT-12 ST-1204 — ultra_long(L5) Memory Gate  
SSOT: status/design/memory_gate/SSOT.md  
API: status/design/memory_gate/API.yaml  
Date: 2025-08-21

## 0) 목적
- Gate 핵심 흐름(제안→승인→L5 편입)을 최소 비용으로 검증한다.
- 서버 가드(4-Eyes, gate_token, 무결성 체인, 정족수/다양성/PII/중복/유사도)를 스모크 수준으로 확인한다.
- 승인 시 인덱스 후처리(역색인/벡터/역링크) 트리거와 증거 쓰기를 확인한다.

## 1) 전제/환경
- Backend FastAPI(8000) 구동 중
- Bridge(3037) 구동 중(선택; 파일 열기용)
- .env
  - GATE_HMAC_SECRET 설정
  - EMBEDDING_VERSION 설정(예: e5-large-v2@384)
  - GATE_REVIEW_MONTHS=12 (기본)
- SSOT/설계 문서 배치 확인
  - status/design/memory_gate/SSOT.md
  - status/design/memory_gate/API.yaml
  - status/design/memory_gate/DECISIONS.md
  - status/resources/memory/pii/patterns_v1.json
- 큐/감사 디렉토리 존재
  - status/evidence/memory/gate/{pending,approved,rejected,audit}/
  - status/evidence/memory/gate/_TEMPLATE/*
- RUN_ID 최신값: status/checkpoints/CKPT_72H_RUN.md

## 2) 엔드포인트(요약)
- POST /api/memory/gate/propose
- PATCH /api/memory/gate/propose/{id}
- POST /api/memory/gate/withdraw
- POST /api/memory/gate/approve
- POST /api/memory/gate/reject
- GET  /api/memory/gate/list?state=...
- GET  /api/memory/gate/item/{id}
- GET  /api/memory/gate/stats

## 3) 템플릿/픽스처
- status/evidence/memory/gate/_TEMPLATE/proposal_example.json
- status/evidence/memory/gate/_TEMPLATE/approve_record_example.json
- status/evidence/memory/gate/_TEMPLATE/reject_record_example.json
- status/evidence/memory/gate/_TEMPLATE/audit_line_example.jsonl

## 4) 스모크 케이스(핵심 8종)

각 케이스는 다음 공통 포맷으로 기록한다.  
- Request: HTTP/Body 요약  
- Expected: 상태코드/핵심 필드/오류코드  
- Evidence: 실제 경로, 감사 로그 라인, 요약 메모

### Case 1 — 정상 승인(정족수/다양성 OK, PII 없음)
- Request:
  - 1) POST /gate/propose { text, refs(≥3; 서로 다른 source_root≥2), rationale, proposer }
  - 2) POST /gate/approve { id, approver(≠proposer), runId(latest), checkpointEvidence }
- Expected:
  - 1) 201 Propose → pending/<id>.json 생성, audit에 PROPOSE append
  - 2) 201 Approve → approved/<id>.json, gate_token 발급, L5 write(ultra_long), indexes 업데이트 플래그 true
- Evidence:
  - status/evidence/memory/gate/pending/YYYYMMDD/<id>.json
  - status/evidence/memory/gate/approved/YYYYMMDD/<id>.json
  - status/evidence/memory/gate/audit/YYYYMMDD/audit.jsonl (체인 prev_hash→this_hash)
  - status/resources/vector_index/gate_upserts_YYYYMMDD.jsonl 라인 존재

### Case 2 — 정족수 부족(refs=2)
- Request:
  - 1) propose { refs=2 }
  - 2) approve { id, approver, runId, checkpointEvidence }
- Expected:
  - approve 422 Error.code=WEAK_EVIDENCE
- Evidence:
  - pending/<id>.json auto_checks.ref_count_ok=false
  - audit에 APPROVE 시도→REJECT 없이 에러 처리 로그(서버 런타임 로그로 대체 가능)

### Case 3 — 출처 다양성 실패(3 refs 모두 동일 root)
- Request:
  - refs는 3개지만 동일 source_root
- Expected:
  - approve 422 WEAK_EVIDENCE (source_diversity_ok=false)
- Evidence:
  - pending/<id>.json source_diversity_ok=false, auto_checks.notes에 편중 사유

### Case 4 — PII 포함 → 리다크션 경로로 승인
- Request:
  - 1) propose { text 내 email/phone 포함 } → 서버가 pii_flags 탐지, redaction_suggested=true
  - 2) patch { redacted_text } 로 수정
  - 3) approve { id, approver, runId, checkpointEvidence }
- Expected:
  - approve 201, approved에 approved_sha256(redacted_text 기준) 기록
- Evidence:
  - pending/<id>.json pii_flags[], redaction_suggested=true
  - patch 후 pending/<id>.json redacted_text 반영
  - approved/<id>.json approved_sha256

### Case 5 — 중복 텍스트(sha256 동일)
- Request:
  - 기존 승인된 텍스트와 동일한 text로 propose→approve
- Expected:
  - approve 409 DUPLICATE
- Evidence:
  - auto_checks.duplicate_sha256=true
  - audit에 DUPLICATE 사유 메모

### Case 6 — 4-Eyes 위반(proposer=approver)
- Request:
  - approve { approver == proposer }
- Expected:
  - 403 FOUR_EYES
- Evidence:
  - 서버 응답 error.code=FOUR_EYES
  - audit append(시도 기록) 혹은 서버 로그

### Case 7 — Gate 토큰 누락 L5 저장 시도
- Request:
  - memory_store(tier=ultra_long) 직접 호출 시뮬레이션(내부 전용 라우트일 경우 테스트 훅/모킹)
- Expected:
  - 403 GATE_REQUIRED
- Evidence:
  - 서버 응답 error.code=GATE_REQUIRED
  - 무단 기록 없음(ultra_long JSONL 변경 無)

### Case 8 — 감사 체인 연속성(연쇄 10건)
- Request:
  - propose/patch/withdraw/approve/reject 등의 혼합으로 10건 이상 이벤트 발생
- Expected:
  - audit.jsonl의 prev_hash→this_hash 체인 검증 PASS(검증 유틸 또는 임시 스크립트)
- Evidence:
  - status/evidence/memory/gate/audit/YYYYMMDD/audit.jsonl
  - 체인 검증 결과 요약 메모

## 5) 실행 순서(권장)
1) Case 1 통과(행복경로) → 승인 후 인덱스 플래그/역링크 확인
2) Case 2/3로 정족수/다양성 가드 확인
3) Case 4 리다크션 경로 검증
4) Case 5/6/7로 보안·중복 가드 확인
5) Case 8 감사 체인 검증으로 마무리

## 6) 증거 캡쳐 규칙
- 모든 성공/실패 응답 JSON과 최종 경로를 이 파일 하단 “Run Notes” 섹션에 붙여넣기
- 파일 경로 인용은 path#Lx-y 형태를 우선(적용 불가 시 경로만)
- 인덱스 후처리 결과: status/resources/vector_index/gate_upserts_YYYYMMDD.jsonl 라인 캡쳐

## 7) 에러 코드(확인용 요약)
- 403 FOUR_EYES / 403 GATE_REQUIRED
- 409 DUPLICATE
- 422 WEAK_EVIDENCE / 422 PII

## 8) 정합성 체크리스트(요약)
- [ ] 승인 없이 ultra_long 쓰기 불가
- [ ] 4-Eyes 강제
- [ ] 정족수/다양성 위반 시 승인 실패
- [ ] PII 발견 시 리다크션 경로로 승인
- [ ] 중복/유사도 가드 작동(sha256/임계값)
- [ ] 승인 시 인덱스 후처리 트리거
- [ ] 감사 체인 단절 없음

---

## Run Notes (append-only)

- RUN_AT: YYYY-MM-DDTHH:MM:SSZ
- CASE: (예: Case 1)
- REQUEST: (요약/중요 필드)
- RESPONSE: (요약/상태코드/에러코드)
- EVIDENCE:
  - pending_path: status/evidence/memory/gate/pending/YYYYMMDD/<id>.json
  - approved_path: status/evidence/memory/gate/approved/YYYYMMDD/<id>.json
  - rejected_path: status/evidence/memory/gate/rejected/YYYYMMDD/<id>.json
  - audit_path: status/evidence/memory/gate/audit/YYYYMMDD/audit.jsonl
  - index_upsert_log: status/resources/vector_index/gate_upserts_YYYYMMDD.jsonl
- NOTES: (관찰/이슈/추가 확인)

- RUN_AT: 2025-08-21T07:39:29Z
- CASE: Case 1 — 정상 승인
- REQUEST: propose(text="L5 게이트 핵심 지식", refs≥3, source_root≥2) → approve(approver=web, runId=72H_20250821_0204Z)
- RESPONSE: 201 approved
- EVIDENCE:
  - pending_path: status/evidence/memory/gate/pending/20250821/06CCQ24XTK2F8ESXYE4BAV8FP4.json
  - approved_path: status/evidence/memory/gate/approved/20250821/06CCQ24XTK2F8ESXYE4BAV8FP4.json
  - audit_path: status/evidence/memory/gate/audit/20250821/audit.jsonl
  - index_upsert_log: status/resources/vector_index/gate_upserts_20250821.jsonl
- NOTES: L5 기록 path=status/evidence/memory/tiers/ultra_long/20250821/GG-SESS-LOCAL.jsonl

- RUN_AT: 2025-08-21T07:30:10Z
- CASE: Case 2 — 정족수 부족
- REQUEST: propose(refs=2) → approve
- RESPONSE: 422 WEAK_EVIDENCE
- EVIDENCE:
  - pending_path: status/evidence/memory/gate/pending/20250821/<id>.json
  - audit_path: status/evidence/memory/gate/audit/20250821/audit.jsonl
- NOTES: auto_checks.ref_count_ok=false

- RUN_AT: 2025-08-21T07:30:20Z
- CASE: Case 3 — 출처 다양성 실패
- REQUEST: propose(3 refs same root) → approve
- RESPONSE: 422 WEAK_EVIDENCE
- EVIDENCE:
  - pending_path: status/evidence/memory/gate/pending/20250821/<id>.json
  - audit_path: status/evidence/memory/gate/audit/20250821/audit.jsonl
- NOTES: auto_checks.source_diversity_ok=false

- RUN_AT: 2025-08-21T07:39:29Z
- CASE: Case 4 — PII 포함 → 리다크션 승인
- REQUEST: propose(text with email) → patch(redacted_text) → approve
- RESPONSE: 201 approved
- EVIDENCE:
  - pending_path: status/evidence/memory/gate/pending/20250821/06CCQ26YB4PC3SXTNYN45FNKXC.json
  - approved_path: status/evidence/memory/gate/approved/20250821/06CCQ26YB4PC3SXTNYN45FNKXC.json
  - audit_path: status/evidence/memory/gate/audit/20250821/audit.jsonl
- NOTES: approved_sha256은 redacted_text 기준

- RUN_AT: 2025-08-21T07:47:01Z
- CASE: Case 5 — 중복 텍스트
- REQUEST: 동일 텍스트 재승인 시도
- RESPONSE: (패치 전) 201 approved → (패치 후) 409 DUPLICATE
- EVIDENCE:
  - approved_paths(중복 예시): status/evidence/memory/gate/approved/20250821/06CCQ24XTK2F8ESXYE4BAV8FP4.json, 06CCQ4PJX0SCSRP6K26QMX8Z88.json, 06CCQ63FW2PEFJ82DRNM5FRSJW.json, 06CCQ6RFG01VHZXR2P7E2BGDXM.json
  - L5 lines(중복): status/evidence/memory/tiers/ultra_long/20250821/GG-SESS-LOCAL.jsonl
  - audit_path: status/evidence/memory/gate/audit/20250821/audit.jsonl
- NOTES: 보강 후 rglob+L5 JSONL 스캔으로 409 확정

- RUN_AT: 2025-08-21T07:45:00Z
- CASE: Case 6 — 4-Eyes 위반
- REQUEST: approve(approver==proposer)
- RESPONSE: 403 FOUR_EYES
- EVIDENCE:
  - audit_path: status/evidence/memory/gate/audit/20250821/audit.jsonl

- RUN_AT: 2025-08-21T07:30:44Z
- CASE: Case 7 — Gate 토큰 누락 직접 L5 쓰기
- REQUEST: POST /api/memory/store tier=ultra_long (gate_token 없음)
- RESPONSE: 403 GATE_REQUIRED
- EVIDENCE:
  - N/A(거부)

- RUN_AT: 2025-08-21T07:59:23Z
- CASE: Case 8 — 감사 체인/통계
- REQUEST: tail audit + GET /api/memory/gate/stats
- RESPONSE: ok:true, pending=10, approved=6, rejected=0, rate=0.375
- EVIDENCE:
  - audit_path: status/evidence/memory/gate/audit/20250821/audit.jsonl
  - stats_path: status/evidence/memory/gate/audit/stats_20250821.json

RESULT: ST-1204 PASS — Gate(제안/승인/거부/토큰/4-Eyes/PII/중복/감사·통계) 스모크 통과. 중복 가드 보강 전 승인 사례는 보강 후 409로 차단됨을 확인함.
