---
phase: past
---

# Import Dry-run Scan Template (Conduits; BT-11)

Policy
- IMPORT_ENABLED: false (House first; no data movement)
- PII_STRICT: true (mask/redact; quarantine on discovery)
- Append-only evidence; NO raw payload copy — record stats/paths only.

Metadata
- pkg_id: <kebab-case id, no PII, e.g., gg-2025-08-pilot-a>
- source_uri: <origin or label>
- snapshot_ts: <ISO8601Z>
- declared_size_mb: <n.nn>
- est_total_lines: <int>
- notes: <context/purpose>

Summary (2–4 lines)
- <what is this package, why consider importing, high-level fit/risk>

Inventory (stats only; no raw content)
- file_types: <e.g., md:120, json:8, png:2>
- top_dirs: <dir1, dir2, …>
- largest_files: <path: size_mb, …>
- counts_by_type: <table or JSON block>
- red_flags: <long lines, binaries, unknown types, etc.>

PII / Risk
- detectors_run: <which heuristics/tools>
- pii_found: [ ] none  [ ] suspected  [ ] confirmed
- pii_notes: <what/where, redacted>
- quarantine_actions: <if any; path → QUARANTINE/; timestamp; reason>

Limits & Gates
- size_within_limits: [ ] yes  [ ] no/unknown
- lines_within_limits: [ ] yes  [ ] no/unknown
- required_gates: [x] GATE_FETCH  [x] GATE_GUARD  [ ] GATE_VECTOR (later)
- import_decision(dry-run): [ ] reject  [ ] request approval  [ ] defer
- prerequisites: <what must be true before enabling IMPORT_ENABLED=true>

Evidence (paths under status/evidence/**)
- stats_report_path: <status/evidence/import_index/<pkg_id>/scan.md>
- sample_listing_path: <status/evidence/import_index/<pkg_id>/listing.txt>
- checksum_manifest: <status/evidence/import_index/<pkg_id>/checksums.txt>

Next Steps (dry-run only)
- <actions to refine scan or prepare proposal; no data movement>

How to Use
1) Copy this template to: status/evidence/import_index/<pkg_id>/scan.md
2) Fill all sections; keep append-only edits.
3) Do NOT paste raw payload; include only redacted snippets or counts.
4) Open a 6-line checkpoint proposing “import consideration” and cite this file as Evidence.