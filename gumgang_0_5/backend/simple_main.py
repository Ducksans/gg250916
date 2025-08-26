import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from typing import Optional, AsyncGenerator
import datetime

import json
import asyncio

from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI
from fastapi import Request
from utils.time_kr import now_kr_str_minute, validate_kr_timestamp
from app.api.websocket_server import websocket_endpoint, start_background_tasks, manager, MessageType
from app.utils.memory_status_adapter import from_simple_memory, build_tiers_response
from utils.rules_enforcer import prepend_full_rules, HEAD_MARK
from app.middleware.approval_gate import ApprovalGateMiddleware
from app.routes import autocode as autocode_routes
from app.routes import files_read as files_read_routes
from app.routes import files_tree as files_tree_routes
import logging

# Logger 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 🧠 전역 메모리 시스템 인스턴스 (싱글톤)
memory_system_instance = None

def get_memory_system():
    """싱글톤 패턴으로 메모리 시스템 인스턴스 반환"""
    global memory_system_instance
    if memory_system_instance is None:
        from app.temporal_memory import TemporalMemorySystem, MemoryType, MemoryPriority, MemoryTrace
        import uuid
        from datetime import datetime

        memory_system_instance = TemporalMemorySystem()

        # 각 레벨에 직접 데이터 추가 (더미 데이터)
        # Level 1: Ultra Short (임시 기억)
        for i in range(5):
            trace = MemoryTrace(
                trace_id=str(uuid.uuid4()),
                content=f"작업 메모리 {i+1}: 현재 세션 데이터",
                timestamp=datetime.now(),
                memory_type=MemoryType.EPISODIC,
                priority=MemoryPriority.MEDIUM
            )
            memory_system_instance.ultra_short.buffer.append(trace.trace_id)

        # Level 2: Short Term (에피소드)
        for i in range(8):
            trace = MemoryTrace(
                trace_id=str(uuid.uuid4()),
                content=f"에피소드 {i+1}: 최근 대화 내용",
                timestamp=datetime.now(),
                memory_type=MemoryType.EPISODIC,
                priority=MemoryPriority.MEDIUM
            )
            memory_system_instance.short_term.traces[trace.trace_id] = trace

        # Level 3: Medium Term (의미 기억)
        for i in range(15):
            trace = MemoryTrace(
                trace_id=str(uuid.uuid4()),
                content=f"의미 기억 {i+1}: Blueprint v1.2, .rules 원칙",
                timestamp=datetime.now(),
                memory_type=MemoryType.SEMANTIC,
                priority=MemoryPriority.HIGH
            )
            memory_system_instance.medium_term.traces[trace.trace_id] = trace

        # Level 4: Long Term (절차 기억)
        for i in range(20):
            trace = MemoryTrace(
                trace_id=str(uuid.uuid4()),
                content=f"절차 기억 {i+1}: Tauri, Next.js, Monaco Editor",
                timestamp=datetime.now(),
                memory_type=MemoryType.PROCEDURAL,
                priority=MemoryPriority.HIGH
            )
            memory_system_instance.long_term.core_knowledge[trace.trace_id] = trace

        logger.info("✅ 메모리 시스템 초기화 및 기본 데이터 로드 완료")
        logger.info(f"   - Ultra Short: {len(memory_system_instance.ultra_short.buffer)}개")
        logger.info(f"   - Short Term: {len(memory_system_instance.short_term.traces)}개")
        logger.info(f"   - Medium Term: {len(memory_system_instance.medium_term.traces)}개")
        logger.info(f"   - Long Term: {len(memory_system_instance.long_term.core_knowledge)}개")

    return memory_system_instance

# Load environment variables
env_path = Path(__file__).parent / ".env"
load_dotenv(env_path)

# Initialize OpenAI client
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
openai_client = None
if OPENAI_API_KEY:
    try:
        openai_client = OpenAI(api_key=OPENAI_API_KEY)
        print("✅ OpenAI API initialized successfully")
    except Exception as e:
        print(f"⚠️ Failed to initialize OpenAI: {e}")
else:
    print("⚠️ No OpenAI API key found in .env")

protocol_router = None
# Protocol 엔드포인트 import
try:
    from protocol_endpoints import router as protocol_router
    PROTOCOL_ENABLED = True
except ImportError:
    protocol_router = None
    PROTOCOL_ENABLED = False
    print("⚠️ Protocol endpoints not available (protocol_endpoints.py not found)")

# ✅ FastAPI 앱 초기화
app = FastAPI(title="금강 2.0 백엔드 - 간단 테스트 서버")
# 🔐 Global Approval Gate for WRITE routes (POST/PUT/PATCH/DELETE)
app.add_middleware(ApprovalGateMiddleware)

# ✅ CORS 설정 (프론트엔드 연결용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(autocode_routes.router)
app.include_router(files_read_routes.router)
app.include_router(files_tree_routes.router)

# ✅ Timestamp Middleware - 모든 응답에 KST 타임스탬프 추가
@app.middleware("http")
async def timestamp_guard(request: Request, call_next):
    """모든 HTTP 응답에 KST 타임스탬프 헤더 추가 및 형식 검증"""
    response = await call_next(request)

    # 현재 KST 시간 가져오기
    ts = now_kr_str_minute()

    # 응답 헤더에 타임스탬프 추가
    response.headers["X-Gumgang-Timestamp"] = ts
    response.headers["X-Gumgang-TZ"] = "Asia/Seoul"

    # 타임스탬프 형식 검증
    if not validate_kr_timestamp(ts):
        raise HTTPException(
            status_code=422,
            detail=f"Invalid timestamp format: {ts}. Expected YYYY-MM-DD HH:mm"
        )

    return response

# ✅ Rules Enforcement Middleware - 모든 LLM 호출에 .rules 강제 주입
@app.middleware("http")
async def enforce_full_rules(request: Request, call_next):
    """모든 API 요청에 .rules 강제 주입 및 검증"""

    # POST 요청이며 /api/* 또는 /ask, /ask/stream 경로인 경우 Rules 주입
    if request.method == "POST" and (request.url.path.startswith("/api/") or request.url.path in ["/ask", "/ask/stream"]):
        try:
            # Request body 읽기
            body_bytes = await request.body()

            # JSON 파싱 시도
            try:
                body = json.loads(body_bytes) if body_bytes else {}
            except Exception:
                body = {}

            # prompt 필드가 있는 경우 rules 주입
            if "prompt" in body:
                text = (body.get("prompt") or "").lstrip()

                # 이미 rules가 포함되어 있지 않은 경우
                if not text.startswith(HEAD_MARK):
                    try:
                        # Rules 주입
                        injected, rules_hash, head = prepend_full_rules(body["prompt"])
                        body["prompt"] = injected

                        # Request body 재설정
                        new_body = json.dumps(body).encode("utf-8")

                        # Request 재구성을 위한 새로운 receive 함수
                        async def receive():
                            return {"type": "http.request", "body": new_body}

                        request = Request(request.scope, receive, request._send)

                        # State에 rules 정보 저장
                        request.state.rules_hash = rules_hash
                        request.state.rules_head = head
                        request.state.rules_injected = True
                    except Exception as e:
                        return JSONResponse(
                            {"error": f"rules_enforcement_failed: {e}"},
                            status_code=500
                        )
        except Exception:
            # Body 읽기 실패 시 무시하고 계속
            pass

    # 다음 미들웨어/핸들러 호출
    response = await call_next(request)

    # Rules 정보가 있으면 응답 헤더에 추가
    if hasattr(request.state, "rules_hash"):
        response.headers["X-Rules-Hash"] = request.state.rules_hash
        response.headers["X-Rules-Head"] = "RULES v1.0 - Gumgang 2.0 / KST 2025-08-09 12:33"
        if hasattr(request.state, "rules_injected"):
            response.headers["X-Rules-Injected"] = "true"

    return response

# ✅ Protocol 라우터 통합
if PROTOCOL_ENABLED and protocol_router is not None:
    app.include_router(protocol_router)
    print("✅ Protocol endpoints integrated successfully")

    # ✅ WebSocket 엔드포인트 및 백그라운드 작업 연결
    # - /ws 경로에 WebSocket 엔드포인트 추가
    app.add_api_websocket_route("/ws", websocket_endpoint)

    # - WebSocket 서버의 heartbeat/cleanup 백그라운드 태스크 시작
    @app.on_event("startup")
    async def _ws_start_background_tasks():
        try:
            await start_background_tasks()
        except Exception as e:
            logger.error(f"WebSocket tasks start failed: {e}")

    # - 주기적으로 메모리 상태(tiers + ts_kst)를 모든 활성 연결에 브로드캐스트
    async def _memory_update_broadcaster():
        while True:
            try:
                memory_system = get_memory_system()
                tiers = from_simple_memory(memory_system)
                payload = {
                    "type": "memory-update",
                    "data": build_tiers_response(tiers)
                }
                # 모든 활성 연결에 전송
                for connection_id in list(manager.active_connections.keys()):
                    await manager.send_personal_message(connection_id, payload)
            except Exception as e:
                logger.error(f"memory update broadcast failed: {e}")
            # 5초 주기
            await asyncio.sleep(5)

    @app.on_event("startup")
    async def _start_memory_update_broadcaster():
        asyncio.create_task(_memory_update_broadcaster())

# ✅ 테스트용 데이터 모델
class TestMessage(BaseModel):
    message: str
    timestamp: Optional[str] = None

class TaskRequest(BaseModel):
    task_id: str
    task_name: str
    status: str = "pending"
    progress: int = 0

class AskRequest(BaseModel):
    query: str
    session_id: Optional[str] = None
    code: Optional[str] = None
    language: Optional[str] = None
    file: Optional[str] = None

# ✅ 헬스 체크 엔드포인트
@app.get("/health")
async def health_check():
    """헬스 체크 엔드포인트"""
    return {
        "status": "healthy",
        "timestamp": now_kr_str_minute(),
        "service": "gumgang-backend",
        "version": "2.0-test"
    }

@app.get("/status")
async def status_check():
    """상태 체크 엔드포인트 (프론트엔드 호환)"""
    try:
        # WebSocket 상태 계산: 연결 수가 1개 이상이면 on, 0이면 ready, 오류 시 off
        ws_connections = 0
        ws_state = "off"
        try:
            ws_connections = len(getattr(manager, "active_connections", {}) or {})
            ws_state = "on" if ws_connections > 0 else "ready"
        except Exception:
            ws_connections = 0
            ws_state = "off"

        # CPU 사용률 근사치(의존성 없이 loadavg/코어수로 계산)
        try:
            load1 = os.getloadavg()[0]
            cores = os.cpu_count() or 1
            cpu_percent = max(0.0, min(100.0, (load1 / cores) * 100.0))
        except Exception:
            cpu_percent = 0.0

        # 메모리 사용량(/proc/meminfo 기반)
        mem_total = 0
        mem_used = 0
        try:
            total_kb = 0
            avail_kb = 0
            with open("/proc/meminfo", "r") as f:
                for line in f:
                    if line.startswith("MemTotal:"):
                        # e.g., "MemTotal:       32694724 kB"
                        parts = line.split()
                        if len(parts) >= 2:
                            total_kb = int(parts[1])
                    elif line.startswith("MemAvailable:"):
                        parts = line.split()
                        if len(parts) >= 2:
                            avail_kb = int(parts[1])
            mem_total = total_kb * 1024
            mem_used = max(0, mem_total - (avail_kb * 1024))
        except Exception:
            pass

        return {
            "status": "healthy",
            "timestamp": now_kr_str_minute(),
            "backend_port": 8000,
            "frontend_port": 3000,
            "websocket": ws_state,
            "ws_connections": ws_connections,
            "cpu_percent": cpu_percent,
            "memory_total": mem_total,
            "memory_used": mem_used
        }
    except Exception:
        # 보수적 기본값
        return {
            "status": "healthy",
            "timestamp": now_kr_str_minute(),
            "backend_port": 8000,
            "frontend_port": 3000,
            "websocket": "off",
            "ws_connections": 0,
            "cpu_percent": 0.0,
            "memory_total": 0,
            "memory_used": 0
        }

# ✅ Rules 테스트 엔드포인트
# Phase 3 — Usage summary/tail APIs
@app.get("/api/usage/summary")
async def usage_summary(session_id: str):
    try:
        from utils.usage_recorder import summarize_session  # type: ignore
        data = summarize_session(session_id)
        data["ts_kst"] = now_kr_str_minute()
        return data
    except Exception as e:
        return JSONResponse({"error": f"usage_summary_failed: {e}"}, status_code=500)

@app.get("/api/usage/tail")
async def usage_tail(lines: int = 20):
    try:
        from utils.usage_recorder import tail_usage  # type: ignore
        lines = max(1, min(1000, int(lines)))
        data = tail_usage(lines)
        return {"ts_kst": now_kr_str_minute(), "lines": data, "count": len(data)}
    except Exception as e:
        return JSONResponse({"error": f"usage_tail_failed: {e}"}, status_code=500)

# ✅ Rules 테스트 엔드포인트

# Phase 2 — Ideas APIs (Quick MVP)
class IdeaCaptureRequest(BaseModel):
    title: str
    body: str | None = ""
    tags: list[str] | None = None
    session_id: str | None = None
    actor: str | None = None

@app.post("/api/ideas/capture")
async def ideas_capture(payload: IdeaCaptureRequest):
    """
    Capture a lightweight idea as Markdown (docs/ideas) and append JSONL index (logs/ideas.jsonl).
    """
    try:
        if not payload.title or not payload.title.strip():
            return JSONResponse({"error": "title is required"}, status_code=400)
        from utils.ideas_recorder import capture_idea  # type: ignore
        res = capture_idea(
            title=payload.title.strip(),
            body=(payload.body or ""),
            tags=(payload.tags or []),
            session_id=payload.session_id,
            actor=payload.actor,
            meta={"route": "/api/ideas/capture"},
        )
        return {
            "ts_kst": res.ts_kst,
            "id": res.id,
            "path": res.path,
            "title": res.title,
            "tags": res.tags,
            "links": res.links,
            "written": res.written,
            "indexed": res.indexed,
        }
    except Exception as e:
        return JSONResponse({"error": f"ideas_capture_failed: {e}"}, status_code=500)

@app.get("/api/ideas/list")
async def ideas_list(limit: int = 20):
    """
    List recent ideas (metadata parsed from frontmatter). Limit 1-200.
    """
    try:
        from utils.ideas_recorder import list_recent_ideas  # type: ignore
        lim = max(1, min(200, int(limit)))
        items = list_recent_ideas(limit=lim)
        return {"ts_kst": now_kr_str_minute(), "items": items, "count": len(items)}
    except Exception as e:
        return JSONResponse({"error": f"ideas_list_failed: {e}"}, status_code=500)

# Blueprint index endpoint (headings + sha256, KST stamped)
@app.get("/api/blueprint/index")
async def blueprint_index():
    """
    Return a lightweight index of docs/blueprint_v1.2.md:
    - version, ts_kst, path, sha256
    - headings: [{level, title, line, anchor}, ...]
    """
    try:
        from utils.blueprint_indexer import build_index  # type: ignore
        repo_root = Path(__file__).resolve().parent.parent
        md_path = repo_root / "docs" / "blueprint_v1.2.md"
        index = build_index(md_path)
        return index
    except Exception as e:
        return JSONResponse({"error": f"blueprint_index_failed: {e}"}, status_code=500)

# Turn Prompt — Git dirty endpoint
@app.get("/api/protocol/git/dirty")
async def protocol_git_dirty():
    """
    Return current git working tree dirty status for Turn-Checkpoint Prompt.
    Uses `git status --porcelain` to classify changes.
    """
    try:
        import subprocess
        repo_root = Path(__file__).resolve().parent.parent  # project root
        cp = subprocess.run(
            ["git", "status", "--porcelain"],
            cwd=str(repo_root),
            capture_output=True,
            text=True,
            check=False,
        )
        raw = [ln.strip() for ln in (cp.stdout or "").splitlines() if ln.strip()]
        modified, added, deleted, renamed, untracked = [], [], [], [], []

        for ln in raw:
            # Status format: XY<space>path (e.g., " M file", "A  file", "D  file", "?  file")
            code = ln[:2]
            rest = ln[3:] if len(ln) > 3 else ""
            # Rename format example: "R  old/path -> new/path"
            if "->" in rest:
                parts = [p.strip() for p in rest.split("->", 1)]
                if len(parts) == 2:
                    renamed.append({"from": parts[0], "to": parts[1]})
                    continue

            path = rest
            if "?" in code:
                untracked.append(path)
            elif "A" in code:
                added.append(path)
            elif "D" in code:
                deleted.append(path)
            elif "M" in code or code.strip():
                # Treat any other non-empty status as modified
                modified.append(path)

        return {
            "ts_kst": now_kr_str_minute(),
            "has_changes": bool(raw),
            "counts": {
                "modified": len(modified),
                "added": len(added),
                "deleted": len(deleted),
                "renamed": len(renamed),
                "untracked": len(untracked),
            },
            "modified": modified,
            "added": added,
            "deleted": deleted,
            "renamed": renamed,
            "untracked": untracked,
        }
    except Exception as e:
        return JSONResponse({"error": f"git_dirty_failed: {e}"}, status_code=500)

# Phase 2 — Protocol Guard Checkpoint/Audit APIs
class CheckpointRequest(BaseModel):
    task_id: str
    operation: str = "edit"
    paths: list[str] | None = None
    notes: str
    risk: str = "SAFE"
    actor: str = "gpt-5"


@app.post("/api/protocol/checkpoint")
async def protocol_checkpoint(payload: CheckpointRequest):
    """
    Record a checkpoint/audit entry via server-side guard recorder.
    - Uses KST timestamp (now_kr_str_minute)
    - Dedups by (task_id, operation, path)
    """
    try:
        # Import locally to avoid global import churn if module not needed at runtime
        from utils.guard_recorder import record  # type: ignore

        paths = payload.paths or []
        notes = payload.notes.strip()
        if not payload.task_id.strip():
            return JSONResponse({"error": "task_id is required"}, status_code=400)
        if not notes:
            return JSONResponse({"error": "notes is required"}, status_code=400)

        appended, modified = record(
            task_id=payload.task_id.strip(),
            operation=payload.operation.strip() or "edit",
            paths=paths,
            notes=notes,
            message=notes,
            risk=payload.risk.strip() or "SAFE",
            actor=payload.actor.strip() or "gpt-5",
        )

        return {
            "ts_kst": now_kr_str_minute(),
            "task_id": payload.task_id,
            "operation": payload.operation,
            "paths": paths,
            "audit_appended": appended,
            "manifest_modified": modified,
        }
    except Exception as e:
        return JSONResponse({"error": f"checkpoint_failed: {e}"}, status_code=500)


@app.get("/api/protocol/audit/tail")
async def protocol_audit_tail(lines: int = 200):
    """
    Return the last N lines of guard audit log.
    """
    try:
        from utils.guard_recorder import audit_tail  # type: ignore

        lines = max(1, min(1000, int(lines)))
        tail = audit_tail(lines=lines)
        return {
            "ts_kst": now_kr_str_minute(),
            "lines": tail,
            "count": len(tail),
        }
    except Exception as e:
        return JSONResponse({"error": f"audit_tail_failed: {e}"}, status_code=500)
@app.post("/api/test")
async def test_rules_injection(request: Request, data: Optional[dict] = None):
    """Rules 주입 테스트 엔드포인트"""
    # Check if rules were injected
    rules_injected = hasattr(request.state, "rules_injected") and request.state.rules_injected
    rules_hash = getattr(request.state, "rules_hash", None)
    rules_head = getattr(request.state, "rules_head", None)

    # Get prompt from request
    prompt = data.get("prompt", "") if data else ""

    return {
        "status": "ok",
        "rules_enforced": rules_injected,
        "rules_hash": rules_hash,
        "rules_head": rules_head,
        "prompt_starts_with_rules": prompt.startswith(HEAD_MARK) if prompt else False,
        "timestamp": now_kr_str_minute()
    }

# ✅ 루트 엔드포인트
@app.get("/")
async def root():
    return {
        "message": "금강 2.0 백엔드 테스트 서버",
        "status": "running",
        "endpoints": [
            "/health",
            "/ask",
            "/api/test",
            "/api/echo",
            "/api/tasks",
            "/api/dashboard/stats"
        ]
    }

# ✅ /ask 엔드포인트 - AI 어시스턴트용
@app.post("/ask")
async def ask_question(request: AskRequest):
    """AI 코딩 어시스턴트 엔드포인트 - OpenAI GPT 연동 + 메모리 시스템"""
    import uuid

    # 세션 ID 생성 또는 재사용
    session_id = request.session_id or str(uuid.uuid4())

    # 메모리 시스템에서 컨텍스트 가져오기
    memory_system = get_memory_system()
    memory_context = []

    # 메모리에서 관련 정보 검색
    try:
        # 사용자 정보 추가
        memory_context.append("사용자 정보: 덕산(duksan) - Gumgang 2.0 프로젝트 개발자")
        memory_context.append("프로젝트: Gumgang 2.0 - Blueprint v1.2 기반 자립형 AI 코드 에디터")
        memory_context.append("핵심 원칙: .rules 문서 불가침")

        # 최근 메모리 가져오기
        if hasattr(memory_system, 'short_term') and memory_system.short_term.traces:
            recent_memories = list(memory_system.short_term.traces.values())[:3]
            for mem in recent_memories:
                if hasattr(mem, 'content'):
                    memory_context.append(f"최근 기억: {mem.content}")

        # 장기 메모리에서 중요 정보
        if hasattr(memory_system, 'long_term') and memory_system.long_term.core_knowledge:
            core_knowledge = list(memory_system.long_term.core_knowledge.values())[:2]
            for knowledge in core_knowledge:
                if hasattr(knowledge, 'content'):
                    memory_context.append(f"핵심 지식: {knowledge.content}")
    except Exception as e:
        logger.warning(f"메모리 컨텍스트 로드 실패: {e}")

    # OpenAI API 사용 가능 여부 확인
    if not openai_client:
        # Fallback to dummy response if no API key
        return {
            "response": f"[테스트 모드] '{request.query}'에 대한 답변입니다. OpenAI API 키가 설정되지 않았습니다.",
            "source": "test-backend",
            "session_id": session_id,
            "timestamp": now_kr_str_minute(),
            "context_info": {
                "session_id": session_id,
                "recent_interactions": 0,
                "context_type": "test"
            },
            "suggest_ingest": False
        }

    try:
        # 메모리 컨텍스트를 포함한 시스템 프롬프트 구성
        memory_info = "\n".join(memory_context) if memory_context else "메모리 시스템 초기화 중..."

        system_prompt = f"""You are 금강 2.0, an advanced AI coding assistant with a 5-layer temporal memory system.

현재 메모리 상태:
{memory_info}

당신은 덕산(duksan)이라는 개발자와 함께 Gumgang 2.0 프로젝트를 개발하고 있습니다.
- 사용자 이름: 덕산 (duksan)
- 프로젝트: Gumgang 2.0 (Blueprint v1.2 기반)
- 아키텍처: Tauri + Next.js + Monaco Editor
- 메모리 시스템: 4계층 시간적 메모리 (초단기, 단기, 중기, 장기) + 메타인지

You have persistent memory and remember all previous interactions.
You are helpful, precise, and capable of understanding both Korean and English at an expert level.
When providing code, always use proper markdown formatting."""

        # 사용자 메시지 구성
        messages = [
            {"role": "system", "content": system_prompt}
        ]

        # 코드가 포함된 경우 컨텍스트 추가
        if request.code:
            code_context = f"\n\n다음 코드와 관련된 질문입니다:\n```{request.language or 'python'}\n{request.code}\n```"
            messages.append({"role": "user", "content": request.query + code_context})
        else:
            messages.append({"role": "user", "content": request.query})

        # OpenAI API 호출
        print(f"🤖 Calling OpenAI API for query: {request.query[:50]}...")
        print(f"📊 메모리 컨텍스트: {len(memory_context)}개 항목 로드됨")

        # GPT-5 모델 사용 (환경변수로 설정 가능)
        model_name = os.getenv("OPENAI_MODEL", "gpt-5")  # 기본값: GPT-5
        logger.info(f"🚀 Using OpenAI model: {model_name}")

        # GPT-5 API 파라미터 설정
        api_params = {
            "model": model_name,
            "messages": messages,
            "stream": False  # 스트리밍은 나중에 구현
        }

        if "gpt-5" in model_name.lower():
            api_params["max_completion_tokens"] = 120000

        elif "gpt-4" in model_name.lower():
            api_params["max_tokens"] = 2000
            api_params["temperature"] = 0.7
        else:
            api_params["max_tokens"] = 2000
            api_params["temperature"] = 0.7

        response = openai_client.chat.completions.create(**api_params)

        # 응답 추출
        response_text = response.choices[0].message.content

        print(f"✅ OpenAI response received: {len(response_text)} chars")

        # 사용량 기록(응답 usage 우선, 없으면 근사값)
        computed_tokens = None
        try:
            from utils.usage_recorder import record_from_openai_usage, approximate_tokens_from_text, record_usage  # type: ignore
            import uuid as _uuid
            turn_id = str(_uuid.uuid4())
            if getattr(response, "usage", None):
                rec = record_from_openai_usage(
                    session_id=session_id,
                    turn_id=turn_id,
                    model=model_name,
                    usage=response.usage,
                    meta={"route": "/ask"},
                )
                computed_tokens = rec.total_tokens
            else:
                p = approximate_tokens_from_text(request.query or "")
                c = approximate_tokens_from_text(response_text or "")
                rec = record_usage(
                    session_id=session_id,
                    turn_id=turn_id,
                    model=model_name,
                    prompt_tokens=p,
                    completion_tokens=c,
                    meta={"route": "/ask", "approx": True},
                )
                computed_tokens = rec.total_tokens
        except Exception as e:
            logger.warning(f"사용량 기록 실패: {e}")

        # 대화 내용을 메모리에 저장
        try:
            from app.temporal_memory import MemoryType, MemoryPriority
            memory_system.store_memory(
                f"Q: {request.query[:100]}... A: {response_text[:100]}...",
                MemoryType.EPISODIC,
                MemoryPriority.MEDIUM,
                session_id=session_id
            )
            logger.info("✅ 대화 내용 메모리에 저장됨")
        except Exception as e:
            logger.warning(f"메모리 저장 실패: {e}")

        return {
            "response": response_text,
            "source": f"openai-{model_name}",
            "session_id": session_id,
            "context_info": {
                "session_id": session_id,
                "recent_interactions": len(memory_context),
                "context_type": "openai-with-memory",
                "model": model_name.upper(),
                "tokens_used": computed_tokens,
                "memory_loaded": len(memory_context) > 0,
                "capabilities": "4-layer temporal memory system with GPT-5 intelligence",
                "model_version": model_name,
                "released": "2025-08-08"  # GPT-5 정식 출시일
            },
            "suggest_ingest": False
        }

    except Exception as e:
        print(f"❌ OpenAI API error: {e}")
        # 에러 발생시 폴백 응답
        return {
            "response": f"죄송합니다. AI 처리 중 오류가 발생했습니다. 다시 시도해주세요.\n\n오류: {str(e)}",
            "source": "error-fallback",
            "session_id": session_id,
            "context_info": {
                "session_id": session_id,
                "recent_interactions": 0,
                "context_type": "error",
                "error": str(e)
            },
            "suggest_ingest": False
        }

# ✅ 스트리밍 응답 엔드포인트 - Server-Sent Events (SSE)
@app.post("/ask/stream")
async def ask_question_stream(request: AskRequest):
    """AI 코딩 어시스턴트 스트리밍 엔드포인트 - OpenAI GPT 스트리밍"""
    import uuid

    # 세션 ID 생성 또는 재사용
    session_id = request.session_id or str(uuid.uuid4())

    async def generate_stream() -> AsyncGenerator[str, None]:
        """SSE 형식으로 스트리밍 응답 생성"""

        # OpenAI API 사용 가능 여부 확인
        if not openai_client:
            # 테스트 모드 스트리밍
            test_response = f"[테스트 모드] '{request.query}'에 대한 스트리밍 응답입니다."
            for char in test_response:
                yield f"data: {json.dumps({'content': char, 'type': 'content'})}\n\n"
                await asyncio.sleep(0.01)  # 스트리밍 효과
            yield f"data: {json.dumps({'type': 'done', 'session_id': session_id})}\n\n"
            return

        try:
            # 시스템 프롬프트 구성
            system_prompt = """You are 금강 2.0, an advanced AI coding assistant powered by GPT-5 with a 5-layer memory system.
You have dramatically improved reasoning capabilities, near-human cognitive abilities, and persistent memory.
You are helpful, precise, and capable of understanding both Korean and English at an expert level.
When providing code, always use proper markdown formatting with exceptional accuracy.
You have PhD-level knowledge of programming, software architecture, and best practices."""

            # 사용자 메시지 구성
            messages = [
                {"role": "system", "content": system_prompt}
            ]

            # 코드가 포함된 경우 컨텍스트 추가
            if request.code:
                code_context = f"\n\n다음 코드와 관련된 질문입니다:\n```{request.language or 'python'}\n{request.code}\n```"
                messages.append({"role": "user", "content": request.query + code_context})
            else:
                messages.append({"role": "user", "content": request.query})

            # 시작 이벤트 전송
            yield f"data: {json.dumps({'type': 'start', 'session_id': session_id})}\n\n"

            # OpenAI API 스트리밍 호출
            print(f"🤖 Starting streaming response for: {request.query[:50]}...")

            stream = openai_client.chat.completions.create(
                model="gpt-5",  # GPT-5 정식 모델 (2025년 8월 7일 출시)
                messages=messages,  # type: ignore[arg-type]
                max_completion_tokens=2000,  # GPT-5는 max_completion_tokens 사용
                stream=True  # 스트리밍 활성화
            )

            # 스트리밍 응답 전송
            full_response = ""
            for chunk in stream:
                if chunk.choices[0].delta.content is not None:
                    content = chunk.choices[0].delta.content
                    full_response += content
                    # 각 청크를 SSE 형식으로 전송
                    yield f"data: {json.dumps({'content': content, 'type': 'content'})}\n\n"

            # 사용량 기록(근사치)
            try:
                from utils.usage_recorder import approximate_tokens_from_text, record_usage  # type: ignore
                import uuid as _uuid
                p = approximate_tokens_from_text(request.query or "")
                c = approximate_tokens_from_text(full_response or "")
                record_usage(
                    session_id=session_id,
                    turn_id=str(_uuid.uuid4()),
                    model="gpt-5",
                    prompt_tokens=p,
                    completion_tokens=c,
                    meta={"route": "/ask/stream"},
                )
            except Exception as e:
                print(f"⚠️ Usage record failed: {e}")

            # 완료 이벤트 전송
            yield f"data: {json.dumps({'type': 'done', 'session_id': session_id, 'full_response': full_response})}\n\n"
            print(f"✅ Streaming completed: {len(full_response)} chars")

        except Exception as e:
            print(f"❌ Streaming error: {e}")
            # 에러 이벤트 전송
            yield f"data: {json.dumps({'type': 'error', 'error': str(e), 'session_id': session_id})}\n\n"

    # StreamingResponse로 SSE 응답 반환
    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Nginx 버퍼링 비활성화
        }
    )

# ✅ 기존 테스트 엔드포인트들


# ✅ 테스트 엔드포인트
@app.get("/api/test")
async def test_endpoint():
    return {
        "status": "success",
        "message": "백엔드 연결 성공!",
        "timestamp": now_kr_str_minute()
    }

# ✅ Echo 엔드포인트 (POST 테스트용)
@app.post("/api/echo")
async def echo_message_post(msg: TestMessage):
    return {
        "status": "success",
        "echo": msg.message,
        "received_at": now_kr_str_minute(),
        "original_timestamp": msg.timestamp
    }

# ✅ Task 관련 엔드포인트
@app.get("/api/tasks")
async def get_tasks():
    # 더미 태스크 데이터
    return {
        "status": "success",
        "tasks": [
            {
                "task_id": "GG-20250108-001",
                "task_name": "세션 매니저 구축",
                "status": "completed",
                "progress": 100
            },
            {
                "task_id": "GG-20250108-002",
                "task_name": "Task 추적 시스템",
                "status": "completed",
                "progress": 100
            },
            {
                "task_id": "GG-20250108-003",
                "task_name": "프론트엔드 연동",
                "status": "completed",
                "progress": 100
            },
            {
                "task_id": "GG-20250108-005",
                "task_name": "백엔드 안정화",
                "status": "in_progress",
                "progress": 50
            }
        ],
        "total": 4,
        "completed": 3,
        "in_progress": 1
    }

@app.post("/api/tasks")
async def create_task(task: TaskRequest):
    return {
        "status": "success",
        "message": f"Task {task.task_id} created",
        "task": task.dict()
    }

# ✅ 대시보드 통계 엔드포인트
@app.get("/api/dashboard/stats")
async def dashboard_stats():
    return {
        "status": "success",
        "stats": {
            "total_files": 1247,
            "total_lines": 45892,
            "active_sessions": 1,
            "memory_usage": {
                "sensory": 15,
                "working": 8,
                "episodic": 42,
                "semantic": 156
            },
            "system_health": "optimal",
            "last_update": datetime.datetime.now().isoformat()
        }
    }

# ✅ 파일 구조 엔드포인트
@app.get("/api/structure")
async def get_structure():
    return {
        "status": "success",
        "structure": {
            "frontend": {
                "path": "/gumgang-v2",
                "framework": "Next.js 15",
                "status": "active"
            },
            "backend": {
                "path": "/backend",
                "framework": "FastAPI",
                "status": "running"
            },
            "memory": {
                "path": "/memory",
                "type": "4-layer temporal system",
                "status": "initialized"
            }
        }
    }

# ✅ 메모리 상태 엔드포인트 (더미)
@app.get("/api/memory/status")
async def memory_status():
    return {
        "status": "success",
        "memory": {
            "layers": {
                "sensory": {"capacity": 100, "used": 15},
                "working": {"capacity": 50, "used": 8},
                "episodic": {"capacity": 500, "used": 42},
                "semantic": {"capacity": 1000, "used": 156}
            },
            "total_memories": 221,
            "last_cleanup": now_kr_str_minute()
        }
    }

# ✅ 프론트엔드용 메모리 상태 엔드포인트 (실제 메모리 시스템 연결)
@app.get("/memory/status")
async def frontend_memory_status():
    """프론트엔드 MemoryStatus 컴포넌트용 엔드포인트"""
    try:
        # 전역 메모리 시스템 인스턴스 사용
        memory_system = get_memory_system()

        # 어댑터를 사용하여 표준 tiers 계산
        from app.utils.memory_status_adapter import build_tiers_response, from_simple_memory
        tiers = from_simple_memory(memory_system)
        return build_tiers_response(tiers)

    except Exception as e:
        logger.error(f"메모리 상태 조회 실패: {str(e)}")
        # 표준 스키마의 기본값 반환
        from utils.time_kr import now_kr_str_minute
        return {
            "tiers": {
                "ultra_short": 0,
                "short_term": 0,
                "medium_term": 0,
                "long_term": 0,
                "meta": 0
            },
            "ts_kst": now_kr_str_minute()
        }

# ✅ 메모리 검색 엔드포인트
@app.get("/memory/search")
async def search_memory(query: Optional[str] = None):
    """메모리 검색 엔드포인트"""
    try:
        # 전역 메모리 시스템 인스턴스 사용
        memory_system = get_memory_system()

        if not query:
            return {
                "query": "",
                "results": [],
                "count": 0,
                "status": "no_query"
            }

        # 메모리 시스템의 retrieve_memories 메서드 사용 (표준 맵핑)
        results = memory_system.retrieve_memories(query, max_results=10)

        # 결과 포맷팅
        formatted_results = []
        layer_to_level = {
            "ultra_short": 1,
            "short_term": 2,
            "medium_term": 3,
            "long_term": 4,
        }
        for result in results or []:
            trace = result.get("trace") if isinstance(result, dict) else None
            content = getattr(trace, "content", "") if trace is not None else ""
            ts = getattr(trace, "timestamp", None) if trace is not None else None
            timestamp_str = str(ts) if ts else now_kr_str_minute()
            layer = result.get("layer") if isinstance(result, dict) else None
            level = layer_to_level.get(str(layer), 1)
            relevance = float(result.get("relevance", 0.0)) if isinstance(result, dict) else 0.0
            formatted_results.append({
                "content": content,
                "level": level,
                "timestamp": timestamp_str,
                "relevance": relevance
            })

        return {
            "query": query,
            "results": formatted_results,
            "count": len(formatted_results),
            "status": "success"
        }

    except Exception as e:
        logger.error(f"메모리 검색 실패: {str(e)}")
        return {
            "query": query or "",
            "results": [],
            "count": 0,
            "status": "error",
            "error": str(e)
        }

# ✅ 에러 핸들러
@app.exception_handler(404)
async def not_found_handler(request, exc):
    return JSONResponse(
        status_code=404,
        content={
            "status": "error",
            "message": "Endpoint not found",
            "path": str(request.url.path)
        }
    )

@app.exception_handler(500)
async def internal_error_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={
            "status": "error",
            "message": "Internal server error",
            "detail": str(exc)
        }
    )

if __name__ == "__main__":
    import uvicorn
    print("🚀 금강 2.0 간단 테스트 서버 시작...")
    print("📍 http://localhost:8000")
    print("📊 대시보드: http://localhost:3000")
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)
