# Conduits README — Locked Policy (BT-11)

Purpose
- Define read-only “conduits” for future imports. During BT-11, imports are disabled to harden the House first.

State
- IMPORT_ENABLED: false
- PII_STRICT: true
- SSOT: status/checkpoints/CKPT_72H_RUN.md (append-only)

Conduits (definitions only)
- conversations/imported/<pkg_id>/{raw.jsonl, meta.json}
- status/evidence/import_index/<pkg_id>/*  (reports/summary only)
- artifacts/<date>/<slug>.json            (artifact cards)

Policy (non‑negotiable while IMPORT_ENABLED=false)
- No ingestion, mutation, or indexing of external packages.
- Dry‑run only: you may write reports under status/evidence/**.
- Append-only evidence; no destructive edits.
- Respect DENY_GLOBS and no symlinks outside project.

Dry‑run workflow (allowed)
1) Choose pkg_id (kebab-case, no PII). Example: gg-2025-08-pilot-a.
2) Generate a report:
   - status/evidence/import_index/<pkg_id>/scan.md
   - Summarize size, counts, risks; do not copy payloads.
3) Propose import by checkpoint (6-line entry in CKPT_72H_RUN.md) citing this README as Evidence.
4) Await explicit approval and IMPORT_ENABLED=true checkpoint before any data movement.

PII and Quarantine
- On PII discovery, stop, record evidence, and move offending material into QUARANTINE/ with a note in QUARANTINE/QUARANTINE.md.

Artifacts
- When later enabled, derived summaries/cards live in artifacts/<date>/<slug>.json (no raw content duplication).

Notes
- This policy aligns with .rules v3.0 BT-11 “House first, Conduits locked”.