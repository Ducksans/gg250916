from datetime import datetime
from typing import Any

from sqlalchemy import Column, DateTime, Integer
from sqlalchemy.ext.declarative import as_declarative, declared_attr

@as_declarative()
class Base:
    id: Any
    __name__: str
    
    # 테이블 이름을 자동으로 생성 (클래스 이름을 소문자로 변환)
    @declared_attr
    def __tablename__(cls) -> str:
        return cls.__name__.lower()
    
    # 공통 컬럼
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
