# /app/nodes/status_formatter.py

from typing import Dict, Any, List


def format_for_chat(state: Dict[str, Any]) -> str:
    """
    ChatWindow에서 보여줄 간결한 응답 요약.
    """
    memory = str(state.get("memory", "")).strip()
    if not memory:
        return "🧠 기억 없음: 해당 질문에 대한 금강의 기억이 존재하지 않습니다."
    return f"🧠 기억 회상 결과:\n\n{memory}"


def format_for_card(state: Dict[str, Any]) -> str:
    """
    GumgangStatusCard.tsx 등 카드용 전체 상태 보고서
    """
    version: str = str(state.get("version", "❓ 버전 정보 없음"))
    memory: str = str(state.get("memory", "")).strip()
    version_check: str = str(state.get("version_check_message", "")).strip()
    edit_history: List[Dict[str, Any]] = state.get("edit_history", [])
    proposals: List[str] = state.get("structure_proposals", [])
    available: List[Dict[str, str]] = state.get("available_components", [])

    lines: List[str] = []

    # 기본 정보
    lines += [
        "📊 금강 현재 상태 요약",
        f"🤖 이름: 금강",
        f"🧠 버전: {version}",
    ]

    if version_check:
        lines.append(version_check)

    lines.append(f"📂 기억 회상 결과:\n{memory or '❓ 회상된 응답 없음'}")

    # 최근 수정 기록
    lines.append("")  # 구분용
    if edit_history:
        lines.append("📎 최근 수정 기록:")
        sorted_history = sorted(edit_history, key=lambda e: e.get("time", ""), reverse=True)
        for e in sorted_history:
            file = str(e.get("file", "❓"))
            time = str(e.get("natural_time", "시간 정보 없음"))
            msg = str(e.get("msg", "메시지 없음"))
            lines.append(f"📄 {file} | 🕒 {time} | 💬 {msg}")
    else:
        lines.append("📎 최근 수정 기록 없음")

    # 구조 개선 제안
    lines.append("")  # 구분용
    if proposals:
        lines.append("🧩 구조 개선 제안:")
        for p in proposals:
            lines.append(f"🔧 {str(p)}")
    else:
        lines.append("🧩 구조 개선 제안 없음")

    # 사용 가능한 기능
    lines.append("")  # 구분용
    if available:
        lines.append("🧰 사용 가능한 기능:")
        for c in available:
            label = str(c.get("label", "❓"))
            endpoint = str(c.get("endpoint", ""))
            lines.append(f"{label} → `{endpoint}`")
    else:
        lines.append("🧰 사용 가능한 기능 없음")

    return "\n".join(lines)
