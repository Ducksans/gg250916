# Gumgang 2.0 - Policy Model v1.0
[HEADER] Gumgang 2.0 / policy_model / KST 2025-08-09 18:33

## 1. 핵심 원칙 (Core Principles)

### 1.1 불가침 규칙 (Immutable Rules)
- **규칙 파일**: `.rules` 파일은 절대 수정/삭제 불가
- **봉인 문서**: 봉인된 캐논 문서는 hash 검증 통과 필수
- **타임스탬프**: Asia/Seoul (KST), "YYYY-MM-DD HH:mm" 형식 절대 준수
- **추측 금지**: 모든 판단은 실제 파일/로그 기반으로만

### 1.2 X-Rules 헤더 정책
```yaml
required_headers:
  X-Rules-Version: "1.0"
  X-Rules-Timestamp: "YYYY-MM-DD HH:mm"  # KST only
  X-Rules-Checksum: "sha256_hash"
  X-Rules-Guard: "protocol_guard_v3"
```

## 2. 이벤트 정책 (Event Policy)

### 2.1 불변 이벤트명 (Immutable Event Names)
```yaml
core_events:
  - name: "metrics"
    type: "system"
    immutable: true
  - name: "memory-update"
    type: "memory"
    immutable: true
  - name: "notification"
    type: "user"
    immutable: true
  - name: "selection-3d"
    type: "visualization"
    immutable: true
```

### 2.2 이벤트 확장 규칙
- **Additive-Only**: 새 이벤트 추가만 허용, 기존 이벤트 수정/삭제 금지
- **Namespace**: 새 이벤트는 `custom.*` 네임스페이스 사용
- **Validation**: 모든 이벤트는 스키마 검증 필수

## 3. 신뢰도 정책 (Trust Policy)

### 3.1 신뢰도 레벨
```yaml
trust_levels:
  SAFE:
    score: "90-100"
    action: "자동 진행"
    checkpoint: "선택적"
    
  CAUTION:
    score: "70-89"
    action: "사용자 확인 필요"
    checkpoint: "필수"
    
  DANGEROUS:
    score: "0-69"
    action: "작업 중단"
    checkpoint: "즉시 롤백"
```

### 3.2 신뢰도 변경 규칙
```yaml
score_changes:
  successful_task: +1
  failed_task: -5
  dangerous_operation: -10
  rollback_performed: -15
  user_override: +5
```

## 4. 파일 시스템 정책 (File System Policy)

### 4.1 보호 경로
```yaml
protected_paths:
  - "/.rules"
  - "/docs/_canon.meta.json"
  - "/protocol_guard_v3.py"
  - "/validate_canon_docs.sh"
```

### 4.2 백업 정책
- **자동 백업**: 모든 중요 변경 전 백업 생성
- **백업 경로**: `/memory/structure_fixes_backup/YYYY-MM-DD_HH-MM/`
- **보존 기간**: 최소 30일

## 5. 작업 정책 (Task Policy)

### 5.1 작업 ID 형식
```yaml
task_id_format:
  regular: "GG-YYYYMMDD-XXX"
  trust_strategy: "GG-YYYYMMDD-HTS-XXX"
  emergency: "GG-YYYYMMDD-EMG-XXX"
```

### 5.2 작업 승인 정책
```yaml
approval_required:
  - "시스템 파일 수정"
  - "포트 변경"
  - "신뢰도 70% 미만"
  - "프로덕션 배포"
  - "데이터베이스 변경"
```

## 6. API 정책 (API Policy)

### 6.1 엔드포인트 규칙
- **버전관리**: `/api/v1/`, `/api/v2/` 형식 사용
- **하위호환성**: 기존 엔드포인트 제거 금지, deprecation 경고만
- **응답 형식**: 모든 응답에 `timestamp` (KST) 포함

### 6.2 에러 정책
```json
{
  "status": "error",
  "code": "ERROR_CODE",
  "message": "사용자 친화적 메시지",
  "timestamp": "2025-08-09 18:33",
  "details": {}
}
```

## 7. 보안 정책 (Security Policy)

### 7.1 금지 명령어
```yaml
forbidden_commands:
  - "rm -rf /"
  - "dd if=/dev/zero"
  - "mkfs"
  - ":(){ :|:& };:"  # Fork bomb
  - "chmod -R 777"
```

### 7.2 포트 정책
```yaml
reserved_ports:
  backend: 8000
  frontend: 3000
  terminal: 8002
  websocket: 8001  # 예약됨
```

## 8. 검증 정책 (Validation Policy)

### 8.1 정기 검증
- **빈도**: 매시 정각
- **대상**: 봉인 문서, 시스템 상태, 신뢰도
- **실패 시**: 즉시 알림, 자동 롤백 시도

### 8.2 검증 체크리스트
```yaml
validation_checks:
  - "봉인 문서 해시"
  - "포트 상태"
  - "신뢰도 점수"
  - "디스크 공간"
  - "메모리 사용량"
  - "프로세스 상태"
```

## 9. 롤백 정책 (Rollback Policy)

### 9.1 자동 롤백 조건
- 신뢰도 50% 이하
- 3회 연속 실패
- 시스템 파일 손상
- 봉인 문서 변조 감지

### 9.2 롤백 절차
1. 즉시 작업 중단
2. 최근 체크포인트 확인
3. 백업에서 복원
4. 검증 수행
5. 보고서 생성

## 10. 문서화 정책 (Documentation Policy)

### 10.1 필수 문서
- `README.md`: 프로젝트 개요
- `NEXT_SESSION_IMMEDIATE.md`: 세션 핸드오버
- `TASK_CONTEXT_BRIDGE.md`: 작업 컨텍스트
- `.session_state.json`: 세션 상태

### 10.2 문서 형식
- **헤더**: `[HEADER] 프로젝트 / 문서명 / KST YYYY-MM-DD HH:mm`
- **섹션**: 번호 또는 이모지 사용
- **코드블록**: 언어 명시 필수

## 11. 모니터링 정책 (Monitoring Policy)

### 11.1 로그 정책
```yaml
log_levels:
  ERROR: "즉시 알림"
  WARNING: "집계 후 보고"
  INFO: "기록만"
  DEBUG: "개발 환경만"
```

### 11.2 메트릭 수집
- CPU 사용률
- 메모리 사용량
- 디스크 I/O
- 네트워크 트래픽
- API 응답 시간

## 12. 업데이트 정책 (Update Policy)

### 12.1 업데이트 규칙
- **Semantic Versioning**: MAJOR.MINOR.PATCH
- **Breaking Changes**: MAJOR 버전 증가
- **Backward Compatible**: MINOR 버전 증가
- **Bug Fixes**: PATCH 버전 증가

### 12.2 배포 정책
- **검증 환경**: 모든 변경은 검증 환경 테스트 필수
- **카나리 배포**: 10% → 50% → 100% 단계적 배포
- **롤백 준비**: 이전 버전 즉시 복원 가능

---

## 정책 시행 (Policy Enforcement)

본 정책 모델은 **2025-08-09 18:33**부터 시행되며, 모든 시스템 구성요소는 이를 준수해야 합니다.

### 검증 명령
```bash
# 정책 준수 검증
./tools/guard_validate_all.sh

# 개별 검증
python protocol_guard_v3.py --validate
```

### 정책 위반 시
1. 즉시 작업 중단
2. Protocol Guard 알림
3. 신뢰도 점수 차감
4. 위반 내용 로깅
5. 필요시 자동 롤백

---

**[SEALED]** 이 문서는 봉인되며, 수정 시 반드시 버전 증가와 함께 새 문서로 생성해야 합니다.