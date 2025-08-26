import os
import json
from langchain_community.vectorstores import Chroma
from langchain.schema import Document
from langchain_openai import OpenAIEmbeddings
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
REPORT_PATH = os.path.join(BASE_DIR, "data/structure_report.json")
VECTOR_DIR = os.path.join(BASE_DIR, "memory/gumgang_memory")

def load_split_documents():
    with open(REPORT_PATH, "r", encoding="utf-8") as f:
        report = json.load(f)

    docs = []

    if "summary" in report:
        docs.append(Document(
            page_content=f"📊 구조 요약: {report['summary']}",
            metadata={"source": "structure_report", "category": "summary"}
        ))

    def add_section(key, title):
        entries = report.get(key, [])
        if entries:
            if isinstance(entries[0], dict):
                contents = "\n".join([f"{k}: {v}" for item in entries for k, v in item.items()])
            else:
                contents = "\n".join(entries)

            docs.append(Document(
                page_content=f"{title}\n{contents}",
                metadata={"source": "structure_report", "category": key}
            ))

    add_section("missing_files", "❌ 누락된 파일:")
    add_section("duplicate_files", "🔁 중복된 파일:")
    add_section("unused_files", "🗑️ 미사용 파일:")
    add_section("unlinked_files", "🔗 연결되지 않은 파일:")
    add_section("backend_frontend_mismatch", "⚠️ 백엔드/프론트 불일치:")

    return docs

def ingest():
    docs = load_split_documents()
    embeddings = OpenAIEmbeddings()
    db = Chroma.from_documents(
        documents=docs,
        embedding=embeddings,
        persist_directory=VECTOR_DIR
    )
    db.persist()
    print(f"✅ 구조 리포트 (분할) 인게스트 완료 → {VECTOR_DIR}, 총 문서 수: {len(docs)}")

if __name__ == "__main__":
    ingest()
