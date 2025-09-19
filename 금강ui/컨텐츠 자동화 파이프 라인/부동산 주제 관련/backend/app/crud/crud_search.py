from typing import List, Optional, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.search_history import SearchHistory
from app.schemas.search import SearchHistoryCreate
from app.crud.base import CRUDBase

class CRUDSearch(CRUDBase[SearchHistory, SearchHistoryCreate, Dict[str, Any]]):
    def create_with_user(
        self, db: Session, *, obj_in: SearchHistoryCreate, user_id: Optional[int] = None
    ) -> SearchHistory:
        """사용자 검색 기록 생성"""
        db_obj = SearchHistory(
            **obj_in.dict(),
            user_id=user_id
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_multi_by_user(
        self, db: Session, *, user_id: int, skip: int = 0, limit: int = 100
    ) -> List[SearchHistory]:
        """사용자별 검색 기록 조회 (최근 순)"""
        return (
            db.query(self.model)
            .filter(SearchHistory.user_id == user_id)
            .order_by(desc(SearchHistory.created_at))
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_popular_searches(
        self, db: Session, *, limit: int = 10, days: int = 7
    ) -> List[Dict[str, Any]]:
        """인기 검색어 조회 (지정된 기간 내)"""
        from sqlalchemy import func, and_
        
        # 최근 일주일 동안의 인기 검색어 조회
        return (
            db.query(
                SearchHistory.query,
                func.count(SearchHistory.id).label("search_count")
            )
            .filter(
                and_(
                    SearchHistory.created_at >= datetime.utcnow() - datetime.timedelta(days=days),
                    SearchHistory.search_type == "property"  # 부동산 검색만 필터링
                )
            )
            .group_by(SearchHistory.query)
            .order_by(desc("search_count"))
            .limit(limit)
            .all()
        )

    def get_suggestions(
        self, db: Session, *, query: str, limit: int = 5
    ) -> List[str]:
        """검색어 자동완성을 위한 제안 목록 조회"""
        search = f"{query}%"
        return (
            db.query(SearchHistory.query)
            .filter(SearchHistory.query.like(search))
            .group_by(SearchHistory.query)
            .order_by(desc(func.count(SearchHistory.id)))
            .limit(limit)
            .all()
        )

    def delete_old_searches(
        self, db: Session, *, days: int = 90
    ) -> int:
        """지정된 일수 이전의 검색 기록 삭제"""
        cutoff_date = datetime.utcnow() - datetime.timedelta(days=days)
        result = (
            db.query(SearchHistory)
            .filter(SearchHistory.created_at < cutoff_date)
            .delete(synchronize_session=False)
        )
        db.commit()
        return result

# SearchHistory CRUD 인스턴스 생성
search_history = CRUDSearch(SearchHistory)
