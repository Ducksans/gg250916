import os
from dotenv import load_dotenv
from langchain.chains import RetrievalQA
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_community.vectorstores import Chroma

# ✅ 고정된 .env 경로에서 API 키 로드
load_dotenv(dotenv_path="/home/duksan/바탕화면/gumgang_0_5/backend/.env")

def get_self_qa():
    vectorstore = Chroma(
        persist_directory="./memory/gumgang_memory",
        embedding_function=OpenAIEmbeddings()
    )
    retriever = vectorstore.as_retriever()
    llm = ChatOpenAI(model_name="gpt-3.5-turbo", temperature=0)
    qa = RetrievalQA.from_chain_type(llm=llm, retriever=retriever)
    return qa

if __name__ == "__main__":
    qa = get_self_qa()
    print("🧠 금강 자기 구조 질의 시스템 실행 중...")
    while True:
        query = input("🤖 질문: ")
        if query.lower() in ["exit", "quit", "종료"]:
            break
        result = qa.run(query)
        print(f"💬 응답: {result}\n")
