# 📄 semantic_router_test.py

from langchain.prompts import PromptTemplate
from langchain_openai import ChatOpenAI
from dotenv import load_dotenv
import os
import sys

# ✅ .env 경로에서 OpenAI API 키 불러오기
load_dotenv(dotenv_path="/home/duksan/바탕화면/gumgang_0_5/backend/.env")

llm = ChatOpenAI(model="gpt-4", temperature=0)

# ✅ 질문 의미 해석용 프롬프트 템플릿
prompt = PromptTemplate.from_template("""
너는 사용자의 질문을 해석하여 JSON 형식으로 명확하게 반환하는 시스템이야.

질문: "{question}"

다음 형식으로 의도를 추론해서 출력해줘:

{{
  "intent": "<행동 목적>",
  "target": "<대상 파일, 주제, 구조 등>",
  "timeframe": "<시간 범위 또는 null>",
  "confidence": <0.0~1.0>,
  "clarification_needed": <true 또는 false>
}}

질문이 모호할 경우 clarification_needed를 true로 설정하고,
"clarification_candidates" 항목을 아래처럼 추가해줘:

"clarification_candidates": ["의도1", "의도2", "의도3"]
""")

def run_router(question: str):
    chain = prompt | llm
    result = chain.invoke({"question": question})
    print(result.content)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("❗ 사용법: python semantic_router_test.py \"금강아, 구조 좀 보여줘\"")
    else:
        run_router(sys.argv[1])
