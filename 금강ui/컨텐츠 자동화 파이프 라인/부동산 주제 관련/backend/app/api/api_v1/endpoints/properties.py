from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.api import deps
from app.core.config import settings

router = APIRouter()

@router.get("/", response_model=List[schemas.Property])
def read_properties(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    부동산 매물 목록 조회 (필터링 가능)
    """
    properties = crud.property.get_multi(db, skip=skip, limit=limit)
    return properties

@router.post("/", response_model=schemas.Property)
def create_property(
    *,
    db: Session = Depends(deps.get_db),
    property_in: schemas.PropertyCreate,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    새 부동산 매물 등록 (중개사/관리자용)
    """
    # 권한 확인: 일반 사용자는 매물을 등록할 수 없음
    if current_user.role not in [models.UserRole.AGENT, models.UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="권한이 없습니다. 중개사 또는 관리자만 매물을 등록할 수 있습니다.",
        )
    
    # 매물 등록 시 현재 사용자를 등록자로 설정
    property_in.registered_by = current_user.id
    
    return crud.property.create(db, obj_in=property_in)

@router.get("/{property_id}", response_model=schemas.Property)
def read_property(
    property_id: int,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    ID로 부동산 매물 상세 조회
    """
    property = crud.property.get(db, id=property_id)
    if not property:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="매물을 찾을 수 없습니다.",
        )
    return property

@router.put("/{property_id}", response_model=schemas.Property)
def update_property(
    *,
    db: Session = Depends(deps.get_db),
    property_id: int,
    property_in: schemas.PropertyUpdate,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    부동산 매물 정보 수정 (등록자/관리자용)
    """
    property = crud.property.get(db, id=property_id)
    if not property:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="매물을 찾을 수 없습니다.",
        )
    
    # 권한 확인: 등록자 또는 관리자만 수정 가능
    if property.registered_by != current_user.id and not crud.user.is_superuser(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="권한이 없습니다. 매물 등록자 또는 관리자만 수정할 수 있습니다.",
        )
    
    return crud.property.update(db, db_obj=property, obj_in=property_in)

@router.delete("/{property_id}", response_model=schemas.Property)
def delete_property(
    *,
    db: Session = Depends(deps.get_db),
    property_id: int,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    부동산 매물 삭제 (등록자/관리자용)
    """
    property = crud.property.get(db, id=property_id)
    if not property:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="매물을 찾을 수 없습니다.",
        )
    
    # 권한 확인: 등록자 또는 관리자만 삭제 가능
    if property.registered_by != current_user.id and not crud.user.is_superuser(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="권한이 없습니다. 매물 등록자 또는 관리자만 삭제할 수 있습니다.",
        )
    
    return crud.property.remove(db, id=property_id)

@router.get("/search/", response_model=List[schemas.Property])
def search_properties(
    *,
    db: Session = Depends(deps.get_db),
    keyword: Optional[str] = None,
    property_type: Optional[schemas.PropertyType] = None,
    transaction_type: Optional[schemas.TransactionType] = None,
    min_price: Optional[int] = None,
    max_price: Optional[int] = None,
    min_area: Optional[float] = None,
    max_area: Optional[float] = None,
    rooms: Optional[int] = None,
    bathrooms: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    부동산 매물 검색 (다양한 필터 적용 가능)
    """
    # 검색 조건 구성
    filters = {}
    if property_type:
        filters["property_type"] = property_type
    if transaction_type:
        filters["transaction_type"] = transaction_type
    if min_price is not None:
        filters["price__gte"] = min_price
    if max_price is not None:
        filters["price__lte"] = max_price
    if min_area is not None:
        filters["area__gte"] = min_area
    if max_area is not None:
        filters["area__lte"] = max_area
    if rooms is not None:
        filters["rooms"] = rooms
    if bathrooms is not None:
        filters["bathrooms"] = bathrooms
    
    # 키워드 검색 (주소, 제목, 설명 등에서 검색)
    if keyword:
        filters["search"] = keyword
    
    properties = crud.property.get_filtered(
        db, 
        skip=skip, 
        limit=limit, 
        **filters
    )
    
    return properties

@router.get("/nearby/", response_model=List[schemas.Property])
def get_nearby_properties(
    *,
    db: Session = Depends(deps.get_db),
    lat: float = Query(..., description="위도"),
    lon: float = Query(..., description="경도"),
    radius: float = Query(1000, description="반경 (미터 단위, 기본값: 1000m)"),
    property_type: Optional[schemas.PropertyType] = None,
    transaction_type: Optional[schemas.TransactionType] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    특정 위치 주변의 부동산 매물 검색
    """
    # 위치 기반 검색 조건
    location = {"lat": lat, "lon": lon, "radius": radius}
    
    # 추가 필터
    filters = {}
    if property_type:
        filters["property_type"] = property_type
    if transaction_type:
        filters["transaction_type"] = transaction_type
    
    properties = crud.property.get_nearby(
        db, 
        location=location,
        skip=skip,
        limit=limit,
        **filters
    )
    
    return properties
