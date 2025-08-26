# 금강 2.0 세션 컨텍스트
생성 시간: 2025-08-08 13:12:10
Task ID: GG-20250108-004

## 🚨 절대 규칙 (반드시 준수)
1. **구버전 금지**: `/frontend` 경로 절대 사용 금지
2. **신버전만 사용**: `/gumgang-v2` 프론트엔드 경로만 사용
3. **추측 금지**: 모든 파일 경로는 `verify_file_exists()` 확인 필수
4. **Task ID 필수**: 모든 작업에 GG-YYYYMMDD-XXX 형식 ID 부여

## 📊 현재 세션 정보
- **세션 ID**: SESSION-20250808-120939
- **시작 시간**: 2025-08-08T12:09:40.886390
- **이전 세션**: 없음
- **토큰 사용**: 예상 0/120000

## 🎯 현재 진행 중인 Task
- 진행 중인 Task 없음

## 📋 Task 현황
- **전체 Task**: 12개
- **완료**: 5개
- **진행 중**: 2개
- **대기**: 5개
- **차단됨**: 0개

## ⚠️ 주의사항 및 경고
- 현재 경고 없음

## ✅ 검증된 프로젝트 구조
```yaml
활성 디렉토리:
  프론트엔드: /gumgang-v2 (Next.js 15 + Monaco + Tauri)
  백엔드: /backend/app/api (FastAPI)
  컨텍스트: /context (세션 영속화)
  Task 추적: /task_tracking (진행상황 관리)

비활성 디렉토리:
  구버전: /legacy_backup/frontend_v0.8_20250108 (사용 금지)
```

## 🔍 파일 상태
- ✅ session_manager.py (21934 bytes)
- ✅ task_tracker.py (26090 bytes)
- ✅ gumgang-v2/app/dashboard/page.tsx (19841 bytes)
- ✅ backend/app/api/routes/dashboard.py (24438 bytes)

## 🚀 즉시 실행 가능한 명령어
```bash
# 세션 상태 확인
python3 /home/duksan/바탕화면/gumgang_0_5/session_manager.py

# Task 추적 확인
python3 /home/duksan/바탕화면/gumgang_0_5/task_tracker.py

# 컨텍스트 동기화
python3 /home/duksan/바탕화면/gumgang_0_5/context_sync.py

# 프론트엔드 실행
cd /home/duksan/바탕화면/gumgang_0_5/gumgang-v2 && npm run dev
```

## 📌 다음 작업 권장사항
1. [high] GG-20250808-123622-002: Task 추적 시스템 구축
2. [medium] GG-20250108-007: Monaco 에디터 연동
3. [medium] GG-20250108-008: 실시간 동기화 시스템
4. [medium] GG-20250108-009: 3D 시각화 최적화
5. [medium] GG-20250108-010: 테스트 및 문서화
