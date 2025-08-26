import os
import subprocess
from datetime import datetime

# ✅ 금강 프론트 경로 (고정)
BASE_FRONTEND_PATH = "/home/duksan/바탕화면/gumgang_2_0"

def create_component(file_path: str, content: str) -> dict:
    # ✅ 절대 경로로 변환
    abs_path = os.path.join(BASE_FRONTEND_PATH, file_path)

    # ✅ 디렉토리 생성
    os.makedirs(os.path.dirname(abs_path), exist_ok=True)

    # ✅ 백업: 기존 파일이 있으면 .bak
    if os.path.exists(abs_path):
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = f"{abs_path}.{timestamp}.bak"
        os.rename(abs_path, backup_path)
    else:
        backup_path = None

    # ✅ 파일 생성
    with open(abs_path, "w", encoding="utf-8") as f:
        f.write(content)

    # ✅ VSCode 열기
    subprocess.Popen(["code", abs_path])

    return {
        "status": "success",
        "message": f"✅ 컴포넌트 생성 완료",
        "file": file_path,  # 입력받은 상대 경로 기준 응답
        "backup": backup_path
    }
