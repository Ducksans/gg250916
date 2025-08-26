# ✅ backend/scripts/check_vector_memory.py

from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings
import os
from dotenv import load_dotenv

# ✅ .env 환경변수 로드 (OPENAI_API_KEY 포함)
load_dotenv()

# ✅ 벡터 저장 경로
vector_path = "./backend/memory/gumgang_memory"

# ✅ Chroma 로드
embedding = OpenAIEmbeddings()
db = Chroma(persist_directory=vector_path, embedding_function=embedding)

# ✅ 벡터 문서 수 확인
collection = db.get()
docs = collection.get("documents", [])

print("🔎 현재 벡터DB에 저장된 문서 수:", len(docs))

# ✅ 최대 20개 문서 요약 출력
for i, doc in enumerate(docs[:20]):
    summary = doc[:80].replace("\n", " ")
    print(f"{i+1}. {summary}...")
