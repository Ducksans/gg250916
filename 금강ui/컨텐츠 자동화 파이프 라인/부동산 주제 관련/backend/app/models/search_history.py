from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.models.base import Base
from datetime import datetime

class SearchHistory(Base):
    __tablename__ = "search_histories"
    
    id = Column(Integer, primary_key=True, index=True)
    query = Column(String(255), nullable=False)  # 검색어
    search_type = Column(String(50), nullable=False)  # 검색 유형 (예: 'property', 'school', 'facility' 등)
    search_params = Column(JSON, nullable=True)  # 검색 파라미터 (JSON 형식)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Foreign Keys
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)  # 비회원도 검색 가능하므로 nullable=True
    
    # Relationships
    user = relationship("User", back_populates="search_histories")
    
    def __repr__(self):
        return f"<SearchHistory {self.id}: {self.query}>"
