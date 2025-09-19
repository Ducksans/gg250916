import secrets
from datetime import datetime, timedelta
from typing import Any, Dict, Optional
from pathlib import Path
from jose import jwt

from app.core.config import settings


def generate_password_reset_token(email: str) -> str:
    """
    비밀번호 재설정을 위한 토큰 생성
    """
    delta = timedelta(hours=settings.EMAIL_RESET_TOKEN_EXPIRE_HOURS)
    now = datetime.utcnow()
    expires = now + delta
    exp = expires.timestamp()
    encoded_jwt = jwt.encode(
        {"exp": exp, "nbf": now, "sub": email}, 
        settings.SECRET_KEY, 
        algorithm="HS256",
    )
    return encoded_jwt


def verify_password_reset_token(token: str) -> Optional[str]:
    """
    비밀번호 재설정 토큰 검증
    """
    try:
        decoded_token = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        return decoded_token["sub"]
    except jwt.JWTError:
        return None


def send_reset_password_email(email_to: str, email: str, token: str) -> None:
    """
    비밀번호 재설정 이메일 발송
    실제 구현에서는 이메일 서비스 (SendGrid, AWS SES 등)를 사용
    """
    # TODO: 실제 이메일 발송 로직 구현
    print(f"비밀번호 재설정 이메일을 {email_to}로 발송했습니다.")
    print(f"재설정 토큰: {token}")
    pass


def send_new_account_email(email_to: str, username: str, password: str) -> None:
    """
    새 계정 생성 알림 이메일 발송
    """
    # TODO: 실제 이메일 발송 로직 구현
    print(f"새 계정 생성 알림을 {email_to}로 발송했습니다.")
    print(f"사용자명: {username}, 임시 비밀번호: {password}")
    pass


def generate_random_password(length: int = 12) -> str:
    """
    랜덤 비밀번호 생성
    """
    alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
    password = ''.join(secrets.choice(alphabet) for i in range(length))
    return password


def create_upload_folder(folder_name: str) -> Path:
    """
    업로드 폴더 생성
    """
    upload_dir = Path("uploads") / folder_name
    upload_dir.mkdir(parents=True, exist_ok=True)
    return upload_dir


def allowed_file(filename: str, allowed_extensions: set) -> bool:
    """
    허용된 파일 확장자인지 확인
    """
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in allowed_extensions


def get_file_size(file_path: Path) -> int:
    """
    파일 크기 반환 (바이트 단위)
    """
    return file_path.stat().st_size


def format_file_size(size_bytes: int) -> str:
    """
    파일 크기를 읽기 쉬운 형태로 포맷팅
    """
    if size_bytes == 0:
        return "0B"
    
    size_names = ["B", "KB", "MB", "GB", "TB"]
    i = 0
    while size_bytes >= 1024 and i < len(size_names) - 1:
        size_bytes /= 1024.0
        i += 1
    
    return f"{size_bytes:.1f}{size_names[i]}"


def validate_korean_phone_number(phone: str) -> bool:
    """
    한국 휴대폰 번호 유효성 검사
    """
    import re
    pattern = r'^01[016789]-?\d{3,4}-?\d{4}$'
    return bool(re.match(pattern, phone))


def format_korean_phone_number(phone: str) -> str:
    """
    한국 휴대폰 번호 포맷팅 (010-1234-5678)
    """
    import re
    # 숫자만 추출
    numbers = re.sub(r'[^0-9]', '', phone)
    
    if len(numbers) == 11 and numbers.startswith('01'):
        return f"{numbers[:3]}-{numbers[3:7]}-{numbers[7:]}"
    elif len(numbers) == 10 and numbers.startswith('01'):
        return f"{numbers[:3]}-{numbers[3:6]}-{numbers[6:]}"
    
    return phone


def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    두 지점 간의 거리 계산 (하버사인 공식, km 단위)
    """
    import math
    
    # 지구 반지름 (km)
    R = 6371.0
    
    # 라디안으로 변환
    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)
    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)
    
    # 위도와 경도 차이
    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad
    
    # 하버사인 공식
    a = math.sin(dlat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    distance = R * c
    return distance


def format_price(price: int) -> str:
    """
    가격을 한국어 형태로 포맷팅 (예: 12억 3천만원)
    """
    if price >= 100000000:  # 1억 이상
        eok = price // 100000000
        remainder = price % 100000000
        if remainder >= 10000000:  # 천만 단위
            cheon = remainder // 10000000
            return f"{eok}억 {cheon}천만원"
        elif remainder >= 1000000:  # 백만 단위
            baek = remainder // 1000000
            return f"{eok}억 {baek}백만원"
        else:
            return f"{eok}억원"
    elif price >= 10000000:  # 천만 이상
        cheon = price // 10000000
        remainder = price % 10000000
        if remainder >= 1000000:
            baek = remainder // 1000000
            return f"{cheon}천{baek}백만원"
        else:
            return f"{cheon}천만원"
    elif price >= 1000000:  # 백만 이상
        baek = price // 1000000
        return f"{baek}백만원"
    else:
        return f"{price:,}원"


def slugify(text: str) -> str:
    """
    텍스트를 URL 친화적인 슬러그로 변환
    """
    import re
    import unicodedata
    
    # 유니코드 정규화
    text = unicodedata.normalize('NFKD', text)
    
    # 소문자로 변환
    text = text.lower()
    
    # 특수문자를 하이픈으로 변경
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[-\s]+', '-', text)
    
    return text.strip('-')
