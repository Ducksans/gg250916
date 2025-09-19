# 금강부동산허브 API

FastAPI 기반의 부동산 매물 관리 및 검색 API 서버입니다.

## 주요 기능

- 🏠 **부동산 매물 관리**: 아파트, 오피스텔, 빌라 등 다양한 매물 등록/수정/삭제
- 🔍 **고급 검색**: 위치, 가격, 면적, 편의시설 등 다양한 조건으로 매물 검색
- 👤 **사용자 관리**: 회원가입, 로그인, 프로필 관리
- 🔐 **JWT 인증**: 안전한 토큰 기반 인증 시스템
- 📷 **이미지 업로드**: 매물 사진 업로드 및 관리
- 🗺️ **지도 기반 검색**: 위치 기반 매물 검색 및 주변 편의시설 조회
- 📊 **검색 기록**: 사용자 검색 기록 관리 및 인기 검색어 제공

## 기술 스택

- **Backend**: FastAPI, Python 3.11+
- **Database**: SQLite (개발), PostgreSQL (운영)
- **ORM**: SQLAlchemy
- **Migration**: Alembic
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Pydantic
- **Testing**: Pytest
- **Documentation**: Swagger/ReDoc (자동 생성)
- **Containerization**: Docker, Docker Compose

## 프로젝트 구조

```
backend/
├── app/
│   ├── api/
│   │   ├── api_v1/
│   │   │   ├── endpoints/
│   │   │   │   ├── auth.py          # 인증 관련 API
│   │   │   │   ├── users.py         # 사용자 관리 API
│   │   │   │   ├── properties.py    # 부동산 매물 API
│   │   │   │   ├── search.py        # 검색 API
│   │   │   │   └── upload.py        # 파일 업로드 API
│   │   │   └── api.py              # API 라우터 설정
│   │   └── deps.py                 # 의존성 주입
│   ├── core/
│   │   ├── config.py               # 설정 관리
│   │   ├── security.py             # 보안 관련 함수
│   │   ├── exceptions.py           # 커스텀 예외
│   │   └── middleware.py           # 미들웨어
│   ├── crud/
│   │   ├── base.py                 # CRUD 베이스 클래스
│   │   ├── crud_user.py           # 사용자 CRUD
│   │   ├── crud_property.py       # 매물 CRUD
│   │   └── crud_search.py         # 검색 CRUD
│   ├── db/
│   │   └── session.py             # 데이터베이스 세션
│   ├── models/
│   │   ├── base.py                # 모델 베이스 클래스
│   │   ├── user.py                # 사용자 모델
│   │   ├── property.py            # 매물 모델
│   │   └── search_history.py      # 검색 기록 모델
│   ├── schemas/
│   │   ├── user.py                # 사용자 스키마
│   │   ├── property.py            # 매물 스키마
│   │   ├── search.py              # 검색 스키마
│   │   └── token.py               # 토큰 스키마
│   ├── utils.py                   # 유틸리티 함수
│   └── main.py                    # FastAPI 애플리케이션
├── migrations/                    # Alembic 마이그레이션
├── tests/                         # 테스트 파일
├── uploads/                       # 업로드된 파일
├── requirements.txt               # Python 의존성
├── Dockerfile                     # Docker 설정
├── docker-compose.yml            # Docker Compose 설정
└── README.md                     # 프로젝트 문서
```

## 설치 및 실행

### 1. 로컬 개발 환경

#### 필수 요구사항
- Python 3.11+
- pip

#### 설치 과정

1. **저장소 클론**
```bash
git clone <repository-url>
cd backend
```

2. **가상환경 생성 및 활성화**
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# 또는
venv\Scripts\activate     # Windows
```

3. **의존성 설치**
```bash
pip install -r requirements.txt
```

4. **데이터베이스 마이그레이션**
```bash
alembic upgrade head
```

5. **서버 실행**
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Docker를 사용한 실행

#### 필수 요구사항
- Docker
- Docker Compose

#### 실행 과정

1. **Docker Compose로 실행**
```bash
docker-compose up -d
```

2. **로그 확인**
```bash
docker-compose logs -f backend
```

3. **서비스 중지**
```bash
docker-compose down
```

## API 문서

서버 실행 후 다음 URL에서 API 문서를 확인할 수 있습니다:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/api/v1/openapi.json

## 주요 API 엔드포인트

### 인증
- `POST /api/v1/auth/login/access-token` - 로그인
- `POST /api/v1/auth/register` - 회원가입
- `POST /api/v1/auth/refresh` - 토큰 갱신

### 사용자
- `GET /api/v1/users/me` - 내 정보 조회
- `PUT /api/v1/users/me` - 내 정보 수정
- `GET /api/v1/users/{user_id}` - 사용자 정보 조회

### 부동산 매물
- `GET /api/v1/properties/` - 매물 목록 조회
- `POST /api/v1/properties/` - 매물 등록
- `GET /api/v1/properties/{property_id}` - 매물 상세 조회
- `PUT /api/v1/properties/{property_id}` - 매물 수정
- `DELETE /api/v1/properties/{property_id}` - 매물 삭제

### 검색
- `GET /api/v1/search/properties` - 매물 검색
- `GET /api/v1/search/autocomplete` - 검색어 자동완성
- `GET /api/v1/search/map` - 지도 기반 검색

### 파일 업로드
- `POST /api/v1/upload/image` - 이미지 업로드
- `POST /api/v1/upload/images` - 다중 이미지 업로드
- `DELETE /api/v1/upload/image/{filename}` - 이미지 삭제

## 테스트

### 단위 테스트 실행
```bash
pytest
```

### 커버리지 포함 테스트
```bash
pytest --cov=app
```

### 특정 테스트 파일 실행
```bash
pytest tests/test_main.py
```

## 환경 변수

다음 환경 변수들을 설정할 수 있습니다:

```bash
# 데이터베이스
DATABASE_URI=sqlite:///./real_estate_hub.db

# JWT 설정
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# 외부 API
KAKAO_REST_API_KEY=your-kakao-api-key
OPEN_API_SERVICE_KEY=your-public-data-portal-key

# 파일 업로드
MAX_FILE_SIZE=10485760
UPLOAD_DIR=uploads
```

## 데이터베이스 마이그레이션

### 새 마이그레이션 생성
```bash
alembic revision --autogenerate -m "마이그레이션 설명"
```

### 마이그레이션 적용
```bash
alembic upgrade head
```

### 마이그레이션 롤백
```bash
alembic downgrade -1
```

## 개발 가이드라인

### 코드 스타일
- PEP 8 준수
- Type hints 사용
- Docstring 작성 (Google 스타일)

### 커밋 메시지
```
feat: 새로운 기능 추가
fix: 버그 수정
docs: 문서 수정
style: 코드 스타일 변경
refactor: 코드 리팩토링
test: 테스트 추가/수정
chore: 기타 변경사항
```

## 배포

### 운영 환경 설정
1. 환경 변수 설정
2. 데이터베이스 마이그레이션
3. 정적 파일 설정
4. SSL 인증서 설정
5. 로그 설정

### Docker를 사용한 배포
```bash
docker build -t real-estate-api .
docker run -d -p 8000:8000 real-estate-api
```

## 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 문의

프로젝트에 대한 문의사항이 있으시면 이슈를 생성해 주세요.

---

**금강부동산허브 API** - 부동산 매물 관리의 새로운 표준
