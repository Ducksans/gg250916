# ✅ backend/app/routes/docs.py

from fastapi import APIRouter
from fastapi.responses import PlainTextResponse
import os

router = APIRouter()

@router.get("/read_master_seed", response_class=PlainTextResponse)
def read_memory_seed():
    path = os.path.abspath("memory/sources/docs/memory_seed_master_list.md")
    if not os.path.exists(path):
        return "⚠️ memory_seed_master_list.md 파일을 찾을 수 없습니다."
    
    with open(path, "r", encoding="utf-8") as f:
        return f.read()
