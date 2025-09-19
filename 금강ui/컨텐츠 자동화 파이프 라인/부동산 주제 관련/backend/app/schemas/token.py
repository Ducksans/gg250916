from pydantic import BaseModel

class Token(BaseModel):
    """
    JWT 토큰 응답 스키마
    """
    access_token: str
    token_type: str = "bearer"

class TokenPayload(BaseModel):
    """
    JWT 토큰 페이로드 스키마
    """
    sub: str  # 사용자 ID
    email: str
    role: str
    exp: int  # 만료 시간 (타임스탬프)

class Msg(BaseModel):
    """
    일반 메시지 응답 스키마
    """
    msg: str

class EmailStr(str):
    """
    이메일 유효성 검사를 위한 커스텀 타입
    """
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if "@" not in v:
            raise ValueError("유효한 이메일 주소가 아닙니다.")
        return v

class ResetPasswordRequest(BaseModel):
    """
    비밀번호 재설정 요청 스키마
    """
    email: str

class ResetPasswordConfirm(BaseModel):
    """
    비밀번호 재설정 확인 스키마
    """
    token: str
    new_password: str

class ChangePassword(BaseModel):
    """
    비밀번호 변경 스키마
    """
    current_password: str
    new_password: str

class OAuth2TokenRequestForm:
    """
    OAuth2 호환 토큰 요청 폼
    """
    def __init__(
        self,
        grant_type: str = None,
        username: str = None,
        password: str = None,
        scope: str = "",
        client_id: str = None,
        client_secret: str = None,
        refresh_token: str = None,
    ):
        self.grant_type = grant_type
        self.username = username
        self.password = password
        self.scopes = scope.split()
        self.client_id = client_id
        self.client_secret = client_secret
        self.refresh_token = refresh_token
