import os
import json
from datetime import datetime

# 🔧 경로 설정
SOURCE_DIR = "./memory/sources/chatgpt_sessions"
TARGET_DIR = SOURCE_DIR  # 같은 위치에 .md 저장

# 📁 대상 디렉토리 순회
for filename in os.listdir(SOURCE_DIR):
    if filename.endswith(".json"):
        json_path = os.path.join(SOURCE_DIR, filename)
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        # 🔍 채팅 데이터 추출
        chat_items = data.get("chat", [])
        timestamp = data.get("timestamp", "")
        source = data.get("source", "unknown")

        # 📝 Markdown 텍스트 생성
        md_lines = []
        md_lines.append(f"# 💾 금강 기억 저장본\n")
        md_lines.append(f"**🕒 Timestamp:** {timestamp}")
        md_lines.append(f"**📦 Source:** {source}\n")

        for item in chat_items:
            role = "👤 사용자" if item["role"] == "User" else "🤖 금강"
            text = item["text"].replace("\n", "\n> ")  # 인용 스타일 정리
            md_lines.append(f"\n### {role}\n> {text}")

        # 🔄 .md 파일명 생성
        md_filename = filename.replace(".json", ".md")
        md_path = os.path.join(TARGET_DIR, md_filename)

        # 💾 파일 저장
        with open(md_path, "w", encoding="utf-8") as f:
            f.write("\n".join(md_lines))

        print(f"✅ 변환 완료: {md_filename}")
