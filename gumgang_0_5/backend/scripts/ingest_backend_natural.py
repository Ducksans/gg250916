# backend/scripts/ingest_backend_natural.py

import os
import json
from langchain.schema import Document
from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from dotenv import load_dotenv

# ✅ 환경 변수 로드
load_dotenv()

# ✅ 경로 설정 (상대 경로 기준으로 정확히 지정)
SOURCE_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../data/backend_structure_natural.json")
)
CHROMA_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../memory/gumgang_memory")
)

# ✅ JSON 로드 및 문서 생성
with open(SOURCE_PATH, "r", encoding="utf-8") as f:
    data = json.load(f)

text = f"금강 백엔드 구조 설명:\n{json.dumps(data, ensure_ascii=False, indent=2)}"
docs = [Document(page_content=text, metadata={"source": "backend_structure_natural"})]

# 🔢 문서 분할
splitter = RecursiveCharacterTextSplitter.from_tiktoken_encoder(chunk_size=800, chunk_overlap=100)
split_docs = splitter.split_documents(docs)

# 💾 저장
db = Chroma.from_documents(split_docs, OpenAIEmbeddings(), persist_directory=CHROMA_PATH)
db.persist()
print("✅ backend_structure_natural 인게스트 완료")
