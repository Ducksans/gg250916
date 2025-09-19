# 사용자 관련 스키마
from .user import User, UserCreate, UserInDB, UserUpdate, UserInResponse

# 부동산 매물 관련 스키마
from .property import (
    PropertyBase, PropertyCreate, PropertyUpdate, PropertyInDBBase, Property,
    PropertyImage, PropertyImageCreate, PropertyFeature, PropertyFeatureCreate,
    PropertyDetail
)

# 부동산 매물 enum 타입들
from app.models.property import PropertyType, TransactionType, PropertyStatus

# 검색 관련 스키마
from .search import (
    SearchBase, SearchHistory, SearchHistoryCreate, SearchResult, MapSearchResult,
    SuggestionItem, SearchSuggestion, SuggestionResponse, GeocodeResult, NearbyPlace, NearbyPlacesResponse,
    SchoolInfo, FacilityInfo
)

# 인증 및 토큰 관련 스키마
from .token import (
    Token, TokenPayload, Msg, EmailStr, ResetPasswordRequest,
    ResetPasswordConfirm, ChangePassword, OAuth2TokenRequestForm
)

# 모든 스키마를 한 곳에서 임포트할 수 있도록 설정
__all__ = [
    # 사용자
    'User', 'UserCreate', 'UserInDB', 'UserUpdate', 'UserInResponse',
    
    # 부동산 매물
    'PropertyBase', 'PropertyCreate', 'PropertyUpdate', 'PropertyInDBBase',
    'Property', 'PropertyImage', 'PropertyImageCreate', 'PropertyFeature',
    'PropertyFeatureCreate', 'PropertyDetail', 'PropertyType', 'TransactionType', 
    'PropertyStatus',
    
    # 검색
    'SearchBase', 'SearchHistory', 'SearchHistoryCreate', 'SearchResult', 'MapSearchResult',
    'SuggestionItem', 'SearchSuggestion', 'SuggestionResponse', 'GeocodeResult', 'NearbyPlace',
    'NearbyPlacesResponse', 'SchoolInfo', 'FacilityInfo',
    
    # 인증 및 토큰
    'Token', 'TokenPayload', 'Msg', 'EmailStr', 'ResetPasswordRequest',
    'ResetPasswordConfirm', 'ChangePassword', 'OAuth2TokenRequestForm'
]
