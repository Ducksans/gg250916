---
phase: past
---

# OpenAI Docs — Curated Index for Gumgang (Live + Ongoing)

Purpose
- Single place to jump into the official docs when building/operating Gumgang on OpenAI as the core engine.
- Split into “Start now (immediate)” vs “Deep/ongoing reference.”
- Notes for how to use specific fields we already see in our logs (e.g., usage.prompt_tokens_details.cached_tokens).

How to use this index
- Bookmark this file: status/resources/openai_docs_index.md
- When something breaks or needs clarity, start at “A. Start Here,” then go to the exact API/topic in “B. Ongoing Reference.”
- Keep “C. Gumgang Ops Notes” in mind while reviewing vendor docs; it anchors the docs to our actual runtime.

---

A) Start Here — Immediate Entrypoints

1) Platform Overview (What/Where)
- Overview: https://platform.openai.com/docs/overview
- API Reference (root): https://platform.openai.com/docs/api-reference
- Models (names, capabilities, context windows): https://platform.openai.com/docs/models
- Pricing (for quick cost sanity): https://openai.com/pricing
- Status (incidents/outages): https://status.openai.com/

2) Core APIs we are using/likely to use first
- Chat/Responses (modern text generation flows): https://platform.openai.com/docs/api-reference
  - Tip: Within API Reference, open “chat” or “responses” section (OpenAI sometimes reorganizes; both are in the API Reference root)
- Embeddings (for retrieval/vector store): https://platform.openai.com/docs/api-reference/embeddings
- Files & Fine-tuning (if/when we customize): https://platform.openai.com/docs/api-reference/files and https://platform.openai.com/docs/guides/fine-tuning
- Realtime / Audio / Vision (if/when needed):
  - Realtime: https://platform.openai.com/docs/guides/realtime
  - Speech-to-Text (STT): https://platform.openai.com/docs/guides/speech-to-text
  - Text-to-Speech (TTS): https://platform.openai.com/docs/guides/text-to-speech
  - Vision (image understanding): https://platform.openai.com/docs/guides/vision

3) Operational must-reads
- Rate Limits (requests/tokens, backoff, retry): https://platform.openai.com/docs/guides/rate-limits
- Safety Best Practices: https://platform.openai.com/docs/guides/safety-best-practices
- Usage Policies (allowed/ disallowed): https://openai.com/policies/usage-policies

---

B) Ongoing Reference — Map by Topic

Modeling & Outputs
- Tools / Function calling / Structured outputs:
  - Function Calling: https://platform.openai.com/docs/guides/function-calling
  - Structured Outputs: https://platform.openai.com/docs/guides/structured-outputs
- Images:
  - Image generation/edit/variation (if needed) under API Reference root.

Tokens, Context, and Costs
- Tokens: Tokenization and budgeting concepts appear across docs; a quick explainer is in multiple guides. Keep the tokenizer handy:
  - Tokenizer (interactive): https://platform.openai.com/tokenizer
- Context windows & max output: Per-model in https://platform.openai.com/docs/models
- Usage metrics fields (where we saw cached tokens):
  - In API responses, usage.* fields report counts; watch for:
    - usage.prompt_tokens, usage.completion_tokens, usage.total_tokens
    - usage.prompt_tokens_details.cached_tokens (when present)
  - “cached_tokens” generally indicates the provider reused/cached part(s) of the prompt, lowering incremental cost for that portion. Availability and exact behavior are model/feature-dependent; verify current model’s docs and billing notes when relying on it.

System & Reliability
- Rate Limits & Retries: https://platform.openai.com/docs/guides/rate-limits
- Streaming (Server-Sent Events / stream decoding) is documented under the relevant API method inside API Reference (look for stream:true examples).
- Errors & HTTP semantics: Refer to each API method’s error section inside API Reference.

Security & Compliance
- API Keys / Auth: explained at the top of API Reference methods (bearer token)
- Policies (central): https://openai.com/policies
- Data controls appear throughout product pages; review for retention, training, logging implications as needed.

Changelog / Updates
- OpenAI evolves endpoints and fields. When behavior changes (e.g., usage fields), check product updates and model cards starting from:
  - API Reference root + Models page
  - Platform blog/updates (linked from the docs home)

---

C) Gumgang Ops Notes — Anchors for Our Runtime

What we already log (and should keep logging)
- Request/Response
  - response.model (and/or upstream model surfaced by vendor)
  - usage: prompt_tokens, completion_tokens, total_tokens
  - usage.prompt_tokens_details.cached_tokens (when present)
  - finish_reason, created, id (if provided)
- Headers
  - x-request-id (trace each call; show in A1/A4; store in conversations/*.json meta.last_request_id)
  - Rate limit headers: (names can vary), plus Retry-After or reset timestamps when 429 occurs
- Timing
  - total latency, TTFB (for streaming), number of chunks (optional)
- Safety / Moderation (if enabled later)
  - If we enable moderation endpoints, store request/response with PII-safe redaction.

How to use cached_tokens in practice (high-level)
- If usage.prompt_tokens_details.cached_tokens > 0:
  - A portion of prompt billing was reduced due to server-side reuse/caching.
  - This is model/feature dependent; treat it as an optimization signal rather than a guaranteed discount.
  - Action item: capture a small “Cached Hit Ratio” metric in A4 (cached_tokens / prompt_tokens) to track savings trend over time.

Runbook Shortcuts (for incidents and verification)
- Is it OpenAI’s issue? Check https://status.openai.com/
- Was our call rate-limited? Inspect rate-limit headers and Retry-After; backoff and retry.
- Is model mismatch suspected? Compare:
  - UI badge in A1 (engine: …), conversations meta.upstream_model, .env OPENAI_MODEL
  - Cross-check OpenAI usage dashboard for the timestamp
- Did costs spike? Compare usage totals per request and look for missing cached_tokens (if we expected reuse).

---

D) Handy Deep Links (grab-bag)

- API Reference root: https://platform.openai.com/docs/api-reference
- Models: https://platform.openai.com/docs/models
- Rate Limits: https://platform.openai.com/docs/guides/rate-limits
- Safety Best Practices: https://platform.openai.com/docs/guides/safety-best-practices
- Tokenizer: https://platform.openai.com/tokenizer
- Pricing: https://openai.com/pricing
- Status: https://status.openai.com/
- Policies: https://openai.com/policies
- Realtime: https://platform.openai.com/docs/guides/realtime
- Structured Outputs: https://platform.openai.com/docs/guides/structured-outputs
- Function Calling: https://platform.openai.com/docs/guides/function-calling
- Fine-tuning: https://platform.openai.com/docs/guides/fine-tuning
- Embeddings: https://platform.openai.com/docs/api-reference/embeddings

---

E) Maintenance Notes (for this index)

- This file is a curated index (not a mirror). Links may change as OpenAI restructures docs.
- When a link dies, start at the API Reference root and search within that section.
- If we adopt new features (batch, vector stores, assistants, etc.), add their links under B) Ongoing Reference with a one-line purpose.

Last curated: YYYY-MM-DD