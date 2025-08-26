# 📁 backend/app/routes/structure_fixes.py

from fastapi import APIRouter, Query, Header
from app.utils.structure_fix_applier import apply_structure_fixes
from app.utils.structure_fix_logger import log_structure_fix_result
from app.utils.approvals import require_approval_or_raise

router = APIRouter()

@router.post("/apply_structure_fixes")
def apply_structure_fixes_endpoint(dry_run: bool = True, approve_code: str | None = Header(None, alias="X-Approve-Code")):
    """
    금강 구조 리포트 기반 자동 수정 실행 API
    """
    if not dry_run:
        require_approval_or_raise(approve_code, "structure_fixes.apply")
    result = apply_structure_fixes(dry_run=dry_run)

    # ✅ 결과 로그 저장
    log_structure_fix_result(result, dry_run)

    return result
