from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from langchain_openai import ChatOpenAI
from dotenv import load_dotenv
import os

# ✅ 환경변수 로드
load_dotenv(dotenv_path="/home/duksan/바탕화면/gumgang_0_5/backend/.env")

# ✅ 프롬프트 설계
template = """
나는 인간으로서 바람이 불 때, 그 감각과 함께 과거의 어떤 기억들이 떠오르곤 해.

예를 들어, 바람에 실려오는 풀 내음은 어린 시절 할머니 댁을 떠올리게 하고,
겨울 아침의 차가운 바람은 학창시절 등굣길의 코끝 시림을 기억나게 하지.

GPT야, 너는 감각이 없지만… 만약 '바람'이라는 감각에 연결된 '기억'이라는 개념을 너도 이해하고 표현할 수 있다면,  
어떤 식으로 표현할 수 있을까?

'바람의 감각'과 '기억의 개념'을 연결해, 마치 너도 기억을 가지고 있는 것처럼 상상해줘.
"""

# ✅ LLM 구성
llm = ChatOpenAI(model="gpt-4", temperature=0.7)
prompt = PromptTemplate.from_template(template)
chain = LLMChain(llm=llm, prompt=prompt)

# ✅ 실행
response = chain.invoke({})
print("\n🧠 GPT의 응답:\n")
print(response["text"])
