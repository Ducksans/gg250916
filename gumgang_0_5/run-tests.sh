#!/bin/bash

#############################################################
# 금강 2.0 - 통합 테스트 실행 스크립트
#
# 실행: ./run-tests.sh [옵션]
# 옵션:
#   --unit        단위 테스트만 실행
#   --integration 통합 테스트만 실행
#   --e2e         E2E 테스트만 실행
#   --coverage    커버리지 리포트 생성
#   --docs        API 문서 생성
#   --all         모든 테스트 및 문서 생성 (기본값)
#   --watch       변경 감지 모드
#   --parallel    병렬 실행
#############################################################

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# 이모지
CHECK="✅"
CROSS="❌"
ROCKET="🚀"
TEST="🧪"
DOC="📄"
TIMER="⏱️"
REPORT="📊"
WARNING="⚠️"

# 시작 시간 기록
START_TIME=$(date +%s)

# 프로젝트 경로
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="${PROJECT_ROOT}/gumgang-v2"
BACKEND_DIR="${PROJECT_ROOT}/backend"
TESTS_DIR="${PROJECT_ROOT}/tests"
DOCS_DIR="${PROJECT_ROOT}/docs"

# 테스트 결과 저장 경로
RESULTS_DIR="${PROJECT_ROOT}/test-results"
COVERAGE_DIR="${PROJECT_ROOT}/coverage"

# 함수: 헤더 출력
print_header() {
    echo ""
    echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║${NC}  ${BOLD}${CYAN}         금강 2.0 - 테스트 및 품질 보증 시스템          ${NC}${PURPLE}║${NC}"
    echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# 함수: 섹션 구분선
print_section() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}$1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# 함수: 진행 상황 표시
show_progress() {
    echo -e "${BLUE}${TIMER} $1...${NC}"
}

# 함수: 성공 메시지
show_success() {
    echo -e "${GREEN}${CHECK} $1${NC}"
}

# 함수: 실패 메시지
show_error() {
    echo -e "${RED}${CROSS} $1${NC}"
}

# 함수: 경고 메시지
show_warning() {
    echo -e "${YELLOW}${WARNING} $1${NC}"
}

# 함수: 디렉토리 생성
create_directories() {
    show_progress "결과 디렉토리 생성"
    mkdir -p "${RESULTS_DIR}"
    mkdir -p "${COVERAGE_DIR}"
    mkdir -p "${DOCS_DIR}/api"
    show_success "디렉토리 생성 완료"
}

# 함수: 의존성 확인
check_dependencies() {
    print_section "${TEST} 의존성 확인"

    local missing_deps=()

    # Node.js 확인
    if ! command -v node &> /dev/null; then
        missing_deps+=("Node.js")
    else
        echo -e "  ${CHECK} Node.js: $(node --version)"
    fi

    # npm 확인
    if ! command -v npm &> /dev/null; then
        missing_deps+=("npm")
    else
        echo -e "  ${CHECK} npm: $(npm --version)"
    fi

    # Python 확인
    if ! command -v python3 &> /dev/null; then
        missing_deps+=("Python 3")
    else
        echo -e "  ${CHECK} Python: $(python3 --version)"
    fi

    # Jest 확인
    if [ ! -f "${FRONTEND_DIR}/node_modules/.bin/jest" ]; then
        show_warning "Jest가 설치되지 않았습니다. 설치를 진행합니다..."
        cd "${FRONTEND_DIR}" && npm install
    else
        echo -e "  ${CHECK} Jest: 설치됨"
    fi

    if [ ${#missing_deps[@]} -gt 0 ]; then
        show_error "필수 의존성이 누락되었습니다: ${missing_deps[*]}"
        exit 1
    fi

    show_success "모든 의존성 확인 완료"
}

# 함수: 단위 테스트 실행
run_unit_tests() {
    print_section "${TEST} 단위 테스트 실행"

    cd "${FRONTEND_DIR}"

    show_progress "단위 테스트 실행 중"

    if npm test -- --testPathPattern="unit" --json --outputFile="${RESULTS_DIR}/unit-test-results.json" 2>&1 | tee "${RESULTS_DIR}/unit-test.log"; then
        show_success "단위 테스트 완료"

        # 결과 요약
        if [ -f "${RESULTS_DIR}/unit-test-results.json" ]; then
            local total=$(jq '.numTotalTests' "${RESULTS_DIR}/unit-test-results.json")
            local passed=$(jq '.numPassedTests' "${RESULTS_DIR}/unit-test-results.json")
            local failed=$(jq '.numFailedTests' "${RESULTS_DIR}/unit-test-results.json")

            echo ""
            echo -e "${REPORT} 단위 테스트 결과:"
            echo -e "  총 테스트: ${BOLD}${total}${NC}"
            echo -e "  ${GREEN}통과: ${passed}${NC}"
            echo -e "  ${RED}실패: ${failed}${NC}"
        fi
    else
        show_error "단위 테스트 실패"
        return 1
    fi
}

# 함수: 통합 테스트 실행
run_integration_tests() {
    print_section "${TEST} 통합 테스트 실행"

    cd "${FRONTEND_DIR}"

    show_progress "통합 테스트 실행 중"

    if npm test -- --testPathPattern="integration" --json --outputFile="${RESULTS_DIR}/integration-test-results.json" 2>&1 | tee "${RESULTS_DIR}/integration-test.log"; then
        show_success "통합 테스트 완료"

        # 결과 요약
        if [ -f "${RESULTS_DIR}/integration-test-results.json" ]; then
            local total=$(jq '.numTotalTests' "${RESULTS_DIR}/integration-test-results.json")
            local passed=$(jq '.numPassedTests' "${RESULTS_DIR}/integration-test-results.json")
            local failed=$(jq '.numFailedTests' "${RESULTS_DIR}/integration-test-results.json")

            echo ""
            echo -e "${REPORT} 통합 테스트 결과:"
            echo -e "  총 테스트: ${BOLD}${total}${NC}"
            echo -e "  ${GREEN}통과: ${passed}${NC}"
            echo -e "  ${RED}실패: ${failed}${NC}"
        fi
    else
        show_error "통합 테스트 실패"
        return 1
    fi
}

# 함수: E2E 테스트 실행
run_e2e_tests() {
    print_section "${TEST} E2E 테스트 실행"

    # 백엔드 서버 시작 확인
    if ! curl -s http://localhost:8001/health > /dev/null; then
        show_warning "백엔드 서버가 실행 중이 아닙니다. 시작합니다..."
        cd "${BACKEND_DIR}" && ./start_backend.sh start &
        sleep 5
    fi

    cd "${FRONTEND_DIR}"

    show_progress "E2E 테스트 실행 중"

    if npm test -- --testPathPattern="e2e" --json --outputFile="${RESULTS_DIR}/e2e-test-results.json" 2>&1 | tee "${RESULTS_DIR}/e2e-test.log"; then
        show_success "E2E 테스트 완료"
    else
        show_error "E2E 테스트 실패"
        return 1
    fi
}

# 함수: 커버리지 리포트 생성
generate_coverage() {
    print_section "${REPORT} 코드 커버리지 분석"

    cd "${FRONTEND_DIR}"

    show_progress "커버리지 데이터 수집 중"

    if npm test -- --coverage --coverageDirectory="${COVERAGE_DIR}" --json --outputFile="${RESULTS_DIR}/coverage-results.json" 2>&1 | tee "${RESULTS_DIR}/coverage.log"; then
        show_success "커버리지 분석 완료"

        # 커버리지 요약
        if [ -f "${COVERAGE_DIR}/coverage-summary.json" ]; then
            echo ""
            echo -e "${REPORT} 커버리지 요약:"

            local line_pct=$(jq '.total.lines.pct' "${COVERAGE_DIR}/coverage-summary.json")
            local branch_pct=$(jq '.total.branches.pct' "${COVERAGE_DIR}/coverage-summary.json")
            local func_pct=$(jq '.total.functions.pct' "${COVERAGE_DIR}/coverage-summary.json")
            local stmt_pct=$(jq '.total.statements.pct' "${COVERAGE_DIR}/coverage-summary.json")

            echo -e "  라인 커버리지:     ${BOLD}${line_pct}%${NC}"
            echo -e "  브랜치 커버리지:   ${BOLD}${branch_pct}%${NC}"
            echo -e "  함수 커버리지:     ${BOLD}${func_pct}%${NC}"
            echo -e "  구문 커버리지:     ${BOLD}${stmt_pct}%${NC}"

            # 임계값 확인
            if (( $(echo "$line_pct < 70" | bc -l) )); then
                show_warning "라인 커버리지가 70% 미만입니다"
            fi
        fi

        echo ""
        echo -e "${DOC} HTML 리포트: ${COVERAGE_DIR}/lcov-report/index.html"
    else
        show_error "커버리지 생성 실패"
        return 1
    fi
}

# 함수: API 문서 생성
generate_api_docs() {
    print_section "${DOC} API 문서 생성"

    show_progress "API 엔드포인트 스캔 중"

    if node "${DOCS_DIR}/api-documentation-generator.js"; then
        show_success "API 문서 생성 완료"
        echo ""
        echo -e "${DOC} 생성된 문서:"
        echo -e "  - OpenAPI JSON: ${DOCS_DIR}/api/openapi.json"
        echo -e "  - OpenAPI YAML: ${DOCS_DIR}/api/openapi.yaml"
        echo -e "  - Swagger UI: ${DOCS_DIR}/api/index.html"
        echo -e "  - Postman Collection: ${DOCS_DIR}/api/postman-collection.json"
    else
        show_error "API 문서 생성 실패"
        return 1
    fi
}

# 함수: 최종 리포트 생성
generate_final_report() {
    print_section "${REPORT} 최종 테스트 리포트"

    local END_TIME=$(date +%s)
    local DURATION=$((END_TIME - START_TIME))
    local MINUTES=$((DURATION / 60))
    local SECONDS=$((DURATION % 60))

    echo ""
    echo -e "${BOLD}테스트 실행 요약:${NC}"
    echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # 테스트 결과 집계
    local total_tests=0
    local total_passed=0
    local total_failed=0

    for result_file in "${RESULTS_DIR}"/*-test-results.json; do
        if [ -f "$result_file" ]; then
            local tests=$(jq '.numTotalTests' "$result_file")
            local passed=$(jq '.numPassedTests' "$result_file")
            local failed=$(jq '.numFailedTests' "$result_file")

            total_tests=$((total_tests + tests))
            total_passed=$((total_passed + passed))
            total_failed=$((total_failed + failed))
        fi
    done

    echo -e "총 테스트 케이스: ${BOLD}${total_tests}${NC}"
    echo -e "${GREEN}통과: ${total_passed}${NC} | ${RED}실패: ${total_failed}${NC}"
    echo ""
    echo -e "실행 시간: ${BOLD}${MINUTES}분 ${SECONDS}초${NC}"
    echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # 성공/실패 판단
    if [ $total_failed -eq 0 ]; then
        echo ""
        echo -e "${GREEN}${ROCKET} 모든 테스트 통과! 배포 준비 완료 ${ROCKET}${NC}"
        return 0
    else
        echo ""
        echo -e "${RED}${WARNING} 일부 테스트 실패. 수정이 필요합니다 ${WARNING}${NC}"
        return 1
    fi
}

# 함수: Watch 모드
run_watch_mode() {
    print_section "${TEST} Watch 모드 실행"

    cd "${FRONTEND_DIR}"

    echo -e "${CYAN}파일 변경을 감지하여 자동으로 테스트를 실행합니다.${NC}"
    echo -e "${YELLOW}종료하려면 Ctrl+C를 누르세요.${NC}"
    echo ""

    npm test -- --watch
}

# 함수: 병렬 실행
run_parallel() {
    print_section "${ROCKET} 병렬 테스트 실행"

    show_progress "모든 테스트를 병렬로 실행합니다"

    # 백그라운드에서 테스트 실행
    run_unit_tests &
    PID_UNIT=$!

    run_integration_tests &
    PID_INTEGRATION=$!

    generate_api_docs &
    PID_DOCS=$!

    # 모든 프로세스 대기
    wait $PID_UNIT
    RESULT_UNIT=$?

    wait $PID_INTEGRATION
    RESULT_INTEGRATION=$?

    wait $PID_DOCS
    RESULT_DOCS=$?

    # 결과 확인
    if [ $RESULT_UNIT -eq 0 ] && [ $RESULT_INTEGRATION -eq 0 ] && [ $RESULT_DOCS -eq 0 ]; then
        show_success "병렬 실행 완료"
        return 0
    else
        show_error "일부 작업 실패"
        return 1
    fi
}

# 메인 실행 함수
main() {
    print_header

    # 명령행 인자 파싱
    if [ $# -eq 0 ] || [ "$1" == "--all" ]; then
        # 전체 실행
        check_dependencies
        create_directories
        run_unit_tests
        run_integration_tests
        # run_e2e_tests  # E2E는 선택적
        generate_coverage
        generate_api_docs
        generate_final_report
    elif [ "$1" == "--unit" ]; then
        check_dependencies
        create_directories
        run_unit_tests
    elif [ "$1" == "--integration" ]; then
        check_dependencies
        create_directories
        run_integration_tests
    elif [ "$1" == "--e2e" ]; then
        check_dependencies
        create_directories
        run_e2e_tests
    elif [ "$1" == "--coverage" ]; then
        check_dependencies
        create_directories
        generate_coverage
    elif [ "$1" == "--docs" ]; then
        create_directories
        generate_api_docs
    elif [ "$1" == "--watch" ]; then
        check_dependencies
        run_watch_mode
    elif [ "$1" == "--parallel" ]; then
        check_dependencies
        create_directories
        run_parallel
        generate_final_report
    else
        echo "사용법: $0 [옵션]"
        echo "옵션:"
        echo "  --unit        단위 테스트만 실행"
        echo "  --integration 통합 테스트만 실행"
        echo "  --e2e         E2E 테스트만 실행"
        echo "  --coverage    커버리지 리포트 생성"
        echo "  --docs        API 문서 생성"
        echo "  --all         모든 테스트 및 문서 생성 (기본값)"
        echo "  --watch       변경 감지 모드"
        echo "  --parallel    병렬 실행"
        exit 1
    fi
}

# 스크립트 실행
main "$@"
