import os
import json
import subprocess
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi_utils.tasks import repeat_every
from fastapi.responses import PlainTextResponse
from utils.rules_enforcer import prepend_full_rules, HEAD_MARK
from app.middleware.approval_gate import ApprovalGateMiddleware

# ✅ 4계층 시간적 메모리 시스템 임포트
from app.core.memory.temporal import get_temporal_memory_system, shutdown_temporal_memory

# ✅ FastAPI 앱 초기화
app = FastAPI(title="금강 2.0 관제탑 - 4계층 메모리 시스템")
app.add_middleware(ApprovalGateMiddleware)

# ✅ CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
                        return PlainTextResponse(f"rules_enforcement_failed: {e}", status_code=500)
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

# ✅ 환경 변수 로드
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

# ✅ 라우터 모듈 등록
from app.routes import (
    status,
    memory,
    edit,
    structure,
    structure_fixes,
    recall_wiki,
    frontend_scaffold,
    electron_scaffold,
    create_component,
    file_ops,
)
from app.routes.ask import router as ask_router  # ✅ 메인 /ask 라우터
from health_route import router as health_router  # ✅ Health check 라우터
from terminal_executor import register_terminal_routes  # ✅ Terminal executor routes

app.include_router(health_router)  # ✅ Health check 라우터 추가
app.include_router(status.router)
app.include_router(memory.router)
app.include_router(edit.router)
app.include_router(ask_router)  # ✅ 여기가 실질 적용됨
app.include_router(structure.router)
app.include_router(structure_fixes.router)

# ✅ Terminal executor routes 등록
register_terminal_routes(app)
app.include_router(recall_wiki.router)
app.include_router(frontend_scaffold.router)
app.include_router(electron_scaffold.router)
app.include_router(create_component.router)
app.include_router(file_ops.router)

# ✅ 기억 수확 엔드포인트
@app.post("/harvest")
async def harvest(request: Request):
    try:
        chat = await request.json()
        timestamp = chat.get("timestamp", "unknown")
        title = chat.get("title", "untitled").replace(" ", "_").replace("/", "_")

        save_dir = "./memory/sources/chatgpt/"
        os.makedirs(save_dir, exist_ok=True)

        filename = f"chatgpt_{timestamp}_{title}.json"
        filepath = os.path.join(save_dir, filename)

        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(chat, f, ensure_ascii=False, indent=2)

        print(f"✅ JSON 기억 수확 완료: {filepath}")
        return {"status": "success", "file": filepath}

    except Exception as e:
        print(f"❌ 저장 실패: {e}")
        return {"status": "error", "message": str(e)}

# ✅ 4계층 메모리 시스템 초기화
@app.on_event("startup")
async def startup_event():
    print("🧠 4계층 시간적 메모리 시스템 초기화 중...")
    try:
        temporal_memory = get_temporal_memory_system()
        memory_stats = temporal_memory.get_memory_stats()
        print(f"✅ 4계층 메모리 시스템 활성화 완료: {memory_stats['layers']}")
    except Exception as e:
        print(f"❌ 메모리 시스템 초기화 실패: {e}")

# ✅ 메모리 시스템 종료 처리
@app.on_event("shutdown")
async def shutdown_event():
    print("🧠 4계층 메모리 시스템 안전 종료 중...")
    try:
        shutdown_temporal_memory()
        print("✅ 메모리 시스템 안전 종료 완료")
    except Exception as e:
        print(f"❌ 메모리 시스템 종료 실패: {e}")

# ✅ 구조 리포트 자동 점검 루프 (1시간마다)
@app.on_event("startup")
@repeat_every(seconds=3600)
def update_structure_report():
    print("🔄 금강 구조 리포트 자동 점검 시작...")

    script_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "scripts/analyze_structure.py")
    )

    try:
        subprocess.run(["python3", script_path], check=True)
        print("✅ 구조 리포트 업데이트 완료")
    except subprocess.CalledProcessError as e:
        print(f"❌ 구조 분석 실패: {e}")

# ✅ 4계층 메모리 시스템 모니터링 (5분마다)
@app.on_event("startup")
@repeat_every(seconds=300)
def monitor_memory_system():
    try:
        temporal_memory = get_temporal_memory_system()
        memory_stats = temporal_memory.get_memory_stats()

        # 메모리 사용량 로깅
        total_memories = sum(layer['current_size'] for layer in memory_stats['layers'].values() if 'current_size' in layer)
        print(f"🧠 메모리 모니터링: 총 {total_memories}개 기억 저장됨")

        # 메모리 포화 상태 확인
        for layer_name, layer_info in memory_stats['layers'].items():
            if 'current_size' in layer_info and 'capacity' in layer_info:
                usage_rate = layer_info['current_size'] / layer_info['capacity']
                if usage_rate > 0.8:
                    print(f"⚠️ {layer_name} 메모리 사용률 높음: {usage_rate:.1%}")

    except Exception as e:
        print(f"❌ 메모리 모니터링 실패: {e}")

# ✅ 4계층 메모리 시스템 상태 API
@app.get("/memory/status")
async def get_memory_status(include_legacy: bool = False):
    try:
        temporal_memory = get_temporal_memory_system()
        memory_stats = temporal_memory.get_memory_stats()

        # Standardized tiers + ts_kst via adapter
        from app.utils.memory_status_adapter import build_tiers_response, from_temporal_stats
        tiers = from_temporal_stats(memory_stats)
        base = build_tiers_response(tiers)

        # Optional legacy payload for transition period
        if include_legacy:
            base["legacy"] = {
                "layers": memory_stats.get('layers', {}),
                "statistics": memory_stats.get('statistics', {}),
                "patterns": memory_stats.get('patterns', {}),
                "activity_patterns": memory_stats.get('activity_patterns', {})
            }

        return base
    except Exception as e:
        # Preserve error schema for now; follow-up can standardize error shape if needed
        return {"status": "error", "message": str(e)}

# ✅ 사용자 프로필 조회 API
@app.get("/memory/profile/{user_id}")
async def get_user_profile(user_id: str = "default_user"):
    try:
        temporal_memory = get_temporal_memory_system()
        user_profile = temporal_memory.get_user_profile(user_id)

        if not user_profile:
            return {"status": "not_found", "message": f"User profile for {user_id} not found"}

        return {
            "status": "success",
            "user_id": user_id,
            "profile": user_profile
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

# ✅ memory_seed_master_list.md 보기
@app.get("/read_master_seed", response_class=PlainTextResponse)
def read_memory_seed():
    path = os.path.abspath("memory/sources/docs/memory_seed_master_list.md")
    if not os.path.exists(path):
        return "⚠️ memory_seed_master_list.md 파일을 찾을 수 없습니다."

    with open(path, "r", encoding="utf-8") as f:
        return f.read()
