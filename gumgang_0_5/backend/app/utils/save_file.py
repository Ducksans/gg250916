# utils/save_file.py

import os
from datetime import datetime
import difflib

def save_file_with_backup(file_path: str, new_content: str) -> dict:
    backup_dir = "./memory/backup_edit_files"
    os.makedirs(backup_dir, exist_ok=True)

    if not os.path.exists(file_path):
        return {"message": "❌ 저장 실패: 파일이 존재하지 않음"}

    try:
        # 백업
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = os.path.basename(file_path)
        backup_path = os.path.join(backup_dir, f"{filename}.{timestamp}.bak")

        with open(file_path, "r", encoding="utf-8") as f:
            old_content = f.read()

        with open(backup_path, "w", encoding="utf-8") as f:
            f.write(old_content)

        # 새 내용 저장
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(new_content)

        # diff 계산
        diff = "\n".join(difflib.unified_diff(
            old_content.splitlines(),
            new_content.splitlines(),
            fromfile="original",
            tofile="modified",
            lineterm=""
        ))

        return {
            "message": f"✅ 저장 완료 (백업: {backup_path})",
            "backup": backup_path,
            "diff": diff
        }

    except Exception as e:
        return {
            "message": f"❌ 저장 중 오류 발생: {e}",
            "backup": None,
            "diff": ""
        }
