#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Gumgang 2.0 — Global Approval Gate Middleware

Purpose
- Enforce a global approval gate for all WRITE HTTP methods (POST/PUT/PATCH/DELETE)
  on specified path prefixes.
- If 'X-Approve-Code' header is missing or empty, reject with 403 JSON:
    {"detail": "approval_required"}
- Dry-run bypass:
  * If query has dry_run in [true,1,yes] (case-insensitive) → bypass approval.
  * If JSON body has {"dry_run": true} → bypass approval.

Notes
- .rules and system files are NOT modified by this middleware.
- This middleware performs presence-only enforcement; token verification is out-of-band.
- Configure prefixes via constructor or environment (comma-separated):
    APPROVAL_WRITE_PREFIXES="/api/,/memory,/save_chat,/harvest"
"""

from __future__ import annotations

import os
import json
from typing import List, Optional, Callable, Awaitable, Dict, Any

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from urllib.parse import parse_qs


WRITE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
DEFAULT_WRITE_PREFIXES = [
    "/api/",
    "/api/v1",
    "/api/protocol",
    "/api/tasks",
    "/api/structure",
    "/api/git",
    "/api/ideas",
    "/memory",
    "/save_chat",
    "/harvest",
]


def _env_prefixes() -> List[str]:
    raw = os.getenv("APPROVAL_WRITE_PREFIXES", "")
    if not raw.strip():
        return []
    parts = [p.strip() for p in raw.split(",")]
    return [p for p in parts if p]


def _starts_with_any(path: str, prefixes: List[str]) -> bool:
    for p in prefixes:
        if not p:
            continue
        if path.startswith(p):
            return True
    return False


def _truthy(val: Any) -> bool:
    if isinstance(val, bool):
        return val
    if isinstance(val, (int, float)):
        return val != 0
    if isinstance(val, str):
        return val.strip().lower() in ("1", "true", "yes", "y")
    return False


class ApprovalGateMiddleware(BaseHTTPMiddleware):
    """
    Global approval gate for WRITE routes.

    Behavior:
    - If request.method not in WRITE_METHODS -> pass.
    - If request.url.path not in configured prefixes -> pass.
    - If query.dry_run is truthy -> pass.
    - If JSON body has dry_run true -> pass.
    - Else require header 'X-Approve-Code' -> if missing/empty → 403.

    Integration:
        app.add_middleware(ApprovalGateMiddleware)
        # or with custom prefixes:
        app.add_middleware(
            ApprovalGateMiddleware,
            write_prefixes=["/api/", "/memory", "/save_chat", "/harvest"],
            header_name="X-Approve-Code",
        )
    """

    def __init__(
        self,
        app,
        write_prefixes: Optional[List[str]] = None,
        header_name: str = "X-Approve-Code",
    ):
        super().__init__(app)
        env_prefixes = _env_prefixes()
        self.write_prefixes = (
            write_prefixes
            if write_prefixes is not None
            else (env_prefixes if env_prefixes else DEFAULT_WRITE_PREFIXES)
        )
        self.header_name = header_name

    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Any]]):
        method = request.method.upper()
        path = request.url.path

        # Only enforce for write methods on selected prefixes
        if method not in WRITE_METHODS:
            return await call_next(request)
        if not _starts_with_any(path, self.write_prefixes):
            return await call_next(request)

        # Dry-run bypass via query
        qs = parse_qs(request.url.query or "")
        if "dry_run" in qs and _truthy(qs.get("dry_run", [""])[0]):
            return await call_next(request)

        # Dry-run bypass via JSON body (if any)
        content_type = request.headers.get("content-type", "")
        body_bytes: Optional[bytes] = None
        if "application/json" in content_type.lower():
            try:
                body_bytes = await request.body()
                # Reconstruct request with preserved body for downstream handlers
                async def receive() -> Dict[str, Any]:
                    return {"type": "http.request", "body": body_bytes or b""}

                request = Request(request.scope, receive)

                if body_bytes:
                    try:
                        payload = json.loads(body_bytes.decode("utf-8") or "{}")
                        if isinstance(payload, dict) and _truthy(payload.get("dry_run", False)):
                            return await call_next(request)
                    except json.JSONDecodeError:
                        # Ignore non-JSON body despite content-type claim
                        pass
            except Exception:
                # If body read fails, continue to header check
                pass

        # Approval header check (presence-only)
        approve_code = request.headers.get(self.header_name)
        if not approve_code or not approve_code.strip():
            return JSONResponse({"detail": "approval_required"}, status_code=403)

        return await call_next(request)
