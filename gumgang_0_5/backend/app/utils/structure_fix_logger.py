import os
import json
from utils.time_kr import now_kr_str_minute

HISTORY_FILE = "./memory/structure_fixes_history.json"

def log_structure_fix_result(result: dict, dry_run: bool):
    entry = {
        "timestamp": now_kr_str_minute(),
        "dry_run": dry_run,
        "result": result,
    }

    if not os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, "w") as f:
            json.dump([entry], f, indent=2)
    else:
        with open(HISTORY_FILE, "r+") as f:
            data = json.load(f)
            data.append(entry)
            f.seek(0)
            json.dump(data, f, indent=2)
