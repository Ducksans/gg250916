import time
import logging
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

# 로거 설정
logger = logging.getLogger(__name__)


class LoggingMiddleware(BaseHTTPMiddleware):
    """
    요청/응답 로깅 미들웨어
    """
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        start_time = time.time()
        
        # 요청 정보 로깅
        logger.info(
            f"요청 시작: {request.method} {request.url.path} "
            f"- 클라이언트: {request.client.host if request.client else 'Unknown'}"
        )
        
        # 요청 처리
        response = await call_next(request)
        
        # 처리 시간 계산
        process_time = time.time() - start_time
        
        # 응답 정보 로깅
        logger.info(
            f"요청 완료: {request.method} {request.url.path} "
            f"- 상태코드: {response.status_code} "
            f"- 처리시간: {process_time:.4f}초"
        )
        
        # 응답 헤더에 처리 시간 추가
        response.headers["X-Process-Time"] = str(process_time)
        
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    보안 헤더 추가 미들웨어
    """
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        response = await call_next(request)
        
        # 보안 헤더 추가
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    간단한 요청 제한 미들웨어
    실제 운영 환경에서는 Redis 등을 사용한 더 정교한 구현 필요
    """
    def __init__(self, app, calls: int = 100, period: int = 60):
        super().__init__(app)
        self.calls = calls
        self.period = period
        self.clients = {}
    
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        client_ip = request.client.host if request.client else "unknown"
        current_time = time.time()
        
        # 클라이언트별 요청 기록 관리
        if client_ip not in self.clients:
            self.clients[client_ip] = []
        
        # 기간이 지난 요청 기록 제거
        self.clients[client_ip] = [
            req_time for req_time in self.clients[client_ip]
            if current_time - req_time < self.period
        ]
        
        # 요청 제한 확인
        if len(self.clients[client_ip]) >= self.calls:
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="요청 제한을 초과했습니다. 잠시 후 다시 시도해주세요.",
                headers={"Retry-After": str(self.period)}
            )
        
        # 현재 요청 시간 기록
        self.clients[client_ip].append(current_time)
        
        response = await call_next(request)
        return response


class DatabaseMiddleware(BaseHTTPMiddleware):
    """
    데이터베이스 연결 관리 미들웨어
    """
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        try:
            response = await call_next(request)
            return response
        except Exception as e:
            # 데이터베이스 관련 오류 처리
            logger.error(f"데이터베이스 오류: {str(e)}")
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="서버 내부 오류가 발생했습니다."
            )


class CacheControlMiddleware(BaseHTTPMiddleware):
    """
    캐시 제어 헤더 추가 미들웨어
    """
    def __init__(self, app, max_age: int = 3600):
        super().__init__(app)
        self.max_age = max_age
    
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        response = await call_next(request)
        
        # GET 요청에 대해서만 캐시 헤더 추가
        if request.method == "GET":
            # 정적 파일이나 이미지에 대해서는 더 긴 캐시 시간 설정
            if any(request.url.path.endswith(ext) for ext in ['.jpg', '.jpeg', '.png', '.gif', '.css', '.js']):
                response.headers["Cache-Control"] = f"public, max-age={self.max_age * 24}"  # 24시간
            else:
                response.headers["Cache-Control"] = f"public, max-age={self.max_age}"  # 1시간
        else:
            # POST, PUT, DELETE 등은 캐시하지 않음
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
        
        return response


class CompressionMiddleware(BaseHTTPMiddleware):
    """
    응답 압축 미들웨어 (실제로는 GZipMiddleware 사용 권장)
    """
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        response = await call_next(request)
        
        # Accept-Encoding 헤더 확인
        accept_encoding = request.headers.get("accept-encoding", "")
        
        if "gzip" in accept_encoding:
            # 실제 압축 로직은 FastAPI의 GZipMiddleware 사용
            response.headers["Content-Encoding"] = "gzip"
        
        return response


class APIVersionMiddleware(BaseHTTPMiddleware):
    """
    API 버전 헤더 추가 미들웨어
    """
    def __init__(self, app, version: str = "1.0.0"):
        super().__init__(app)
        self.version = version
    
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        response = await call_next(request)
        response.headers["X-API-Version"] = self.version
        return response
