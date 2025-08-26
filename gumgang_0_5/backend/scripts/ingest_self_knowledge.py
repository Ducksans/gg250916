import os
import json
from langchain_openai import OpenAIEmbeddings
from langchain_chroma import Chroma
from langchain.text_splitter import RecursiveCharacterTextSplitter
from dotenv import load_dotenv

load_dotenv()

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
SUMMARY_PATH = os.path.join(PROJECT_ROOT, "backend/data/file_summaries.json")
STRUCTURE_PATH = os.path.join(PROJECT_ROOT, "backend/data/folder_structure.json")
CHROMA_PATH = os.path.join(PROJECT_ROOT, "backend/memory/gumgang_memory")

# 텍스트 분할기 설정
text_splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=100)

def make_documents_from_json(json_data, prefix=""):
    documents = []
    for key, value in json_data.items():
        content = f"[{prefix}] {key}\n{json.dumps(value, ensure_ascii=False, indent=2)}"
        splits = text_splitter.create_documents([content])
        documents.extend(splits)
    return documents

def main():
    print("📦 금강 자기 구조 기억 인게스트 시작...")

    # JSON 로드
    with open(SUMMARY_PATH, encoding="utf-8") as f:
        summary_data = json.load(f)
    with open(STRUCTURE_PATH, encoding="utf-8") as f:
        folder_data = json.load(f)

    # 문서 생성
    docs_summary = make_documents_from_json(summary_data, "파일 요약")
    docs_folder = make_documents_from_json(folder_data, "폴더 구조")

    all_docs = docs_summary + docs_folder
    print(f"✅ 문서 총 {len(all_docs)}개 생성")

    # 임베딩 및 Chroma 저장
    embedding = OpenAIEmbeddings()
    vectordb = Chroma.from_documents(
        documents=all_docs,
        embedding=embedding,
        persist_directory=CHROMA_PATH
    )

    vectordb.persist()
    print(f"✅ 인게스트 완료 → {CHROMA_PATH}")

if __name__ == "__main__":
    main()


