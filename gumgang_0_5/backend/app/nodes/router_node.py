# /home/duksan/바탕화면/gumgang_0_5/backend/langgraph/nodes/route_node.py

from typing import TypedDict, Literal, Union
from langgraph.graph import StateGraph

class RouteState(TypedDict):
    query: str
    memory_response: Union[str, None]
    router_decision: str  # e.g. "memory", "no_memory"

def route_node(state: RouteState) -> RouteState:
    """
    사용자의 질문(query)과 기억 응답(memory_response)을 바탕으로
    흐름을 memory / no_memory로 분기합니다.

    - 기억 응답이 존재하지 않으면 no_memory
    - 존재하지만 상태 리포트로 연결될 필요 없으면 그대로 memory
    - 상태 보고서는 UI 카드에서 별도로 처리하므로 여기선 출력 금지
    """

    query = state["query"]
    memory_response = state.get("memory_response", "")

    # 1️⃣ 기억 없음 또는 whitespace → "no_memory"
    if not memory_response or memory_response.strip() == "":
        return {
            **state,
            "memory_response": "🧠 기억 없음: 해당 질문에 대한 금강의 기억이 존재하지 않습니다.",
            "router_decision": "no_memory_generate_node"
        }

    # 2️⃣ 특정 키워드(예: "기억")가 포함되더라도 짧은 질문이면 회상 전용으로
    if "기억" in query and len(query.strip()) < 20:
        # 상태 리포트 호출은 프론트 카드에서만
        return {
            **state,
            "router_decision": "memory"
        }

    # 3️⃣ 일반적인 기억 회상 성공
    return {
        **state,
        "router_decision": "memory"
    }
