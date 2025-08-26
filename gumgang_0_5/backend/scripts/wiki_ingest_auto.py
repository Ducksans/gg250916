import os
import time
import requests
from bs4 import BeautifulSoup
from markdownify import markdownify as md
from dotenv import load_dotenv

# ✅ 최신 LangChain 모듈 경로 사용
from langchain_chroma import Chroma
from langchain_community.document_loaders import TextLoader
from langchain_openai import OpenAIEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter

# ✅ 환경 변수 로드
load_dotenv()

# ✅ 경로 설정
MASTER_LIST = "/home/duksan/바탕화면/gumgang_0_5/backend/memory/sources/docs/memory_seed_master_list_converted.md"
SAVE_ROOT = "/home/duksan/바탕화면/gumgang_0_5/backend/memory/sources/docs/wiki_pages"
VECTOR_PATH = "/home/duksan/바탕화면/gumgang_0_5/backend/memory/vectors/docs_memory"

# ✅ 벡터 저장소 및 임베딩 설정
embeddings = OpenAIEmbeddings()
vectorstore = Chroma(persist_directory=VECTOR_PATH, embedding_function=embeddings)

# ✅ 텍스트 분할기
text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)

def fetch_markdown_from_url(url: str) -> str:
    print(f"🔎 URL 접속 중: {url}")
    res = requests.get(url)
    soup = BeautifulSoup(res.text, "html.parser")
    content = soup.find("div", {"id": "bodyContent"})
    return md(str(content)) if content else ""

def save_markdown(title: str, lang: str, markdown: str) -> str:
    safe_title = title.replace("/", "_").strip()
    folder_path = os.path.join(SAVE_ROOT, safe_title)
    os.makedirs(folder_path, exist_ok=True)
    file_path = os.path.join(folder_path, f"{lang}.md")

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(markdown)
    
    print(f"✅ 저장 완료: {file_path}")
    return file_path

def ingest_markdown(markdown: str, title: str, lang: str):
    # ✅ 문서 출처 경로 추가 (메타데이터)
    source_path = f"wiki_pages/{title.replace('/', '_')}/{lang}.md"

    docs = text_splitter.create_documents(
        texts=[markdown],
        metadatas=[{"source": source_path}]
    )

    vectorstore.add_documents(docs)
    print(f"📥 인게스트 완료: {title} ({lang}) → {source_path}")

def run():
    if not os.path.exists(MASTER_LIST):
        print(f"❌ 마스터 리스트가 존재하지 않습니다: {MASTER_LIST}")
        return

    with open(MASTER_LIST, "r", encoding="utf-8") as f:
        lines = f.readlines()

    for line in lines:
        if "|" not in line:
            continue
        parts = line.strip().split("|")
        if len(parts) < 3:
            continue

        title, url_en, url_ko = [p.strip() for p in parts[:3]]

        try:
            # 🔹 영어 위키
            md_en = fetch_markdown_from_url(url_en)
            path_en = save_markdown(title, "en", md_en)
            ingest_markdown(md_en, title, "en")
            time.sleep(3)

            # 🔹 한글 위키
            md_ko = fetch_markdown_from_url(url_ko)
            path_ko = save_markdown(title, "ko", md_ko)
            ingest_markdown(md_ko, title, "ko")
            time.sleep(3)

        except Exception as e:
            print(f"⚠️ {title} 처리 실패: {e}")

if __name__ == "__main__":
    run()
