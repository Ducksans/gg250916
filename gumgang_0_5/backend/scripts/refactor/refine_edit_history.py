import os
import json
from datetime import datetime

# ✅ 금강 루트 디렉토리 기준 경로를 정확히 계산
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))

INPUT_PATH = os.path.join(BASE_DIR, "backend/memory/history/edit_history.json")
OUTPUT_PATH = os.path.join(BASE_DIR, "backend/memory/history/edit_history_refined.json")

def refine_entry(entry):
    return {
        "file": os.path.relpath(entry["file_path"], start="frontend"),
        "time": entry["timestamp"].split(".")[0],
        "type": "자동",
        "msg": extract_main_msg(entry.get("message", "")),
        "diff": entry.get("diff", "").strip(),
        "backup": entry.get("backup_path", "").replace("./", "")
    }

def extract_main_msg(full_msg):
    for keyword in ["수정 완료", "상태", "변경", "추가"]:
        if keyword in full_msg:
            return full_msg
    return full_msg[:50]

def main():
    if not os.path.exists(INPUT_PATH):
        print(f"❌ {INPUT_PATH} not found.")
        return

    with open(INPUT_PATH, "r") as f:
        raw = json.load(f)

    refined = [refine_entry(entry) for entry in raw]

    with open(OUTPUT_PATH, "w") as f:
        json.dump(refined, f, indent=2, ensure_ascii=False)

    print(f"✅ 정제 완료 → {OUTPUT_PATH}")

if __name__ == "__main__":
    main()
