# ✅ backend/scripts/check_vector_memory_debug.py

from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings
import os
from dotenv import load_dotenv

# 🔐 환경 변수 로드
load_dotenv()

# 🧠 벡터 저장소 경로 및 임베딩 정의
vector_path = "./backend/memory/gumgang_memory"
embedding = OpenAIEmbeddings()
db = Chroma(persist_directory=vector_path, embedding_function=embedding)

# 📦 벡터 컬렉션 내용 가져오기
collection = db.get()

# 🧾 컬렉션 키별 개수 출력
print("\n🔍 [DEBUG] Chroma 컬렉션 내용 요약:")
for key in collection:
    value = collection[key]
    if value is None:
        print(f" - {key}: None")
    elif isinstance(value, list):
        print(f" - {key}: {len(value)}개")
    else:
        print(f" - {key}: {value}")

# 📄 문서 미리보기
print("\n📄 예시 문서 미리보기:")
docs = collection["documents"] if "documents" in collection and collection["documents"] else []

if not docs:
    print("❗️문서가 없습니다.")
else:
    for i, doc in enumerate(docs[:10]):
        preview = doc[:120].replace("\n", " ")
        print(f"{i+1}. {preview}...")
