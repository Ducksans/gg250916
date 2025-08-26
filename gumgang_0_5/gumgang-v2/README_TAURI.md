# 🚀 Tauri 파일시스템 API 테스트 가이드

**Task ID**: GG-20250108-006  
**작성일**: 2025-08-08  
**진행률**: 75%  
**Protocol**: Guard v2.0 적용

---

## 📋 구현 완료 항목

### 1. **Rust 백엔드 (src-tauri/src/main.rs)**
- ✅ 파일 읽기/쓰기 (`read_file`, `write_file`)
- ✅ 디렉토리 탐색 (`read_directory`)
- ✅ 디렉토리 생성 (`create_directory`)
- ✅ 파일/폴더 삭제 (`remove_path`)
- ✅ 이름 변경 (`rename_path`)
- ✅ 파일 정보 조회 (`get_file_info`)
- ✅ 파일 검색 (`search_files`)
- ✅ 텍스트 검색 (`grep_in_files`)

### 2. **TypeScript 훅 (hooks/useTauriFileSystem.ts)**
- ✅ 완전한 타입 정의
- ✅ 에러 핸들링
- ✅ 로딩 상태 관리
- ✅ 파일 다이얼로그 통합
- ✅ 유틸리티 함수 (파일 크기 포맷, 날짜 포맷)

### 3. **테스트 컴포넌트 (components/FileExplorer.tsx)**
- ✅ 시각적 파일 탐색기
- ✅ 파일 미리보기
- ✅ 폴더 생성/삭제
- ✅ 검색 기능
- ✅ 네비게이션

---

## 🛠️ 사전 요구사항

```bash
# 1. Rust 설치 (없는 경우)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 2. Node.js 18+ 확인
node --version

# 3. Tauri CLI 설치
npm install -g @tauri-apps/cli
```

---

## 📦 설치 및 실행

### **1단계: 의존성 설치**
```bash
cd /home/duksan/바탕화면/gumgang_0_5/gumgang-v2

# Node.js 의존성
npm install

# Tauri 의존성
npm install @tauri-apps/api @tauri-apps/plugin-dialog
```

### **2단계: 백엔드 서버 실행 (필수!)**
```bash
# 새 터미널에서
cd /home/duksan/바탕화면/gumgang_0_5/backend
python simple_main.py

# 포트 8001에서 실행 확인
curl http://localhost:8001/health
```

### **3단계: Tauri 개발 모드 실행**
```bash
cd /home/duksan/바탕화면/gumgang_0_5/gumgang-v2

# Tauri 개발 서버 시작
npm run tauri dev

# 또는 직접 실행
cargo tauri dev
```

---

## 🧪 테스트 방법

### **파일 탐색기 테스트 페이지**
1. Tauri 앱이 실행되면 자동으로 열립니다
2. 또는 앱 내에서 `/test-filesystem` 경로로 이동
3. 프로젝트 루트 디렉토리가 자동으로 로드됩니다

### **테스트 시나리오**
```
1. 폴더 탐색
   - 폴더 클릭하여 이동
   - 상위 폴더 버튼으로 뒤로 가기
   - 홈 버튼으로 프로젝트 루트 이동

2. 파일 작업
   - 텍스트 파일 클릭하여 내용 미리보기
   - 새 폴더 만들기 버튼 클릭
   - 파일/폴더 삭제 (휴지통 아이콘)

3. 검색 기능
   - 파일명으로 필터링
   - 실시간 검색 결과 확인
```

---

## 🏗️ 프로덕션 빌드

```bash
# Tauri 앱 빌드
npm run tauri build

# 빌드 결과물 위치
# Linux: src-tauri/target/release/bundle/
# Windows: src-tauri/target/release/bundle/msi/
# macOS: src-tauri/target/release/bundle/dmg/
```

---

## 🐛 트러블슈팅

### **문제 1: Tauri 명령어를 찾을 수 없음**
```bash
# 해결책
npm install -g @tauri-apps/cli
```

### **문제 2: Rust 컴파일 오류**
```bash
# 해결책
rustup update
cargo clean
cargo build
```

### **문제 3: 파일시스템 권한 오류**
```bash
# tauri.conf.json에서 권한 확인
"allowlist": {
  "fs": {
    "all": true,
    "scope": ["**"]
  }
}
```

### **문제 4: 포트 8001 연결 실패**
```bash
# Protocol Guard 실행
python protocol_guard.py --auto-fix
```

---

## 📂 프로젝트 구조

```
gumgang-v2/
├── src-tauri/
│   ├── src/
│   │   └── main.rs         # ✅ Rust 백엔드 (완성)
│   ├── tauri.conf.json     # ✅ Tauri 설정
│   └── Cargo.toml          # ✅ Rust 의존성
├── app/
│   └── test-filesystem/
│       └── page.tsx        # ✅ 테스트 페이지
├── components/
│   └── FileExplorer.tsx   # ✅ 파일 탐색기 컴포넌트
└── hooks/
    └── useTauriFileSystem.ts # ✅ 파일시스템 훅
```

---

## 📊 진행 상황

| 구성 요소 | 상태 | 진행률 |
|----------|------|--------|
| Rust API | ✅ 완료 | 100% |
| TypeScript 훅 | ✅ 완료 | 100% |
| UI 컴포넌트 | ✅ 완료 | 100% |
| 테스트 페이지 | ✅ 완료 | 100% |
| Monaco 연동 | ⏳ 대기 | 0% |

**전체 Task 진행률: 75%**

---

## 🔮 다음 단계

### **GG-20250108-007: Monaco 에디터 연동**
- Monaco Editor 컴포넌트 생성
- 파일 시스템과 연동
- 실시간 편집 기능
- 구문 강조 설정

---

## ⚠️ 주의사항

1. **반드시 백엔드 서버 먼저 실행** (포트 8001)
2. **Tauri 앱에서만 파일시스템 API 작동**
3. **Protocol Guard 정기적으로 실행**
4. **React 아님! Tauri 사용!**

---

## 💡 유용한 명령어

```bash
# Protocol Guard 실행
python protocol_guard.py

# Task 상태 확인
python update_tasks_b.py

# 빠른 검증
./guard.sh

# Tauri 로그 확인
RUST_LOG=debug npm run tauri dev
```

---

**Protocol Guard v2.0** 적용 중  
**작성자**: Task GG-20250108-006  
**날짜**: 2025년 8월 8일