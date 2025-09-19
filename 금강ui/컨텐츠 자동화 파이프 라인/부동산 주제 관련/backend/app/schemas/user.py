from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from datetime import datetime
from enum import Enum
from app.models.user import UserRole

# 공통 기본 클래스
class UserBase(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=50)
    phone_number: str = Field(..., pattern=r'^\+?[1-9]\d{1,14}$')  # E.164 형식

# 사용자 생성 스키마
class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=50)
    password_confirm: str
    
    @field_validator('password_confirm')
    @classmethod
    def passwords_match(cls, v, info):
        if 'password' in info.data and v != info.data['password']:
            raise ValueError('비밀번호가 일치하지 않습니다')
        return v

# 사용자 업데이트 스키마
class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(None, min_length=2, max_length=50)
    phone_number: Optional[str] = Field(None, pattern=r'^\+?[1-9]\d{1,14}$')
    profile_image_url: Optional[str] = None

# 비밀번호 변경 스키마
class UserPasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=50)
    new_password_confirm: str
    
    @field_validator('new_password_confirm')
    @classmethod
    def new_passwords_match(cls, v, info):
        if 'new_password' in info.data and v != info.data['new_password']:
            raise ValueError('새 비밀번호가 일치하지 않습니다')
        return v

# 데이터베이스 모델 응답 스키마
class UserInDBBase(UserBase):
    id: int
    role: UserRole
    is_active: bool
    is_verified: bool
    profile_image_url: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True

# API 응답용 사용자 스키마
class User(UserInDBBase):
    pass

# 데이터베이스 저장용 사용자 스키마 (비밀번호 포함)
class UserInDB(UserInDBBase):
    hashed_password: str

# 사용자 응답 스키마 (래퍼)
class UserInResponse(BaseModel):
    user: User

# JWT 토큰 페이로드
class TokenPayload(BaseModel):
    sub: Optional[int] = None  # 사용자 ID
    email: Optional[str] = None
    role: Optional[str] = None

# 로그인 응답 모델
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    refresh_token: str

# 리프레시 토큰 요청 모델
class TokenRefresh(BaseModel):
    refresh_token: str

# 로그인 요청 모델
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

# 비밀번호 재설정 요청 모델
class PasswordResetRequest(BaseModel):
    email: EmailStr

# 비밀번호 재설정 확인 모델
class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8, max_length=50)
    new_password_confirm: str
    
    @field_validator('new_password_confirm')
    @classmethod
    def new_passwords_match(cls, v, info):
        if 'new_password' in info.data and v != info.data['new_password']:
            raise ValueError('새 비밀번호가 일치하지 않습니다')
        return v
