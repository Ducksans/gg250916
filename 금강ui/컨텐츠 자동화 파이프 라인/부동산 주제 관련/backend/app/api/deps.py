from typing import Generator, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.core import security
from app.core.config import settings
from app.crud import crud_user
from app.db.session import SessionLocal
from app.models.user import User
from app.schemas.user import TokenPayload

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

def get_db() -> Generator:
    """
    의존성 주입을 위한 DB 세션 생성기
    각 요청마다 새로운 세션을 생성하고 요청이 완료되면 세션을 닫음
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(
    db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)
) -> User:
    """
    현재 인증된 사용자를 가져오는 의존성 함수
    """
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        token_data = TokenPayload(**payload)
    except (jwt.JWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="유효하지 않은 인증 정보입니다.",
        )
    
    user = crud_user.user.get(db, id=token_data.sub)
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail="비활성화된 사용자입니다.")
    
    return user

def get_current_active_superuser(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    현재 인증된 사용자가 슈퍼유저인지 확인하는 의존성 함수
    """
    if not crud_user.user.is_superuser(current_user):
        raise HTTPException(
            status_code=400, 
            detail="권한이 없습니다."
        )
    return current_user
