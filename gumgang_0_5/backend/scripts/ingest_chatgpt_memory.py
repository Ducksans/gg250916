import os
import json
from pathlib import Path
from dotenv import load_dotenv
from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from tqdm import tqdm

# 🌱 환경 변수 로드
load_dotenv()

# 📁 경로 설정
SOURCE_DIR = "backend/memory/sources/chatgpt/"
VECTOR_DIR = "backend/memory/vectors/chatgpt_memory"

# 🔧 임베딩 모델 + 텍스트 청크 분할기
embedding = OpenAIEmbeddings()
splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)

docs = []

print(f"📂 인게스트 대상 폴더: {SOURCE_DIR}")

# 📦 JSON 파일 순회하며 messages 파싱
for file in tqdm(Path(SOURCE_DIR).glob("*.json"), desc="🔍 파일 스캔 중"):
    try:
        with open(file, "r", encoding="utf-8") as f:
            data = json.load(f)

        # ✅ Plan A: OpenAI 대화 형식
        full_text = ""
        messages = data.get("messages", [])
        if isinstance(messages, list):
            for msg in messages:
                role = msg.get("role")
                content = msg.get("content", "").strip()
                if role in ["user", "assistant"] and content:
                    full_text += f"{role.upper()}: {content}\n\n"

        # ✅ Plan B: fallback
        if not full_text.strip():
            if isinstance(data.get("text"), str):
                full_text = data["text"].strip()
            elif isinstance(data.get("content"), str):
                full_text = data["content"].strip()

        if not full_text.strip():
            print(f"⚠️ 유효한 텍스트 없음: {file.name}")
            continue

        metadata = {
            "source": str(file),
            "filename": file.name
        }

        for chunk in splitter.split_text(full_text):
            docs.append(Document(page_content=chunk, metadata=metadata))

    except Exception as e:
        print(f"❌ 오류: {file.name} → {str(e)}")

# ✅ 인게스트 시작
print(f"\n📥 최종 청크 수: {len(docs)}")

db = Chroma(persist_directory=VECTOR_DIR, embedding_function=embedding)

# 🔁 배치 추가
BATCH_SIZE = 100
for i in tqdm(range(0, len(docs), BATCH_SIZE), desc="🔄 인게스트 중"):
    batch = docs[i:i + BATCH_SIZE]
    try:
        db.add_documents(batch)
    except Exception as e:
        print(f"❌ 배치 오류 @ {i}: {e}")

# 💾 저장
db.persist()
print("✅ 인게스트 완료 및 벡터 DB 저장됨")
