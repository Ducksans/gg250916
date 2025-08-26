# 📄 test_langgraph_selfreport.py

import sys
import os
from dotenv import load_dotenv

# ✅ 경로 등록: backend 안의 app 모듈 인식
sys.path.append(os.path.join(os.path.dirname(__file__), "backend"))

# ✅ .env 명시 로드 (OpenAI API 키)
load_dotenv(dotenv_path="/home/duksan/바탕화면/gumgang_0_5/backend/.env")

from app import run_graph  # 반드시 .env 로드 후에 import

def main():
    print("🚀 금강 LangGraph 자기 구조 리포트 실행")
    print("🧠 현재 상태 흐름: reflect → gpt_call → status_report")

    try:
        response = run_graph("reflect")

        print("\n📄 금강 자기 리포트 응답:")
        print("=" * 40)
        print(response)
        print("=" * 40)

    except Exception as e:
        print("❌ 실행 중 오류 발생:")
        print(str(e))

if __name__ == "__main__":
    main()
