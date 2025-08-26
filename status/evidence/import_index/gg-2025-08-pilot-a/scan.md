# Import Dry-run Scan Template (Conduits; BT-11)

Policy
- IMPORT_ENABLED: false (House first; no data movement)
- PII_STRICT: true (mask/redact; quarantine on discovery)
- Append-only evidence; NO raw payload copy — record stats/paths only.

Metadata
- pkg_id: gg-2025-08-pilot-a
- source_uri: sample/local-probe (no raw data)
- snapshot_ts: 2025-08-21T02:17:00Z
- declared_size_mb: unknown
- est_total_lines: unknown
- notes: Dry-run only; House-first hardening; no payload collected.

Summary (2–4 lines)
- Candidate legacy snippets to evaluate future import; dry-run assesses size/PII/fit under v3.0 BT-11 constraints.

Inventory (stats only; no raw content)
- file_types: <e.g., md:120, json:8, png:2>
- top_dirs: <dir1, dir2, …>
- largest_files: <path: size_mb, …>
- counts_by_type: <table or JSON block>
- red_flags: <long lines, binaries, unknown types, etc.>

PII / Risk
- detectors_run: manual review checklist (no raw data); filename/extension heuristics
- pii_found: [x] none  [ ] suspected  [ ] confirmed
- pii_notes: n/a
- quarantine_actions: <if any; path → QUARANTINE/; timestamp; reason>

Limits & Gates
- size_within_limits: [ ] yes  [x] no/unknown
- lines_within_limits: [ ] yes  [x] no/unknown
- required_gates: [x] GATE_FETCH  [x] GATE_GUARD  [ ] GATE_VECTOR (later)
- import_decision(dry-run): [ ] reject  [ ] request approval  [x] defer
- prerequisites: BT-12 memory loop stable; SAFE/NORMAL parity verified; explicit checkpoint to flip IMPORT_ENABLED=true.

Evidence (paths under status/evidence/**)
- stats_report_path: status/evidence/import_index/gg-2025-08-pilot-a/scan.md
- sample_listing_path: status/evidence/import_index/gg-2025-08-pilot-a/listing.txt
- checksum_manifest: status/evidence/import_index/gg-2025-08-pilot-a/checksums.txt

Next Steps (dry-run only)
- <actions to refine scan or prepare proposal; no data movement>

How to Use
1) Copy this template to: status/evidence/import_index/<pkg_id>/scan.md
2) Fill all sections; keep append-only edits.
3) Do NOT paste raw payload; include only redacted snippets or counts.
4) Open a 6-line checkpoint proposing “import consideration” and cite this file as Evidence.