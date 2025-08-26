# backend/scripts/ingest_structure_report.py

import os
import json
import time
from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings
from langchain.schema import Document
from dotenv import load_dotenv

load_dotenv()

# 📁 경로 설정
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_PATH = os.path.join(BASE_DIR, "data/structure_report.json")
VECTORSTORE_DIR = os.path.join(BASE_DIR, "memory/gumgang_memory")

def load_structure_report() -> list[Document]:
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        json_data = json.load(f)

    docs = []
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    for key, value in json_data.items():
        if isinstance(value, list):
            content = f"[{key}]\n" + "\n".join([str(v) for v in value])
        else:
            content = f"[{key}]\n{value}"

        doc = Document(
            page_content=content,
            metadata={
                "source": "structure_report",
                "section": key,
                "type": "report",
                "timestamp": timestamp
            }
        )
        docs.append(doc)

    return docs

def ingest():
    try:
        docs = load_structure_report()
        embeddings = OpenAIEmbeddings()

        db = Chroma.from_documents(
            documents=docs,
            embedding=embeddings,
            persist_directory=VECTORSTORE_DIR
        )
        db.persist()

        print(f"✅ 구조 리포트 인게스트 완료 ({len(docs)}개 섹션) → 저장 위치: {VECTORSTORE_DIR}")

    except Exception as e:
        print(f"❌ 인게스트 실패: {e}")

if __name__ == "__main__":
    ingest()
