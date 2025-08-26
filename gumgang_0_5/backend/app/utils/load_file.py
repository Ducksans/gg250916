# utils/load_file.py

import os

def load_file_content(file_path: str) -> dict:
    if not os.path.exists(file_path):
        return {
            "message": "❌ 파일이 존재하지 않습니다.",
            "content": ""
        }

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
        return {
            "message": "✅ 파일 불러오기 성공",
            "content": content
        }
    except Exception as e:
        return {
            "message": f"❌ 파일 읽기 오류: {e}",
            "content": ""
        }
