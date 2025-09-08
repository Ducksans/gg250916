"""
FastAPI Chat Gateway Router

- Provides unified chat endpoints:
    - POST /api/chat          → single response (ok/data/error envelope)
    - POST /api/chat/stream   → Server-Sent Events (SSE) text stream

- Provider routing based on `model` prefix:
    - "gpt"/"o" → OpenAI
    - "claude"  → Anthropic
    - "gemini"  → Google Gemini
    - default   → OpenAI (if key present), else error

- Keys are loaded from environment variables:
    OPENAI_API_KEY, ANTHROPIC_API_KEY (or ANTHROPIC_KEY), GEMINI_API_KEY

- Notes:
    - Streaming falls back to a single final chunk for providers without SSE implemented.
    - Tools(MCP) in request are logged only; execution hooks are left for future extension.

This module can be included in the FastAPI app as:
    from app.api.routes import chat_gateway
    app.include_router(chat_gateway.router)

Author: Gumgang Team
"""

from __future__ import annotations


import json
import os
import time
from typing import Any, AsyncGenerator, Dict, Iterable, List, Literal, Optional

import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

# ------------------------------------------------------------------------------
# Router and configuration
# ------------------------------------------------------------------------------

router = APIRouter(prefix="/api", tags=["chat-gateway"])

# Early response model to avoid NameError in decorators below
class ChatResponse(BaseModel):
    ok: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

# ---- Data models (moved up to avoid forward-ref issues in decorators) ----
Role = Literal["system", "user", "assistant"]


class Msg(BaseModel):
    role: Role
    content: str


class ChatRequest(BaseModel):
    model: Optional[str] = Field(
        default=None, description='Model ID (e.g., "gpt-4o", "claude-3-5-sonnet", "gemini-1.5-pro")'
    )
    messages: List[Msg]
    temperature: Optional[float] = Field(default=0.7, ge=0.0, le=2.0)
    tools: Optional[List[Dict[str, Any]]] = Field(
        default=None, description="Reserved for MCP/tool calls (logged only)"
    )

# ============== MCP‑Lite (Tools) — definitions & invoke ==============
class ToolDefModel(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    params: Optional[Dict[str, Any]] = None


class ToolInvokeRequest(BaseModel):
    tool: str
    args: Optional[Dict[str, Any]] = None


class ToolInvokeResponse(BaseModel):
    ok: bool
    data: Optional[Any] = None
    error: Optional[str] = None


# Default tool registry (UI may also pass req.tools to override per-agent)
TOOL_DEFS: List[Dict[str, Any]] = [
    {
        "id": "now",
        "name": "now",
        "description": "Return current datetime in ISO8601 (UTC).",
        "params": {"type": "object", "properties": {}},
    },
    {
        "id": "fs.read",
        "name": "fs.read",
        "description": "Read small UTF‑8 text file under project root (gumgang_meeting/**). Args: { path }",
        "params": {
            "type": "object",
            "properties": {"path": {"type": "string"}},
            "required": ["path"],
        },
    },
    {
        "id": "web.search",
        "name": "web.search",
        "description": "Simple web search (DuckDuckGo Instant Answer). Args: { query }",
        "params": {
            "type": "object",
            "properties": {"query": {"type": "string"}},
            "required": ["query"],
        },
    },
]


def _safe_func_name(name: str) -> str:
    # OpenAI function name rules: [a-zA-Z0-9_-]{1,64}
    base = "".join(ch if (ch.isalnum() or ch in ("_", "-")) else "_" for ch in (name or "tool"))
    return (base or "tool")[:64]

def _openai_tools_from_defs(defs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    for d in defs:
        internal = d.get("name") or d.get("id") or "tool"
        safe = _safe_func_name(internal)
        out.append(
            {
                "type": "function",
                "function": {
                    "name": safe,
                    "description": d.get("description") or "",
                    "parameters": d.get("params") or {"type": "object"},
                },
            }
        )
    return out


def _safe_read_text(rel_path: str, limit_bytes: int = 64_000) -> str:
    # Accept root-relative paths, normalize safely, and deny traversal outside project root.
    if not isinstance(rel_path, str) or not rel_path:
        raise ValueError("Invalid path")
    abs_path = os.path.abspath(os.path.join(PROJECT_ROOT, rel_path))
    # Must remain under project root
    if not abs_path.startswith(PROJECT_ROOT + os.sep):
        raise ValueError("Access outside project root is denied")
    # Deny sensitive/large directories
    deny_dirs = (
        os.sep + ".git" + os.sep,
        os.sep + "node_modules" + os.sep,
        os.sep + "__pycache__" + os.sep,
        os.sep + "dist" + os.sep,
        os.sep + "build" + os.sep,
    )
    if any(seg in abs_path for seg in deny_dirs):
        raise ValueError("Access to this path is denied")
    if not os.path.exists(abs_path) or not os.path.isfile(abs_path):
        raise FileNotFoundError("File not found")
    size = os.path.getsize(abs_path)
    if size > limit_bytes:
        raise ValueError(f"File too large: {size} bytes (limit {limit_bytes})")
    with open(abs_path, "r", encoding="utf-8", errors="replace") as f:
        return f.read()


async def _tool_run(tool: str, args: Optional[Dict[str, Any]]) -> Any:
    tool = str(tool or "").strip()
    args = args or {}
    if tool in ("now",):
        # Return UTC ISO8601
        return {"now": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}

    if tool in ("fs.read", "fs_read"):
        path = args.get("path")
        if not path or not isinstance(path, str):
            raise ValueError("fs.read requires string 'path'")
        text = _safe_read_text(path)
        # Truncate overly long content defensively
        if len(text) > 60_000:
            text = text[:60_000] + "\n…(truncated)"
        return {"path": path, "content": text}

    if tool in ("web.search", "web_search"):
        query = (args.get("query") or "").strip()
        if not query:
            raise ValueError("web.search requires 'query'")
        # DuckDuckGo Instant Answer (best-effort; may be rate/region limited)
        url = "https://api.duckduckgo.com/"
        params = {"q": query, "format": "json", "no_html": 1, "skip_disambig": 1}
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.get(url, params=params)
                r.raise_for_status()
                j = r.json()
                # Extract top related topics / abstract
                results = []
                if j.get("AbstractText"):
                    results.append({"title": "Abstract", "snippet": j.get("AbstractText")})
                for t in (j.get("RelatedTopics") or [])[:5]:
                    if isinstance(t, dict):
                        txt = t.get("Text")
                        href = t.get("FirstURL")
                        if txt or href:
                            results.append({"title": txt or "(no title)", "url": href})
                return {"query": query, "results": results or [{"info": "No results"}]}
        except Exception as e:
            # Fallback: return a search URL
            return {
                "query": query,
                "results": [],
                "note": f"Search fallback used: {type(e).__name__}: {e}",
                "search_url": f"https://duckduckgo.com/?q={httpx.QueryParams({'q': query})['q']}",
            }

    raise ValueError(f"Unknown tool: {tool}")


@router.get("/tools/definitions")
async def tool_definitions():
    """Return server-side tool definitions (MCP-Lite)."""
    return {"ok": True, "tools": TOOL_DEFS}


@router.post("/tools/invoke", response_model=ToolInvokeResponse)
async def tool_invoke(req: ToolInvokeRequest) -> ToolInvokeResponse:
    try:
        data = await _tool_run(req.tool, req.args or {})
        return ToolInvokeResponse(ok=True, data=data)
    except Exception as e:
        return ToolInvokeResponse(ok=False, error=str(e))


# ============== OpenAI tool-call loop (MCP‑Lite integration) ==============
async def call_openai_with_tools(req: "ChatRequest") -> str:
    """
    Tool-call loop for OpenAI Chat Completions.
    - Uses either req.tools (UI-defined) or default TOOL_DEFS.
    - Up to 3 iterations of tool_use → tool_result → assistant follow-up.
    """
    if not OPENAI_KEY:
        raise RuntimeError("OPENAI_API_KEY missing")

    tools_defs = req.tools if (req.tools and isinstance(req.tools, list)) else TOOL_DEFS
    # Map safe(OpenAI) function name → internal tool id/name
    name_map: Dict[str, str] = {}
    for d in tools_defs:
        internal = d.get("name") or d.get("id") or "tool"
        name_map[_safe_func_name(internal)] = internal
    tools_schema = _openai_tools_from_defs(tools_defs)

    msgs = [m.model_dump() for m in req.messages]
    temp = req.temperature or 0.7

    async def _once(messages: List[Dict[str, Any]]) -> Dict[str, Any]:
        url = "https://api.openai.com/v1/chat/completions"
        headers = {"Authorization": f"Bearer {OPENAI_KEY}", "Content-Type": "application/json"}
        payload = {
            "model": req.model or "gpt-4o-mini",
            "temperature": temp,
            "messages": messages,
            "tools": tools_schema,
            "tool_choice": "auto",
            "stream": False,
        }
        async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as client:
            r = await client.post(url, headers=headers, json=payload)
            r.raise_for_status()
            return r.json()

    MAX_STEPS = 3
    messages = msgs
    for _ in range(MAX_STEPS):
        j = await _once(messages)
        choice = (j.get("choices") or [{}])[0]
        msg = choice.get("message") or {}
        tool_calls = msg.get("tool_calls") or []
        content = msg.get("content") or ""

        if tool_calls:
            # Append assistant tool_calls message first
            messages.append(
                {
                    "role": "assistant",
                    "content": content or "",
                    "tool_calls": tool_calls,
                }
            )
            # Execute each call sequentially; push tool results
            for tc in tool_calls:
                fn = (tc.get("function") or {})
                name = fn.get("name") or ""
                arg_str = fn.get("arguments") or "{}"
                try:
                    args_obj = json.loads(arg_str) if isinstance(arg_str, str) else (arg_str or {})
                except Exception:
                    args_obj = {}
                try:
                    result = await _tool_run(name, args_obj)
                    messages.append(
                        {
                            "role": "tool",
                            "tool_call_id": tc.get("id") or "",
                            "name": name,
                            "content": json.dumps({"ok": True, "data": result}, ensure_ascii=False),
                        }
                    )
                except Exception as e:
                    messages.append(
                        {
                            "role": "tool",
                            "tool_call_id": tc.get("id") or "",
                            "name": name,
                            "content": json.dumps({"ok": False, "error": str(e)}, ensure_ascii=False),
                        }
                    )
            # Continue loop for follow-up answer
            continue

        # No tool calls → final assistant content
        if content:
            return content

    # If loop exhausted without final content, try last completion without tools
    return await call_openai(req)


@router.post("/chat/toolcall", response_model=ChatResponse)
async def chat_toolcall(req: "ChatRequest") -> ChatResponse:
    """
    Tool-aware chat endpoint (OpenAI-first).
    - If model is OpenAI, use function calling (tools).
    - Otherwise, fallback to provider routing without tools.
    """
    try:
        started = time.time()
        provider = _pick_provider(req.model)
        if provider == "openai":
            reply = await call_openai_with_tools(req)
        else:
            # Non-OpenAI providers fallback to regular call (or future tool_use)
            reply = await route_to_provider(req)
        elapsed = int((time.time() - started) * 1000)
        return ChatResponse(ok=True, data={"message": {"role": "assistant", "content": reply}, "elapsed_ms": elapsed})
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=str(e))
    except Exception as e:
        return ChatResponse(ok=False, error=str(e))

# Environment keys (load .env first)
from dotenv import load_dotenv
load_dotenv()
OPENAI_KEY = os.getenv("OPENAI_API_KEY")
ANTHROPIC_KEY = os.getenv("ANTHROPIC_API_KEY") or os.getenv("ANTHROPIC_KEY")
GEMINI_KEY = os.getenv("GEMINI_API_KEY")
# Absolute project root (safe base for fs.read). Override with GUMGANG_PROJECT_ROOT if needed.
PROJECT_ROOT = os.path.abspath(os.environ.get("GUMGANG_PROJECT_ROOT", os.getcwd()))

DEFAULT_TIMEOUT = 30.0  # seconds
HTTPX_CLIENT_KW = dict(timeout=DEFAULT_TIMEOUT, follow_redirects=True)

# Data models are defined earlier to avoid forward-ref issues in decorators.


class ChatResponse(BaseModel):
    ok: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ------------------------------------------------------------------------------
# Provider helpers
# ------------------------------------------------------------------------------

def _first_system_and_rest(messages: Iterable[Msg]) -> tuple[str, List[Dict[str, str]]]:
    """
    Extracts system prompt (concatenated) and returns remaining messages mapped to provider-friendly dicts.
    """
    system_buf: List[str] = []
    rest: List[Dict[str, str]] = []
    for m in messages:
        if m.role == "system":
            system_buf.append(m.content)
        else:
            rest.append({"role": m.role, "content": m.content})
    system = "\n".join(system_buf).strip()
    return system, rest


# ------------------------------ OpenAI ----------------------------------------

async def call_openai(req: ChatRequest) -> str:
    """
    Non-streaming call to OpenAI Chat Completions.
    """
    if not OPENAI_KEY:
        raise RuntimeError("OPENAI_API_KEY missing")

    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {OPENAI_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": (req.model or "gpt-4o-mini"),
        "temperature": req.temperature or 0.7,
        "messages": [m.model_dump() for m in req.messages],
        "stream": False,
    }
    async with httpx.AsyncClient(**HTTPX_CLIENT_KW) as client:
        r = await client.post(url, headers=headers, json=payload)
        r.raise_for_status()
        j = r.json()
        # Try parsing various shapes
        return (
            j.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
        ) or ""


async def call_openai_stream(req: ChatRequest) -> AsyncGenerator[str, None]:
    """
    Streaming call to OpenAI (SSE). Yields plain text chunks.
    """
    if not OPENAI_KEY:
        raise RuntimeError("OPENAI_API_KEY missing")

    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {OPENAI_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": (req.model or "gpt-4o-mini"),
        "temperature": req.temperature or 0.7,
        "messages": [m.model_dump() for m in req.messages],
        "stream": True,
    }
    async with httpx.AsyncClient(**HTTPX_CLIENT_KW) as client:
        async with client.stream("POST", url, headers=headers, json=payload) as r:
            r.raise_for_status()
            async for line in r.aiter_lines():
                if not line:
                    continue
                if line.startswith("data: "):
                    data = line[6:].strip()
                    if data == "[DONE]":
                        break
                    try:
                        j = json.loads(data)
                        # Prefer delta.content
                        choices = j.get("choices") or []
                        if choices:
                            delta = choices[0].get("delta") or {}
                            content = delta.get("content")
                            if content:
                                yield content
                    except Exception:
                        # If parsing fails, ignore the chunk
                        continue


# ---------------------------- Anthropic ---------------------------------------

async def call_anthropic(req: ChatRequest) -> str:
    """
    Non-streaming call to Anthropic Messages API.
    """
    if not ANTHROPIC_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY missing")

    url = "https://api.anthropic.com/v1/messages"
    headers = {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }

    system, rest = _first_system_and_rest(req.messages)
    payload = {
        "model": req.model or "claude-3-5-sonnet-20241022",
        "max_tokens": 1024,
        "temperature": req.temperature or 0.7,
        "system": system or None,
        "messages": [
            {"role": "user" if m["role"] == "user" else "assistant", "content": m["content"]}
            for m in rest
        ],
    }

    async with httpx.AsyncClient(**HTTPX_CLIENT_KW) as client:
        r = await client.post(url, headers=headers, json=payload)
        r.raise_for_status()
        j = r.json()
        # Newer API: content is a list of blocks
        content = j.get("content")
        if isinstance(content, list):
            return "".join(
                (blk.get("text") or "")
                for blk in content
                if blk.get("type") == "text"
            )
        # Fallback
        return j.get("output_text") or ""


async def call_anthropic_stream(req: ChatRequest) -> AsyncGenerator[str, None]:
    """
    Streaming call to Anthropic Messages API (SSE).
    Parses content_block_delta events to yield text chunks.
    """
    if not ANTHROPIC_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY missing")

    url = "https://api.anthropic.com/v1/messages"
    headers = {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }

    system, rest = _first_system_and_rest(req.messages)
    payload = {
        "model": req.model or "claude-3-5-sonnet-20241022",
        "max_tokens": 1024,
        "temperature": req.temperature or 0.7,
        "system": system or None,
        "messages": [
            {"role": "user" if m["role"] == "user" else "assistant", "content": m["content"]}
            for m in rest
        ],
        "stream": True,
    }

    async with httpx.AsyncClient(**HTTPX_CLIENT_KW) as client:
        async with client.stream("POST", url, headers=headers, json=payload) as r:
            r.raise_for_status()
            async for raw in r.aiter_lines():
                if not raw:
                    continue
                # Anthropic SSE typically uses "event: <type>\n" + "data: {...}\n\n"
                if raw.startswith("data: "):
                    data = raw[6:].strip()
                    if data in ("[DONE]", ""):
                        continue
                    try:
                        evt = json.loads(data)
                        # content_block_delta contains incremental text
                        if evt.get("type") == "content_block_delta":
                            delta = evt.get("delta") or {}
                            text = delta.get("text")
                            if text:
                                yield text
                    except Exception:
                        continue


# ------------------------------ Gemini ----------------------------------------

async def call_gemini(req: ChatRequest) -> str:
    """
    Non-streaming call to Google Generative Language API (Gemini).
    """
    if not GEMINI_KEY:
        raise RuntimeError("GEMINI_API_KEY missing")

    model = req.model or "gemini-1.5-pro"
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_KEY}"

    # Simple mapping: include system as a separate "user" preface
    parts: List[Dict[str, Any]] = []
    for m in req.messages:
        parts.append({"role": m.role, "parts": [{"text": m.content}]})
    payload = {"contents": parts}

    async with httpx.AsyncClient(**HTTPX_CLIENT_KW) as client:
        r = await client.post(url, json=payload)
        r.raise_for_status()
        j = r.json()
        cands = j.get("candidates") or []
        if cands:
            segs = cands[0].get("content", {}).get("parts") or []
            return "".join([p.get("text", "") for p in segs])
        return ""


async def call_gemini_stream(req: ChatRequest) -> AsyncGenerator[str, None]:
    """
    Streaming for Gemini is not implemented here; yield a single final chunk as fallback.
    """
    text = await call_gemini(req)
    if text:
        yield text


# --------------------------- Provider chooser ---------------------------------

def _pick_provider(model: Optional[str]) -> str:
    m = (model or "").lower()
    if m.startswith("gpt") or m.startswith("o"):
        return "openai"
    if m.startswith("claude"):
        return "anthropic"
    if m.startswith("gemini"):
        return "gemini"
    # default
    return "openai"


async def route_to_provider(req: ChatRequest) -> str:
    provider = _pick_provider(req.model)
    if provider == "openai":
        if not OPENAI_KEY:
            raise RuntimeError("OPENAI_API_KEY missing")
        return await call_openai(req)
    if provider == "anthropic":
        if not ANTHROPIC_KEY:
            raise RuntimeError("ANTHROPIC_API_KEY missing")
        return await call_anthropic(req)
    if provider == "gemini":
        if not GEMINI_KEY:
            raise RuntimeError("GEMINI_API_KEY missing")
        return await call_gemini(req)
    # Fallback to OpenAI if available
    if OPENAI_KEY:
        return await call_openai(req)
    raise RuntimeError("No provider key available")


async def route_to_provider_stream(req: ChatRequest) -> AsyncGenerator[str, None]:
    provider = _pick_provider(req.model)
    if provider == "openai":
        if not OPENAI_KEY:
            raise RuntimeError("OPENAI_API_KEY missing")
        async for chunk in call_openai_stream(req):
            yield chunk
        return
    if provider == "anthropic":
        if not ANTHROPIC_KEY:
            raise RuntimeError("ANTHROPIC_API_KEY missing")
        # Attempt SSE; if anything fails, fallback to one-shot
        try:
            async for chunk in call_anthropic_stream(req):
                yield chunk
            return
        except Exception:
            text = await call_anthropic(req)
            if text:
                yield text
            return
    if provider == "gemini":
        if not GEMINI_KEY:
            raise RuntimeError("GEMINI_API_KEY missing")
        async for chunk in call_gemini_stream(req):
            yield chunk
        return
    # Fallback to OpenAI or error
    if OPENAI_KEY:
        async for chunk in call_openai_stream(req):
            yield chunk
        return
    raise RuntimeError("No provider key available")


# ------------------------------------------------------------------------------
# Routes
# ------------------------------------------------------------------------------

@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest) -> ChatResponse:
    """
    Single-response chat endpoint.
    Returns: { ok, data: { message: {role, content}, elapsed_ms }, error }
    """
    # MCP/Tools: log shape only for now
    if req.tools:
        try:
            # Keep logs minimal and safe
            _ = [t.get("name") or t.get("id") or "tool" for t in req.tools]
            # You can wire this into your logger if needed
            # print(f"[chat] tools requested: {tool_names}")
        except Exception:
            pass

    started = time.time()
    try:
        reply = await route_to_provider(req)
        elapsed = int((time.time() - started) * 1000)
        return ChatResponse(
            ok=True,
            data={
                "message": {"role": "assistant", "content": reply},
                "elapsed_ms": elapsed,
            },
        )
    except httpx.HTTPStatusError as e:
        # Surface upstream status, but keep envelope consistent
        raise HTTPException(status_code=e.response.status_code, detail=str(e))
    except Exception as e:
        return ChatResponse(ok=False, error=str(e))


@router.post("/chat/stream")
async def chat_stream(req: ChatRequest):
    """
    Streaming chat endpoint (SSE).
    - Emits "data: <text_chunk>\\n\\n" for each chunk.
    - Finalizes with an empty flush (connection close).

    For clients without SSE handling, consider using the non-streaming /api/chat.
    """
    async def event_gen() -> AsyncGenerator[bytes, None]:
        # Preamble (optional)
        # yield b": ready\n\n"
        try:
            async for chunk in route_to_provider_stream(req):
                if not chunk:
                    continue
                # Basic SSE message: data: <chunk>\n\n
                data = chunk.replace("\r", "")
                yield f"data: {data}\n\n".encode("utf-8")
        except httpx.HTTPStatusError as e:
            # Emit an SSE error line then end
            yield f"data: ⚠️ Upstream error: {e.response.status_code} {e}\n\n".encode(
                "utf-8"
            )
        except Exception as e:
            yield f"data: ⚠️ Error: {str(e)}\n\n".encode("utf-8")

    return StreamingResponse(event_gen(), media_type="text/event-stream")
