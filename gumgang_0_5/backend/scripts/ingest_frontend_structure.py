import os
import json
from langchain_core.documents import Document
from langchain_community.vectorstores import Chroma
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from dotenv import load_dotenv

# ✅ 환경 변수 로드 (.env에 OPENAI_API_KEY 있어야 함)
load_dotenv()

# ✅ 경로 설정
json_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../data/frontend_structure_0.7.json"))
persist_directory = os.path.abspath(os.path.join(os.path.dirname(__file__), "../memory/gumgang_memory"))

# ✅ JSON 로드
if not os.path.exists(json_path):
    raise FileNotFoundError(f"⚠️ JSON 파일이 존재하지 않습니다: {json_path}")

with open(json_path, "r", encoding="utf-8") as f:
    data = json.load(f)

# ✅ Document로 변환
text = f"[프론트 구조: {data.get('name')}]\n" + "\n".join(data.get("structure", []))
doc = Document(page_content=text, metadata={"source": "frontend_structure_0.7.json"})

# ✅ 분할 및 임베딩
splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
docs = splitter.split_documents([doc])

db = Chroma.from_documents(docs, OpenAIEmbeddings(), persist_directory=persist_directory)
db.persist()

print("✅ 프론트 구조 인게스트 완료!")
