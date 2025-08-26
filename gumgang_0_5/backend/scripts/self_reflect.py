import os
import json
from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings
from langchain_core.documents import Document
from dotenv import load_dotenv

load_dotenv()  # 🔐 OPENAI_API_KEY 불러오기

def scan_local_structure(root="./backend"):
    file_list = []
    for dirpath, _, filenames in os.walk(root):
        for fname in filenames:
            rel_path = os.path.relpath(os.path.join(dirpath, fname), root)
            file_list.append(rel_path)
    return file_list

def reflect_and_ingest():
    roadmap_path = "./backend/data/roadmap_gold.json"
    if not os.path.exists(roadmap_path):
        print(f"❌ 로드맵 파일 없음: {roadmap_path}")
        return

    with open(roadmap_path, encoding="utf-8") as f:
        roadmap_data = json.load(f)

    structure = scan_local_structure()

    documents = [
        Document(
            page_content=f"[📘 금강 로드맵 상태]\n{json.dumps(roadmap_data, ensure_ascii=False, indent=2)}",
            metadata={"source": "self_roadmap"}
        ),
        Document(
            page_content=f"[📂 금강 로컬 구조]\n{json.dumps(structure, ensure_ascii=False, indent=2)}",
            metadata={"source": "self_structure"}
        )
    ]

    embedding = OpenAIEmbeddings()
    vectordb = Chroma(
        persist_directory="./backend/memory/gumgang_memory",
        embedding_function=embedding
    )

    vectordb.add_documents(documents)
    print("✅ 금강 자기 인식 정보 인게스트 완료")

if __name__ == "__main__":
    reflect_and_ingest()
