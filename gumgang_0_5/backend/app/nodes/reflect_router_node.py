# ✅ reflect_router_node.py
# 질문 내용을 기반으로 LangGraph 내부 reflect 흐름을 분기함

from langchain_core.runnables import RunnableLambda
from langchain_core.messages import HumanMessage
from app.nodes.status_report import status_report
from app.nodes.generate_only_node import generate_only_node

# ✅ 의미 기반 키워드 정의
KEYWORDS_TRIGGER_MEMORY = ["상태", "구조", "기억", "버전", "수정", "로드맵"]

# ✅ 분기 로직 (verbose 지원)
def route_by_query_verbose(inputs: dict, verbose: bool = False) -> dict:
    query = inputs.get("query", "")
    if verbose:
        print(f"🔎 reflect_router_node input query: {query}")

    if any(keyword in query for keyword in KEYWORDS_TRIGGER_MEMORY):
        if verbose:
            print("🔀 키워드 감지 → status_report")
        return {"next": "status_report"}
    else:
        if verbose:
            print("➡️ 키워드 없음 → generate_only_node")
        return {"next": "generate_only_node"}

# ✅ LangGraph 라우터 노드 정의
def build_reflect_router_node(verbose: bool = False) -> RunnableLambda:
    return RunnableLambda(lambda inputs: route_by_query_verbose(inputs, verbose=verbose))

# 📌 연결 예시 (graph.py 내에서 사용)
# reflect_router_node = build_reflect_router_node(verbose=True)
