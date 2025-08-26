#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Gumgang 2.0 — Approval Utilities

Purpose
- Enforce an explicit human approval gate on any WRITE operation route.
- If the approval header is missing or empty, raise HTTP 403 immediately.
- Header name is fixed to X-Approve-Code; value verification is out-of-band.

Usage (example in FastAPI route):
    from fastapi import Header
    from app.utils.approvals import require_approval_or_raise

    @router.post("/edit")
    async def edit_file(req: EditRequest, approve_code: str | None = Header(None, alias="X-Approve-Code")):
        # dry_run == False 일 때만 승인 필요
        if not req.dry_run:
            require_approval_or_raise(approve_code, "edit.apply")
        ...

Optional dependency style:
    from fastapi import Depends
    from app.utils.approvals import approval_dependency

    @router.post("/apply_structure_fixes")
    def apply_endpoint(dry_run: bool = True, _=Depends(approval_dependency("structure_fixes.apply") if not dry_run else lambda: None)):
        ...

Notes
- Do NOT hardcode approval token values in repository. Presence-only enforcement here.
- Keep this module lightweight; no external side effects or logging.
"""

from typing import Optional, Callable, Any
from fastapi import HTTPException, status, Header

HEADER_NAME = "X-Approve-Code"

__all__ = [
    "HEADER_NAME",
    "require_approval_or_raise",
    "is_approved",
    "approval_dependency",
]


def is_approved(approve_code: Optional[str]) -> bool:
    """
    Return True if an approval code is present and non-empty.
    Value verification is handled out-of-band by the operator/process.
    """
    return bool(approve_code and approve_code.strip())


def require_approval_or_raise(approve_code: Optional[str], context: str = "unspecified") -> None:
    """
    Enforce approval presence for write operations.
    Raises:
        HTTPException(403) if approval header is missing/empty.
    """
    if not is_approved(approve_code):
        # 403 Forbidden to clearly signal missing approval
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"approval_required: missing {HEADER_NAME} for {context}",
        )


def approval_dependency(context: str = "unspecified") -> Callable[..., Any]:
    """
    Returns a FastAPI dependency that enforces approval presence.
    Example:
        @router.post("/danger")
        def do_dangerous(_, _2 = Depends(approval_dependency("dangerous.write"))):
            ...
    """
    def _dep(approve_code: Optional[str] = Header(None, alias=HEADER_NAME)) -> None:
        require_approval_or_raise(approve_code, context)
    return _dep
