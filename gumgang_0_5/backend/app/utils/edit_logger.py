import json
import os
from utils.time_kr import now_kr_str_minute

# ✅ 기준 루트: 현재 파일의 상위 3단계 -> gumgang_0_5/backend/
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
HISTORY_PATH = os.path.join(BASE_DIR, "memory/history/edit_history.json")

def save_edit_history(entry: dict):
    os.makedirs(os.path.dirname(HISTORY_PATH), exist_ok=True)

    if "timestamp" not in entry:
        entry["timestamp"] = now_kr_str_minute()

    if os.path.exists(HISTORY_PATH):
        try:
            with open(HISTORY_PATH, "r", encoding="utf-8") as f:
                content = f.read().strip()
                history = json.loads(content) if content else []
        except json.JSONDecodeError:
            history = []
    else:
        history = []

    history.append(entry)

    with open(HISTORY_PATH, "w", encoding="utf-8") as f:
        json.dump(history, f, indent=2, ensure_ascii=False)
