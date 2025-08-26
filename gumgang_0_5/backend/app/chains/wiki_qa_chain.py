import os
from langchain.chains import RetrievalQA
from langchain.chains.qa_with_sources import load_qa_with_sources_chain
from langchain.chains.combine_documents.stuff import StuffDocumentsChain
from langchain.prompts import PromptTemplate
from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings, ChatOpenAI

# ✅ 벡터 저장 경로
VECTOR_PATH = "./memory/vectors/docs_memory"

# ✅ 벡터 DB 로딩
vectorstore = Chroma(
    persist_directory=VECTOR_PATH,
    embedding_function=OpenAIEmbeddings()
)

# ✅ LLM 설정 (GPT는 조력자 역할)
llm = ChatOpenAI(temperature=0)

# ✅ 체인 프롬프트 템플릿 (원문 요약용, 선택사항)
prompt = PromptTemplate(
    template="""
당신은 금강의 기억을 요약하는 조력자입니다.
다음 문서들을 참고하여 사용자 질문에 간결하고 정확하게 답해주세요:

{context}

질문: {question}
답변:""",
    input_variables=["context", "question"]
)

# ✅ QA 체인 정의
wiki_qa_chain = RetrievalQA.from_chain_type(
    llm=llm,
    retriever=vectorstore.as_retriever(search_kwargs={"k": 3}),
    chain_type="stuff",  # "stuff" 또는 "map_reduce", "refine" 등 사용 가능
    chain_type_kwargs={"prompt": prompt},
    return_source_documents=True  # invoke 사용 전제조건
)
