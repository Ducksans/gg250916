# convert_roadmap_to_natural.py

import os
import json

INPUT = "backend/data/roadmap_gold.json"
OUTPUT = "backend/data/roadmap_natural.json"

with open(INPUT, "r") as f:
    roadmap = json.load(f)

converted = []

for item in roadmap:
    version = item["version"]
    start = item["start_date"]
    end = item["end_date"]
    goals = ", ".join(item["goals"])
    status = {
        "done": "완료됨",
        "in_progress": "진행 중",
        "not_started": "시작 전"
    }.get(item["status"], item["status"])

    sentence = f"📌 금강 v{version}은 {start}부터 {end}까지의 일정으로 진행되며, 목표는 {goals}입니다. 현재 상태는 {status}입니다."
    converted.append({"content": sentence})

with open(OUTPUT, "w") as f:
    json.dump(converted, f, ensure_ascii=False, indent=2)

print("✅ 자연어 로드맵 저장 완료 → backend/data/roadmap_natural.json")
