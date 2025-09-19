# SQLAlchemy Base 클래스 임포트
from .base import Base

# 모든 모델을 한 곳에서 임포트할 수 있도록 함
__all__ = [
    'Base',
    'User',
    'UserRole',
    'Property',
    'PropertyType',
    'TransactionType',
    'PropertyStatus',
    'PropertyFeature',
    'PropertyImage',
    'SearchHistory'
]

# 모든 모델을 임포트하여 메타데이터에 등록
from .user import User, UserRole
from .property import Property, PropertyType, TransactionType, PropertyStatus, PropertyFeature, PropertyImage
from .search_history import SearchHistory
