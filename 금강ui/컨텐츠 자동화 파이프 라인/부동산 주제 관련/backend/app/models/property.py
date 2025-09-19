from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Enum, Boolean, JSON
from sqlalchemy.orm import relationship
from app.models.base import Base
from datetime import datetime
import enum

class PropertyType(str, enum.Enum):
    APT = "apartment"
    OFFICETEL = "officetel"
    VILLA = "villa"
    HOUSE = "house"
    LAND = "land"
    COMMERCIAL = "commercial"

class TransactionType(str, enum.Enum):
    SALE = "sale"
    RENT = "rent"
    LEASE = "lease"

class PropertyStatus(str, enum.Enum):
    AVAILABLE = "available"
    PENDING = "pending"
    SOLD = "sold"
    RENTED = "rented"
    HIDDEN = "hidden"

class Property(Base):
    __tablename__ = "properties"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    property_type = Column(Enum(PropertyType), nullable=False)
    transaction_type = Column(Enum(TransactionType), nullable=False)
    price = Column(Integer, nullable=False)  # 매매가 또는 전세/월세 보증금
    monthly_rent = Column(Integer, nullable=True)  # 월세 (월세/전세인 경우)
    maintenance_fee = Column(Integer, nullable=True)  # 관리비
    area = Column(Float, nullable=False)  # 전용면적 (제곱미터)
    floor = Column(Integer, nullable=True)  # 층수
    building_floor = Column(Integer, nullable=True)  # 건물 총 층수
    room_count = Column(Integer, nullable=True)  # 방 개수
    bathroom_count = Column(Integer, nullable=True)  # 욕실 개수
    address = Column(String(200), nullable=False)
    address_detail = Column(String(200), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    status = Column(Enum(PropertyStatus), default=PropertyStatus.AVAILABLE)
    is_parking = Column(Boolean, default=False)
    is_elevator = Column(Boolean, default=False)
    is_loan_possible = Column(Boolean, default=False)
    is_pet = Column(Boolean, default=False)
    move_in_date = Column(DateTime, nullable=True)  # 입주 가능일
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Foreign Keys
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Relationships
    owner = relationship("User", back_populates="properties")
    images = relationship("PropertyImage", back_populates="property", cascade="all, delete-orphan")
    features = relationship("PropertyFeature", back_populates="property", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Property {self.id}: {self.title}>"

class PropertyImage(Base):
    __tablename__ = "property_images"
    
    id = Column(Integer, primary_key=True, index=True)
    url = Column(String(500), nullable=False)
    is_main = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Foreign Keys
    property_id = Column(Integer, ForeignKey("properties.id", ondelete="CASCADE"), nullable=False)
    
    # Relationships
    property = relationship("Property", back_populates="images")

class PropertyFeature(Base):
    __tablename__ = "property_features"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)  # 예: '주방', '에어컨', '세탁기' 등
    is_available = Column(Boolean, default=True)
    
    # Foreign Keys
    property_id = Column(Integer, ForeignKey("properties.id", ondelete="CASCADE"), nullable=False)
    
    # Relationships
    property = relationship("Property", back_populates="features")
