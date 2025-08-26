from fastapi import APIRouter, Request, Header
import os
from app.routes.ingest import ingest_document, ingest_directory  # ✅ 이 줄만 남깁니다
from app.utils.approvals import require_approval_or_raise  # ✅ 승인 게이트

router = APIRouter()

# ✅ memory_search 함수는 이 파일 아래에 직접 정의하세요
@router.get("/memory/search")
def search_memory(q: str):
    return memory_search(q)

@router.post("/memory/ingest")
async def ingest_memory(request: Request, approve_code: str | None = Header(None, alias="X-Approve-Code")):
    data = await request.json()
    require_approval_or_raise(approve_code, "memory.ingest_document")
    return ingest_document(data.get("text", ""))

@router.get("/memory/ingest-all")
def ingest_all_memory(approve_code: str | None = Header(None, alias="X-Approve-Code")):
    require_approval_or_raise(approve_code, "memory.ingest_all")
    return ingest_directory(os.path.expanduser("~/newgumgang"))

# ✅ 아래처럼 memory_search 함수를 이 파일 안에 직접 선언합니다
def memory_search(query: str):
    return {"results": [f"'{query}'에 대한 기억 결과 (예시)"]}
