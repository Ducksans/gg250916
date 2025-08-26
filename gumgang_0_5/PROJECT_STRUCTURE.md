# 금강 2.0 프로젝트 구조
> 생성 시간: 2025-01-08
> Task ID: GG-20250108-003

## ✅ 활성 디렉토리 (사용해야 할 것)

### 🎨 프론트엔드
- **경로**: `/gumgang-v2`
- **기술**: Next.js 15.4.6 + React 19 + TypeScript
- **주요 기능**:
  - Monaco 에디터 통합
  - Tauri 데스크톱 앱 지원
  - 3D 시각화 컴포넌트
- **주요 파일**:
  ```
  /gumgang-v2/
  ├── app/
  │   ├── dashboard/page.tsx    # 대시보드 메인
  │   ├── chat/page.tsx         # AI 채팅 인터페이스
  │   ├── memory/page.tsx       # 메모리 관리
  │   ├── evolution/            # 진화 시스템
  │   └── settings/             # 설정
  ├── components/               # 재사용 컴포넌트
  ├── src-tauri/               # Tauri 백엔드
  └── package.json
  ```

### 🔧 백엔드
- **경로**: `/backend`
- **기술**: FastAPI + Python 3.11+
- **주요 API**:
  ```
  /backend/
  ├── app/
  │   ├── api/
  │   │   └── routes/
  │   │       └── dashboard.py  # 대시보드 API (723줄)
  │   ├── core/                 # 핵심 모듈
  │   └── services/             # 서비스 레이어
  ├── main.py                   # 기존 진입점
  └── app_new.py               # 새 진입점 (확인 필요)
  ```

### 🧠 메모리 시스템
- **경로**: `/memory`
- **용도**: 4계층 시간적 메모리 저장소
  - Ultra-short-term (초단기)
  - Short-term (단기)
  - Medium-term (중장기)
  - Long-term (초장기)

### 📝 컨텍스트 관리
- **경로**: `/context`
- **용도**: 세션 간 컨텍스트 영속화
- **주요 파일**:
  - `current_session.yaml` - 현재 세션 상태
  - `session_history.json` - 세션 히스토리
  - `task_registry.json` - Task 레지스트리
  - `memory_*.json` - 메모리 계층별 저장소

### 📊 Task 추적
- **경로**: `/task_tracking`
- **용도**: 모든 작업의 추적 및 시각화
- **주요 파일**:
  - `master_registry.json` - 마스터 Task 레지스트리
  - `task_timeline.json` - Task 타임라인
  - `visual_config.json` - 시각화 설정
  - `visual_data.json` - 시각화 데이터

### 🔨 핵심 스크립트
- **위치**: 프로젝트 루트
- **주요 파일**:
  - `session_manager.py` - 세션 관리 시스템 (644줄)
  - `task_tracker.py` - Task 추적 시스템 (748줄)
  - `context_sync.py` - 컨텍스트 동기화
  - `init_perfect_collaboration.py` - 협업 시스템 초기화

---

## ❌ 비활성 디렉토리 (사용 금지)

### 📦 Legacy 백업
- **경로**: `/legacy_backup`
- **내용**:
  - `frontend_v0.8_20250108/` - 구버전 React 프론트엔드
  - 구버전 테스트 파일들
- **⚠️ 주의**: 읽기 전용, 수정 절대 금지

### 🗄️ 기타 백업
- `backend_backup_*` - 백엔드 백업들
- `backup_*` - 각종 백업 디렉토리
- `*.zip` - 압축 백업 파일들

---

## 📝 작업 규칙

### 1. 파일 경로 규칙
```python
# ✅ 올바른 예시
path = "/home/duksan/바탕화면/gumgang_0_5/gumgang-v2/app/dashboard/page.tsx"

# ❌ 잘못된 예시
path = "/home/duksan/바탕화면/gumgang_0_5/frontend/..."  # 구버전 경로
```

### 2. 검증 우선 원칙
- 모든 파일 경로는 `session_manager.verify_file_exists()` 사용
- 추측 기반 작업 절대 금지
- 실제 파일 확인 후 작업

### 3. Task 관리
- 모든 작업은 Task ID 부여 (예: GG-20250108-XXX)
- 진행상황 실시간 업데이트
- 체크포인트 생성 필수

### 4. 세션 관리
- 세션 시작: `session_manager.create_session()`
- 세션 종료: 인계 문서 자동 생성
- 컨텍스트 영속화 보장

---

## 🔄 현재 상태 (2025-01-08)

### ✅ 완료된 작업
- [x] 세션 매니저 시스템 구축 (session_manager.py)
- [x] Task 추적 시스템 구축 (task_tracker.py)
- [x] 구버전 frontend 격리 (/legacy_backup으로 이동)
- [x] 컨텍스트 디렉토리 생성
- [x] Task 추적 디렉토리 생성

### 🔄 진행 중
- [ ] 프로젝트 구조 문서화
- [ ] 인계 문서 시스템 구축

### 📋 다음 작업
- [ ] gumgang-v2 실행 테스트
- [ ] 백엔드 통합 방식 결정 (main.py vs app_new.py)
- [ ] Tauri 파일시스템 API 활성화
- [ ] 실행 승인 UI 구현

---

## 🚀 빠른 시작

### 1. 세션 초기화
```bash
python3 session_manager.py
```

### 2. Task 추적 시작
```bash
python3 task_tracker.py
```

### 3. 프론트엔드 실행
```bash
cd gumgang-v2
npm run dev
# 또는 Tauri 앱으로 실행
npm run tauri dev
```

### 4. 백엔드 실행
```bash
cd backend
python main.py  # 또는 python app_new.py
```

---

## 📌 중요 참고사항

1. **구버전 혼용 금지**: `/frontend` 경로 사용 금지
2. **추측 금지**: 모든 파일 경로는 확인 후 사용
3. **문서화 필수**: 모든 변경사항은 컨텍스트에 기록
4. **단계별 진행**: 한 번에 한 가지 작업만

---

## 📞 문의 및 지원

- 프로젝트 오너: 덕산
- AI 협업 파트너: 금강 2.0
- 목표: 인간과 AI의 완벽한 협업 시스템 구축