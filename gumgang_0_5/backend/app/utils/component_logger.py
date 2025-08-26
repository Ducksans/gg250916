# backend/app/utils/component_logger.py

import os
import json
from datetime import datetime

# 로그 파일 경로 (금강의 기억 위치)
LOG_PATH = "/home/duksan/바탕화면/gumgang_0_5/backend/memory/logs/component_log.json"

def append_component_log(
    action: str,
    dry_run: bool,
    file_path: str,
    component_name: str,
    description: str,
    source_trigger: str,
    result_status: str,
    result_message: str,
):
    # 기존 로그 로드
    if os.path.exists(LOG_PATH):
        with open(LOG_PATH, "r", encoding="utf-8") as f:
            logs = json.load(f)
    else:
        logs = []

    # 새 로그 항목 생성
    log_entry = {
        "timestamp": datetime.now().isoformat(),
        "action": action,  # "create_component" or "modify_component"
        "dry_run": dry_run,
        "file_path": file_path,
        "component_name": component_name,
        "description": description,
        "source_trigger": source_trigger,
        "result": {
            "status": result_status,
            "message": result_message
        }
    }

    logs.append(log_entry)

    # 로그 저장
    with open(LOG_PATH, "w", encoding="utf-8") as f:
        json.dump(logs, f, indent=2, ensure_ascii=False)

    return log_entry  # Optional: 나중에 프론트로도 전달 가능
