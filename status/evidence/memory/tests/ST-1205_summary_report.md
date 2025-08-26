# ST-1205 — Summary Report (Unified Search + Strict Grounded Mode, SGM_v1)

Version: 1.0 (final)  
Scope: BT-12 / ST-1205  
Window: Phase 1 → Phase 3 complete

## 1) Objective
Deliver a fact-only chat runtime that:
- Uses Unified Search (memory + files) as the evidence layer.
- Enforces SGM gate: when evidence=0 within the wait window, block model calls (no hallucination).
- Logs every decision with transparent evidence_path, source_mix, grounded flags for observability.

## 2) Delivered (by Phase)

- Phase 1 — Unified API (memory-only), A1 fallback
  - API: GET /api/search/unified (wraps memory_search; returns pre/post/source_mix/grounded/evidence_path/logs)
    - Evidence: gumgang_meeting/app/api.py#L1561-1648
  - A1: Unified-first call; fallback to /api/memory/search if unified is unavailable
    - Evidence: gumgang_meeting/ui/proto/chat_view_A1/index.html#L820-860
  - Tests (A/B): grounded responses with evidence_path
    - Report: gumgang_meeting/status/evidence/memory/tests/ST-1205_phase1_tests.md#L1-76

- Phase 2 — FileRetriever v0 + Unified merge (ENV-guarded)
  - File channel (whitelist dirs; kw+mtime scoring; basic filters)
    - Evidence: gumgang_meeting/app/search/file_retriever_v0.py#L1-220
    - Sample seed: gumgang_meeting/projects/phase2_sample_note.md#L1-48
  - Unified merge (memory ∪ file → rank)
    - Evidence: gumgang_meeting/app/api.py#L1561-1698
  - Tests (A/B): source_mix.file > 0 confirmed, evidence_path consistent
    - A: status/evidence/memory/search_runs/20250825/run_1756104823891.json
    - B: status/evidence/memory/search_runs/20250825/run_1756104833450.json
  - Phase 2C: strict no‑evidence case PASS (ok:false + hint.evidence_path)
    - C: status/evidence/memory/search_runs/20250825/run_1756105165774.json
  - Test report: gumgang_meeting/status/evidence/memory/tests/ST-1205_phase2_tests.md#L1-73

- Phase 3 — Router + Conditional Self‑RAG v0.5 (rerank)
  - Policy: apply if recency<0.2 AND refs<0.2; 0.92*base + 0.08*rubric(kw 0.6 / recency 0.2 / refs 0.2)
    - Bonus: refs≥1 → +0.05; Cap: kw≥0.9 → uplift≤0.02
  - Implementation + logs (rerank_policy, rerank_applied)
    - Evidence: gumgang_meeting/app/api.py#L1657-1766
  - A1 badge updated to reflect sources
    - Evidence: gumgang_meeting/ui/proto/chat_view_A1/index.html#L836-843
  - Rerank-applied run (half_life=0.05, fresh=0.2) — rerank_applied > 0 confirmed
    - Unified runs index (same day):  
      status/evidence/memory/unified_runs/20250825/run_1756104823906.json  
      status/evidence/memory/unified_runs/20250825/run_1756104833462.json  
      status/evidence/memory/unified_runs/20250825/run_1756105165787.json  
      (see directory for the exact run created during your test window)

## 3) SGM Gate — Behavior Guarantee
- Strict mode (strict=1) with 0 evidence → API returns ok:false + hint.evidence_path
  - Verified: status/evidence/memory/search_runs/20250825/run_1756105165774.json
- A1 enforces the same gate; when unified returns no evidence, it shows the “lack of evidence” template (no model call).

## 4) API Contract (stable for A1)
- GET /api/search/unified
  - Query: q (required), k (default 5), half_life, fresh, self_rag (0|1), strict (0|1)
  - Response (200): { pre, post, source_mix{memory,file}, grounded, evidence_path, logs{need_fresh,self_rag,file_enabled,rerank_policy,rerank_applied} }
  - Response (strict=1 and post=0): { ok:false, hint{ suggestion?, evidence_path } }
- Backward-compat: /api/memory/search remains available and still returns evidence_path

## 5) A1 UX (Phase 3)
- Badge: “SGM ON · sources: memory+files”
  - Evidence: gumgang_meeting/ui/proto/chat_view_A1/index.html#L836-843
- Evidence display: paths from both memory (JSONL#line) and files (project-relative)
- Status line: existing “대기/충족/근거 부족” semantics preserved

## 6) Tests — Highlights
- Phase 1 A/B (memory-only) PASS  
  Report: gumgang_meeting/status/evidence/memory/tests/ST-1205_phase1_tests.md#L1-76
- Phase 2 A/B (file enabled) PASS, C (strict) PASS  
  Report: gumgang_meeting/status/evidence/memory/tests/ST-1205_phase2_tests.md#L1-73
- Phase 3 rerank-applied PASS (half_life=0.05)  
  Unified runs: status/evidence/memory/unified_runs/20250825/run_*.json (see above)

## 7) Risks & Mitigations
- Latency increase ⇒ Parallel channels + early top‑K cut; strict wait ≤5s via UI; logs capture timing.
- Quality variance ⇒ Conditional rerank (v0.5) minimizes overcorrection; SGM blocks zero‑evidence outputs.
- PII/permissions ⇒ File channel is whitelist‑only; option to add PII scan/redaction in later iteration.

## 8) DoD Checklist (ST‑1205)
- [x] Unified search returns pre/post, grounded, evidence_path, source_mix
- [x] SGM gate blocks zero‑evidence (server+client)
- [x] File channel (whitelist, kw+mtime) integrated and toggleable via ENV
- [x] Conditional Self‑RAG rerank (v0.5) applied and logged
- [x] A1 badge/labels reflect memory+files
- [x] Phase 1~3 test reports + run artifacts committed as Evidence

## 9) Evidence Index (primary)
- API (Unified + Router + Rerank): gumgang_meeting/app/api.py#L1561-1766
- File retriever v0: gumgang_meeting/app/search/file_retriever_v0.py#L1-220
- A1 integration + badge: gumgang_meeting/ui/proto/chat_view_A1/index.html#L820-860, #L836-843
- Tests:
  - Phase 1: gumgang_meeting/status/evidence/memory/tests/ST-1205_phase1_tests.md#L1-76
  - Phase 2: gumgang_meeting/status/evidence/memory/tests/ST-1205_phase2_tests.md#L1-73
- Search runs (samples)
  - A: status/evidence/memory/search_runs/20250825/run_1756104823891.json
  - B: status/evidence/memory/search_runs/20250825/run_1756104833450.json
  - C: status/evidence/memory/search_runs/20250825/run_1756105165774.json
- Unified runs (samples)
  - status/evidence/memory/unified_runs/20250825/run_1756104823906.json
  - status/evidence/memory/unified_runs/20250825/run_1756104833462.json
  - status/evidence/memory/unified_runs/20250825/run_1756105165787.json

## 10) Conclusion
ST‑1205 is complete. Unified Search (memory+files) + SGM gate are enforced end‑to‑end with transparent evidence logging, and conditional rerank improves stability under weak‑freshness/low‑refs scenarios.

## 11) Next (new thread, ST‑1206 — Thread UX v1)
- convId badge + recent thread list
- Append‑only JSONL per thread: status/evidence/ui_runtime/threads/YYYYMMDD/<convId>.jsonl
- Local cache: localStorage.gg_a1_<convId>, gg_last_conv
- Open/continue thread; “복구” button; SGM gate intact
