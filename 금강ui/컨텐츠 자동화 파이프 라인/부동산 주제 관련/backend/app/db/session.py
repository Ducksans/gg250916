from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# SQLAlchemy 엔진 생성
engine = create_engine(
    settings.DATABASE_URI,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    pool_recycle=300
)

# 세션 팩토리
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 베이스 모델
Base = declarative_base()

def get_db():
    """
    의존성 주입을 위한 DB 세션 생성기
    각 요청마다 새로운 세션을 생성하고 요청이 완료되면 세션을 닫음
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
