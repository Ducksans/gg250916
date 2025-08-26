#!/bin/bash

echo "🚀 [1단계] 금강 LangGraph 상태 표시 자동 구성 시작..."

# 경로 설정
BACKEND_DIR="./backend/app"
ROUTES_DIR="$BACKEND_DIR/routes"
FRONTEND_COMPONENTS="./frontend/src/components"

# 1. Python 상태 노드 및 FastAPI API 라우터 생성
echo "📦 FastAPI 상태 노드 및 라우터 생성..."

mkdir -p "$ROUTES_DIR"

# 1-1. graph.py
cat <<EOF > "$BACKEND_DIR/graph.py"
from langgraph.graph import StateGraph
def build_graph():
    state_graph = StateGraph()
    def reflect_status(state):
        return {"status": state.get("status", "알 수 없음")}
    state_graph.add_node("reflect", reflect_status)
    state_graph.set_entry_point("reflect")
    state_graph.set_finish_point("reflect")
    return state_graph.compile()
EOF

# 1-2. routes/status.py
cat <<EOF > "$ROUTES_DIR/status.py"
from fastapi import APIRouter
from app.graph import build_graph

router = APIRouter()

@router.get("/status")
def get_status():
    graph = build_graph()
    result = graph.invoke({"status": "자기 인식 완료"})
    return result
EOF

# 1-3. main.py에 라우터 연결 (필요 시 덮어쓰기)
MAIN_PY="./backend/main.py"
if ! grep -q "include_router" "$MAIN_PY"; then
cat <<EOF > "$MAIN_PY"
from fastapi import FastAPI
from app.routes import status

app = FastAPI()
app.include_router(status.router)
EOF
fi

# 2. React 컴포넌트 생성
echo "🧩 React 상태 표시 컴포넌트 생성..."

mkdir -p "$FRONTEND_COMPONENTS"

cat <<EOF > "$FRONTEND_COMPONENTS/StatusDisplay.tsx"
import React, { useEffect, useState } from 'react'

const StatusDisplay = () => {
  const [status, setStatus] = useState("불러오는 중...")

  useEffect(() => {
    fetch("http://localhost:8000/status")
      .then(res => res.json())
      .then(data => setStatus(data.status))
  }, [])

  return (
    <div className="p-4 border rounded-xl">
      <h2 className="text-xl font-bold">🧠 금강 상태</h2>
      <p>{status}</p>
    </div>
  )
}

export default StatusDisplay
EOF

# 완료
echo "✅ 1단계 구성 완료: LangGraph 상태 → FastAPI → React 연결 완료"
echo "🖥️  다음 단계:"
echo "  1. 백엔드 실행: uvicorn main:app --reload --port 8000 --host 0.0.0.0"
echo "  2. 프론트엔드 실행 후 <StatusDisplay /> 컴포넌트 불러오기"
