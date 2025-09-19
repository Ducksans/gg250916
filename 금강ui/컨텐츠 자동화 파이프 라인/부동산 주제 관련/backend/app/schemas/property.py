from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field
from app.models.property import PropertyType, TransactionType, PropertyStatus

# 공통 속성
class PropertyBase(BaseModel):
    title: str = Field(..., max_length=200)
    description: Optional[str] = None
    property_type: PropertyType
    transaction_type: TransactionType
    price: int = Field(..., gt=0)
    monthly_rent: Optional[int] = Field(None, gt=0)
    maintenance_fee: Optional[int] = Field(None, ge=0)
    area: float = Field(..., gt=0)
    floor: Optional[int] = None
    building_floor: Optional[int] = None
    room_count: Optional[int] = None
    bathroom_count: Optional[int] = None
    address: str = Field(..., max_length=200)
    address_detail: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_parking: bool = False
    is_elevator: bool = False
    is_loan_possible: bool = False
    is_pet: bool = False
    move_in_date: Optional[datetime] = None

# 생성 시 사용할 스키마
class PropertyCreate(PropertyBase):
    pass

# 수정 시 사용할 스키마
class PropertyUpdate(PropertyBase):
    title: Optional[str] = Field(None, max_length=200)
    property_type: Optional[PropertyType] = None
    transaction_type: Optional[TransactionType] = None
    price: Optional[int] = Field(None, gt=0)
    area: Optional[float] = Field(None, gt=0)
    address: Optional[str] = Field(None, max_length=200)

# 데이터베이스 모델 스키마
class PropertyInDBBase(PropertyBase):
    id: int
    owner_id: int
    status: PropertyStatus = PropertyStatus.AVAILABLE
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# API 응답 시 사용할 스키마
class Property(PropertyInDBBase):
    pass

# 프로퍼티 이미지 스키마
class PropertyImageBase(BaseModel):
    url: str
    is_main: bool = False

class PropertyImageCreate(PropertyImageBase):
    pass

class PropertyImage(PropertyImageBase):
    id: int
    property_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# 프로퍼티 특징 스키마
class PropertyFeatureBase(BaseModel):
    name: str
    is_available: bool = True

class PropertyFeatureCreate(PropertyFeatureBase):
    pass

class PropertyFeature(PropertyFeatureBase):
    id: int
    property_id: int

    class Config:
        from_attributes = True

# 상세 조회 응답 스키마
class PropertyDetail(Property):
    images: List[PropertyImage] = []
    features: List[PropertyFeature] = []
