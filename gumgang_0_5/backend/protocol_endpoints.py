#!/usr/bin/env python3
"""
Protocol & Git Safety Endpoints
SSE와 WebSocket을 통한 실시간 모니터링 및 제어
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Request
from fastapi.responses import StreamingResponse
from typing import Dict, List, Optional, Any
import json
import asyncio
import time
from datetime import datetime
from pathlib import Path
import sys
import os

# Import KST timestamp utility
from utils.time_kr import now_kr_str_minute, format_for_filename

# 상위 디렉토리 import 경로 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from git_safety_guard import GitSafetyGuard
from semantic_task_id import SemanticTaskID
from protocol_guard_v3 import ProtocolGuardV3

router = APIRouter(prefix="/api")

# 전역 인스턴스
git_guard = GitSafetyGuard()
semantic_id = SemanticTaskID()
protocol_guard = ProtocolGuardV3()

# WebSocket 연결 관리
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
            try:
                await connection.send_text(message)
            except:
                pass

manager = ConnectionManager()

# 현재 작업 상태 (메모리 저장)
current_task_state = {
    "id": None,
    "category": None,
    "subcategory": None,
    "risk": "S",
    "name": None,
    "progress": 0,
    "status": "idle",
    "checkpoints": [],
    "trustScore": 100,
    "startTime": None,
    "eta": None,
    "currentAction": None,
    "logs": []
}

# =================
# Protocol Endpoints
# =================

@router.get("/protocol/stream")
async def protocol_stream(request: Request):
    """SSE를 통한 실시간 프로토콜 상태 스트리밍"""

    async def event_generator():
        while True:
            # 연결이 끊어졌는지 확인
            if await request.is_disconnected():
                break

            # 현재 상태 수집
            git_status = git_guard.get_safety_status()
            protocol_status = protocol_guard.get_status()

            # 종합 상태 생성
            state = {
                "trustScore": protocol_status.get("trust_score", 100),
                "currentTask": current_task_state if current_task_state["id"] else None,
                "recentTasks": semantic_id.search(limit=5),
                "systemStatus": "working" if current_task_state["status"] == "active" else "idle",
                "autoSaveEnabled": True,
                "lastCheckpoint": git_guard.get_recent_checkpoints(1)[0]["id"] if git_guard.get_recent_checkpoints(1) else None,
                "gitBranch": git_status["current_branch"],
                "uncommittedChanges": git_status["uncommitted_files"] + git_status["untracked_files"],
                "timestamp": now_kr_str_minute()
            }

            # SSE 형식으로 전송
            yield f"data: {json.dumps(state)}\n\n"

            # 1초 대기
            await asyncio.sleep(1)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@router.websocket("/command")
async def websocket_command(websocket: WebSocket):
    """WebSocket을 통한 명령 처리"""
    await manager.connect(websocket)

    try:
        while True:
            # 클라이언트로부터 명령 수신
            data = await websocket.receive_text()
            command = json.loads(data)

            action = command.get("action")
            result = {"action": action, "success": False, "message": "Unknown command"}

            # 명령 처리
            if action == "checkpoint":
                message = command.get("message", "Manual checkpoint")
                cp_result = git_guard.auto_checkpoint(message)
                result = {
                    "action": action,
                    "success": "✅" in cp_result,
                    "message": cp_result
                }

            elif action == "rollback":
                target = command.get("target", "HEAD~1")
                rb_result = git_guard.instant_rollback(target)
                result = {
                    "action": action,
                    "success": "↩️" in rb_result,
                    "message": rb_result
                }

            elif action == "pause":
                current_task_state["status"] = "paused"
                result = {"action": action, "success": True, "message": "Task paused"}

            elif action == "resume":
                current_task_state["status"] = "active"
                result = {"action": action, "success": True, "message": "Task resumed"}

            elif action == "toggleAutoSave":
                enabled = command.get("enabled", True)
                if enabled:
                    git_guard.start_auto_save_daemon()
                else:
                    git_guard.stop_auto_save_daemon()
                result = {"action": action, "success": True, "message": f"Auto-save {'enabled' if enabled else 'disabled'}"}

            # 결과 전송
            await websocket.send_text(json.dumps(result))

            # 모든 연결에 상태 브로드캐스트
            await manager.broadcast(json.dumps({"event": "command_executed", "result": result}))

    except WebSocketDisconnect:
        manager.disconnect(websocket)

@router.post("/protocol/command")
async def protocol_command(command: dict):
    """HTTP를 통한 명령 처리 (WebSocket 대체)"""
    action = command.get("action")

    if action == "checkpoint":
        message = command.get("message", "Manual checkpoint")
        result = git_guard.auto_checkpoint(message)
        return {"success": "✅" in result, "message": result}

    elif action == "rollback":
        target = command.get("target", "HEAD~1")
        result = git_guard.instant_rollback(target)
        return {"success": "↩️" in result, "message": result}

    elif action == "pause":
        current_task_state["status"] = "paused"
        return {"success": True, "message": "Task paused"}

    elif action == "resume":
        current_task_state["status"] = "active"
        return {"success": True, "message": "Task resumed"}

    else:
        raise HTTPException(status_code=400, detail="Unknown command")

@router.post("/protocol/task/start")
async def start_task(task_data: dict):
    """새 작업 시작"""
    description = task_data.get("description", "New task")
    category = task_data.get("category")
    risk = task_data.get("risk")

    # Semantic Task ID 생성
    task_id = semantic_id.generate(description, category=category, risk=risk)
    metadata = semantic_id.parse(task_id)

    # 작업 상태 업데이트
    current_task_state.update({
        "id": task_id,
        "category": metadata.category,
        "subcategory": metadata.subcategory,
        "risk": metadata.risk,
        "name": description,
        "progress": 0,
        "status": "active",
        "checkpoints": [],
        "startTime": now_kr_str_minute(),
        "currentAction": "Initializing...",
        "logs": [f"Task started: {task_id}"]
    })

    # Git 안전 브랜치 생성
    branch_result = git_guard.create_safety_branch(task_id)

    return {
        "task_id": task_id,
        "metadata": metadata.__dict__,
        "branch": branch_result
    }

@router.post("/protocol/task/update")
async def update_task(update_data: dict):
    """작업 진행 상황 업데이트"""
    if not current_task_state["id"]:
        raise HTTPException(status_code=400, detail="No active task")

    progress = update_data.get("progress")
    action = update_data.get("action")
    log = update_data.get("log")

    if progress is not None:
        current_task_state["progress"] = min(100, max(0, progress))

    if action:
        current_task_state["currentAction"] = action

    if log:
        current_task_state["logs"].append(f"[{now_kr_str_minute().split(' ')[1]}] {log}")
        # 최대 100개 로그 유지
        if len(current_task_state["logs"]) > 100:
            current_task_state["logs"] = current_task_state["logs"][-100:]

    return {"success": True, "task": current_task_state}

@router.post("/protocol/task/complete")
async def complete_task():
    """작업 완료"""
    if not current_task_state["id"]:
        raise HTTPException(status_code=400, detail="No active task")

    # 최종 체크포인트 생성
    checkpoint_result = git_guard.auto_checkpoint(f"Task completed: {current_task_state['id']}")

    # 작업 상태 업데이트
    current_task_state["status"] = "completed"
    current_task_state["progress"] = 100

    # 다음 작업 제안
    next_task = semantic_id.suggest_next_task(current_task_state["id"])

    return {
        "success": True,
        "checkpoint": checkpoint_result,
        "next_task": next_task
    }

# =================
# Git Endpoints
# =================

@router.get("/git/status")
async def git_status():
    """Git 저장소 상태"""
    return git_guard.get_safety_status()

@router.get("/git/checkpoints")
async def git_checkpoints(limit: int = 10):
    """최근 체크포인트 목록"""
    checkpoints = git_guard.get_recent_checkpoints(limit)

    # 위험도 정보 추가
    for cp in checkpoints:
        if "CP_" in cp["message"]:
            # 메시지에서 위험도 추출
            if "[DANGER]" in cp["message"]:
                cp["risk"] = "D"
            elif "[CAUTION]" in cp["message"]:
                cp["risk"] = "C"
            else:
                cp["risk"] = "S"

    return checkpoints

@router.get("/git/stats")
async def git_stats():
    """Git 변경사항 통계"""
    stats = git_guard._analyze_changes()
    return {
        "added": len(stats["added"]),
        "modified": len(stats["modified"]),
        "deleted": len(stats["deleted"]),
        "untracked": len(stats["untracked"]),
        "total": stats["total"]
    }

@router.post("/git/checkpoint")
async def create_checkpoint(data: dict):
    """체크포인트 생성"""
    message = data.get("message", "Manual checkpoint")
    risk = data.get("risk", "S")

    result = git_guard.auto_checkpoint(message, risk)

    return {
        "success": "✅" in result,
        "message": result
    }

@router.post("/git/rollback")
async def git_rollback(data: dict):
    """Git 롤백"""
    target = data.get("target", "HEAD~1")

    result = git_guard.instant_rollback(target)

    return {
        "success": "↩️" in result,
        "message": result
    }

@router.post("/git/branch")
async def create_branch(data: dict):
    """안전 브랜치 생성"""
    task_id = data.get("task_id", format_for_filename())

    result = git_guard.create_safety_branch(task_id)

    return {
        "success": "🌿" in result,
        "message": result
    }

@router.post("/git/autosave")
async def toggle_autosave(data: dict):
    """자동 저장 토글"""
    enabled = data.get("enabled", True)
    interval = data.get("interval", 60)

    if enabled:
        git_guard.config["auto_save_interval"] = interval
        git_guard._save_config(git_guard.config)
        git_guard.start_auto_save_daemon()
        return {"success": True, "message": f"Auto-save enabled (interval: {interval}s)"}
    else:
        git_guard.stop_auto_save_daemon()
        return {"success": True, "message": "Auto-save disabled"}

@router.post("/git/backup")
async def push_to_backup():
    """백업 저장소로 푸시"""
    try:
        git_guard._push_to_backup()
        return {"success": True, "message": "Pushed to backup repository"}
    except Exception as e:
        return {"success": False, "message": str(e)}

@router.post("/git/archive")
async def archive_to_usb(data: dict):
    """USB로 아카이브"""
    usb_path = data.get("path", "/media/usb")

    result = git_guard.archive_to_usb(usb_path)

    return {
        "success": "💾" in result,
        "message": result
    }

# =================
# Semantic Task ID Endpoints
# =================

@router.post("/task/generate")
async def generate_task_id(data: dict):
    """Semantic Task ID 생성"""
    description = data.get("description", "")
    category = data.get("category")
    risk = data.get("risk")

    if not description:
        raise HTTPException(status_code=400, detail="Description is required")

    task_id = semantic_id.generate(
        description=description,
        category=category,
        risk=risk
    )

    metadata = semantic_id.parse(task_id)

    return {
        "task_id": task_id,
        "metadata": metadata.__dict__ if metadata else None
    }

@router.get("/task/search")
async def search_tasks(
    query: Optional[str] = None,
    category: Optional[str] = None,
    risk: Optional[str] = None,
    limit: int = 50
):
    """작업 검색"""
    results = semantic_id.search(
        query=query,
        category=category,
        risk=risk,
        limit=limit
    )

    return [task.__dict__ for task in results]

@router.get("/task/statistics")
async def task_statistics():
    """작업 통계"""
    return semantic_id.get_statistics()

@router.get("/task/suggest/{task_id}")
async def suggest_next_task(task_id: str):
    """다음 작업 제안"""
    next_task = semantic_id.suggest_next_task(task_id)

    if next_task:
        metadata = semantic_id.parse(next_task)
        return {
            "task_id": next_task,
            "metadata": metadata.__dict__ if metadata else None
        }
    else:
        return {"task_id": None, "metadata": None}

# =================
# Health Check
# =================

@router.get("/protocol/health")
async def protocol_health():
    """프로토콜 시스템 상태 확인"""
    git_status = git_guard.get_safety_status()
    protocol_status = protocol_guard.get_status()

    return {
        "status": "healthy",
        "timestamp": now_kr_str_minute(),
        "components": {
            "git_safety": {
                "status": "ok",
                "branch": git_status["current_branch"],
                "uncommitted": git_status["uncommitted_files"],
                "backup": git_status["backup_exists"]
            },
            "protocol_guard": {
                "status": "ok",
                "trust_score": protocol_status.get("trust_score", 100),
                "checkpoints": len(protocol_status.get("checkpoints", []))
            },
            "semantic_id": {
                "status": "ok",
                "total_tasks": semantic_id.get_statistics()["total_tasks"]
            },
            "current_task": {
                "active": current_task_state["id"] is not None,
                "status": current_task_state["status"],
                "progress": current_task_state["progress"]
            }
        }
    }
