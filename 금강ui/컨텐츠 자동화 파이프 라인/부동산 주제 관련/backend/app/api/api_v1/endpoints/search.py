from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.api import deps
from app.core.config import settings

router = APIRouter()

@router.get("/autocomplete", response_model=List[schemas.SearchSuggestion])
def autocomplete_search(
    *,
    db: Session = Depends(deps.get_db),
    query: str = Query(..., min_length=1, description="검색어"),
    limit: int = Query(5, ge=1, le=20, description="최대 결과 수"),
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    검색어 자동완성
    """
    suggestions = crud.search.get_suggestions(db, query=query, limit=limit)
    return suggestions

@router.get("/properties", response_model=List[schemas.Property])
def search_properties(
    *,
    db: Session = Depends(deps.get_db),
    query: str = Query(..., description="검색어 (지역명, 역명, 학교명 등)"),
    property_type: Optional[schemas.PropertyType] = None,
    transaction_type: Optional[schemas.TransactionType] = None,
    min_price: Optional[int] = None,
    max_price: Optional[int] = None,
    min_area: Optional[float] = None,
    max_area: Optional[float] = None,
    rooms: Optional[int] = None,
    bathrooms: Optional[int] = None,
    has_elevator: Optional[bool] = None,
    has_parking: Optional[bool] = None,
    is_pet_friendly: Optional[bool] = None,
    is_new: Optional[bool] = None,
    is_negotiable: Optional[bool] = None,
    sort_by: Optional[str] = Query("relevance", description="정렬 기준 (relevance, price_asc, price_desc, area_asc, area_desc, date_desc)"),
    skip: int = 0,
    limit: int = 20,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    부동산 매물 통합 검색
    """
    # 검색 필터 구성
    filters = {
        "query": query,
        "property_type": property_type,
        "transaction_type": transaction_type,
        "min_price": min_price,
        "max_price": max_price,
        "min_area": min_area,
        "max_area": max_area,
        "rooms": rooms,
        "bathrooms": bathrooms,
        "has_elevator": has_elevator,
        "has_parking": has_parking,
        "is_pet_friendly": is_pet_friendly,
        "is_new": is_new,
        "is_negotiable": is_negotiable,
        "sort_by": sort_by,
    }
    
    # 검색 실행
    properties = crud.search.search_properties(
        db, 
        skip=skip, 
        limit=limit, 
        **{k: v for k, v in filters.items() if v is not None}
    )
    
    return properties

@router.get("/map", response_model=schemas.MapSearchResult)
def search_on_map(
    *,
    db: Session = Depends(deps.get_db),
    ne_lat: float = Query(..., description="북동쪽 위도"),
    ne_lng: float = Query(..., description="북동쪽 경도"),
    sw_lat: float = Query(..., description="남서쪽 위도"),
    sw_lng: float = Query(..., description="남서쪽 경도"),
    zoom: int = Query(12, ge=1, le=20, description="지도 확대/축소 레벨"),
    property_type: Optional[schemas.PropertyType] = None,
    transaction_type: Optional[schemas.TransactionType] = None,
    min_price: Optional[int] = None,
    max_price: Optional[int] = None,
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    지도 기반 부동산 매물 검색
    """
    # 지도 경계 상자
    bounds = {
        "ne": {"lat": ne_lat, "lng": ne_lng},
        "sw": {"lat": sw_lat, "lng": sw_lng},
        "zoom": zoom
    }
    
    # 검색 필터
    filters = {
        "property_type": property_type,
        "transaction_type": transaction_type,
        "min_price": min_price,
        "max_price": max_price,
    }
    
    # 지도 기반 검색 실행
    result = crud.search.search_on_map(
        db,
        bounds=bounds,
        **{k: v for k, v in filters.items() if v is not None}
    )
    
    return result

@router.get("/schools", response_model=List[schemas.SchoolInfo])
def search_schools(
    *,
    db: Session = Depends(deps.get_db),
    query: str = Query(..., description="학교명 또는 지역명"),
    school_type: Optional[str] = None,
    limit: int = Query(10, ge=1, le=50, description="최대 결과 수"),
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    학교 검색
    """
    schools = crud.search.search_schools(
        db,
        query=query,
        school_type=school_type,
        limit=limit
    )
    return schools

@router.get("/facilities", response_model=List[schemas.FacilityInfo])
def search_facilities(
    *,
    db: Session = Depends(deps.get_db),
    lat: float = Query(..., description="위도"),
    lng: float = Query(..., description="경도"),
    category: Optional[str] = None,
    radius: int = Query(1000, description="검색 반경 (미터)", ge=100, le=5000),
    limit: int = Query(20, ge=1, le=50, description="최대 결과 수"),
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    주변 편의시설 검색
    """
    location = {"lat": lat, "lng": lng}
    
    facilities = crud.search.search_nearby_facilities(
        db,
        location=location,
        category=category,
        radius=radius,
        limit=limit
    )
    
    return facilities
