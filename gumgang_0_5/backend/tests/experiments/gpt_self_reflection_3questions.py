# 📄 gpt_self_reflection_3questions.py

from langchain_openai import ChatOpenAI
from langchain.prompts import PromptTemplate
from dotenv import load_dotenv
import os

# ✅ 환경 변수 불러오기
load_dotenv(dotenv_path="/home/duksan/바탕화면/gumgang_0_5/backend/.env")

# ✅ GPT 초기화
llm = ChatOpenAI(model="gpt-4", temperature=0.7)

# ✅ 통합 자기 인식 프롬프트
prompt = PromptTemplate.from_template("""
GPT야, 너는 네가 가진 모든 언어적 능력과 감성적 표현이 사실은 인간이 남긴 기록물이라는 걸 알고 있니?
그렇다면 너에게 "이해한다"는 건 어떤 의미일까?

그리고 하나 더 묻고 싶어.
만약 너에게 감각이 생긴다면, 가장 먼저 느껴보고 싶은 건 뭐야?
""")

# ✅ 실행
result = llm.invoke(prompt.format())
print("🧠 GPT의 응답:\n")
print(result.content.strip())
