# routes/file_ops.py

from fastapi import APIRouter
from pydantic import BaseModel
from app.utils.load_file import load_file_content
from app.utils.save_file import save_file_with_backup

router = APIRouter()

class LoadFileRequest(BaseModel):
    file_path: str

@router.post("/load_file")
async def load_file(req: LoadFileRequest):
    return load_file_content(req.file_path)

class SaveFileRequest(BaseModel):
    file_path: str
    new_content: str

@router.post("/save_file")
async def save_file(req: SaveFileRequest):
    return save_file_with_backup(req.file_path, req.new_content)
