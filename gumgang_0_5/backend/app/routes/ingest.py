# 📄 ingest.py

import os, json
from langchain.schema import Document
from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from bs4 import BeautifulSoup
from dotenv import load_dotenv

# ✅ 환경변수 로드
load_dotenv()

# ✅ 벡터 저장소 위치와 임베딩 정의
CHROMA_PATH = "./memory/gumgang_memory"
embedding = OpenAIEmbeddings()
db = Chroma(persist_directory=CHROMA_PATH, embedding_function=embedding)

# ✅ 파일 내용 로드 함수
def load_text(path: str) -> str | None:
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as e:
        print(f"❌ 파일 읽기 실패: {path} → {e}")
        return None

# ✅ 파일 형식별 파싱
def parse_file(filepath: str) -> str | None:
    ext = os.path.splitext(filepath)[-1].lower()
    text = load_text(filepath)
    if not text:
        return None

    if ext == ".html":
        soup = BeautifulSoup(text, "html.parser")
        return soup.get_text()
    elif ext in [".md", ".txt"]:
        return text
    elif ext == ".json":
        try:
            return json.dumps(json.loads(text), indent=2)
        except:
            return None
    return None

# ✅ 텍스트 → 문서 조각 분할
def split_text_to_chunks(text: str, chunk_size=1000, chunk_overlap=200):
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len
    )
    return splitter.split_text(text)

# ✅ 디렉토리 전체 인게스트
def ingest_directory(root_dir="~/newgumgang"):
    root_dir = os.path.expanduser(root_dir)
    added_chunks = 0
    for dirpath, _, filenames in os.walk(root_dir):
        for fname in filenames:
            if not fname.lower().endswith((".html", ".md", ".json", ".txt")):
                continue
            fpath = os.path.join(dirpath, fname)
            parsed = parse_file(fpath)
            if not parsed:
                continue

            chunks = split_text_to_chunks(parsed)
            docs = [Document(page_content=chunk) for chunk in chunks]

            try:
                db.add_documents(docs)
                print(f"✅ {fname} → {len(docs)} 조각 저장됨")
                added_chunks += len(docs)
            except Exception as e:
                print(f"❌ {fname} 저장 실패: {str(e)}")

    db.persist()
    return {"ingested_chunks": added_chunks}

# ✅ 단일 텍스트 인게스트 (API에서 호출)
def ingest_document(text: str):
    try:
        chunks = split_text_to_chunks(text)
        docs = [Document(page_content=chunk) for chunk in chunks]
        db.add_documents(docs)
        db.persist()
        return {"status": "success", "chunks": len(docs)}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# ✅ 직접 실행 시
if __name__ == "__main__":
    print("📥 기억 주입 시작...")
    result = ingest_directory()
    print("✅ 완료:", result)
