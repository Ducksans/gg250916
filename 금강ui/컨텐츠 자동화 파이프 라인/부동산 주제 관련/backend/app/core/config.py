from pydantic_settings import BaseSettings
from typing import Optional, List

class Settings(BaseSettings):
    PROJECT_NAME: str = "금강부동산허브 API"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "your-secret-key-here"  # 실제 운영 환경에서는 .env에서 관리
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7일
    
    # 데이터베이스 설정 (SQLite)
    SQLITE_DB: str = "sqlite:///./real_estate_hub.db"
    DATABASE_URI: Optional[str] = None
    
    # 외부 API 키 (실제 운영 환경에서는 보안에 주의)
    KAKAO_REST_API_KEY: str = "your-kakao-rest-api-key"
    OPEN_API_SERVICE_KEY: str = "your-public-data-portal-key"
    
    # 이메일 설정
    EMAIL_RESET_TOKEN_EXPIRE_HOURS: int = 48
    EMAILS_FROM_EMAIL: Optional[str] = None
    EMAILS_FROM_NAME: Optional[str] = None
    
    # CORS 설정
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000",
    ]
    
    # 파일 업로드 설정
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_IMAGE_EXTENSIONS: set = {"png", "jpg", "jpeg", "gif", "webp"}
    UPLOAD_DIR: str = "uploads"
    
    class Config:
        case_sensitive = True

settings = Settings()

# 데이터베이스 URL 설정 (SQLite)
if not settings.DATABASE_URI:
    settings.DATABASE_URI = settings.SQLITE_DB
