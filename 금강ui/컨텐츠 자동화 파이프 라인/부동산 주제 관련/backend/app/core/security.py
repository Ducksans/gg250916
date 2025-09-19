from datetime import datetime, timedelta
from typing import Any, Optional, Union

from jose import jwt
from passlib.context import CryptContext
from pydantic import ValidationError

from app.core.config import settings
from app.schemas.user import TokenPayload

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_access_token(
    subject: Union[str, Any], 
    expires_delta: Optional[timedelta] = None,
    refresh: bool = False
) -> str:
    """
    JWT 액세스/리프레시 토큰 생성
    """
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    
    to_encode = {"exp": expire, "sub": str(subject), "type": "refresh" if refresh else "access"}
    encoded_jwt = jwt.encode(
        to_encode, 
        settings.SECRET_KEY, 
        algorithm=settings.ALGORITHM
    )
    return encoded_jwt

def create_tokens(user_id: int) -> dict:
    """
    액세스 토큰과 리프레시 토큰을 생성하여 반환
    """
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    refresh_token_expires = timedelta(days=30)  # 리프레시 토큰은 30일 유효
    
    return {
        "access_token": create_access_token(user_id, access_token_expires),
        "refresh_token": create_access_token(user_id, refresh_token_expires, refresh=True),
        "token_type": "bearer"
    }

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    평문 비밀번호와 해시된 비밀번호가 일치하는지 검증
    """
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """
    비밀번호 해시 생성
    """
    return pwd_context.hash(password)

def verify_token(token: str) -> Optional[TokenPayload]:
    """
    JWT 토큰 검증 및 페이로드 반환
    """
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        token_data = TokenPayload(**payload)
        # 토큰이 만료되었는지 확인
        if datetime.fromtimestamp(token_data.exp) < datetime.utcnow():
            return None
    except (jwt.JWTError, ValidationError):
        return None
    
    return token_data
