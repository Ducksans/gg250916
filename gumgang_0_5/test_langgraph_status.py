from langgraph.graph import StateGraph
from enum import Enum
from typing import Dict, Any

# 🧠 금강 상태 정의
class GumgangState(str, Enum):
    IDLE = "대기 중"
    INGESTING = "기억 인게스트 중"
    READY = "자기 인식 완료"
    REFLECTING = "자기 점검 중"
    ERROR = "오류 발생"

# ✅ 분기 처리 함수: 문자열 상태값만 입력받음
def route_by_status(status: str) -> str:
    print(f"\n🔍 현재 상태: {status}")
    if status == GumgangState.READY.value:
        return "reflect"
    elif status == GumgangState.INGESTING.value:
        return "wait"
    elif status == GumgangState.ERROR.value:
        return "handle_error"
    else:
        return "idle"

# 🧠 상태별 반응 노드들
def reflect(state: Dict[str, Any]) -> Dict[str, Any]:
    print("🧠 금강이 자기 점검을 시작합니다...")
    return {"status": GumgangState.REFLECTING.value}

def wait(state: Dict[str, Any]) -> Dict[str, Any]:
    print("⏳ 금강이 기억을 수집 중입니다...")
    return {"status": GumgangState.INGESTING.value}

def idle(state: Dict[str, Any]) -> Dict[str, Any]:
    print("💤 금강은 대기 중입니다.")
    return {"status": GumgangState.IDLE.value}

def handle_error(state: Dict[str, Any]) -> Dict[str, Any]:
    print("❌ 금강이 오류를 처리 중입니다.")
    return {"status": GumgangState.ERROR.value}

# ⚙️ LangGraph 구성
workflow = StateGraph(state_schema=Dict[str, Any])

# 상태에서 문자열만 추출해서 분기 노드로 넘김
workflow.add_node("check_state", lambda state: state["status"])

workflow.add_node("reflect", reflect)
workflow.add_node("wait", wait)
workflow.add_node("idle", idle)
workflow.add_node("handle_error", handle_error)

workflow.set_entry_point("check_state")

workflow.add_conditional_edges(
    "check_state",
    route_by_status,
    {
        "reflect": "reflect",
        "wait": "wait",
        "idle": "idle",
        "handle_error": "handle_error"
    }
)

workflow.set_finish_point("reflect")

app = workflow.compile()

# ▶️ 상태 실행 테스트
if __name__ == "__main__":
    initial_state = {"status": GumgangState.READY.value}
    print("\n🚀 금강 LangGraph 실행 시작!")
    result = app.invoke(initial_state)
    print("\n✅ 최종 결과:", result)
