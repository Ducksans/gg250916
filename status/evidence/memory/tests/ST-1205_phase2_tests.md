---
phase: past
---

# ST-1205 — Phase 2 A/B/C Test Report (Unified Search: File Channel Enabled)

Scope
- BT-12 / ST-1205 — Phase 2(FileRetriever v0, whitelist + kw+mtime, SGM 유지)
- Goal: Unified Search에서 file 채널이 실제로 Top-K에 기여(source_mix.file > 0)하는지 검증하고, strict=1 동작을 재확인

Environment
- Backend: FastAPI (uvicorn app.api:app) — OK
- Unified API: GET /api/search/unified
- Config (enabled):
  - FILE_RETRIEVER_ENABLED=true
  - FILE_WHITELIST=docs,projects,status/evidence/logs
  - FILE_EXTS=.md,.txt,.json,.py,.ts,.js,.html,.css,.yaml,.yml (기본)
  - Strict Gate(요청 파라미터): strict=1
- Test seed (file channel 대상):
  - projects/phase2_sample_note.md

Test Matrix
- A: “unified search phase 2” → file evidence가 Top-K에 포함되어야 함
- B: “sgm source mix files” → file evidence가 Top-K에 1건 이상 포함되어야 함
- C: 강한 네거티브 쿼리(또는 whitelist 비움) → strict=1에서 0건이면 ok:false + hint (게이트 확인)

How to run (examples)
- curl -s "http://127.0.0.1:8000/api/search/unified?q=unified%20search%20phase%202&k=5&self_rag=1&strict=1"
- curl -s "http://127.0.0.1:8000/api/search/unified?q=sgm%20source%20mix%20files&k=5&self_rag=1&strict=1"

Results

A) Query: "unified search phase 2"
- Response: ok:true, grounded:true
- source_mix: { memory: 2, file: 3 }  ← file 채널 기여 확인
- logs.file_enabled: true
- evidence_path: status/evidence/memory/search_runs/20250825/run_1756104823891.json

B) Query: "sgm source mix files"
- Response: ok:true, grounded:true
- source_mix: { memory: 4, file: 1 }  ← file 채널 기여 확인
- logs.file_enabled: true
- evidence_path: status/evidence/memory/search_runs/20250825/run_1756104833450.json

C) Negative-case(Strict Gate)
- 결과: PASS — strict=1 && post.length==0 → ok:false + hint.evidence_path 반환
- Query: "__nohit__ultra_rare_token_xyz"
- Evidence: status/evidence/memory/search_runs/20250825/run_1756105165774.json

DoD Checklist (Phase 2)
- [x] file 채널이 활성(ENV)일 때 source_mix.file > 0 재현(A/B)
- [x] evidence_path가 search_runs/* 경로로 일관되게 반환
- [x] logs.file_enabled=true 노출 확인
- [x] strict=1에서 0건 → ok:false + hint (C 케이스 PASS)

Findings
- 파일 채널이 활성화되면, 키워드·최근성 기반으로 실제 Top-K에 기여함을 확인.
- 메모리/파일 혼합 결과에서 파일 스니펫이 요약 텍스트로 들어오며, path는 프로젝트 상대 경로로 표기됨.
- 현 시드에서는 네거티브 케이스를 강제하지 않는 한 strict 게이트가 트리거되지 않음.

Next Steps
- C 케이스 재현 후 보고서 갱신(ok:false + hint.evidence_path 스냅샷 첨부)
- Phase 3 진행: Router + Self‑RAG v0.5 조건부 재랭크 적용(0.92/0.08, refs 보너스 +0.05, kw≥0.9 캡 +0.02)
- A1 UI: 배지 “SGM ON · sources: memory+files”로 업데이트(Phase 3 시점), 증거 블록에 파일 경로 병기

Evidence Index
- A: status/evidence/memory/search_runs/20250825/run_1756104823891.json
- B: status/evidence/memory/search_runs/20250825/run_1756104833450.json
- C: status/evidence/memory/search_runs/20250825/run_1756105165774.json
- Seed file: projects/phase2_sample_note.md

Appendix — Expected A1 UX (참고)
- 상태 라인: “리콜 대기/충족/근거 부족”
- 증거 블록: 메모리/파일 경로 혼합 표기(접힘)
- Strict Gate: refs=0인 경우 서버 ok:false + 프런트 없음 템플릿 출력