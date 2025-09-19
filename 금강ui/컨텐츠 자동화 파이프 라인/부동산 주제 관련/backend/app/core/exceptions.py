from typing import Any, Dict, Optional
from fastapi import HTTPException, status


class BaseCustomException(HTTPException):
    """
    커스텀 예외의 기본 클래스
    """
    def __init__(
        self,
        status_code: int,
        detail: Any = None,
        headers: Optional[Dict[str, Any]] = None,
    ) -> None:
        super().__init__(status_code=status_code, detail=detail, headers=headers)


class UserNotFoundException(BaseCustomException):
    """
    사용자를 찾을 수 없을 때 발생하는 예외
    """
    def __init__(self, user_id: int = None, email: str = None):
        if user_id:
            detail = f"ID {user_id}에 해당하는 사용자를 찾을 수 없습니다."
        elif email:
            detail = f"이메일 {email}에 해당하는 사용자를 찾을 수 없습니다."
        else:
            detail = "사용자를 찾을 수 없습니다."
        
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail
        )


class PropertyNotFoundException(BaseCustomException):
    """
    부동산 매물을 찾을 수 없을 때 발생하는 예외
    """
    def __init__(self, property_id: int):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ID {property_id}에 해당하는 매물을 찾을 수 없습니다."
        )


class InsufficientPermissionException(BaseCustomException):
    """
    권한이 부족할 때 발생하는 예외
    """
    def __init__(self, detail: str = "이 작업을 수행할 권한이 없습니다."):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail
        )


class InvalidCredentialsException(BaseCustomException):
    """
    잘못된 인증 정보일 때 발생하는 예외
    """
    def __init__(self, detail: str = "이메일 또는 비밀번호가 올바르지 않습니다."):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"}
        )


class EmailAlreadyExistsException(BaseCustomException):
    """
    이미 존재하는 이메일로 가입하려 할 때 발생하는 예외
    """
    def __init__(self, email: str):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"이메일 {email}은 이미 사용 중입니다."
        )


class PhoneAlreadyExistsException(BaseCustomException):
    """
    이미 존재하는 전화번호로 가입하려 할 때 발생하는 예외
    """
    def __init__(self, phone: str):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"전화번호 {phone}은 이미 사용 중입니다."
        )


class InvalidFileTypeException(BaseCustomException):
    """
    허용되지 않는 파일 형식일 때 발생하는 예외
    """
    def __init__(self, file_type: str, allowed_types: list):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"허용되지 않는 파일 형식입니다. ({file_type}) 허용되는 형식: {', '.join(allowed_types)}"
        )


class FileSizeExceededException(BaseCustomException):
    """
    파일 크기가 제한을 초과할 때 발생하는 예외
    """
    def __init__(self, file_size: int, max_size: int):
        super().__init__(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"파일 크기가 제한을 초과했습니다. (현재: {file_size}bytes, 최대: {max_size}bytes)"
        )


class DatabaseException(BaseCustomException):
    """
    데이터베이스 관련 예외
    """
    def __init__(self, detail: str = "데이터베이스 오류가 발생했습니다."):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail
        )


class ExternalAPIException(BaseCustomException):
    """
    외부 API 호출 실패 시 발생하는 예외
    """
    def __init__(self, api_name: str, detail: str = None):
        if detail:
            message = f"{api_name} API 호출 중 오류가 발생했습니다: {detail}"
        else:
            message = f"{api_name} API 호출 중 오류가 발생했습니다."
        
        super().__init__(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=message
        )


class ValidationException(BaseCustomException):
    """
    유효성 검사 실패 시 발생하는 예외
    """
    def __init__(self, field: str, detail: str):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{field}: {detail}"
        )


class RateLimitExceededException(BaseCustomException):
    """
    요청 제한을 초과했을 때 발생하는 예외
    """
    def __init__(self, detail: str = "요청 제한을 초과했습니다. 잠시 후 다시 시도해주세요."):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=detail,
            headers={"Retry-After": "60"}
        )


class MaintenanceException(BaseCustomException):
    """
    서비스 점검 중일 때 발생하는 예외
    """
    def __init__(self, detail: str = "서비스 점검 중입니다. 잠시 후 다시 이용해주세요."):
        super().__init__(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=detail
        )
