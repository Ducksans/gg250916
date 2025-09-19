import uvicorn
import logging
from fastapi import FastAPI, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.api_v1.api import api_router
from app.core.config import settings
from app.core.middleware import (
    LoggingMiddleware,
    SecurityHeadersMiddleware,
    RateLimitMiddleware,
    APIVersionMiddleware
)
from app.core.exceptions import BaseCustomException

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc"
)

# 미들웨어 설정 (순서 중요!)
# 1. CORS 미들웨어
app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. GZip 압축 미들웨어
app.add_middleware(GZipMiddleware, minimum_size=1000)

# 3. 보안 헤더 미들웨어
app.add_middleware(SecurityHeadersMiddleware)

# 4. API 버전 미들웨어
app.add_middleware(APIVersionMiddleware, version="1.0.0")

# 5. 로깅 미들웨어
app.add_middleware(LoggingMiddleware)

# 6. 요청 제한 미들웨어 (개발 환경에서는 제한 완화)
app.add_middleware(RateLimitMiddleware, calls=1000, period=60)

# 예외 핸들러 설정
@app.exception_handler(BaseCustomException)
async def custom_exception_handler(request: Request, exc: BaseCustomException):
    """커스텀 예외 핸들러"""
    logger.error(f"커스텀 예외 발생: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=exc.headers
    )

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """HTTP 예외 핸들러"""
    logger.error(f"HTTP 예외 발생: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """요청 유효성 검사 예외 핸들러"""
    logger.error(f"유효성 검사 오류: {exc.errors()}")
    return JSONResponse(
        status_code=422,
        content={
            "detail": "입력 데이터가 유효하지 않습니다.",
            "errors": exc.errors()
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """일반 예외 핸들러"""
    logger.error(f"예상치 못한 오류 발생: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "서버 내부 오류가 발생했습니다."}
    )

# 정적 파일 서빙 (업로드된 이미지 등)
try:
    app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
except RuntimeError:
    # uploads 디렉토리가 없는 경우 생성
    import os
    os.makedirs("uploads", exist_ok=True)
    app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# API 라우터 등록
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
async def root():
    """
    루트 엔드포인트 - 서버 상태 확인용
    """
    return {
        "message": "금강부동산허브 API 서버가 정상적으로 실행 중입니다.",
        "docs": "/docs",
        "redoc": "/redoc"
    }

@app.get("/health")
async def health_check():
    """
    헬스 체크 엔드포인트 - 서버 상태 모니터링용
    """
    return {"status": "healthy"}

if __name__ == "__main__":
    # 개발 서버 실행
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        workers=4
    )
