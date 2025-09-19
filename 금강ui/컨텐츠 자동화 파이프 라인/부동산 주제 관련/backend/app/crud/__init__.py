from .base import CRUDBase
from .crud_user import user
from .crud_property import property
from .crud_search import search_history

# 모든 CRUD 인스턴스를 한 곳에서 임포트할 수 있도록 설정
__all__ = [
    'CRUDBase',
    'user',
    'property',
    'search_history',
]
