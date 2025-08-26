# QUARANTINE Execution Manifest — ST-0203

RUN_ID: 72H_20250819_1114Z
STATUS: BLOCKED (tool I/O limited to WRITE_ALLOW)
REASON: .rules §1 FILE_OPERATIONS forbids moves outside WRITE_ALLOW; requires manual op or post-72h override.

Scope
- Quarantine runtime artifacts and the nested duplicate tree; mirror structure into gumgang_meeting/QUARANTINE/.

Planned moves (exact)
1) Nested tree
- from: gumgang_meeting/gumgang_meeting/**
- to:   gumgang_meeting/QUARANTINE/gumgang_meeting_nested/**
- stub: gumgang_meeting/gumgang_meeting/README.QUARANTINED.md

2) PIDs
- from: gumgang_meeting/gumgang_0_5/.backend.pid, gumgang_meeting/gumgang_0_5/.frontend.pid, gumgang_meeting/gumgang_0_5/terminal_server.pid
- to:   gumgang_meeting/QUARANTINE/gumgang_0_5/pids/

3) Logs
- from: gumgang_meeting/gumgang_0_5/*{backend*.log,frontend*.log,memory_*.log,protocol_validation.log,gumgang_cmd.log,terminal_server.log}
- to:   gumgang_meeting/QUARANTINE/gumgang_0_5/logs/

4) Snapshots (large JSON)
- from: gumgang_meeting/gumgang_0_5/{complete_gumgang_memories_*.json,gumgang_memories_*.json,metacognitive_test_results_*.json,temporal_memory_test_results_*.json}
- to:   gumgang_meeting/QUARANTINE/gumgang_0_5/snapshots/

Stub note (template)
- File: README.QUARANTINED.md at each source root after move
- Body: reason, UTC timestamp, target path, “No-Reference/No-Modification” policy, contact.

No-Reference/No-Modification
- After execution, do not read/write/quote any paths under QUARANTINE/ or the original nested path.

Preconditions (manual operator)
- Verify disk space and permissions.
- Execute atomic rsync/mv with --archive to preserve metadata.
- Generate QUARANTINE/QUARANTINE.md enumerating all moved paths with counts.

Post-exec evidence to produce
- gumgang_meeting/QUARANTINE/QUARANTINE.md
- Stubs at original locations
- Checkpoint append to gumgang_meeting/status/checkpoints/CKPT_72H_RUN.md

References
- Plan: gumgang_meeting/status/evidence/fs_quarantine_plan.md
- Guards: gumgang_meeting/.rules §6 (FS Quarantine), §10 (Non-Negotiables)