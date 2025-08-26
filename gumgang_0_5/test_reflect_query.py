from dotenv import load_dotenv
import os

# ⬇️ 정확하게 현재 스크립트 기준의 .env 경로를 로드
dotenv_path = os.path.join(os.path.dirname(__file__), "backend", ".env")
load_dotenv(dotenv_path)


from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings

retriever = Chroma(
    persist_directory="./backend/memory/gumgang_memory",
    embedding_function=OpenAIEmbeddings()
).as_retriever()

res = retriever.invoke("금강은 지금 어떤 로드맵 상태에 있어?")
print(res[0].page_content)
