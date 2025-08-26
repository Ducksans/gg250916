# QUARANTINE Manifest (Placeholder)

Status
- STATE: BLOCKED (execution pending)
- REASON: During the 72h run, .rules restricts file operations to WRITE_ALLOW and disallows modifying .rules; quarantine moves must be executed manually or after an approved override.
- RUN_ID: 72H_20250819_1114Z

Purpose
- Document the quarantine policy and the exact plan for isolating runtime artifacts and duplicate/nested trees.
- Prevent AI drift by enforcing a strict No-Reference/No-Modification policy for quarantined content.

Quarantine Target (root)
- gumgang_meeting/QUARANTINE/

Scope (planned sources to isolate)
1) Nested tree (duplicate root)
   - from: gumgang_meeting/gumgang_meeting/**
   - to:   gumgang_meeting/QUARANTINE/gumgang_meeting_nested/**
   - stub: gumgang_meeting/gumgang_meeting/README.QUARANTINED.md

2) Runtime artifacts (gumgang_0_5)
   - PIDs:
     - from: gumgang_meeting/gumgang_0_5/.backend.pid, .frontend.pid, terminal_server.pid
     - to:   gumgang_meeting/QUARANTINE/gumgang_0_5/pids/
   - Logs:
     - from: gumgang_meeting/gumgang_0_5/*{backend*.log,frontend*.log,memory_*.log,protocol_validation.log,gumgang_cmd.log,terminal_server.log}
     - to:   gumgang_meeting/QUARANTINE/gumgang_0_5/logs/
   - Large snapshots (JSON):
     - from: gumgang_meeting/gumgang_0_5/{complete_gumgang_memories_*.json,gumgang_memories_*.json,metacognitive_test_results_*.json,temporal_memory_test_results_*.json}
     - to:   gumgang_meeting/QUARANTINE/gumgang_0_5/snapshots/

Deny/Pattern Guidance
- Patterns prioritized for quarantine: "**/.git/**", "**/node_modules/**", "**/.venv/**", "**/.next/**", "**/target/**", "**/__pycache__/**", "**/.cache/**", "**/dist/**", "**/build/**", and large caches/artifacts discovered during scan.

Policy — No-Reference / No-Modification
- After execution, absolutely do not read, write, move, or cite any paths under QUARANTINE/ or the original nested path gumgang_meeting/gumgang_meeting/**.
- Evidence citations, code paths, and tools must ignore quarantined content.

Execution Plan (to be performed when authorized)
- Use atomic rsync/mv (archive mode) to preserve metadata while mirroring structure into QUARANTINE/.
- Leave stub README.QUARANTINED.md at each source root with:
  - reason, UTC timestamp, destination path, and the No-Reference/No-Modification policy.
- Produce post-exec inventory:
  - gumgang_meeting/QUARANTINE/QUARANTINE.md updated with counts and exact moved paths.
  - Update checkpoint (SSOT) with 6-line entry referencing this manifest.

Operator Checklist (pre-authorization)
- Verify: disk space, permissions, and no active processes holding files.
- Confirm: WRITE_ALLOW boundaries remain intact; do not quarantine any of gumgang_meeting/{ui,conversations,sessions,status}.
- Dry-run verified by: status/evidence/fs_quarantine_plan.md

Notes
- This file is a placeholder manifest only; no moves have been executed yet.
- Upon authorization, execute ST-0203 exactly as specified and then update this manifest with the executed inventory.
## Inventory (2025-08-19T13:53:49Z)
QUARANTINE/QUARANTINE.md
QUARANTINE/gumgang_meeting_nested/README.QUARANTINED.md
