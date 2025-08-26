"""
금강 2.0 통합 백엔드 서버
WebSocket + REST API + 실시간 모니터링
"""

import os
import sys
import json
import asyncio
import logging
from datetime import datetime
from typing import Dict, List, Set, Optional, Any
from pathlib import Path
import random
import time

# FastAPI 및 WebSocket
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse
from pydantic import BaseModel, Field
import uvicorn

# 환경 설정
from dotenv import load_dotenv

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('unified_backend.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# 환경 변수 로드
load_dotenv()

# ===========================================
# 데이터 모델
# ===========================================

class SystemStatus(BaseModel):
    """시스템 상태 모델"""
    cpu_usage: float = Field(default=0.0)
    memory_usage: float = Field(default=0.0)
    gpu_usage: float = Field(default=0.0)
    network_throughput: float = Field(default=0.0)
    active_connections: int = Field(default=0)
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())

class MemoryData(BaseModel):
    """메모리 데이터 모델"""
    layer: str
    capacity: int
    current_size: int
    access_frequency: float
    last_accessed: str
    data: Dict[str, Any] = Field(default_factory=dict)

class SystemComponent(BaseModel):
    """시스템 컴포넌트 모델"""
    id: str
    name: str
    type: str
    status: str
    cpu_usage: float = 0.0
    memory_usage: float = 0.0
    connections: List[str] = Field(default_factory=list)
    position: Dict[str, float] = Field(default_factory=dict)

class ChatMessage(BaseModel):
    """채팅 메시지 모델"""
    role: str
    content: str
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())
    metadata: Dict[str, Any] = Field(default_factory=dict)

class ProcessingRequest(BaseModel):
    """처리 요청 모델"""
    query: str
    context: Optional[Dict[str, Any]] = None
    user_id: str = "default_user"
    session_id: Optional[str] = None

# ===========================================
# 메모리 시스템 시뮬레이션
# ===========================================

class TemporalMemorySystem:
    """시간적 메모리 시스템 (시뮬레이션)"""

    def __init__(self):
        self.layers = {
            "sensory": {
                "capacity": 100,
                "duration": 0.5,
                "current_size": 0,
                "data": []
            },
            "short_term": {
                "capacity": 7,
                "duration": 30,
                "current_size": 0,
                "data": []
            },
            "working": {
                "capacity": 4,
                "duration": 60,
                "current_size": 0,
                "data": []
            },
            "long_term": {
                "capacity": 10000,
                "duration": 999999,  # Very large number instead of infinity for JSON compatibility
                "current_size": 0,
                "data": []
            },
            "meta": {
                "capacity": 1000,
                "duration": 999999,  # Very large number instead of infinity for JSON compatibility
                "current_size": 0,
                "data": []
            }
        }
        self.access_patterns = {}
        self.user_profiles = {}

    def store_memory(self, layer: str, content: Any) -> bool:
        """메모리 저장"""
        if layer in self.layers:
            layer_data = self.layers[layer]
            if layer_data["current_size"] < layer_data["capacity"]:
                layer_data["data"].append({
                    "content": content,
                    "timestamp": datetime.now().isoformat(),
                    "access_count": 0
                })
                layer_data["current_size"] += 1
                return True
        return False

    def retrieve_memory(self, layer: str, query: str) -> List[Any]:
        """메모리 검색"""
        if layer in self.layers:
            # 간단한 검색 시뮬레이션
            results = []
            for item in self.layers[layer]["data"]:
                if query.lower() in str(item["content"]).lower():
                    item["access_count"] += 1
                    results.append(item)
            return results
        return []

    def get_stats(self) -> Dict[str, Any]:
        """메모리 통계"""
        stats = {
            "layers": {},
            "total_memories": 0,
            "access_patterns": self.access_patterns
        }

        for layer_name, layer_data in self.layers.items():
            stats["layers"][layer_name] = {
                "capacity": layer_data["capacity"],
                "current_size": layer_data["current_size"],
                "usage_rate": layer_data["current_size"] / layer_data["capacity"] if layer_data["capacity"] > 0 else 0,
                "duration": layer_data["duration"]
            }
            stats["total_memories"] += layer_data["current_size"]

        return stats

    def consolidate_memories(self):
        """메모리 통합 (시뮬레이션)"""
        # 단기 메모리를 장기 메모리로 이동
        if self.layers["short_term"]["current_size"] > 5:
            # 가장 오래된 메모리를 장기 메모리로 이동
            if self.layers["short_term"]["data"]:
                memory = self.layers["short_term"]["data"].pop(0)
                self.layers["short_term"]["current_size"] -= 1

                if self.layers["long_term"]["current_size"] < self.layers["long_term"]["capacity"]:
                    self.layers["long_term"]["data"].append(memory)
                    self.layers["long_term"]["current_size"] += 1
                    logger.info(f"Memory consolidated: {memory['content'][:50]}...")

# ===========================================
# 통합 백엔드 서버
# ===========================================

class UnifiedBackend:
    """통합 백엔드 관리자"""

    def __init__(self):
        self.app = FastAPI(
            title="금강 2.0 통합 백엔드",
            description="WebSocket + REST API + 실시간 모니터링",
            version="2.0.0"
        )

        # CORS 설정 (WebSocket 지원 포함)
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
            expose_headers=["*"],
        )

        # WebSocket 연결 관리
        self.active_connections: Set[WebSocket] = set()
        self.connection_data: Dict[WebSocket, Dict] = {}

        # 시스템 상태
        self.system_status = SystemStatus()
        self.memory_system = TemporalMemorySystem()
        self.components: Dict[str, SystemComponent] = self._initialize_components()

        # 메시지 히스토리
        self.message_history: List[ChatMessage] = []
        self.max_history = 100

        # 백그라운드 태스크
        self.background_tasks = []

        # 라우트 설정
        self._setup_routes()

        logger.info("통합 백엔드 초기화 완료")

    def _initialize_components(self) -> Dict[str, SystemComponent]:
        """시스템 컴포넌트 초기화"""
        components = {
            "core": SystemComponent(
                id="core",
                name="Core System",
                type="core",
                status="active",
                position={"x": 0, "y": 0, "z": 0}
            ),
            "memory": SystemComponent(
                id="memory",
                name="Memory System",
                type="memory",
                status="active",
                position={"x": 2, "y": 0, "z": 0}
            ),
            "processor": SystemComponent(
                id="processor",
                name="Processor",
                type="processor",
                status="active",
                position={"x": -2, "y": 0, "z": 0}
            ),
            "network": SystemComponent(
                id="network",
                name="Network Manager",
                type="network",
                status="active",
                position={"x": 0, "y": 2, "z": 0}
            ),
            "storage": SystemComponent(
                id="storage",
                name="Storage System",
                type="storage",
                status="active",
                position={"x": 0, "y": -2, "z": 0}
            )
        }

        # 컴포넌트 간 연결 설정
        components["core"].connections = ["memory", "processor", "network", "storage"]
        components["memory"].connections = ["core", "processor"]
        components["processor"].connections = ["core", "memory"]
        components["network"].connections = ["core"]
        components["storage"].connections = ["core"]

        return components

    def _setup_routes(self):
        """라우트 설정"""

        # ===========================================
        # WebSocket 엔드포인트
        # ===========================================

        @self.app.websocket("/ws")
        async def websocket_endpoint(websocket: WebSocket):
            await self.connect(websocket)
            try:
                while True:
                    data = await websocket.receive_text()
                    await self.handle_websocket_message(websocket, data)
            except WebSocketDisconnect:
                await self.disconnect(websocket)
            except Exception as e:
                logger.error(f"WebSocket error: {e}")
                await self.disconnect(websocket)

        # ===========================================
        # REST API 엔드포인트
        # ===========================================

        @self.app.get("/")
        async def root():
            return {
                "name": "금강 2.0 통합 백엔드",
                "version": "2.0.0",
                "status": "active",
                "endpoints": {
                    "websocket": "/ws",
                    "status": "/api/status",
                    "memory": "/api/memory",
                    "components": "/api/components",
                    "process": "/api/process"
                }
            }

        @self.app.get("/api/status")
        async def get_status():
            """시스템 상태 조회"""
            self._update_system_status()
            return {
                "system": self.system_status.dict(),
                "memory": self.memory_system.get_stats(),
                "connections": len(self.active_connections),
                "components": len(self.components)
            }

        @self.app.get("/api/memory")
        async def get_memory_status():
            """메모리 시스템 상태"""
            return self.memory_system.get_stats()

        @self.app.post("/api/memory/store")
        async def store_memory(layer: str, content: str):
            """메모리 저장"""
            success = self.memory_system.store_memory(layer, content)
            if success:
                await self.broadcast({
                    "type": "memory_update",
                    "layer": layer,
                    "action": "store",
                    "success": True
                })
                return {"success": True, "message": "Memory stored"}
            else:
                raise HTTPException(status_code=400, detail="Memory storage failed")

        @self.app.get("/api/memory/retrieve")
        async def retrieve_memory(layer: str, query: str):
            """메모리 검색"""
            results = self.memory_system.retrieve_memory(layer, query)
            return {"results": results, "count": len(results)}

        @self.app.get("/api/components")
        async def get_components():
            """시스템 컴포넌트 조회"""
            return [comp.dict() for comp in self.components.values()]

        @self.app.get("/api/components/{component_id}")
        async def get_component(component_id: str):
            """특정 컴포넌트 조회"""
            if component_id in self.components:
                return self.components[component_id].dict()
            else:
                raise HTTPException(status_code=404, detail="Component not found")

        @self.app.post("/api/process")
        async def process_request(request: ProcessingRequest):
            """처리 요청"""
            # 메시지 저장
            message = ChatMessage(
                role="user",
                content=request.query,
                metadata={"user_id": request.user_id}
            )
            self.message_history.append(message)

            # 메모리 시스템에 저장
            self.memory_system.store_memory("short_term", request.query)

            # 시뮬레이션된 응답 생성
            response_content = await self._generate_response(request.query)

            response = ChatMessage(
                role="assistant",
                content=response_content,
                metadata={"processing_time": 0.5}
            )
            self.message_history.append(response)

            # WebSocket으로 브로드캐스트
            await self.broadcast({
                "type": "processing_complete",
                "request": request.dict(),
                "response": response.dict()
            })

            return response.dict()

        @self.app.get("/api/messages")
        async def get_messages(limit: int = 50):
            """메시지 히스토리 조회"""
            messages = self.message_history[-limit:]
            return [msg.dict() for msg in messages]

        @self.app.post("/api/consolidate")
        async def consolidate_memories():
            """메모리 통합 트리거"""
            self.memory_system.consolidate_memories()
            return {"status": "success", "message": "Memory consolidation triggered"}

        @self.app.get("/memory/status")
        async def get_memory_status_legacy():
            """메모리 상태 (레거시 경로)"""
            return self.memory_system.get_stats()

        @self.app.get("/health")
        async def health_check():
            """헬스 체크"""
            return {
                "status": "healthy",
                "timestamp": datetime.now().isoformat(),
                "active_connections": len(self.active_connections)
            }

    async def connect(self, websocket: WebSocket):
        """WebSocket 연결"""
        await websocket.accept()
        self.active_connections.add(websocket)
        self.connection_data[websocket] = {
            "connected_at": datetime.now().isoformat(),
            "id": f"ws_{len(self.active_connections)}"
        }

        # 연결 알림
        await self.broadcast({
            "type": "connection",
            "action": "connected",
            "total_connections": len(self.active_connections)
        }, exclude=websocket)

        # 초기 데이터 전송
        await websocket.send_json({
            "type": "initial_data",
            "system_status": self.system_status.dict(),
            "memory_stats": self.memory_system.get_stats(),
            "components": [comp.dict() for comp in self.components.values()]
        })

        logger.info(f"WebSocket connected: {self.connection_data[websocket]['id']}")

    async def disconnect(self, websocket: WebSocket):
        """WebSocket 연결 해제"""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

            if websocket in self.connection_data:
                ws_id = self.connection_data[websocket]['id']
                del self.connection_data[websocket]
                logger.info(f"WebSocket disconnected: {ws_id}")

            # 연결 해제 알림
            await self.broadcast({
                "type": "connection",
                "action": "disconnected",
                "total_connections": len(self.active_connections)
            })

    async def handle_websocket_message(self, websocket: WebSocket, message: str):
        """WebSocket 메시지 처리"""
        try:
            data = json.loads(message)
            message_type = data.get("type", "unknown")

            if message_type == "ping":
                await websocket.send_json({"type": "pong"})

            elif message_type == "get_status":
                self._update_system_status()
                await websocket.send_json({
                    "type": "status_update",
                    "data": self.system_status.dict()
                })

            elif message_type == "get_memory":
                await websocket.send_json({
                    "type": "memory_update",
                    "data": self.memory_system.get_stats()
                })

            elif message_type == "get_components":
                await websocket.send_json({
                    "type": "components_update",
                    "data": [comp.dict() for comp in self.components.values()]
                })

            elif message_type == "process":
                query = data.get("query", "")
                response = await self._generate_response(query)
                await websocket.send_json({
                    "type": "process_response",
                    "query": query,
                    "response": response
                })

            elif message_type == "update_component":
                component_id = data.get("component_id")
                updates = data.get("updates", {})
                if component_id in self.components:
                    for key, value in updates.items():
                        if hasattr(self.components[component_id], key):
                            setattr(self.components[component_id], key, value)

                    await self.broadcast({
                        "type": "component_updated",
                        "component": self.components[component_id].dict()
                    })

            else:
                await websocket.send_json({
                    "type": "error",
                    "message": f"Unknown message type: {message_type}"
                })

        except json.JSONDecodeError:
            await websocket.send_json({
                "type": "error",
                "message": "Invalid JSON format"
            })
        except Exception as e:
            logger.error(f"Error handling WebSocket message: {e}")
            await websocket.send_json({
                "type": "error",
                "message": str(e)
            })

    async def broadcast(self, message: dict, exclude: Optional[WebSocket] = None):
        """모든 연결된 클라이언트에 메시지 브로드캐스트"""
        disconnected = set()
        for connection in self.active_connections:
            if connection != exclude:
                try:
                    await connection.send_json(message)
                except:
                    disconnected.add(connection)

        # 연결이 끊긴 클라이언트 제거
        for conn in disconnected:
            await self.disconnect(conn)

    def _update_system_status(self):
        """시스템 상태 업데이트 (시뮬레이션)"""
        self.system_status.cpu_usage = random.uniform(20, 80)
        self.system_status.memory_usage = random.uniform(30, 70)
        self.system_status.gpu_usage = random.uniform(10, 60)
        self.system_status.network_throughput = random.uniform(100, 1000)
        self.system_status.active_connections = len(self.active_connections)
        self.system_status.timestamp = datetime.now().isoformat()

        # 컴포넌트 상태 업데이트
        for comp in self.components.values():
            comp.cpu_usage = random.uniform(10, 50)
            comp.memory_usage = random.uniform(20, 60)

    async def _generate_response(self, query: str) -> str:
        """응답 생성 (시뮬레이션)"""
        # 실제 구현에서는 LLM이나 처리 로직 호출
        responses = [
            f"처리 완료: {query}에 대한 분석 결과입니다.",
            f"금강 시스템이 '{query}'를 성공적으로 처리했습니다.",
            f"메모리 시스템에서 '{query}' 관련 정보를 검색했습니다.",
            f"'{query}'에 대한 최적화된 응답을 생성했습니다."
        ]

        # 시뮬레이션 지연
        await asyncio.sleep(0.5)

        return random.choice(responses)

    async def start_background_tasks(self):
        """백그라운드 태스크 시작"""

        async def monitor_system():
            """시스템 모니터링 태스크"""
            while True:
                try:
                    self._update_system_status()
                    await self.broadcast({
                        "type": "status_update",
                        "data": self.system_status.dict()
                    })
                    await asyncio.sleep(5)  # 5초마다 업데이트
                except Exception as e:
                    logger.error(f"Monitoring error: {e}")
                    await asyncio.sleep(5)

        async def consolidate_memories():
            """메모리 통합 태스크"""
            while True:
                try:
                    await asyncio.sleep(60)  # 1분마다 실행
                    self.memory_system.consolidate_memories()
                    await self.broadcast({
                        "type": "memory_consolidated",
                        "stats": self.memory_system.get_stats()
                    })
                except Exception as e:
                    logger.error(f"Memory consolidation error: {e}")
                    await asyncio.sleep(60)

        async def cleanup_history():
            """메시지 히스토리 정리"""
            while True:
                try:
                    await asyncio.sleep(300)  # 5분마다 실행
                    if len(self.message_history) > self.max_history:
                        self.message_history = self.message_history[-self.max_history:]
                        logger.info(f"Cleaned message history, kept last {self.max_history} messages")
                except Exception as e:
                    logger.error(f"History cleanup error: {e}")
                    await asyncio.sleep(300)

        # 태스크 생성 및 저장
        self.background_tasks = [
            asyncio.create_task(monitor_system()),
            asyncio.create_task(consolidate_memories()),
            asyncio.create_task(cleanup_history())
        ]

        logger.info("Background tasks started")

    async def stop_background_tasks(self):
        """백그라운드 태스크 중지"""
        for task in self.background_tasks:
            task.cancel()

        await asyncio.gather(*self.background_tasks, return_exceptions=True)
        logger.info("Background tasks stopped")

    def get_app(self) -> FastAPI:
        """FastAPI 앱 반환"""
        return self.app

# ===========================================
# 메인 실행
# ===========================================

backend = UnifiedBackend()
app = backend.get_app()

@app.on_event("startup")
async def startup_event():
    """서버 시작 이벤트"""
    logger.info("금강 2.0 통합 백엔드 시작")
    await backend.start_background_tasks()

@app.on_event("shutdown")
async def shutdown_event():
    """서버 종료 이벤트"""
    logger.info("금강 2.0 통합 백엔드 종료 중...")
    await backend.stop_background_tasks()

    # 모든 WebSocket 연결 종료
    connections = list(backend.active_connections)
    for ws in connections:
        await backend.disconnect(ws)

    logger.info("금강 2.0 통합 백엔드 종료 완료")

if __name__ == "__main__":
    # 서버 실행
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8001,
        log_level="info",
        access_log=True
    )
