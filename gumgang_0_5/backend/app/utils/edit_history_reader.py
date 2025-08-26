import os
import json

# ✅ 원본 edit_history.json 경로
EDIT_HISTORY_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../memory/history/edit_history.json")
)

# ✅ 정제된 edit_history_refined.json 경로
EDIT_HISTORY_REFINED_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../memory/history/edit_history_refined.json")
)

# ✅ 원본 수정 기록 (구조 그대로)
def read_latest_edit(n: int = 3):
    if not os.path.exists(EDIT_HISTORY_PATH):
        return []

    with open(EDIT_HISTORY_PATH, "r", encoding="utf-8") as f:
        history = json.load(f)

    return history[-n:]  # 최신 n건 반환

# ✅ 정제된 수정 기록 (msg, file, time 기반 요약)
def read_latest_refined_edits(n: int = 3):
    if not os.path.exists(EDIT_HISTORY_REFINED_PATH):
        return []

    try:
        with open(EDIT_HISTORY_REFINED_PATH, "r", encoding="utf-8") as f:
            refined_history = json.load(f)
        return refined_history[-n:]
    except Exception as e:
        print(f"⚠️ refined_edit_history 읽기 실패: {e}")
        return []

# ✅ 자연어 요약용: 최근 수정 3건을 보기 좋게 문자열로 구성
def get_recent_edit_summary(n: int = 3) -> str:
    edits = read_latest_refined_edits(n)

    if not edits:
        return "🛠 최근 수정 내역이 없습니다."

    lines = ["🛠 최근 수정 기록:"]
    for item in edits:
        file = item.get("file", "❓ 알 수 없음")
        time = item.get("timestamp", "🕒 시각 미상")
        msg = item.get("message", "💬 메시지 없음")
        diff = item.get("diff", "")

        lines.append(f"📄 파일: {file}\n🕒 시각: {time}\n💬 메시지: {msg}")
        if diff:
            lines.append(f"📎 diff:\n{diff}")
        lines.append("")  # 줄바꿈

    return "\n".join(lines)
