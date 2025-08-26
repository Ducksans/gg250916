# 📚 Backend Structure Documentation
**Last Updated**: 2025-01-09
**Status**: Cleaned and Simplified

## 🎯 Current Main Entry Point

### PRIMARY: `simple_main.py`
- **Port**: 8000 (통일됨)
- **Purpose**: 간단한 테스트 서버 (현재 메인으로 사용)
- **Start Command**: `python3 simple_main.py`
- **Features**:
  - ✅ Health check endpoint
  - ✅ Protocol endpoints integration
  - ✅ AI Ask endpoint
  - ✅ Dashboard stats
  - ✅ Task management

### SECONDARY: `main.py`
- **Port**: 8000
- **Purpose**: 프로덕션 서버 (복잡한 메모리 시스템 포함)
- **Start Command**: `uvicorn main:app --host 0.0.0.0 --port 8000`
- **Note**: 현재 사용하지 않음 (메모리 시스템 초기화 필요)

## 🗂️ Backed Up Files (불필요한 진입점)

다음 파일들은 `backup_entries_20250809/` 디렉토리로 이동됨:
- `app_new.py` - 테스트용 대체 서버
- `start_server.py` - 복잡한 관리 스크립트
- `start_test_server.sh` - 중복 시작 스크립트
- `backendserverstart.sh` - 구버전 시작 스크립트
- `app_new.log` - 로그 파일
- `backend_simple.log` - 로그 파일

## 🚀 백엔드 시작 방법 (권장)

### 방법 1: 자동 시작 (권장) ✨
```bash
# 이미 .bashrc/.zshrc에 설정됨
# 새 터미널 열면 자동으로 백엔드 확인 및 시작

# 수동으로 상태 확인
gumgang-status

# 수동으로 시작
gumgang-start
```

### 방법 2: 직접 실행
```bash
cd /home/duksan/바탕화면/gumgang_0_5/backend
python3 simple_main.py
```

### 방법 3: 자동 시작 스크립트
```bash
cd /home/duksan/바탕화면/gumgang_0_5
./auto_start_backend.sh start
```

## 🔧 포트 설정

### 현재 포트 구성
- **Backend API**: `8000` (통일됨)
- **Terminal Server**: `8002` (별도 서비스)
- **Frontend**: `3000` (Next.js dev server)

### 포트 변경 이력
- 초기: 8000
- 중간: 8001 (충돌 회피용)
- 현재: 8000 (원래대로 복원)

## 📁 디렉토리 구조

```
backend/
├── simple_main.py         # ⭐ 메인 진입점
├── main.py               # 프로덕션 서버 (미사용)
├── protocol_endpoints.py # Protocol API 라우터
├── health_route.py       # 헬스체크 라우터
├── requirements.txt      # 의존성
│
├── app/                  # 애플리케이션 모듈
│   ├── api/             # API 라우터
│   ├── core/            # 핵심 설정
│   └── services/        # 서비스 레이어
│
├── memory/              # 메모리 시스템 (main.py용)
├── logs/                # 로그 파일
├── venv/                # 가상환경
│
└── backup_entries_20250809/  # 백업된 불필요 파일들
    ├── app_new.py
    ├── start_server.py
    └── ...
```

## 🛠️ 관리 명령어

### 기본 명령어 (별칭 설정됨)
```bash
gumgang         # 백엔드 관리 도구
gumgang-status  # 상태 확인
gumgang-start   # 시작
gumgang-stop    # 중지
gumgang-restart # 재시작
gumgang-logs    # 실시간 로그
gumgang-errors  # 에러 로그
test-api        # API 헬스체크
```

### 프로세스 관리
```bash
# 실행 중인 백엔드 찾기
ps aux | grep simple_main

# 포트 사용 확인
lsof -i:8000

# 강제 종료 (필요시)
pkill -f simple_main.py
```

## ⚠️ 주의사항

1. **단일 진입점 사용**: `simple_main.py`만 사용
2. **포트 충돌 방지**: 8000 포트가 이미 사용 중이면 자동 정리
3. **자동 시작 활성화**: 새 세션에서 자동으로 백엔드 시작
4. **로그 확인**: 문제 발생시 `backend/logs/` 확인

## 🔄 세션 연속성

재부팅이나 세션 종료 후:
1. 새 터미널 열기 → 자동으로 백엔드 시작
2. Cron job이 5분마다 헬스체크
3. 다운 감지시 자동 재시작

## 📊 현재 상태 요약

| 항목 | 상태 | 설명 |
|------|------|------|
| 메인 서버 | `simple_main.py` | 포트 8000 |
| 백업 파일 | 격리 완료 | `backup_entries_20250809/` |
| 자동 시작 | 설정 완료 | `.bashrc/.zshrc` |
| 모니터링 | 활성화 | Cron 5분마다 |
| 포트 통일 | 완료 | 8000으로 통일 |

## 🎯 다음 단계

1. ✅ 불필요한 진입점 백업 완료
2. ✅ 포트 8000으로 통일 완료
3. ✅ 자동 시작 시스템 구축 완료
4. ⏳ 추후: `main.py`와 통합 고려

---

**문제 발생시**: `gumgang-logs` 또는 `gumgang-errors` 명령어로 로그 확인