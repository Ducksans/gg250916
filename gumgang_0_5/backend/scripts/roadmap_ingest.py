import os
import json
from dotenv import load_dotenv
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.schema.document import Document

# ✅ 1. .env 환경변수 로드
dotenv_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env"))
load_dotenv(dotenv_path)

# ✅ 2. 자연어 기반 로드맵 JSON 경로
ROADMAP_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "roadmap_natural.json"))

# ✅ 3. 벡터 저장소 위치
CHROMA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "memory", "backend/memory/gumgang_memory"))

# ✅ 4. 메인 함수
def main():
    print(f"📥 자연어 로드맵 JSON 로드 중: {ROADMAP_PATH}")

    try:
        with open(ROADMAP_PATH, encoding="utf-8") as f:
            lines = json.load(f)
    except Exception as e:
        print(f"❌ JSON 파일 로드 실패: {e}")
        return

    # ✅ 5. 각 줄을 Document 객체로 변환
    docs = [
        Document(page_content=item["content"])
        for item in lines
        if isinstance(item, dict) and "content" in item
    ]

    # ✅ 6. Chroma로 인게스트
    print(f"🔄 Chroma 저장 경로: {CHROMA_DIR}")
    db = Chroma.from_documents(
        documents=docs,
        embedding=OpenAIEmbeddings(),
        persist_directory=CHROMA_DIR
    )

    print("✅ 금강 자연어 로드맵 인게스트 완료!")

if __name__ == "__main__":
    main()
