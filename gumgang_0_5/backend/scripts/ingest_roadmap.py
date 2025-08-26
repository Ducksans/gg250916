import os
import json
from dotenv import load_dotenv
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings
from langchain.schema.document import Document

# ✅ 1. .env 환경변수 로드
dotenv_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env"))
load_dotenv(dotenv_path)

# ✅ 2. JSON 및 저장소 경로 설정 (경로 정정 포함)
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ROADMAP_PATH = os.path.join(BASE_DIR, "memory", "sources", "roadmap_natural.json")
CHROMA_DIR = os.path.join(BASE_DIR, "memory", "gumgang_memory")

# ✅ 3. 메인 함수
def main():
    print(f"📥 자연어 로드맵 JSON 로드 중: {ROADMAP_PATH}")

    try:
        with open(ROADMAP_PATH, encoding="utf-8") as f:
            lines = json.load(f)
    except Exception as e:
        print(f"❌ JSON 파일 로드 실패: {e}")
        return

    # ✅ 4. content 필드 기준 문서 생성
    docs = []
    for item in lines:
        if isinstance(item, dict) and "content" in item:
            text = item["content"].strip()
            if text:
                docs.append(Document(page_content=text))

    print(f"🧾 인게스트 대상 문서 수: {len(docs)}")
    for i, doc in enumerate(docs[:3]):
        print(f"📄 문서 {i+1}: {doc.page_content[:80]}...")

    if not docs:
        print("⚠️ 인게스트할 문서가 없습니다.")
        return

    # ✅ 5. Chroma 인게스트
    print(f"🔄 Chroma 저장 경로: {CHROMA_DIR}")
    try:
        db = Chroma.from_documents(
            documents=docs,
            embedding=OpenAIEmbeddings(),
            persist_directory=CHROMA_DIR
        )
    except Exception as e:
        print(f"❌ Chroma 인게스트 실패: {e}")
        return

    print("✅ 금강 자연어 로드맵 인게스트 완료!")

# ✅ 6. 실행
if __name__ == "__main__":
    main()
