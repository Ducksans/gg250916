# 📁 backend/app/utils/chat_logger.py

import os
import json
from datetime import datetime

# ✅ 로그 저장 경로
LOG_DIR = "./memory/chat_logs"
os.makedirs(LOG_DIR, exist_ok=True)

def get_current_log_path() -> str:
    now = datetime.now()
    filename = now.strftime("%Y-%m-%d_%H%M") + "_session.json"
    return os.path.join(LOG_DIR, filename)

def append_chat_log(question: str, answer: str):
    log_path = get_current_log_path()
    
    record = {
        "timestamp": datetime.now().isoformat(),
        "question": question,
        "answer": answer
    }

    if os.path.exists(log_path):
        with open(log_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    else:
        data = []

    data.append(record)

    with open(log_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"💾 대화 로그 저장됨: {log_path}")
