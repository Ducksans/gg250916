# SSOT Path Policy — 72h Escape Protocol

Purpose
- Eliminate drift by enforcing a single canonical checkpoint file path (SSOT) and deprecating any nested duplicates.

Canonical SSOT (enforced)
- CHECKPOINT_FILE: `gumgang_meeting/status/checkpoints/CKPT_72H_RUN.md`
- Format: Append-only, 6 lines per entry (RUN_ID, UTC_TS, SCOPE, DECISION, NEXT STEP, EVIDENCE)
- Cadence: Start, ≤90 min, and on task transitions

Deprecated (do not write)
- Nested path (legacy): `gumgang_meeting/gumgang_meeting/status/checkpoints/CKPT_72H_RUN.md`
- Status: Deprecated for writes; retained temporarily as read-only artifact until quarantine action in BT-02 ST-0203

Normalization Record
- Action: SSOT path normalized; all future appends MUST target the canonical path
- Date: 2025-08-19 (UTC)
- Prior content: Copied from nested path to canonical SSOT

Operational Rules
- Never reference or append to the nested path in code, docs, checkpoints, or evidence
- Evidence citations must use the canonical SSOT path
- Reviews must reject any changes that touch the deprecated path
- Grep guard (manual): search for `gumgang_meeting/gumgang_meeting/status/checkpoints/CKPT_72H_RUN.md`

Examples
- Good: Use `gumgang_meeting/status/checkpoints/CKPT_72H_RUN.md#Lx-y`
- Bad: Any path under `gumgang_meeting/gumgang_meeting/...`

References
- Policy source: `.rules` SSOT spec (CHECKPOINT_FILE)
- Roadmap: 72H task breakdown (checkpointing cadence)

Future Work (BT-02 ST-0203)
- Quarantine the deprecated file and leave a stub note at its original location