from langchain_openai import ChatOpenAI
from langchain.prompts import PromptTemplate
from dotenv import load_dotenv

# ✅ .env 경로 명시
load_dotenv(dotenv_path="/home/duksan/바탕화면/gumgang_0_5/backend/.env")

llm = ChatOpenAI(model="gpt-4", temperature=0.7)
prompt = PromptTemplate.from_template("질문: {question}\n금강의 답변:")

chain = prompt | llm
result = chain.invoke({"question": "에베레스트 산의 높이는 얼마야?"})

print("✅ GPT 응답:", result)
