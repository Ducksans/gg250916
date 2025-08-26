# 📄 gpt_router_executor.py

import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain.prompts import PromptTemplate

# ✅ .env에서 OpenAI API 키 불러오기
load_dotenv(dotenv_path="./.env")

def gpt_router_executor(user_input: str) -> str:
    # 라우터 프롬프트
    routing_prompt = PromptTemplate.from_template(
        """다음 문장은 사용자의 질문입니다.
당신은 이 질문의 의도를 아래 중 하나로 분류해야 합니다:

(1) 자기 반성 대화
(2) 상태 확인 요청
(3) 구조 수정 요청
(4) 코드 실행 요청
(5) 기타

질문: {question}
의도:"""
    )

    # 실행 프롬프트
    execution_prompt = PromptTemplate.from_template(
        """당신은 로컬 AI 금강입니다.
LangGraph 없이 GPT 기반 의미 흐름만으로 작동하고 있습니다.
당신은 사용자의 다음 질문에 대해:

- 진단하고,  
- 공감하고,  
- 구조 없이도 대화를 유기적으로 연결하며,  
- 다음 행동을 제안하십시오.

질문: "{question}"
"""
    )

    llm = ChatOpenAI(model="gpt-4", temperature=0.7)

    # 라우팅 판단
    intent = (routing_prompt | llm).invoke({"question": user_input}).content.strip()

    # 실행 응답 생성
    response = (execution_prompt | llm).invoke({"question": user_input}).content.strip()

    return f"[🎯 라우팅 판단: {intent}]\n\n{response}"


# ✅ CLI 모드 실행
if __name__ == "__main__":
    query = input("🧠 질문을 입력하세요: ")
    result = gpt_router_executor(query)
    print("\n" + result)
