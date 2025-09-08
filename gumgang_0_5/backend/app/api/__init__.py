"""
금강 2.0 API 메인 모듈

FastAPI 애플리케이션 설정 및 라우터 구성
프론트엔드와의 통신을 위한 RESTful API 및 WebSocket 엔드포인트 제공

Author: Gumgang AI Team
Version: 2.0
"""

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
import time
from datetime import datetime
import importlib

# 시스템 매니저 import — deferred to lifespan for optional dependency
# (Hotfix) app.core.system_manager is imported inside lifespan() using importlib

# 로거 설정
logger = logging.getLogger(__name__)

# 전역 변수
app_start_time = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    애플리케이션 생명주기 관리

    시작 시: 시스템 초기화
    종료 시: 시스템 정리
    """
    global app_start_time

    # 시작 시
    logger.info("🚀 금강 2.0 API 서버 시작...")
    app_start_time = datetime.now()

    # 시스템 매니저 초기화(지연 로딩)
    try:
        mod = importlib.import_module("app.core.system_manager")
        SystemConfig = getattr(mod, "SystemConfig")
        get_system_manager = getattr(mod, "get_system_manager")
        config = SystemConfig(
            enable_temporal_memory=True,
            enable_meta_cognitive=True,
            enable_creative=True,
            enable_dream=True,
            enable_empathy=True
        )
        app.state.manager = get_system_manager(config)
        success = await app.state.manager.initialize()
        if success:
            logger.info("✅ 시스템 초기화 완료")
        else:
            logger.error("❌ 시스템 초기화 실패")
    except Exception as e:
        logger.error(f"❌ 초기화 중 오류(지연 로딩): {e}")
        app.state.manager = None  # 제한 모드로 계속 진행

    yield

    # 종료 시
    logger.info("🛑 금강 2.0 API 서버 종료 중...")

    try:
        manager = getattr(app.state, "manager", None)
        if manager is not None and hasattr(manager, "shutdown"):
            await manager.shutdown()
            logger.info("✅ 시스템 정상 종료")
    except Exception as e:
        logger.error(f"❌ 종료 중 오류: {e}")


# FastAPI 앱 생성
app = FastAPI(
    title="금강 2.0 API",
    description="차세대 AI 인지 시스템 백엔드 API",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan
)

# CORS 설정
# FRONTEND_PORT 환경변수 안전 파싱 (os 미임포트 상황에서도 동작)
try:
    import os as _os
    _frontend_port_env = _os.getenv("FRONTEND_PORT", "3000")
except Exception:
    _frontend_port_env = "3000"
frontend_port = int(_frontend_port_env) if str(_frontend_port_env).isdigit() else 3000
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        f"http://localhost:{frontend_port}",
        "http://localhost:3000",  # Next.js 개발 서버
        "http://localhost:5173",  # Vite 개발 서버
        "http://localhost:8080",  # Vue 개발 서버
        "http://localhost:4200",  # Angular 개발 서버
        "https://gumgang.ai",     # 프로덕션 도메인
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 전역 예외 처리
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """전역 예외 처리기"""
    logger.error(f"처리되지 않은 예외: {exc}", exc_info=True)

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal Server Error",
            "message": str(exc) if app.state.debug else "서버 오류가 발생했습니다",
            "path": str(request.url)
        }
    )


# 미들웨어: 요청 로깅
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """모든 HTTP 요청 로깅"""
    start_time = time.time()

    # 요청 로깅
    logger.info(f"📥 {request.method} {request.url.path}")

    # 요청 처리
    response = await call_next(request)

    # 응답 시간 계산
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)

    # 응답 로깅
    logger.info(
        f"📤 {request.method} {request.url.path} "
        f"- {response.status_code} ({process_time:.3f}s)"
    )

    return response


# 기본 라우트
@app.get("/")
async def root():
    """루트 엔드포인트"""
    return {
        "name": "금강 2.0 API",
        "version": "2.0.0",
        "status": "running",
        "docs": "/api/docs",
        "health": "/api/v1/health"
    }


@app.get("/api/v1/health")
async def health_check():
    """
    시스템 헬스 체크 엔드포인트

    Returns:
        시스템 상태 및 메트릭
    """
    global app_start_time

    try:
        manager = app.state.manager

        # 시스템 상태 확인
        systems_status = {
            "temporal_memory": bool(manager.temporal_memory),
            "meta_cognitive": bool(manager.meta_cognitive),
            "creative_engine": bool(manager.creative_engine),
            "dream_system": bool(manager.dream_system),
            "empathy_system": bool(manager.empathy_system)
        }

        # 가동 시간 계산
        if app_start_time:
            uptime = datetime.now() - app_start_time
            uptime_str = f"{uptime.days}d {uptime.seconds // 3600}h {(uptime.seconds % 3600) // 60}m"
        else:
            uptime_str = "N/A"

        # 메트릭 수집
        metrics = {
            "total_requests": manager.metrics.get("total_requests", 0),
            "errors": manager.metrics.get("errors", 0),
            "avg_response_time": manager.metrics.get("avg_response_time", 0),
            "memory_usage": "N/A"  # 추후 구현
        }

        return {
            "status": "healthy" if all(systems_status.values()) else "degraded",
            "uptime": uptime_str,
            "systems": systems_status,
            "metrics": metrics,
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        logger.error(f"헬스 체크 실패: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }


@app.get("/api/health")
async def health_check_alias():
    """
    Alias for Vite Dev UI compatibility. Mirrors /api/v1/health.
    """
    return await health_check()

# 라우터 등록 (별도 파일에서 import) — 의존성 가드
try:
    from app.api.routes import chat, dashboard, chat_gateway
    # New chat gateway provides /api/chat and /api/chat/stream
    app.include_router(chat_gateway.router)
    # Legacy/other routes
    app.include_router(chat.router, prefix="/api/v1/chat", tags=["chat"])
    app.include_router(dashboard.router, prefix="/api/v1", tags=["dashboard"])
except Exception as e:
    logger.warning(f"라우터 등록 건너뜀(선택 의존성 실패): {e}")
# app.include_router(memory.router, prefix="/api/v1/memory", tags=["memory"])
# app.include_router(creative.router, prefix="/api/v1/creative", tags=["creative"])
# app.include_router(dream.router, prefix="/api/v1/dream", tags=["dream"])
# app.include_router(empathy.router, prefix="/api/v1/empathy", tags=["empathy"])


# WebSocket 엔드포인트 (별도 파일에서 import)
# from app.api.websockets import websocket_endpoint
# app.add_api_websocket_route("/ws", websocket_endpoint)


# 개발 모드 설정
if __name__ == "__main__":
    import uvicorn

    # 로깅 설정
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    # 개발 서버 실행
    uvicorn.run(
        "app.api:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
