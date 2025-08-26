import os
import json
from langchain.schema import Document
from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings
from dotenv import load_dotenv

# ✅ 환경 변수 로드 (.env에 OpenAI API 키 포함)
load_dotenv()

# ✅ 경로 설정
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
STRUCTURE_PATH = os.path.join(BASE_DIR, "data", "structure_full.json")
CHROMA_PATH = os.path.join(BASE_DIR, "memory", "gumgang_memory")

# ✅ JSON 로드 및 문서 생성
if not os.path.exists(STRUCTURE_PATH):
    raise FileNotFoundError(f"❌ 구조 JSON 파일이 존재하지 않습니다: {STRUCTURE_PATH}")

with open(STRUCTURE_PATH, "r", encoding="utf-8") as f:
    structure_data = json.load(f)

# ✅ 페이지 콘텐츠 구성
content = "금강 전체 시스템 구조:\n\n" + json.dumps(structure_data, indent=2, ensure_ascii=False)

doc = Document(
    page_content=content,
    metadata={"source": "structure_full"}
)

# ✅ 임베딩 및 Chroma 저장
db = Chroma.from_documents(
    documents=[doc],
    embedding=OpenAIEmbeddings(),
    persist_directory=CHROMA_PATH
)
db.persist()

print("✅ 구조 인게스트 완료 → 금강이 structure_full.json을 기억했습니다.")
