"""
금강 2.0 대시보드 API

프로젝트 전체 상태 모니터링 및 제어를 위한 API 엔드포인트
실시간 WebSocket 통신 및 Zed 에디터 통합 지원

Author: Gumgang AI Team
Version: 2.0
"""

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional, Set
from datetime import datetime, timedelta
import asyncio
import json
import logging
import psutil
import os
import subprocess
from pathlib import Path

# 시스템 매니저 import
from app.core.system_manager import get_system_manager

logger = logging.getLogger(__name__)

# 라우터 생성
router = APIRouter(
    prefix="/dashboard",
    tags=["dashboard"],
    responses={404: {"description": "Not found"}},
)

# WebSocket 연결 관리
class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"WebSocket 연결 추가: 총 {len(self.active_connections)}개")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        logger.info(f"WebSocket 연결 해제: 총 {len(self.active_connections)}개")

    async def broadcast(self, message: dict):
        """모든 연결된 클라이언트에 메시지 브로드캐스트"""
        if self.active_connections:
            message_str = json.dumps(message)
            for connection in self.active_connections:
                try:
                    await connection.send_text(message_str)
                except Exception as e:
                    logger.error(f"브로드캐스트 실패: {e}")

manager = ConnectionManager()

# ==================== Pydantic 모델 ====================

class SystemStatus(BaseModel):
    """시스템 상태 모델"""
    name: str
    status: str = Field(..., description="running | stopped | error | initializing")
    health: int = Field(..., ge=0, le=100, description="시스템 건강도 (0-100)")
    last_active: datetime
    metrics: Dict[str, Any] = {}

class ProjectStatus(BaseModel):
    """프로젝트 전체 상태 모델"""
    backend: Dict[str, Any]
    frontend: Dict[str, Any]
    systems: List[SystemStatus]
    tasks: List[Dict[str, Any]]
    resources: Dict[str, Any]
    timestamp: datetime = Field(default_factory=datetime.now)

class TaskCreate(BaseModel):
    """작업 생성 모델"""
    title: str
    description: str
    type: str = Field(..., description="refactoring | feature | bugfix | test | docs")
    priority: int = Field(1, ge=1, le=5)
    assigned_system: Optional[str] = None

class TaskUpdate(BaseModel):
    """작업 업데이트 모델"""
    status: Optional[str] = Field(None, description="pending | in_progress | completed | failed")
    progress: Optional[int] = Field(None, ge=0, le=100)
    result: Optional[Dict[str, Any]] = None

class ZedCommand(BaseModel):
    """Zed 에디터 명령 모델"""
    action: str = Field(..., description="open | edit | save | format | search | replace")
    file_path: Optional[str] = None
    content: Optional[str] = None
    line_start: Optional[int] = None
    line_end: Optional[int] = None
    search_term: Optional[str] = None
    replace_with: Optional[str] = None

class SystemCommand(BaseModel):
    """시스템 제어 명령 모델"""
    target: str = Field(..., description="대상 시스템 (temporal_memory, meta_cognitive 등)")
    action: str = Field(..., description="start | stop | restart | reset | test")
    params: Optional[Dict[str, Any]] = {}

# ==================== 유틸리티 함수 ====================

async def get_system_health(system_name: str) -> Dict[str, Any]:
    """개별 시스템 건강 상태 확인"""
    try:
        manager = get_system_manager()
        system = getattr(manager, system_name, None)

        if not system:
            return {"status": "not_found", "health": 0}

        # 시스템별 건강 체크 로직
        health_score = 100
        issues = []

        # 메모리 사용량 체크
        process = psutil.Process()
        memory_percent = process.memory_percent()
        if memory_percent > 80:
            health_score -= 30
            issues.append(f"높은 메모리 사용량: {memory_percent:.1f}%")

        # CPU 사용량 체크
        cpu_percent = process.cpu_percent(interval=0.1)
        if cpu_percent > 90:
            health_score -= 20
            issues.append(f"높은 CPU 사용량: {cpu_percent:.1f}%")

        return {
            "status": "running" if health_score > 50 else "degraded",
            "health": health_score,
            "issues": issues,
            "metrics": {
                "memory_mb": process.memory_info().rss / 1024 / 1024,
                "cpu_percent": cpu_percent,
                "threads": process.num_threads()
            }
        }

    except Exception as e:
        logger.error(f"시스템 건강 체크 실패 ({system_name}): {e}")
        return {"status": "error", "health": 0, "error": str(e)}

async def get_project_metrics() -> Dict[str, Any]:
    """프로젝트 전체 메트릭 수집"""
    try:
        # 파일 시스템 통계
        project_path = Path("/home/duksan/바탕화면/gumgang_0_5")

        # Python 파일 수
        py_files = list(project_path.glob("**/*.py"))
        # JavaScript/TypeScript 파일 수
        js_files = list(project_path.glob("**/*.{js,jsx,ts,tsx}"))

        # 코드 라인 수 계산
        total_lines = 0
        for file in py_files + js_files:
            try:
                with open(file, 'r', encoding='utf-8') as f:
                    total_lines += len(f.readlines())
            except:
                pass

        return {
            "files": {
                "python": len(py_files),
                "javascript": len(js_files),
                "total": len(py_files) + len(js_files)
            },
            "lines_of_code": total_lines,
            "last_updated": datetime.now().isoformat()
        }

    except Exception as e:
        logger.error(f"프로젝트 메트릭 수집 실패: {e}")
        return {}

# ==================== 작업 관리 ====================

# 메모리 내 작업 저장소 (실제로는 DB 사용 권장)
tasks_db: Dict[str, Dict[str, Any]] = {}
task_counter = 0

# ==================== API 엔드포인트 ====================

@router.get("/status", response_model=ProjectStatus)
async def get_project_status():
    """프로젝트 전체 상태 조회"""
    try:
        manager = get_system_manager()

        # 백엔드 상태
        backend_status = {
            "status": "running",
            "health_check": await manager.health_check(),
            "uptime": str(datetime.now() - manager.start_time) if hasattr(manager, 'start_time') else "N/A",
            "active_systems": {
                "temporal_memory": bool(manager.temporal_memory),
                "meta_cognitive": bool(manager.meta_cognitive),
                "creative_engine": bool(manager.creative_engine),
                "dream_system": bool(manager.dream_system),
                "empathy_system": bool(manager.empathy_system)
            }
        }

        # 프론트엔드 상태 (프로세스 체크)
        frontend_port = int(os.getenv("FRONTEND_PORT", "3000"))
        frontend_status = {
            "status": "unknown",
            "dev_server": False,
            "port": frontend_port
        }

        # 프론트엔드 개발 서버 체크
        try:
            result = subprocess.run(
                ["lsof", "-i", f":{frontend_port}"],
                capture_output=True,
                text=True,
                timeout=2
            )
            if result.returncode == 0:
                frontend_status["status"] = "running"
                frontend_status["dev_server"] = True
        except:
            pass

        # 시스템별 상태
        systems = []
        for system_name in ["temporal_memory", "meta_cognitive", "creative_engine", "dream_system", "empathy_system"]:
            health = await get_system_health(system_name)
            systems.append(SystemStatus(
                name=system_name,
                status=health["status"],
                health=health["health"],
                last_active=datetime.now(),
                metrics=health.get("metrics", {})
            ))

        # 활성 작업 목록
        active_tasks = [
            task for task in tasks_db.values()
            if task.get("status") in ["pending", "in_progress"]
        ]

        # 시스템 리소스
        resources = {
            "cpu": {
                "percent": psutil.cpu_percent(interval=0.1),
                "cores": psutil.cpu_count()
            },
            "memory": {
                "total_gb": psutil.virtual_memory().total / (1024**3),
                "used_gb": psutil.virtual_memory().used / (1024**3),
                "percent": psutil.virtual_memory().percent
            },
            "disk": {
                "total_gb": psutil.disk_usage('/').total / (1024**3),
                "used_gb": psutil.disk_usage('/').used / (1024**3),
                "percent": psutil.disk_usage('/').percent
            }
        }

        status = ProjectStatus(
            backend=backend_status,
            frontend=frontend_status,
            systems=systems,
            tasks=active_tasks,
            resources=resources
        )

        # WebSocket으로 브로드캐스트
        await manager.broadcast({
            "type": "status_update",
            "data": status.dict()
        })

        return status

    except Exception as e:
        logger.error(f"프로젝트 상태 조회 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/metrics")
async def get_metrics():
    """프로젝트 메트릭 조회"""
    try:
        metrics = await get_project_metrics()
        return JSONResponse(content=metrics)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== 작업 관리 API ====================

@router.get("/tasks")
async def get_tasks(status: Optional[str] = None, limit: int = 50):
    """작업 목록 조회"""
    tasks = list(tasks_db.values())

    if status:
        tasks = [t for t in tasks if t.get("status") == status]

    # 최신 순으로 정렬
    tasks.sort(key=lambda x: x.get("created_at", ""), reverse=True)

    return tasks[:limit]

@router.post("/tasks")
async def create_task(task: TaskCreate):
    """새 작업 생성"""
    global task_counter

    task_counter += 1
    task_id = f"task_{task_counter:04d}"

    new_task = {
        "id": task_id,
        "title": task.title,
        "description": task.description,
        "type": task.type,
        "priority": task.priority,
        "assigned_system": task.assigned_system,
        "status": "pending",
        "progress": 0,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    }

    tasks_db[task_id] = new_task

    # WebSocket 알림
    await manager.broadcast({
        "type": "task_created",
        "data": new_task
    })

    return new_task

@router.patch("/tasks/{task_id}")
async def update_task(task_id: str, update: TaskUpdate):
    """작업 상태 업데이트"""
    if task_id not in tasks_db:
        raise HTTPException(status_code=404, detail="작업을 찾을 수 없습니다")

    task = tasks_db[task_id]

    if update.status:
        task["status"] = update.status
    if update.progress is not None:
        task["progress"] = update.progress
    if update.result:
        task["result"] = update.result

    task["updated_at"] = datetime.now().isoformat()

    # WebSocket 알림
    await manager.broadcast({
        "type": "task_updated",
        "data": task
    })

    return task

@router.delete("/tasks/{task_id}")
async def delete_task(task_id: str):
    """작업 삭제"""
    if task_id not in tasks_db:
        raise HTTPException(status_code=404, detail="작업을 찾을 수 없습니다")

    del tasks_db[task_id]

    # WebSocket 알림
    await manager.broadcast({
        "type": "task_deleted",
        "data": {"id": task_id}
    })

    return {"message": "작업이 삭제되었습니다"}

# ==================== Zed 에디터 통합 ====================

@router.post("/zed/command")
async def execute_zed_command(command: ZedCommand):
    """Zed 에디터 명령 실행"""
    try:
        result = {"success": False, "message": "", "data": None}

        if command.action == "open":
            # 파일 열기
            if not command.file_path:
                raise ValueError("파일 경로가 필요합니다")

            file_path = Path(command.file_path)
            if not file_path.exists():
                raise ValueError(f"파일을 찾을 수 없습니다: {command.file_path}")

            # Zed CLI를 통한 파일 열기 (설치되어 있다고 가정)
            subprocess.run(["zed", str(file_path)], check=False)

            result["success"] = True
            result["message"] = f"파일 열기: {command.file_path}"

        elif command.action == "edit":
            # 파일 편집
            if not command.file_path or command.content is None:
                raise ValueError("파일 경로와 내용이 필요합니다")

            file_path = Path(command.file_path)

            # 백업 생성
            if file_path.exists():
                backup_path = file_path.with_suffix(f".bak.{datetime.now().strftime('%Y%m%d_%H%M%S')}")
                file_path.rename(backup_path)
                result["data"] = {"backup": str(backup_path)}

            # 파일 쓰기
            file_path.write_text(command.content, encoding='utf-8')

            result["success"] = True
            result["message"] = f"파일 수정 완료: {command.file_path}"

        elif command.action == "search":
            # 파일 내 검색
            if not command.file_path or not command.search_term:
                raise ValueError("파일 경로와 검색어가 필요합니다")

            file_path = Path(command.file_path)
            if not file_path.exists():
                raise ValueError(f"파일을 찾을 수 없습니다: {command.file_path}")

            content = file_path.read_text(encoding='utf-8')
            lines = content.split('\n')

            matches = []
            for i, line in enumerate(lines, 1):
                if command.search_term in line:
                    matches.append({
                        "line": i,
                        "content": line.strip(),
                        "column": line.find(command.search_term)
                    })

            result["success"] = True
            result["message"] = f"{len(matches)}개 일치 항목 발견"
            result["data"] = {"matches": matches}

        elif command.action == "replace":
            # 찾기 및 바꾸기
            if not all([command.file_path, command.search_term, command.replace_with is not None]):
                raise ValueError("파일 경로, 검색어, 대체 문자열이 필요합니다")

            file_path = Path(command.file_path)
            if not file_path.exists():
                raise ValueError(f"파일을 찾을 수 없습니다: {command.file_path}")

            # 백업 생성
            backup_path = file_path.with_suffix(f".bak.{datetime.now().strftime('%Y%m%d_%H%M%S')}")
            content = file_path.read_text(encoding='utf-8')
            file_path.rename(backup_path)

            # 치환
            new_content = content.replace(command.search_term, command.replace_with)
            count = content.count(command.search_term)

            # 새 내용 저장
            file_path.write_text(new_content, encoding='utf-8')

            result["success"] = True
            result["message"] = f"{count}개 항목 치환 완료"
            result["data"] = {
                "backup": str(backup_path),
                "replacements": count
            }

        elif command.action == "format":
            # 코드 포매팅
            if not command.file_path:
                raise ValueError("파일 경로가 필요합니다")

            file_path = Path(command.file_path)
            if not file_path.exists():
                raise ValueError(f"파일을 찾을 수 없습니다: {command.file_path}")

            # 파일 확장자에 따른 포매터 선택
            if file_path.suffix in ['.py']:
                # Black 포매터 사용
                subprocess.run(["black", str(file_path)], check=True)
                result["message"] = "Python 코드 포매팅 완료 (Black)"

            elif file_path.suffix in ['.js', '.jsx', '.ts', '.tsx']:
                # Prettier 사용
                subprocess.run(["npx", "prettier", "--write", str(file_path)], check=True)
                result["message"] = "JavaScript/TypeScript 코드 포매팅 완료 (Prettier)"

            else:
                raise ValueError(f"지원하지 않는 파일 형식: {file_path.suffix}")

            result["success"] = True

        else:
            raise ValueError(f"알 수 없는 명령: {command.action}")

        # WebSocket 알림
        await manager.broadcast({
            "type": "zed_command_executed",
            "data": {
                "command": command.dict(),
                "result": result
            }
        })

        return result

    except Exception as e:
        logger.error(f"Zed 명령 실행 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== 시스템 제어 ====================

@router.post("/system/command")
async def execute_system_command(command: SystemCommand):
    """시스템 제어 명령 실행"""
    try:
        manager = get_system_manager()
        result = {"success": False, "message": "", "data": None}

        # 대상 시스템 확인
        system = getattr(manager, command.target, None)
        if not system:
            raise ValueError(f"시스템을 찾을 수 없습니다: {command.target}")

        if command.action == "start":
            # 시스템 시작
            if hasattr(system, 'initialize'):
                await system.initialize()
            result["success"] = True
            result["message"] = f"{command.target} 시스템 시작됨"

        elif command.action == "stop":
            # 시스템 중지
            if hasattr(system, 'shutdown'):
                await system.shutdown()
            result["success"] = True
            result["message"] = f"{command.target} 시스템 중지됨"

        elif command.action == "restart":
            # 시스템 재시작
            if hasattr(system, 'shutdown'):
                await system.shutdown()
            await asyncio.sleep(1)
            if hasattr(system, 'initialize'):
                await system.initialize()
            result["success"] = True
            result["message"] = f"{command.target} 시스템 재시작됨"

        elif command.action == "reset":
            # 시스템 리셋
            if hasattr(system, 'reset'):
                await system.reset()
            result["success"] = True
            result["message"] = f"{command.target} 시스템 리셋됨"

        elif command.action == "test":
            # 시스템 테스트
            if hasattr(system, 'test'):
                test_result = await system.test(**command.params)
                result["data"] = test_result
            result["success"] = True
            result["message"] = f"{command.target} 시스템 테스트 완료"

        else:
            raise ValueError(f"알 수 없는 액션: {command.action}")

        # WebSocket 알림
        await manager.broadcast({
            "type": "system_command_executed",
            "data": {
                "command": command.dict(),
                "result": result
            }
        })

        return result

    except Exception as e:
        logger.error(f"시스템 명령 실행 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== WebSocket 엔드포인트 ====================

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """대시보드 실시간 통신용 WebSocket"""
    await manager.connect(websocket)

    try:
        # 연결 성공 메시지
        await websocket.send_json({
            "type": "connection",
            "message": "대시보드 WebSocket 연결 성공",
            "timestamp": datetime.now().isoformat()
        })

        # 초기 상태 전송
        status = await get_project_status()
        await websocket.send_json({
            "type": "initial_status",
            "data": status.dict()
        })

        # 주기적 상태 업데이트 (5초마다)
        async def send_periodic_updates():
            while True:
                try:
                    await asyncio.sleep(5)

                    # 간단한 헬스 체크
                    health = {
                        "cpu": psutil.cpu_percent(interval=0.1),
                        "memory": psutil.virtual_memory().percent,
                        "timestamp": datetime.now().isoformat()
                    }

                    await websocket.send_json({
                        "type": "health_update",
                        "data": health
                    })

                except Exception as e:
                    logger.error(f"주기적 업데이트 실패: {e}")
                    break

        # 백그라운드 태스크 시작
        update_task = asyncio.create_task(send_periodic_updates())

        # 클라이언트 메시지 처리
        while True:
            try:
                data = await websocket.receive_json()

                # 메시지 타입별 처리
                if data.get("type") == "ping":
                    await websocket.send_json({
                        "type": "pong",
                        "timestamp": datetime.now().isoformat()
                    })

                elif data.get("type") == "command":
                    # 명령 실행
                    command_data = data.get("data", {})
                    # 명령 처리 로직...

                elif data.get("type") == "query":
                    # 쿼리 처리
                    query_data = data.get("data", {})
                    # 쿼리 처리 로직...

            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.error(f"WebSocket 메시지 처리 오류: {e}")
                break

    finally:
        # 정리
        update_task.cancel()
        manager.disconnect(websocket)
        logger.info("WebSocket 연결 종료")

# ==================== 개발 도구 ====================

@router.get("/logs")
async def get_logs(lines: int = 100, level: str = "INFO"):
    """최근 로그 조회"""
    try:
        log_file = Path("/home/duksan/바탕화면/gumgang_0_5/backend/backend.log")

        if not log_file.exists():
            return {"logs": [], "message": "로그 파일이 없습니다"}

        # 로그 파일 읽기
        with open(log_file, 'r', encoding='utf-8') as f:
            all_lines = f.readlines()

        # 최근 N개 라인
        recent_lines = all_lines[-lines:]

        # 레벨 필터링
        if level != "ALL":
            recent_lines = [l for l in recent_lines if level in l]

        return {
            "logs": recent_lines,
            "total": len(recent_lines),
            "level": level
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/debug/eval")
async def evaluate_code(code: str):
    """디버그용 코드 평가 (개발 모드에서만)"""
    # 주의: 프로덕션에서는 비활성화해야 함!
    import os
    if os.getenv("ENV") == "production":
        raise HTTPException(status_code=403, detail="프로덕션 환경에서는 사용할 수 없습니다")

    try:
        # 제한된 환경에서 코드 실행
        result = eval(code, {"__builtins__": {}}, {})
        return {"result": str(result)}
    except Exception as e:
        return {"error": str(e)}
