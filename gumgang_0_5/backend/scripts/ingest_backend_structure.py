import os
import json
from typing import List
from langchain_community.vectorstores import Chroma
from langchain.schema import Document
from langchain_openai import OpenAIEmbeddings
from dotenv import load_dotenv

# ✅ 환경 변수 로드 (.env에 OpenAI API 키가 있어야 함)
load_dotenv()

# ✅ 기본 경로 정의
SOURCE_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../memory/sources/structure/backend_structure_knowledge.json")
)
CHROMA_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../memory/gumgang_memory")
)

# ✅ JSON 로드 함수
def load_backend_structure() -> List[Document]:
    if not os.path.exists(SOURCE_PATH):
        raise FileNotFoundError(f"❌ 구조 JSON 파일 없음: {SOURCE_PATH}")

    with open(SOURCE_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    docs = []
    # 데이터가 리스트가 아닌 경우 처리
    if isinstance(data, dict):
        data = [data]

    for entry in data:
        if isinstance(entry, dict):
            content = entry.get("content", "")
            metadata = {
                "source": "backend_structure_knowledge",
                "type": entry.get("type", "backend"),
                "filename": entry.get("filename", ""),
                "path": entry.get("path", ""),
            }
            docs.append(Document(page_content=content, metadata=metadata))
        else:
            print(f"⚠️ 예상치 못한 형식: {entry} (무시됨)")
    return docs

# ✅ 인게스트 실행
def ingest():
    print("📥 백엔드 구조 JSON 로딩 중...")
    documents = load_backend_structure()

    print(f"📦 문서 개수: {len(documents)}")
    print("🔍 임베딩 및 저장 경로:", CHROMA_PATH)

    # ✅ 임베딩 및 저장
    db = Chroma.from_documents(
        documents=documents,
        embedding=OpenAIEmbeddings(),
        persist_directory=CHROMA_PATH
    )
    db.persist()
    print("✅ 백엔드 구조 인게스트 완료!")

if __name__ == "__main__":
    ingest()
