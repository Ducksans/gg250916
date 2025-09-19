from typing import List, Optional, Dict, Any, Union
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func

from app.models.property import Property, PropertyImage, PropertyFeature, PropertyStatus
from app.schemas.property import PropertyCreate, PropertyUpdate, PropertyImageCreate, PropertyFeatureCreate
from app.crud.base import CRUDBase

class CRUDProperty(CRUDBase[Property, PropertyCreate, PropertyUpdate]):
    def get_multi(
        self, db: Session, *, skip: int = 0, limit: int = 100, owner_id: int = None
    ) -> List[Property]:
        query = db.query(self.model)
        if owner_id is not None:
            query = query.filter(Property.owner_id == owner_id)
        return query.offset(skip).limit(limit).all()

    def create_with_owner(
        self, db: Session, *, obj_in: PropertyCreate, owner_id: int
    ) -> Property:
        db_obj = Property(
            **obj_in.dict(exclude={"images", "features"}),
            owner_id=owner_id,
            status=PropertyStatus.AVAILABLE
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        
        # 이미지 추가
        if hasattr(obj_in, 'images'):
            for image in obj_in.images:
                self.add_image(db, property_id=db_obj.id, image_in=image)
        
        # 특징 추가
        if hasattr(obj_in, 'features'):
            for feature in obj_in.features:
                self.add_feature(db, property_id=db_obj.id, feature_in=feature)
        
        return db_obj

    def add_image(
        self, db: Session, *, property_id: int, image_in: PropertyImageCreate
    ) -> PropertyImage:
        db_obj = PropertyImage(**image_in.dict(), property_id=property_id)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def add_feature(
        self, db: Session, *, property_id: int, feature_in: PropertyFeatureCreate
    ) -> PropertyFeature:
        db_obj = PropertyFeature(**feature_in.dict(), property_id=property_id)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_multi_by_filters(
        self, db: Session, *, 
        skip: int = 0, 
        limit: int = 100,
        filters: Dict[str, Any] = None
    ) -> List[Property]:
        query = db.query(self.model)
        
        # 필터링 조건 적용
        if filters:
            if "property_type" in filters and filters["property_type"]:
                query = query.filter(Property.property_type == filters["property_type"])
                
            if "transaction_type" in filters and filters["transaction_type"]:
                query = query.filter(Property.transaction_type == filters["transaction_type"])
                
            if "min_price" in filters and filters["min_price"] is not None:
                query = query.filter(Property.price >= filters["min_price"])
                
            if "max_price" in filters and filters["max_price"] is not None:
                query = query.filter(Property.price <= filters["max_price"])
                
            if "min_area" in filters and filters["min_area"] is not None:
                query = query.filter(Property.area >= filters["min_area"])
                
            if "max_area" in filters and filters["max_area"] is not None:
                query = query.filter(Property.area <= filters["max_area"])
                
            if "rooms" in filters and filters["rooms"] is not None:
                query = query.filter(Property.room_count == filters["rooms"])
                
            if "bathrooms" in filters and filters["bathrooms"] is not None:
                query = query.filter(Property.bathroom_count == filters["bathrooms"])
                
            if "has_parking" in filters and filters["has_parking"] is not None:
                query = query.filter(Property.is_parking == filters["has_parking"])
                
            if "has_elevator" in filters and filters["has_elevator"] is not None:
                query = query.filter(Property.is_elevator == filters["has_elevator"])
                
            if "is_pet_allowed" in filters and filters["is_pet_allowed"] is not None:
                query = query.filter(Property.is_pet == filters["is_pet_allowed"])
                
            if "is_loan_available" in filters and filters["is_loan_available"] is not None:
                query = query.filter(Property.is_loan_possible == filters["is_loan_available"])
                
            if "status" in filters and filters["status"] is not None:
                query = query.filter(Property.status == filters["status"])
        
        # 정렬
        if "sort_by" in filters and filters["sort_by"]:
            sort_field = getattr(Property, filters["sort_by"], None)
            if sort_field is not None:
                if filters.get("sort_order", "desc").lower() == "asc":
                    query = query.order_by(sort_field.asc())
                else:
                    query = query.order_by(sort_field.desc())
        else:
            # 기본 정렬: 최신순
            query = query.order_by(Property.created_at.desc())
        
        # 위치 기반 검색 (반경 내 매물)
        if "latitude" in filters and "longitude" in filters and "radius" in filters:
            if all([filters["latitude"], filters["longitude"], filters["radius"]]):
                # 하버사인 공식을 사용한 반경 내 검색 (SQLite에서는 지원하지 않으므로 애플리케이션 레벨에서 처리 필요)
                # 여기서는 간단한 예시만 제공
                pass
        
        return query.offset(skip).limit(limit).all()

    def search_by_keyword(
        self, db: Session, *, keyword: str, skip: int = 0, limit: int = 100
    ) -> List[Property]:
        """키워드로 매물 검색 (제목, 설명, 주소에서 검색)"""
        search = f"%{keyword}%"
        return (
            db.query(self.model)
            .filter(
                or_(
                    Property.title.ilike(search),
                    Property.description.ilike(search),
                    Property.address.ilike(search),
                    Property.address_detail.ilike(search)
                )
            )
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_property_with_details(
        self, db: Session, property_id: int
    ) -> Optional[Property]:
        """매물 상세 정보와 함께 이미지, 특징, 소유자 정보를 함께 조회"""
        return (
            db.query(Property)
            .filter(Property.id == property_id)
            .first()
        )

    def update_status(
        self, db: Session, *, db_obj: Property, status: PropertyStatus
    ) -> Property:
        db_obj.status = status
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

# Property CRUD 인스턴스 생성
property = CRUDProperty(Property)
