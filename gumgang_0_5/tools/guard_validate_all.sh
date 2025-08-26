#!/usr/bin/env bash
# 🛡️ Gumgang 2.0 — Guard Validate All
# 목적: 시스템 전체 상태 검증 및 정책 준수 확인
# 규칙: .rules 불가침, 타임스탬프 KST, 추측 금지

set -euo pipefail

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 경로 설정
ROOT="/home/duksan/바탕화면/gumgang_0_5"
DOCS="${ROOT}/docs"
LOGS="${ROOT}/logs"
VALIDATION_LOG="${LOGS}/validation_$(date +%Y%m%d_%H%M).log"

# 타임스탬프 함수 (KST)
ts() { TZ=Asia/Seoul date '+%Y-%m-%d %H:%M'; }

# 로깅 함수
log() {
    echo -e "$1" | tee -a "${VALIDATION_LOG}"
}

# 검증 결과 카운터
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNINGS=0

# 헤더 출력
echo "============================================================" | tee "${VALIDATION_LOG}"
echo "  🛡️  Gumgang 2.0 - System Validation Report" | tee -a "${VALIDATION_LOG}"
echo "  Time: $(ts) KST" | tee -a "${VALIDATION_LOG}"
echo "============================================================" | tee -a "${VALIDATION_LOG}"
echo "" | tee -a "${VALIDATION_LOG}"

# ========== 1. 봉인 문서 검증 ==========
log "${BLUE}[1/8] 봉인 문서 무결성 검증${NC}"
log "----------------------------------------"

if [[ -f "${DOCS}/_canon.meta.json" ]]; then
    CANON_VALID=true

    # jq 사용 가능 여부 확인
    if command -v jq >/dev/null 2>&1; then
        # 각 봉인 문서 검증
        while IFS= read -r line; do
            TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

            # JSON 파싱
            DOC_PATH=$(echo "$line" | jq -r '.path')
            DOC_HASH=$(echo "$line" | jq -r '.hash_sha256')
            DOC_TITLE=$(echo "$line" | jq -r '.title')

            # 실제 해시 계산
            if [[ -f "${ROOT}/${DOC_PATH}" ]]; then
                ACTUAL_HASH=$(sha256sum "${ROOT}/${DOC_PATH}" | awk '{print $1}')

                if [[ "${ACTUAL_HASH}" == "${DOC_HASH}" ]]; then
                    log "  ${GREEN}✓${NC} ${DOC_TITLE}: 무결성 확인됨"
                    PASSED_CHECKS=$((PASSED_CHECKS + 1))
                else
                    log "  ${RED}✗${NC} ${DOC_TITLE}: 해시 불일치!"
                    log "    예상: ${DOC_HASH:0:12}..."
                    log "    실제: ${ACTUAL_HASH:0:12}..."
                    FAILED_CHECKS=$((FAILED_CHECKS + 1))
                    CANON_VALID=false
                fi
            else
                log "  ${RED}✗${NC} ${DOC_TITLE}: 파일 없음!"
                FAILED_CHECKS=$((FAILED_CHECKS + 1))
                CANON_VALID=false
            fi
        done < <(jq -c '.docs[]' "${DOCS}/_canon.meta.json")
    else
        log "  ${YELLOW}⚠${NC} jq 미설치 - 수동 검증 필요"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    log "  ${RED}✗${NC} _canon.meta.json 파일 없음"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# ========== 2. 백엔드 상태 검증 ==========
log ""
log "${BLUE}[2/8] 백엔드 서버 상태${NC}"
log "----------------------------------------"
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

BACKEND_STATUS=$(curl -s http://localhost:8000/health 2>/dev/null | grep -o '"status":"healthy"' || echo "")
if [[ -n "${BACKEND_STATUS}" ]]; then
    log "  ${GREEN}✓${NC} 백엔드 서버: 정상 (포트 8000)"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))

    # 엔드포인트 테스트
    ENDPOINTS=("/health" "/status" "/api/test" "/api/tasks" "/api/dashboard/stats")
    for endpoint in "${ENDPOINTS[@]}"; do
        TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
        STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:8000${endpoint}" 2>/dev/null || echo "000")
        if [[ "${STATUS_CODE}" == "200" ]] || [[ "${STATUS_CODE}" == "405" ]]; then
            log "    ${GREEN}✓${NC} ${endpoint}: ${STATUS_CODE}"
            PASSED_CHECKS=$((PASSED_CHECKS + 1))
        else
            log "    ${RED}✗${NC} ${endpoint}: ${STATUS_CODE}"
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
        fi
    done
else
    log "  ${RED}✗${NC} 백엔드 서버: 오프라인 또는 비정상"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# ========== 3. 프론트엔드 상태 검증 ==========
log ""
log "${BLUE}[3/8] 프론트엔드 서버 상태${NC}"
log "----------------------------------------"
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

FRONTEND_PID=$(lsof -ti:3000 2>/dev/null || echo "")
if [[ -n "${FRONTEND_PID}" ]]; then
    log "  ${GREEN}✓${NC} 프론트엔드 서버: 실행 중 (포트 3000, PID: ${FRONTEND_PID})"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    log "  ${YELLOW}⚠${NC} 프론트엔드 서버: 미실행"
    WARNINGS=$((WARNINGS + 1))
fi

# ========== 4. Protocol Guard 상태 ==========
log ""
log "${BLUE}[4/8] Protocol Guard v3 상태${NC}"
log "----------------------------------------"
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

if [[ -f "${ROOT}/protocol_guard_v3.py" ]]; then
    GUARD_STATUS=$(python "${ROOT}/protocol_guard_v3.py" --status 2>&1 | grep -o "신뢰도: [0-9.]*%" || echo "")
    if [[ -n "${GUARD_STATUS}" ]]; then
        log "  ${GREEN}✓${NC} Protocol Guard: 정상 (${GUARD_STATUS})"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        log "  ${YELLOW}⚠${NC} Protocol Guard: 상태 확인 불가"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    log "  ${RED}✗${NC} Protocol Guard: 파일 없음"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# ========== 5. 포트 상태 확인 ==========
log ""
log "${BLUE}[5/8] 포트 사용 현황${NC}"
log "----------------------------------------"

PORTS=("8000:Backend" "3000:Frontend" "8002:Terminal" "8001:WebSocket")
for port_info in "${PORTS[@]}"; do
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    IFS=':' read -r PORT SERVICE <<< "${port_info}"

    if lsof -i:${PORT} >/dev/null 2>&1; then
        PID=$(lsof -ti:${PORT} 2>/dev/null | head -1)
        log "  ${GREEN}✓${NC} 포트 ${PORT} (${SERVICE}): 사용 중 [PID: ${PID}]"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        if [[ "${SERVICE}" == "Backend" ]]; then
            log "  ${RED}✗${NC} 포트 ${PORT} (${SERVICE}): 미사용"
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
        else
            log "  ${YELLOW}○${NC} 포트 ${PORT} (${SERVICE}): 미사용"
        fi
    fi
done

# ========== 6. Git 상태 확인 ==========
log ""
log "${BLUE}[6/8] Git 저장소 상태${NC}"
log "----------------------------------------"
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

cd "${ROOT}"
UNTRACKED_COUNT=$(git status --porcelain 2>/dev/null | wc -l || echo "0")
if [[ "${UNTRACKED_COUNT}" -gt 1000 ]]; then
    log "  ${RED}✗${NC} Git 파일 과다: ${UNTRACKED_COUNT}개 (정리 필요)"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
elif [[ "${UNTRACKED_COUNT}" -gt 100 ]]; then
    log "  ${YELLOW}⚠${NC} Git 파일 많음: ${UNTRACKED_COUNT}개"
    WARNINGS=$((WARNINGS + 1))
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    log "  ${GREEN}✓${NC} Git 상태 양호: ${UNTRACKED_COUNT}개 변경"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
fi

# ========== 7. 시스템 리소스 확인 ==========
log ""
log "${BLUE}[7/8] 시스템 리소스${NC}"
log "----------------------------------------"

# 디스크 사용량
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
DISK_USAGE=$(df -h "${ROOT}" | awk 'NR==2 {print $5}' | sed 's/%//')
if [[ "${DISK_USAGE}" -lt 80 ]]; then
    log "  ${GREEN}✓${NC} 디스크 사용량: ${DISK_USAGE}%"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
elif [[ "${DISK_USAGE}" -lt 90 ]]; then
    log "  ${YELLOW}⚠${NC} 디스크 사용량: ${DISK_USAGE}% (주의)"
    WARNINGS=$((WARNINGS + 1))
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    log "  ${RED}✗${NC} 디스크 사용량: ${DISK_USAGE}% (위험)"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# 메모리 사용량
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
MEM_USAGE=$(free -m | awk 'NR==2 {printf "%.1f", $3*100/$2}')
MEM_USAGE_INT=${MEM_USAGE%.*}
if [[ "${MEM_USAGE_INT}" -lt 80 ]]; then
    log "  ${GREEN}✓${NC} 메모리 사용량: ${MEM_USAGE}%"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
elif [[ "${MEM_USAGE_INT}" -lt 90 ]]; then
    log "  ${YELLOW}⚠${NC} 메모리 사용량: ${MEM_USAGE}% (주의)"
    WARNINGS=$((WARNINGS + 1))
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    log "  ${RED}✗${NC} 메모리 사용량: ${MEM_USAGE}% (위험)"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# ========== 8. 정책 준수 확인 ==========
log ""
log "${BLUE}[8/8] 정책 모델 준수${NC}"
log "----------------------------------------"

# .rules 파일 확인
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if [[ -f "${ROOT}/.rules" ]]; then
    log "  ${GREEN}✓${NC} .rules 파일: 존재"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    log "  ${RED}✗${NC} .rules 파일: 없음"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# 필수 디렉토리 확인
REQUIRED_DIRS=("backend" "gumgang-v2" "docs" "logs" "memory")
for dir in "${REQUIRED_DIRS[@]}"; do
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    if [[ -d "${ROOT}/${dir}" ]]; then
        log "  ${GREEN}✓${NC} ${dir}/: 존재"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        log "  ${RED}✗${NC} ${dir}/: 없음"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
done

# ========== 검증 결과 요약 ==========
log ""
log "============================================================"
log "  📊 검증 결과 요약"
log "============================================================"
log "  총 검사 항목: ${TOTAL_CHECKS}"
log "  ${GREEN}통과: ${PASSED_CHECKS}${NC}"
log "  ${RED}실패: ${FAILED_CHECKS}${NC}"
log "  ${YELLOW}경고: ${WARNINGS}${NC}"
log ""

# 성공률 계산
if [[ ${TOTAL_CHECKS} -gt 0 ]]; then
    SUCCESS_RATE=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
else
    SUCCESS_RATE=0
fi

log "  성공률: ${SUCCESS_RATE}%"
log ""

# 최종 판정
if [[ ${FAILED_CHECKS} -eq 0 ]]; then
    log "  ${GREEN}✅ 시스템 상태: 정상${NC}"
    EXIT_CODE=0
elif [[ ${FAILED_CHECKS} -le 3 ]]; then
    log "  ${YELLOW}⚠️  시스템 상태: 주의 필요${NC}"
    EXIT_CODE=1
else
    log "  ${RED}❌ 시스템 상태: 문제 발생${NC}"
    EXIT_CODE=2
fi

log ""
log "  검증 시간: $(ts) KST"
log "  로그 파일: ${VALIDATION_LOG}"
log "============================================================"

# 크리티컬 이슈 있을 경우 상세 정보
if [[ ${FAILED_CHECKS} -gt 0 ]]; then
    log ""
    log "${RED}[조치 필요 사항]${NC}"
    log "----------------------------------------"

    if [[ "${CANON_VALID}" == "false" ]]; then
        log "  • 봉인 문서 무결성 복구 필요"
        log "    실행: ./validate_canon_docs.sh"
    fi

    if [[ -z "${BACKEND_STATUS}" ]]; then
        log "  • 백엔드 서버 시작 필요"
        log "    실행: cd backend && python simple_main.py"
    fi

    if [[ "${UNTRACKED_COUNT}" -gt 1000 ]]; then
        log "  • Git 파일 정리 필요"
        log "    실행: git clean -fd (주의: 파일 삭제됨)"
    fi
fi

exit ${EXIT_CODE}
