import pytest
from typing import Generator
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.db.session import Base
from app.api import deps
from app.core.config import settings

# 테스트용 데이터베이스 설정
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    """테스트용 데이터베이스 세션"""
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


@pytest.fixture(scope="session")
def db() -> Generator:
    """테스트 데이터베이스 생성"""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="module")
def client() -> Generator:
    """테스트 클라이언트"""
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="function")
def db_session():
    """각 테스트 함수마다 새로운 데이터베이스 세션"""
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    
    # 의존성 오버라이드
    app.dependency_overrides[deps.get_db] = lambda: session
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()
    
    # 의존성 오버라이드 제거
    app.dependency_overrides.clear()


@pytest.fixture
def test_user_data():
    """테스트용 사용자 데이터"""
    return {
        "email": "test@example.com",
        "password": "testpassword123",
        "full_name": "테스트 사용자",
        "phone_number": "010-1234-5678"
    }


@pytest.fixture
def test_property_data():
    """테스트용 부동산 매물 데이터"""
    return {
        "title": "테스트 아파트",
        "description": "테스트용 아파트 매물입니다.",
        "property_type": "apartment",
        "transaction_type": "sale",
        "price": 500000000,
        "area": 84.5,
        "floor": 5,
        "building_floor": 15,
        "room_count": 3,
        "bathroom_count": 2,
        "address": "서울시 강남구 테스트동",
        "address_detail": "테스트 아파트 101동 505호",
        "latitude": 37.5665,
        "longitude": 126.9780,
        "is_parking": True,
        "is_elevator": True,
        "is_loan_possible": True,
        "is_pet": False
    }
