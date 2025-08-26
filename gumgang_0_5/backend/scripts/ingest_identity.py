from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings
from langchain_community.document_loaders import JSONLoader  # ✅ 최신 import
from langchain.text_splitter import RecursiveCharacterTextSplitter
from dotenv import load_dotenv
from pathlib import Path
import os

# ✅ .env 로드 (절대 경로로 robust하게 처리)
env_path = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(dotenv_path=env_path)

# ✅ API 키 유효성 검사
if not os.getenv("OPENAI_API_KEY"):
    raise ValueError("❌ OPENAI_API_KEY가 설정되지 않았습니다. .env 파일을 확인하세요.")

# 📂 경로 설정
SOURCE_PATH = Path(__file__).resolve().parents[1] / "data/core_identity.json"
CHROMA_PATH = Path(__file__).resolve().parents[1] / "backend/memory/gumgang_memory"

# 📄 JSON 로드
loader = JSONLoader(
    file_path=str(SOURCE_PATH),
    jq_schema=".",
    text_content=False
)
documents = loader.load()

# ✂️ 청크 분할
text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
splits = text_splitter.split_documents(documents)

# 💾 임베딩 + 저장
embedding = OpenAIEmbeddings()
vectordb = Chroma.from_documents(documents=splits, embedding=embedding, persist_directory=str(CHROMA_PATH))

vectordb.persist()
print("✅ 금강 정체성(core_identity.json) 인게스트 완료!")
