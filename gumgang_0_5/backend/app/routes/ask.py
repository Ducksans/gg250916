# /home/duksan/바탕화면/gumgang_0_5/backend/app/routes/ask.py

from fastapi import APIRouter, Request
from app.graph import run_graph
from app.utils.edit_history_reader import read_latest_edit
from app.context_manager import get_session_manager, get_conversation_memory
import os
import json

router = APIRouter()

@router.post("/ask")
async def ask_question(request: Request):
    body = await request.json()
    query = body.get("query", "").strip()
    session_id = body.get("session_id")  # 클라이언트에서 세션 ID 전달 가능

    # 세션 관리
    session_manager = get_session_manager()
    conversation_memory = get_conversation_memory()

    # 기존 세션 검증 또는 새 세션 생성
    if session_id:
        user_context = session_manager.get_session(session_id)
        if not user_context:
            session_id = session_manager.create_session()
    else:
        session_id = session_manager.create_session()

    # ✅ 1. "수정 내역" 관련 질의는 로컬 처리
    if any(keyword in query for keyword in ["수정 내역", "최근 수정", "diff", "edit history"]):
        edits = read_latest_edit()
        if not edits:
            return {"response": "📝 최근 수정 내역이 없습니다."}

        response_lines = ["🧾 최근 수정 기록:\n"]
        for edit in edits:
            line = f"""
📄 파일: {os.path.basename(edit["file_path"])}
🕒 시각: {edit.get("timestamp", "시간 정보 없음")}
💬 메시지: {edit.get("message", "메시지 없음")}
📎 diff:
{edit.get("diff", "없음")}
"""
            response_lines.append(line.strip())

        return {"response": "\n\n".join(response_lines)}

    # ✅ 2. 일반 질의 → LangGraph 실행 (세션 컨텍스트 포함)
    result = run_graph_with_context(query, session_id)

    # ✅ 3. 컨텍스트 정보 추출
    router_decision = result.get("router_decision", "")
    source = result.get("source", "memory")
    suggest_ingest = result.get("suggest_ingest", False)
    conversation_context = result.get("conversation_context", {})

    # ✅ 4. 대화 히스토리 정보 (디버깅용)
    recent_history = conversation_memory.get_recent_history(session_id, count=3)
    context_summary = {
        "session_id": session_id,
        "recent_interactions": len(recent_history),
        "context_type": conversation_context.get("flow_analysis", {}).get("context_type", "new"),
        "continuity_score": conversation_context.get("flow_analysis", {}).get("continuity_score", 0.0)
    }

    # ✅ 5. 상태 리포트는 항상 output 사용 (카드에서 보기 위함)
    if router_decision == "status_report":
        return {
            "response": result.get("output", "📊 상태 리포트 없음"),
            "source": "system",
            "suggest_ingest": False,
            "session_id": session_id,
            "context_info": context_summary
        }

    # ✅ 6. 회상 또는 GPT 생성 응답 → output → memory 순으로 우선 출력
    return {
        "response": result.get("output") or result.get("memory") or "🧠 기억 없음: 금강이 응답을 생성하지 못했습니다.",
        "source": source,
        "suggest_ingest": suggest_ingest,
        "session_id": session_id,
        "context_info": context_summary,
        "response_quality": result.get("response_quality", {}),
        "intent_analysis": result.get("intent_analysis", {})
    }

def run_graph_with_context(query: str, session_id: str) -> dict:
    """컨텍스트가 포함된 LangGraph 실행"""
    from app.graph import run_graph

    # 임시로 기존 run_graph 사용하되, 세션 ID 전달 방법 개선 필요
    # TODO: run_graph 함수가 session_id를 직접 받도록 수정
    return run_graph(query, verbose=False)

@router.get("/session/{session_id}/history")
async def get_session_history(session_id: str):
    """세션별 대화 히스토리 조회"""
    conversation_memory = get_conversation_memory()
    session_manager = get_session_manager()

    # 세션 검증
    user_context = session_manager.get_session(session_id)
    if not user_context:
        return {"error": "세션을 찾을 수 없습니다.", "session_id": session_id}

    # 대화 히스토리 조회
    history = conversation_memory.get_recent_history(session_id, count=10)

    return {
        "session_id": session_id,
        "user_context": {
            "total_interactions": user_context.total_interactions,
            "frequent_intents": user_context.frequent_intents,
            "avg_response_quality": user_context.avg_response_quality,
            "last_active": user_context.last_active.isoformat()
        },
        "conversation_history": [turn.to_dict() for turn in history]
    }

@router.post("/session/new")
async def create_new_session():
    """새 세션 생성"""
    session_manager = get_session_manager()
    session_id = session_manager.create_session()

    return {
        "session_id": session_id,
        "message": "새 세션이 생성되었습니다."
    }
