# FS Quarantine Dry-Run Plan (ST-0201)

Scope
- Roots scanned: gumgang_meeting/, gumgang_meeting/gumgang_0_5/
- Rules: QUARANTINE_TARGET gumgang_meeting/QUARANTINE/ with mirrored paths; WRITE_ALLOW unchanged.
- Sources: gumgang_meeting/status/roadmap/72H_TASK_BREAKDOWN.md#L33-49, gumgang_meeting/.rules#L68-95

Scan summary (deny globs)
- node_modules: 0
- .venv: 0
- .next: 0
- target: 0
- __pycache__: 0
- dist: 0
- build: 0
- .git: 0

Dry-run candidates (non-code artifacts)
- Ephemeral PIDs:
  - gumgang_meeting/gumgang_0_5/.backend.pid
  - gumgang_meeting/gumgang_0_5/.frontend.pid
  - gumgang_meeting/gumgang_0_5/terminal_server.pid
- Logs:
  - gumgang_meeting/gumgang_0_5/backend.log
  - gumgang_meeting/gumgang_0_5/backend_server.log
  - gumgang_meeting/gumgang_0_5/frontend.log
  - gumgang_meeting/gumgang_0_5/frontend_test.log
  - gumgang_meeting/gumgang_0_5/memory_collection.log
  - gumgang_meeting/gumgang_0_5/memory_integration.log
  - gumgang_meeting/gumgang_0_5/protocol_validation.log
  - gumgang_meeting/gumgang_0_5/complete_memory_integration.log
  - gumgang_meeting/gumgang_0_5/gumgang_cmd.log
  - gumgang_meeting/gumgang_0_5/terminal_server.log
- Large snapshots (JSON):
  - gumgang_meeting/gumgang_0_5/complete_gumgang_memories_*.json
  - gumgang_meeting/gumgang_0_5/gumgang_memories_*.json
  - gumgang_meeting/gumgang_0_5/metacognitive_test_results_*.json
  - gumgang_meeting/gumgang_0_5/temporal_memory_test_results_*.json

Intended moves (plan only; no execution)
- Move PIDs → QUARANTINE/gumgang_0_5/pids/ (mirror filenames)
- Move Logs → QUARANTINE/gumgang_0_5/logs/
- Move Snapshots → QUARANTINE/gumgang_0_5/snapshots/
- Quarantine entire nested tree: gumgang_meeting/gumgang_meeting/** → QUARANTINE/gumgang_meeting_nested/** (mirror structure; deprecate original); leave stub notes at nested root.
- Create stub notes at original locations describing quarantine reason and target path.
- Do NOT touch WRITE_ALLOW dirs: gumgang_meeting/ui, conversations, sessions, status

Rationale
- Reduce noise and risk from ephemeral/runtime artifacts while keeping reproducible sources in place.
- Aligns with .rules §6 “large caches/artifacts” quarantine guidance.

Safety & Next steps
- This is a dry-run plan; no files moved yet.
- ST-0202: prepare RW ops probes confined to WRITEALLOW.
- ST-0203: execute moves per plan (including full quarantine of gumgang_meeting/gumgang_meeting/**); write QUARANTINE/QUARANTINE.md and stubs.
- No-reference/no-modification policy: After ST-0203, absolutely do not reference or modify any quarantined files under QUARANTINE/ or the original nested path; all tools, evidence, and code must ignore them to prevent AI drift.

Evidence pointers
- Roadmap directive: gumgang_meeting/status/roadmap/72H_TASK_BREAKDOWN.md#L33-49
- Sample artifacts: 
  - gumgang_meeting/gumgang_0_5/backend.log#L1-1
  - gumgang_meeting/gumgang_0_5/.backend.pid#L1-1
  - gumgang_meeting/gumgang_0_5/complete_gumgang_memories_20250807_143946.json#L1-1