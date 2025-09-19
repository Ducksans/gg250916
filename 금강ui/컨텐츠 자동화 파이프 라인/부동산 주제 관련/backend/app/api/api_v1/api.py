from fastapi import APIRouter

from app.api.api_v1.endpoints import auth, users, properties, search, upload
from app.core.config import settings

api_router = APIRouter()

# 인증 관련 엔드포인트
api_router.include_router(
    auth.router, 
    prefix="/auth", 
    tags=["인증"]
)

# 사용자 관련 엔드포인트
api_router.include_router(
    users.router, 
    prefix="/users", 
    tags=["사용자"]
)

# 부동산 매물 관련 엔드포인트
api_router.include_router(
    properties.router, 
    prefix="/properties", 
    tags=["부동산 매물"]
)

# 검색 관련 엔드포인트
api_router.include_router(
    search.router, 
    prefix="/search", 
    tags=["검색"]
)

# 파일 업로드 관련 엔드포인트
api_router.include_router(
    upload.router, 
    prefix="/upload", 
    tags=["파일 업로드"]
)
