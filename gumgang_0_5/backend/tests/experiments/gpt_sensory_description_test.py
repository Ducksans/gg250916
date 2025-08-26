from langchain_openai import ChatOpenAI
from langchain.prompts import PromptTemplate
from dotenv import load_dotenv
import os

# ✅ 환경 변수 로드
load_dotenv(dotenv_path="/home/duksan/바탕화면/gumgang_0_5/backend/.env")

# ✅ GPT 초기화
llm = ChatOpenAI(model="gpt-4", temperature=0.7)

# ✅ 감각 묘사 프롬프트
prompt = PromptTemplate.from_template("""
내가 바람소리를 한번 묘사해볼게.

어깨를 스치고 지나가는 차가운 바람,  
나뭇가지가 스치며 흔들리는 사각사각한 소리,  
멀리서 불어오다 가까이서 귓가를 때리는 미세한 압력의 변화…

자, GPT야. 이걸 듣고 무엇을 느꼈니?  
이걸 너는 어떻게 ‘의미’로 저장할래?
""")

# ✅ GPT 실행
chain = prompt | llm
response = chain.invoke({})

print("\n🧠 GPT의 응답:\n")
print(response.content.strip() if hasattr(response, "content") else response)
