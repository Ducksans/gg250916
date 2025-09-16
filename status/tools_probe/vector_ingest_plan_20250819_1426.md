---
phase: past
---

# ST-0501 Vector Ingest Probe & Plan — 2025-08-19 14:26Z

Scope & Goal
- Build first-pass vector index for local search (GATE_VECTOR probe).
- Deliver: embedding+HNSW snapshot and append checkpoint with Evidence.

Env Probe (OPENAI_API_KEY)
- Source: process env (root .env is authoritative but private; do not print value).
- Method: at runtime, assert presence and log “OPENAI_API_KEY: present | missing”.
- If missing → mark BLOCKED in checkpoint and skip remote calls.

Corpus & Chunking
- Include: status/**/*.md, docs/**/*.md, ui/logs/*.json, .rules
- Exclude (deny-globs): **/.git/**, **/node_modules/**, **/dist/**, **/build/**
- Chunking: markdown-aware, 800–1200 chars, overlap 120, keep path + approx L-start.

Embedding & Index Config
- Provider: OpenAI (plan: text-embedding-3-small, dims≈1536)
- Space: cosine
- HNSW: M=16, ef_construction=200, ef_search=64

Outputs (WRITE_ALLOW only)
- Canonical snapshot(JSON): memory/index/VECTOR_INDEX_SNAPSHOT_YYYYMMDD_HHMM.json
- HNSW artifacts: status/resources/vector_index/index_YYYYMMDD_HHMM.(bin|meta)

Steps
1) Probe env key presence (no echo).
2) Enumerate corpus with include/exclude.
3) Chunk + normalize metadata {path, approx line, hash}.
4) Compute embeddings (batched).
5) Build HNSW, persist artifacts.
6) Write snapshot JSON and append checkpoint.

Evidence
- gumgang_meeting/status/roadmap/72H_TASK_BREAKDOWN.md#L44-50
- gumgang_meeting/memory/index/VECTOR_INDEX_SNAPSHOT_20250819_1426.json#L1-31
- gumgang_meeting/status/resources/fetch_snapshot_20250819_tauri.app.md#L1-36