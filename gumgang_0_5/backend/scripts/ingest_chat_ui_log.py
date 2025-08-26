# 📁 backend/scripts/ingest_chat_ui_log.py

import os
import json
from datetime import datetime
from langchain_community.document_loaders import JSONLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings
from langchain_core.documents import Document
from dotenv import load_dotenv

# ✅ 환경 변수 로드
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../.env"))

# ✅ 경로 정의
CHAT_LOG_DIR = "./memory/chat_logs"
VECTOR_DB_DIR = "./memory/vectors/chatgpt_memory"

def load_chat_records():
    documents = []
    total = 0
    skipped = 0

    for filename in os.listdir(CHAT_LOG_DIR):
        if filename.endswith(".json"):
            filepath = os.path.join(CHAT_LOG_DIR, filename)
            with open(filepath, "r", encoding="utf-8") as f:
                try:
                    records = json.load(f)
                    for record in records:
                        question = record.get("question", "").strip()
                        answer = record.get("answer", "").strip()
                        timestamp = record.get("timestamp", "")
                        if not question or not answer:
                            skipped += 1
                            continue

                        metadata = {
                            "answer": answer,
                            "timestamp": timestamp,
                            "source": filename
                        }
                        documents.append(Document(page_content=question, metadata=metadata))
                        total += 1
                except Exception as e:
                    print(f"⚠️ {filename} 읽기 실패: {e}")
    return documents, total, skipped

def main():
    print("🔄 대화 로그 인게스트 시작...")

    records, total, skipped = load_chat_records()
    if not records:
        print("⚠️ 인게스트할 유효한 대화 없음.")
        return

    # ✅ 텍스트 분할
    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
    docs = splitter.split_documents(records)

    # ✅ 벡터 저장소 생성 및 저장
    db = Chroma.from_documents(
        documents=docs,
        embedding=OpenAIEmbeddings(),
        persist_directory=VECTOR_DB_DIR
    )
    db.persist()

    print(f"✅ 인게스트 완료: 총 {total}건 (무시된 {skipped}건) → {VECTOR_DB_DIR}")

if __name__ == "__main__":
    main()
