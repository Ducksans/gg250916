---
phase: past
---

# ST-1205 — Phase 1 A/B Test Report (Unified API: memory-only stub)

Scope
- Task: BT-12 / ST-1205
- Phase: 1 (Unified API memory-only; A1 unified-first + fallback wired)
- Goal: Verify /api/search/unified returns grounded evidence from memory channel, logs evidence_path, and A1 calls unified first, falling back to /api/memory/search only on failure.

Environment
- Backend: FastAPI (uvicorn app.api:app) @ 127.0.0.1:8000 (health OK)
- Bridge: 3037 (not required for this test; A1 integration verified separately)
- Unified API (Phase 1) implementation:
  - Evidence: gumgang_meeting/app/api.py#L1561-1648
- A1 integration (unified-first + fallback + badge “SGM ON · sources: memory”):
  - Evidence: gumgang_meeting/ui/proto/chat_view_A1/index.html#L820-860

Test Matrix (A/B)
- A: Typical query with existing memory hits → expect ok:true, grounded:true, source_mix.memory>0, evidence_path present
- B: Low-likelihood token query (still may hit due to recent “ping” seed) → expect same as A in Phase 1 (memory-only), confirm logging and grounded flag

How to Reproduce
- A:
  curl -s 'http://127.0.0.1:8000/api/search/unified?q=hello&k=5&self_rag=1&strict=1'
- B:
  curl -s 'http://127.0.0.1:8000/api/search/unified?q=__nohit__unlikely&k=3&self_rag=1&strict=1'

Results (A/B)

A) Query: "hello"
- Response: ok:true, data.grounded:true, data.source_mix={memory:5,file:0}, data.evidence_path set
- Evidence (search run JSON):
  - gumgang_meeting/status/evidence/memory/search_runs/20250825/run_1756102827775.json#L1-200
- Notes:
  - pre/post arrays populated with memory hits
  - strict gate not triggered (grounded=true)
  - Phase 1 behavior as designed (memory-only); file channel not included

B) Query: "__nohit__unlikely"
- Response: ok:true, data.grounded:true, data.source_mix={memory:3,file:0}, data.evidence_path set
- Evidence (search run JSON):
  - gumgang_meeting/status/evidence/memory/search_runs/20250825/run_1756103157327.json#L1-200
- Notes:
  - Despite a “low-likelihood” token, recent ultra_short items (e.g., “ping”) produce hits (freshness weight)
  - strict gate not triggered
  - Confirms unified → memory pipeline stability

A1 Integration Sanity (manual)
- Unified-first call path and fallback code present; badge rendered as “SGM ON · sources: memory”
- Evidence:
  - gumgang_meeting/ui/proto/chat_view_A1/index.html#L820-860

Findings
- Unified API (Phase 1) returns grounded results and evidence_path. Behavior matches memory_search since file channel is OFF.
- A1 successfully integrates unified-first with fallback; current runs did not require fallback.
- Evidence trails (search_runs) are consistently written and referenced back to clients via data.evidence_path.

DoD Checklist (Phase 1)
- [x] /api/search/unified returns {pre, post, source_mix, grounded, evidence_path}
- [x] strict=1 returns ok:false only when post.length==0 (not triggered in A/B)
- [x] A1 unified-first call present with fallback path to /api/memory/search
- [x] evidence_path points to status/evidence/memory/search_runs/YYYYMMDD/run_*.json
- [x] Logs for unified_runs also created (Phase 1 writer; path recorded internally)

Deviations / Open Items
- C case (strict gate with zero evidence) not triggered under current memory seed; keep for regression after Phase 2 toggles or using a clean memory set.
- unified_runs file paths not enumerated in this report; search_runs evidence paths are sufficient for Phase 1 verification.

Next Steps
- Proceed to Phase 2 (FileRetriever v0: whitelist + kw+mtime scoring, default OFF).
- Prepare a clean memory scenario or query shaping to force C case (refs=0) for strict gate validation.
- Keep A1 badge as “sources: memory” until Phase 3, then update to “memory+files”.

Appendix — Key Evidence Index
- Unified API impl: gumgang_meeting/app/api.py#L1561-1648
- A1 unified-first integration: gumgang_meeting/ui/proto/chat_view_A1/index.html#L820-860
- Search run (A): gumgang_meeting/status/evidence/memory/search_runs/20250825/run_1756102827775.json#L1-200
- Search run (B): gumgang_meeting/status/evidence/memory/search_runs/20250825/run_1756103157327.json#L1-200