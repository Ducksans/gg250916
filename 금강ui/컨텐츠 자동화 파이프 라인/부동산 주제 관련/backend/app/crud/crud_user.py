from typing import Any, Dict, Optional, Union

from sqlalchemy.orm import Session

from app.core.security import get_password_hash, verify_password
from app.crud.base import CRUDBase
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate, UserRole

class CRUDUser(CRUDBase[User, UserCreate, UserUpdate]):
    def get_by_email(self, db: Session, *, email: str) -> Optional[User]:
        """이메일로 사용자 조회"""
        return db.query(User).filter(User.email == email).first()
    
    def get_by_phone(self, db: Session, *, phone_number: str) -> Optional[User]:
        """전화번호로 사용자 조회"""
        return db.query(User).filter(User.phone_number == phone_number).first()
    
    def create(self, db: Session, *, obj_in: UserCreate) -> User:
        """새 사용자 생성"""
        db_obj = User(
            email=obj_in.email,
            hashed_password=get_password_hash(obj_in.password),
            full_name=obj_in.full_name,
            phone_number=obj_in.phone_number,
            is_active=True,
            is_verified=False,  # 이메일 인증 후 활성화
            role=UserRole.USER  # 기본 역할은 일반 사용자
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def update(
        self, db: Session, *, db_obj: User, obj_in: Union[UserUpdate, Dict[str, Any]]
    ) -> User:
        """사용자 정보 업데이트"""
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.dict(exclude_unset=True)
        
        # 비밀번호가 제공된 경우 해시 처리
        if "password" in update_data:
            hashed_password = get_password_hash(update_data["password"])
            del update_data["password"]
            update_data["hashed_password"] = hashed_password
        
        return super().update(db, db_obj=db_obj, obj_in=update_data)
    
    def authenticate(self, db: Session, *, email: str, password: str) -> Optional[User]:
        """이메일과 비밀번호로 인증"""
        user = self.get_by_email(db, email=email)
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user
    
    def is_active(self, user: User) -> bool:
        """사용자가 활성화되어 있는지 확인"""
        return user.is_active
    
    def is_superuser(self, user: User) -> bool:
        """사용자가 관리자인지 확인"""
        return user.role == UserRole.ADMIN
    
    def update_last_login(self, db: Session, *, user_id: int) -> None:
        """사용자 마지막 로그인 시간 업데이트"""
        user = self.get(db, id=user_id)
        if user:
            user.last_login = db.func.now()
            db.add(user)
            db.commit()
            db.refresh(user)

# 사용자 CRUD 인스턴스 생성
user = CRUDUser(User)
