from typing import Any, Dict, List, Optional
from datetime import datetime
from pydantic import BaseModel, Field

# 검색 파라미터 베이스
class SearchBase(BaseModel):
    query: Optional[str] = None
    property_type: Optional[str] = None
    transaction_type: Optional[str] = None
    min_price: Optional[int] = None
    max_price: Optional[int] = None
    min_area: Optional[float] = None
    max_area: Optional[float] = None
    rooms: Optional[int] = None
    bathrooms: Optional[int] = None
    has_parking: Optional[bool] = None
    has_elevator: Optional[bool] = None
    is_pet_allowed: Optional[bool] = None
    is_loan_available: Optional[bool] = None
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    radius: Optional[float] = None  # km 단위
    page: int = 1
    limit: int = 10
    sort_by: Optional[str] = None
    sort_order: str = "desc"

# 검색 기록 생성 스키마
class SearchHistoryCreate(BaseModel):
    query: str
    search_type: str
    search_params: Optional[Dict[str, Any]] = None

# 검색 기록 응답 스키마
class SearchHistory(SearchHistoryCreate):
    id: int
    user_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

# 검색 결과 응답 스키마
class SearchResult(BaseModel):
    total: int
    items: List[Any]  # Property 모델의 리스트가 올 수 있음
    page: int
    limit: int
    total_pages: int

# 지도 검색 결과 응답 스키마
class MapSearchResult(BaseModel):
    properties: List[Any]  # Property 모델의 리스트
    total: int
    bounds: Optional[Dict[str, float]] = None  # 검색 영역 경계

# 자동완성 응답 스키마
class SuggestionItem(BaseModel):
    text: str
    type: str  # 'address', 'complex', 'keyword' 등
    count: Optional[int] = None

class SearchSuggestion(BaseModel):
    """검색 제안 항목"""
    text: str
    type: str = "keyword"
    count: Optional[int] = None

class SuggestionResponse(BaseModel):
    suggestions: List[SuggestionItem]

# 지오코딩 응답 스키마
class GeocodeResult(BaseModel):
    address: str
    latitude: float
    longitude: float
    region_1depth_name: Optional[str] = None
    region_2depth_name: Optional[str] = None
    region_3depth_name: Optional[str] = None
    region_4depth_name: Optional[str] = None

# 주변 시설 검색 결과
class NearbyPlace(BaseModel):
    name: str
    category: str
    distance: float  # km 단위
    address: str
    latitude: float
    longitude: float

class NearbyPlacesResponse(BaseModel):
    places: List[NearbyPlace]
    total: int

# 학교 정보 스키마
class SchoolInfo(BaseModel):
    name: str
    school_type: str  # 'elementary', 'middle', 'high', 'university' 등
    address: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    distance: Optional[float] = None  # km 단위
    
# 편의시설 정보 스키마  
class FacilityInfo(BaseModel):
    name: str
    category: str
    address: str
    latitude: float
    longitude: float
    distance: float  # km 단위
