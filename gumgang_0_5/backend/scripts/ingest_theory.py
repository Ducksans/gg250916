# ingest_theory.py

import os
from dotenv import load_dotenv
from langchain.document_loaders import TextLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.vectorstores import Chroma
from langchain.embeddings import OpenAIEmbeddings

# ✅ .env 파일 로드
env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env"))
load_dotenv(dotenv_path=env_path)

# ✅ 경로 설정
file_path = "memory/sources/theory/gumgang_manifest.txt"
persist_directory = "memory/vectors/theory_memory"

# ✅ 문서 로드
loader = TextLoader(file_path)
documents = loader.load()

# ✅ 텍스트 분할
splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
docs = splitter.split_documents(documents)

# ✅ 벡터 저장소에 인게스트
embedding = OpenAIEmbeddings()
vectorstore = Chroma.from_documents(documents=docs, embedding=embedding, persist_directory=persist_directory)
vectorstore.persist()

print("✅ 금강 선언문이 성공적으로 theory_memory에 인게스트되었습니다.")
