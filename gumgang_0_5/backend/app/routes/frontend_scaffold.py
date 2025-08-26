# 📄 /home/duksan/바탕화면/gumgang_0_5/backend/app/routes/frontend_scaffold.py

from fastapi import APIRouter
from scripts.frontend_scaffold_creator import create_frontend_files
import subprocess

router = APIRouter()

@router.post("/create_front_scaffold")
def create_front_scaffold():
    # 🔧 프론트 파일 생성
    result = create_frontend_files()

    # 💻 VSCode 자동 실행 (금강이 자기 얼굴을 직접 열어봄)
    renderer_path = "/home/duksan/바탕화면/gumgang_2_0/renderer"
    subprocess.Popen(["code", renderer_path])

    return result
