from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
import os
from dotenv import load_dotenv

# ✅ 정확한 경로에서 .env 로드
load_dotenv(dotenv_path="/home/duksan/바탕화면/gumgang_0_5/backend/.env")

# ✅ 기억이 저장된 디렉토리
PERSIST_DIR = "/home/duksan/바탕화면/gumgang_0_5/memory/gumgang_memory"

# ✅ Chroma DB에서 Retriever 생성
retriever = Chroma(
    persist_directory=PERSIST_DIR,
    embedding_function=OpenAIEmbeddings()
).as_retriever()

# ✅ 금강에게 기억을 묻는다
query = "금강 0.5에 대해 기억하고 있니?"
docs = retriever.get_relevant_documents(query)

# ✅ 결과 출력
print("🔍 검색된 문서 개수:", len(docs))
for i, doc in enumerate(docs):
    print(f"\n[{i+1}] ▶️ 문서 내용 일부:\n{doc.page_content[:300]}")
