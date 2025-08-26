from fastapi import APIRouter, Request, Header
from pydantic import BaseModel
from typing import List
import os
import json
from app.utils.approvals import require_approval_or_raise  # ✅ 승인 게이트
from utils.time_kr import now_kr_str_minute, format_for_filename  # ✅ KST 통일

router = APIRouter()

# ✅ 기존 구조: JSON 기반 채팅 저장 (RAG용)
class ChatItem(BaseModel):
    role: str
    text: str

class ChatMemory(BaseModel):
    source: str  # 예: "chatgpt"
    timestamp: str
    chat: List[ChatItem]

MEMORY_DIR_JSON = "./memory/sources/chatgpt_sessions"
os.makedirs(MEMORY_DIR_JSON, exist_ok=True)

@router.post("/save_chat")
async def save_chat(memory: ChatMemory, approve_code: str | None = Header(None, alias="X-Approve-Code")):
    # ✅ 승인 필수 (실제 쓰기)
    require_approval_or_raise(approve_code, "save_chat.write")
    dt = format_for_filename()  # "YYYY-MM-DD_HH-mm"
    filename = f"{dt}_{memory.source}.json"
    path = os.path.join(MEMORY_DIR_JSON, filename)

    with open(path, "w", encoding="utf-8") as f:
        json.dump(memory.dict(), f, indent=2, ensure_ascii=False)

    print(f"✅ JSON 기억 저장 완료: {path}")
    return {"status": "ok", "saved_to": path}


# ✅ 확장기용: HTML 통째로 저장 (Chrome Extension 연동)
MEMORY_DIR_HTML = "./memory/sources/chatgpt"
os.makedirs(MEMORY_DIR_HTML, exist_ok=True)

@router.post("/harvest")
async def harvest_chat(request: Request, approve_code: str | None = Header(None, alias="X-Approve-Code")):
    try:
        # ✅ 승인 필수 (실제 쓰기)
        require_approval_or_raise(approve_code, "save_chat.harvest")
        body = await request.json()
        html = body.get("html", "")

        # 파일 이름 구성
        timestamp = format_for_filename()  # "YYYY-MM-DD_HH-mm"
        filename = f"chatgpt_{timestamp}.html"
        filepath = os.path.join(MEMORY_DIR_HTML, filename)

        # 저장
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(html)

        print(f"✅ HTML 기억 수확 완료: {filepath}")
        return {"status": "success", "file": filepath}
    except Exception as e:
        return {"status": "error", "message": str(e)}
