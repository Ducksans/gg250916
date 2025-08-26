#!/usr/bin/env python3
"""
금강 2.0 - 간단 테스트 서버
연결 테스트 및 기본 기능 확인용
"""

import os
import sys
import json
import asyncio
from datetime import datetime
from typing import Dict, Any, Optional, List
from pathlib import Path

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv

# 환경 변수 로드
load_dotenv()

# FastAPI 앱 생성
app = FastAPI(
    title="금강 2.0 테스트 서버",
    description="프론트엔드 연결 테스트용 간단 서버",
    version="1.0.0"
)

# CORS 설정 - 모든 origin 허용 (개발용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 모든 origin 허용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ========================
# Pydantic 모델 정의
# ========================

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = "default"
    user_id: Optional[str] = "default_user"

class ChatResponse(BaseModel):
    response: str
    message: str
    metadata: Optional[Dict[str, Any]] = None
    timestamp: str = None
    session_id: str = "default"

class MemoryStatus(BaseModel):
    total_memories: int
    active_memories: int
    memory_layers: Dict[str, int]
    last_updated: str
    status: str

class SystemStatus(BaseModel):
    status: str
    backend_version: str
    memory_system: str
    api_status: str
    timestamp: str

# ========================
# 메모리 저장소 (임시)
# ========================
memory_store = {
    "conversations": [],
    "memories": [],
    "stats": {
        "total_messages": 0,
        "total_memories": 0,
        "sessions": {}
    }
}

# ========================
# 기본 라우트
# ========================

@app.get("/")
async def root():
    """루트 엔드포인트"""
    return {
        "message": "금강 2.0 테스트 서버가 실행 중입니다! 🧠",
        "status": "active",
        "endpoints": {
            "chat": "/ask",
            "health": "/health",
            "status": "/status",
            "memory": "/memory/status",
            "docs": "/docs"
        }
    }

@app.get("/health")
async def health_check():
    """헬스 체크 엔드포인트"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.get("/status")
async def get_status():
    """시스템 상태 확인"""
    return SystemStatus(
        status="operational",
        backend_version="2.0.0-test",
        memory_system="4-layer temporal",
        api_status="connected",
        timestamp=datetime.now().isoformat()
    )

# ========================
# 채팅 엔드포인트
# ========================

@app.post("/ask")
async def chat(request: ChatRequest):
    """메인 채팅 엔드포인트"""
    try:
        # 통계 업데이트
        memory_store["stats"]["total_messages"] += 1

        # 세션별 메시지 카운트
        if request.session_id not in memory_store["stats"]["sessions"]:
            memory_store["stats"]["sessions"][request.session_id] = 0
        memory_store["stats"]["sessions"][request.session_id] += 1

        # 대화 저장
        conversation = {
            "session_id": request.session_id,
            "user_id": request.user_id,
            "message": request.message,
            "timestamp": datetime.now().isoformat()
        }
        memory_store["conversations"].append(conversation)

        # 간단한 응답 생성
        response_text = generate_response(request.message)

        # 응답 객체 생성
        response = ChatResponse(
            response=response_text,
            message=response_text,
            metadata={
                "model": "test-model",
                "tokens": len(request.message.split()),
                "processingTime": 100,
                "memoryUsed": True,
                "memoryType": "temporal",
                "confidence": 0.95,
                "session_messages": memory_store["stats"]["sessions"].get(request.session_id, 0)
            },
            timestamp=datetime.now().isoformat(),
            session_id=request.session_id
        )

        return response

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat")
async def chat_alias(request: ChatRequest):
    """채팅 엔드포인트 별칭"""
    return await chat(request)

@app.post("/api/chat")
async def api_chat(request: ChatRequest):
    """API prefix가 있는 채팅 엔드포인트 - 프론트엔드 호환용"""
    return await chat(request)

# ========================
# 메모리 관련 엔드포인트
# ========================

@app.get("/memory/status")
async def get_memory_status():
    """메모리 시스템 상태"""
    return MemoryStatus(
        total_memories=len(memory_store["memories"]),
        active_memories=len(memory_store["conversations"]),
        memory_layers={
            "sensory": 10,
            "working": 25,
            "episodic": 150,
            "semantic": 500,
            "procedural": 100
        },
        last_updated=datetime.now().isoformat(),
        status="active"
    )

@app.get("/memory/profile/{user_id}")
async def get_user_profile(user_id: str):
    """사용자 프로필 조회"""
    user_conversations = [
        c for c in memory_store["conversations"]
        if c.get("user_id") == user_id
    ]

    return {
        "user_id": user_id,
        "total_interactions": len(user_conversations),
        "first_interaction": user_conversations[0]["timestamp"] if user_conversations else None,
        "last_interaction": user_conversations[-1]["timestamp"] if user_conversations else None,
        "preferences": {
            "language": "ko",
            "style": "friendly",
            "topics": ["AI", "programming", "philosophy"]
        }
    }

# ========================
# WebSocket 엔드포인트
# ========================

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket 연결 처리"""
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Echo back with timestamp
            response = {
                "type": "message",
                "data": data,
                "timestamp": datetime.now().isoformat()
            }
            await websocket.send_json(response)
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# ========================
# 헬퍼 함수
# ========================

def generate_response(message: str) -> str:
    """간단한 응답 생성 로직"""
    message_lower = message.lower()

    # 특정 키워드에 대한 응답
    if "안녕" in message_lower or "hello" in message_lower:
        return "안녕하세요! 저는 금강 AI입니다. 무엇을 도와드릴까요? 🤖"

    elif "코드" in message_lower or "code" in message_lower:
        return """네, 코드 작성을 도와드리겠습니다! 다음은 예제입니다:

```python
def hello_world():
    print("Hello, 금강 2.0!")
    return "코드 실행 완료"

# 실행
result = hello_world()
print(result)
```

이런 식으로 코드를 작성할 수 있습니다. 어떤 언어로 작성하시겠습니까?"""

    elif "메모리" in message_lower or "memory" in message_lower:
        return f"""금강의 5계층 메모리 시스템 상태:

• 감각 메모리: 활성
• 작업 메모리: {memory_store['stats']['total_messages']} 메시지 처리
• 에피소드 메모리: {len(memory_store['conversations'])} 대화 저장
• 의미 메모리: 지식베이스 연결
• 절차 메모리: 학습된 패턴 적용 중

현재 세션에서 {memory_store['stats']['sessions'].get('default', 0)}개의 메시지를 처리했습니다."""

    elif "도움" in message_lower or "help" in message_lower:
        return """제가 도와드릴 수 있는 것들:

• 💬 일반 대화 및 질문 답변
• 🔧 코드 작성 및 디버깅
• 📊 데이터 분석 및 시각화
• 🧠 5계층 메모리 시스템 활용
• ⚡ 실시간 학습 및 적응

무엇을 도와드릴까요?"""

    else:
        # 기본 응답
        return f"""입력하신 메시지를 받았습니다: "{message}"

금강 AI가 생각 중입니다... 🤔

[테스트 모드] 이것은 테스트 서버의 응답입니다.
실제 AI 처리를 위해서는 OpenAI API 연결이 필요합니다.

현재 세션 통계:
- 총 메시지: {memory_store['stats']['total_messages']}
- 저장된 대화: {len(memory_store['conversations'])}"""

# ========================
# 서버 실행
# ========================

if __name__ == "__main__":
    import uvicorn

    print("=" * 50)
    print("🧠 금강 2.0 테스트 서버 시작")
    print("=" * 50)
    print("📡 서버 주소: http://localhost:8001")
    print("📚 API 문서: http://localhost:8001/docs")
    print("🔄 자동 리로드: 활성화")
    print("=" * 50)

    uvicorn.run(
        "test_server:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )
