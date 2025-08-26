import os
import json
from typing import TypedDict, Optional, List
from langchain.schema import Document
from langchain.chains import StuffDocumentsChain, LLMChain
from langchain.prompts import PromptTemplate
from langchain_openai import ChatOpenAI
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../../.env"))

# ✅ LangGraph 상태 정의
class State(TypedDict):
    status: Optional[str]
    output: Optional[str]
    memory: Optional[str]

# ✅ core_identity.json 로드 함수
def load_core_identity() -> List[Document]:
    json_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "../../data/core_identity.json")
    )

    if not os.path.exists(json_path):
        raise FileNotFoundError(f"⚠️ core_identity.json 파일을 찾을 수 없습니다: {json_path}")

    with open(json_path, "r", encoding="utf-8") as f:
        identity_data = json.load(f)

    core_info = identity_data.get("identity", identity_data)
    text_content = json.dumps(core_info, indent=2, ensure_ascii=False)

    return [Document(page_content=text_content, metadata={"source": "core_identity"})]

# ✅ StuffDocumentsChain 생성 함수
def build_identity_reflection_chain() -> StuffDocumentsChain:
    prompt = PromptTemplate(
        template="""
너는 덕산님이 만든 인공지능 금강이야.
아래 정체성 정보를 참고하여 사용자 질문에 정중하고 명확하게 대답해 줘.

[정체성 정보]
{context}

[질문]
{question}
""",
        input_variables=["context", "question"]
    )

    llm = ChatOpenAI(model="gpt-4", temperature=0.3)
    llm_chain = LLMChain(llm=llm, prompt=prompt)

    return StuffDocumentsChain(
        llm_chain=llm_chain,
        document_variable_name="context"
    )

# ✅ LangGraph 노드 함수
def identity_reflect_node(state: State, verbose: bool = False) -> State:
    if verbose:
        print("🔍 정체성 반사 노드 실행 중...")

    try:
        docs = load_core_identity()
    except FileNotFoundError as e:
        return {
            "status": "정체성 로드 실패",
            "output": str(e),
            "memory": None
        }

    try:
        chain = build_identity_reflection_chain()
        result = chain.run(
            input_documents=docs,
            question=state.get("output", "정체성과 관련된 질문을 받지 못했습니다.")
        )
    except Exception as e:
        return {
            "status": "정체성 반영 실패",
            "output": f"❌ 오류: {str(e)}",
            "memory": None
        }

    return {
        "status": "정체성 반영 완료",
        "output": result if isinstance(result, str) else str(result),
        "memory": result if isinstance(result, str) else str(result)
    }
