from langchain_openai import ChatOpenAI
from langchain.prompts import PromptTemplate
from dotenv import load_dotenv

# 🔐 .env 파일에서 API 키 불러오기
load_dotenv(dotenv_path="/home/duksan/바탕화면/gumgang_0_5/backend/.env")

# 🔍 GPT-4 설정
llm = ChatOpenAI(model="gpt-4", temperature=0.7)

# 🧠 간단한 프롬프트
prompt = PromptTemplate.from_template("질문: {question}\n금강의 답변:")

# 🔗 체인 구성 및 실행
chain = prompt | llm
result = chain.invoke({"question": "에베레스트 산의 높이는 얼마야?"})

# 📤 결과 출력
print("✅ GPT 응답:", result)
