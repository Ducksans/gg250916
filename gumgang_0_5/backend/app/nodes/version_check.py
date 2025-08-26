# app/nodes/version_check.py

from typing import TypedDict, Optional
from app.nodes.file_tree_analyzer import find_version_clues  # ✅ 버전 판별 로직 호출

# ✅ 금강 상태 정의
class State(TypedDict):
    version: Optional[str]               # 실제 감지된 금강 버전 (ex: '0.6')
    ui_version: Optional[str]            # 프론트에서 보고 있는 표기 버전 (기본: '0.5')
    version_check_message: Optional[str] # 비교 결과 메시지
    version_clues: Optional[list[str]]   # 내부 판단 단서들
    output: Optional[str]                # 기타 상태 출력 (옵션)

# 🧠 버전 비교 + 구조 판단 통합 노드
def version_check_node(state: State) -> State:
    # 1. 파일 구조 기반 버전 판단 수행
    result = find_version_clues()

    detected_version = result.get("version", "unknown")
    state["version"] = detected_version
    state["version_clues"] = result.get("clues", [])
    
    # 2. 프론트 표기 버전과 비교
    ui_version = state.get("ui_version", "0.5")

    if detected_version != ui_version:
        message = (
            f"⚠️ UI 표기 버전은 v{ui_version}지만, 실제 금강 버전은 v{detected_version}입니다.\n"
            f"🛠 UI 상단 표시를 v{detected_version}로 수정하는 것을 권장합니다."
        )
    else:
        message = "✅ UI와 실제 금강 버전이 일치합니다."

    # 3. 상태에 메시지 저장
    state["version_check_message"] = message
    return state
