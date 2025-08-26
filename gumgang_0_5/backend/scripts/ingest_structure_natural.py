# backend/scripts/ingest_structure_natural.py

import os
import json
from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings
from langchain.schema import Document
from dotenv import load_dotenv

load_dotenv()

# 경로 설정
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
JSON_PATH = os.path.join(BASE_DIR, "data/structure_report_natural.json")
VECTORSTORE_DIR = os.path.join(BASE_DIR, "memory/gumgang_memory")

# JSON → LangChain Document
def load_natural_report():
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    return [Document(page_content=data["content"], metadata={"source": "structure_report_natural", "title": data["title"]})]

# 인게스트 실행
def ingest():
    docs = load_natural_report()
    embeddings = OpenAIEmbeddings()
    db = Chroma.from_documents(
        documents=docs,
        embedding=embeddings,
        persist_directory=VECTORSTORE_DIR
    )
    db.persist()
    print(f"✅ 자연어 구조 리포트 인게스트 완료 → 저장 위치: {VECTORSTORE_DIR}")

if __name__ == "__main__":
    ingest()
