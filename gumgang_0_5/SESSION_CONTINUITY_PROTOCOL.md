# 🔐 SESSION CONTINUITY PROTOCOL v4.0
**Document ID**: SCP-20250808-FINAL  
**Creation Time**: 2025-08-08 21:00:00  
**Protocol Version**: 4.0-CONTINUITY  
**Status**: ACTIVE AND ENFORCED  
**Priority**: CRITICAL - READ FIRST

---

## 🚨 **CRITICAL: 새 세션 시작 전 필수 확인**

### **1단계: 즉시 실행 (순서 절대 준수)**
```bash
# 1. 작업 디렉토리 이동
cd /home/duksan/바탕화면/gumgang_0_5

# 2. Protocol Guard v3.0 실행 (필수!)
python protocol_guard_v3.py --status

# 3. 최신 체크포인트 확인
ls -la checkpoints/ | tail -5

# 4. 현재 진행 중인 Task 확인
python -c "
import json
from datetime import datetime

with open('task_tracking/master_registry.json') as f:
    data = json.load(f)
    
print('='*60)
print('📊 현재 Task 상태')
print('='*60)

# HTS Tasks 확인
hts_tasks = [k for k in data['tasks'].keys() if 'HTS' in k]
for task_id in sorted(hts_tasks):
    task = data['tasks'][task_id]
    status = task.get('status', 'unknown')
    progress = task.get('progress', 0)
    emoji = '✅' if status == 'completed' else '🔄' if status == 'in_progress' else '⏳'
    print(f'{emoji} {task_id}: {progress}% - {status}')

# 기존 Tasks 확인  
print('\n기존 Task Group B:')
for i in range(5, 11):
    task_id = f'GG-20250108-00{i:02d}'
    if task_id in data['tasks']:
        task = data['tasks'][task_id]
        status = task.get('status', 'unknown')
        progress = task.get('progress', 0)
        emoji = '✅' if status == 'completed' else '🔄' if status == 'in_progress' else '⏳'
        print(f'{emoji} {task_id}: {progress}% - {status}')
"

# 5. 백엔드 상태 확인
curl -s http://localhost:8001/health | python -m json.tool || echo "⚠️ 백엔드 오프라인"

# 6. 세션 연속성 데이터 로드
cat .session_state.json 2>/dev/null || echo "⚠️ 세션 상태 파일 없음"
```

---

## 📋 **세션 상태 자동 추적 시스템**

### **실시간 상태 파일 구조**
```json
{
  "session_id": "SESSION-20250808-210000",
  "last_update": "2025-08-08T21:00:00",
  "active_task": {
    "id": "GG-20250808-HTS-001",
    "name": "Protocol Guard v3.0",
    "progress": 0,
    "status": "pending",
    "last_action": "created",
    "next_steps": ["validate", "execute", "test"]
  },
  "completed_tasks": [
    "GG-20250108-005",
    "GG-20250108-006", 
    "GG-20250108-007"
  ],
  "environment": {
    "backend_port": 8001,
    "frontend_port": 3000,
    "trust_score": 100,
    "token_usage": {
      "used": 61000,
      "total": 120000,
      "remaining": 59000
    }
  },
  "checkpoints": [
    {
      "id": "CP-20250808-205122",
      "timestamp": "2025-08-08T20:51:22",
      "task_id": null,
      "trust_score": 100
    }
  ],
  "warnings": [],
  "rollback_available": true
}
```

### **상태 업데이트 명령**
```python
# 매 작업 후 실행
python update_session_state.py \
  --task-id "GG-20250808-HTS-001" \
  --progress 25 \
  --action "터미널 통합 시작"
```

---

## 🔄 **Task 진행 프로토콜**

### **작업 시작 전 체크리스트**
```yaml
□ Protocol Guard 실행 완료
□ 체크포인트 생성 완료
□ 의존성 Task 확인 완료
□ 신뢰도 92% 이상 확인
□ 백업 생성 완료
```

### **작업 중 필수 기록**
```bash
# 10분마다 자동 실행
*/10 * * * * cd /home/duksan/바탕화면/gumgang_0_5 && python auto_checkpoint.py

# 수동 체크포인트 (중요 변경 시)
python protocol_guard_v3.py --checkpoint "TASK-완료-전"
```

### **작업 완료 후 프로토콜**
```python
# 1. Task 상태 업데이트
update_task_status(task_id, "completed", progress=100)

# 2. 체크포인트 생성
create_checkpoint(f"{task_id}-완료")

# 3. 다음 Task 준비
prepare_next_task()

# 4. 세션 상태 저장
save_session_state()
```

---

## 🎯 **현재 정확한 상태 (2025-08-08 21:00)**

### **완료된 작업**
```markdown
✅ GG-20250108-005: 백엔드 안정화 (100%)
✅ GG-20250108-006: Tauri 파일시스템 API (100%)
✅ GG-20250108-007: Monaco Editor 연동 (100%)
✅ AI File Permission System 구현
✅ Protocol Guard v3.0 생성
✅ HYBRID_TRUST_STRATEGY.md 문서화
```

### **진행 예정 작업 (우선순위)**
```markdown
1️⃣ GG-20250808-HTS-001: Protocol Guard v3.0 실행 (2시간)
   - 체크포인트 시스템 활성화
   - 자동 백업 설정
   - 실시간 모니터링 시작

2️⃣ GG-20250808-HTS-002: Secure Terminal (3시간)
   - xterm.js 통합
   - 명령어 승인 시스템
   - Zed 50% 대체 달성

3️⃣ GG-20250808-HTS-003: Rollback System (3시간)
   - Git 자동 커밋
   - 1-click 복구
   - 완전한 안전망 구축
```

### **중요 경로 및 파일**
```yaml
프로젝트 루트: /home/duksan/바탕화면/gumgang_0_5
백엔드 메인: backend/simple_main.py
프론트엔드: gumgang-v2/
Monaco Editor: gumgang-v2/components/editor/
AI 시스템: gumgang-v2/components/ai/
Protocol Guard: protocol_guard_v3.py
전략 문서: HYBRID_TRUST_STRATEGY.md
```

---

## 🚦 **세션 전환 신호 시스템**

### **GREEN (안전) - 계속 진행**
```python
if trust_score >= 92 and all_tests_pass and no_errors:
    print("🟢 안전 - 작업 계속")
    continue_work()
```

### **YELLOW (주의) - 검증 필요**
```python
if 80 <= trust_score < 92 or warnings_exist:
    print("🟡 주의 - 검증 후 진행")
    validate_and_fix()
    create_checkpoint()
```

### **RED (위험) - 즉시 중단**
```python
if trust_score < 80 or critical_error:
    print("🔴 위험 - 즉시 중단")
    rollback_to_last_checkpoint()
    wait_for_human_intervention()
```

---

## 💾 **자동 백업 정책**

### **백업 트리거**
1. **시간 기반**: 매 1시간
2. **이벤트 기반**: Task 완료 시
3. **위험도 기반**: 위험 작업 전
4. **수동**: 사용자 요청 시

### **백업 명령**
```bash
# 전체 백업
python protocol_guard_v3.py --backup "세션-종료-전"

# 선택적 백업
tar -czf backups/$(date +%Y%m%d-%H%M%S).tar.gz \
  backend/ \
  gumgang-v2/components/ \
  task_tracking/ \
  *.md \
  *.py
```

---

## 📊 **메트릭 추적**

### **필수 추적 지표**
```yaml
시스템 건강도:
  - CPU 사용률: < 80%
  - 메모리 사용률: < 90%
  - 디스크 여유: > 5GB
  
작업 지표:
  - 신뢰도 점수: >= 92%
  - 에러율: < 1%
  - 롤백 횟수: < 2/세션
  
진행 상황:
  - 완료 Task: X개
  - 진행 중: X개
  - 대기 중: X개
```

---

## 🔧 **트러블슈팅 가이드**

### **문제: 세션 상태 불일치**
```bash
# 해결책
python protocol_guard_v3.py --validate
python fix_session_state.py --auto-repair
```

### **문제: 체크포인트 손상**
```bash
# 해결책
python protocol_guard_v3.py --rollback <이전-체크포인트-ID>
git reset --hard HEAD~1  # Git 롤백
```

### **문제: 백엔드 연결 실패**
```bash
# 해결책
cd backend && python simple_main.py &
sleep 3
curl http://localhost:8001/health
```

---

## 📝 **세션 종료 체크리스트**

### **필수 수행 항목**
```markdown
□ 모든 작업 상태 저장
□ 최종 체크포인트 생성
□ 세션 요약 문서 작성
□ 다음 세션 지시사항 작성
□ 백업 생성 및 검증
□ .session_state.json 업데이트
□ SESSION_HANDOVER_TRIGGER.md 업데이트
```

### **핸드오버 문서 템플릿**
```markdown
## 다음 세션 시작 지시사항

**마지막 작업**: [작업 ID 및 설명]
**진행률**: XX%
**다음 단계**: [구체적 작업]
**주의사항**: [있다면]
**필수 명령**: 
  1. cd /home/duksan/바탕화면/gumgang_0_5
  2. python protocol_guard_v3.py --status
  3. [작업별 명령]
```

---

## ⚡ **긴급 복구 프로토콜**

### **LEVEL 1: 소프트 복구 (1분)**
```bash
python protocol_guard_v3.py --status
python protocol_guard_v3.py --rollback LAST
```

### **LEVEL 2: 미디움 복구 (5분)**
```bash
git status
git reset --hard HEAD
python restore_from_backup.py --latest
```

### **LEVEL 3: 하드 복구 (10분)**
```bash
# 마지막 안전 상태로 완전 복구
./emergency_restore.sh --safe-point
```

---

## 🎯 **핵심 원칙**

1. **신뢰도 우선**: 속도보다 안전
2. **투명성**: 모든 작업 기록
3. **복구 가능**: 언제든 롤백
4. **연속성**: 세션 간 완벽한 전달
5. **자동화**: 수동 개입 최소화

---

**이 문서는 모든 AI 세션의 필수 가이드입니다.**
**세션 시작 시 반드시 이 문서를 먼저 읽고 프로토콜을 따르세요.**

**Last Updated**: 2025-08-08 21:00:00
**Next Review**: 2025-08-09 09:00:00
**Maintained By**: 금강 2.0 Protocol System