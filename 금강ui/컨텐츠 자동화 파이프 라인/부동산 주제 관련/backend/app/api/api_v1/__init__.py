from fastapi import APIRouter

from app.api.api_v1.endpoints import users, auth, properties, search

api_router = APIRouter()

# API 엔드포인트 등록
api_router.include_router(auth.router, prefix="/auth", tags=["인증"])
api_router.include_router(users.router, prefix="/users", tags=["사용자"])
api_router.include_router(properties.router, prefix="/properties", tags=["부동산 매물"])
api_router.include_router(search.router, prefix="/search", tags=["검색"])
