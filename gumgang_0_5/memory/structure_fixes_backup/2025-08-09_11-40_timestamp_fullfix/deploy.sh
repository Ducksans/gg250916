#!/bin/bash

#############################################################
# 금강 2.0 - 배포 자동화 스크립트
#
# 사용법: ./deploy.sh [환경] [옵션]
#
# 환경:
#   staging    - 스테이징 환경
#   production - 프로덕션 환경
#
# 옵션:
#   --rollback - 이전 버전으로 롤백
#   --force    - 강제 배포 (헬스체크 무시)
#   --dry-run  - 실제 배포 없이 시뮬레이션
#############################################################

set -e  # 에러 발생 시 스크립트 중단

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

# 이모지
ROCKET="🚀"
CHECK="✅"
CROSS="❌"
WARNING="⚠️"
TIMER="⏱️"
PACKAGE="📦"

# 기본 설정
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${SCRIPT_DIR}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_DIR="${PROJECT_ROOT}/logs/deploy"
LOG_FILE="${LOG_DIR}/deploy_${TIMESTAMP}.log"

# 환경별 설정
declare -A ENV_CONFIG
ENV_CONFIG[staging]="staging"
ENV_CONFIG[production]="production"

# 배포 환경
ENVIRONMENT="${1:-staging}"
ROLLBACK=false
FORCE=false
DRY_RUN=false

# 함수: 로그 출력
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date "+%Y-%m-%d %H:%M:%S")

    case "$level" in
        INFO)
            echo -e "${BLUE}[INFO]${NC} ${message}"
            ;;
        SUCCESS)
            echo -e "${GREEN}[SUCCESS]${NC} ${CHECK} ${message}"
            ;;
        WARNING)
            echo -e "${YELLOW}[WARNING]${NC} ${WARNING} ${message}"
            ;;
        ERROR)
            echo -e "${RED}[ERROR]${NC} ${CROSS} ${message}"
            ;;
        *)
            echo -e "${message}"
            ;;
    esac

    echo "[${timestamp}] [${level}] ${message}" >> "${LOG_FILE}"
}

# 함수: 헤더 출력
print_header() {
    echo ""
    echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║${NC}  ${BOLD}${CYAN}         금강 2.0 - 자동 배포 시스템              ${NC}${PURPLE}║${NC}"
    echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${CYAN}환경: ${BOLD}${ENVIRONMENT}${NC}"
    echo -e "${CYAN}시간: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# 함수: 사전 체크
pre_check() {
    log INFO "사전 체크 시작..."

    # Docker 확인
    if ! command -v docker &> /dev/null; then
        log ERROR "Docker가 설치되지 않았습니다"
        exit 1
    fi

    # Docker Compose 확인
    if ! command -v docker-compose &> /dev/null; then
        log ERROR "Docker Compose가 설치되지 않았습니다"
        exit 1
    fi

    # 환경 파일 확인
    if [ ! -f "${PROJECT_ROOT}/.env.${ENVIRONMENT}" ]; then
        log ERROR ".env.${ENVIRONMENT} 파일이 없습니다"
        exit 1
    fi

    # 디스크 공간 확인
    AVAILABLE_SPACE=$(df -BG /var/lib/docker | awk 'NR==2 {print $4}' | sed 's/G//')
    if [ "$AVAILABLE_SPACE" -lt 5 ]; then
        log WARNING "디스크 공간 부족: ${AVAILABLE_SPACE}GB"
        if [ "$FORCE" != true ]; then
            exit 1
        fi
    fi

    log SUCCESS "사전 체크 완료"
}

# 함수: 백업 생성
create_backup() {
    log INFO "백업 생성 중..."

    BACKUP_DIR="${PROJECT_ROOT}/backups/${TIMESTAMP}"
    mkdir -p "${BACKUP_DIR}"

    # 데이터베이스 백업
    if docker-compose exec -T postgres pg_dump -U gumgang_user gumgang > "${BACKUP_DIR}/database.sql" 2>/dev/null; then
        log SUCCESS "데이터베이스 백업 완료"
    else
        log WARNING "데이터베이스 백업 실패"
    fi

    # 볼륨 백업
    docker run --rm \
        -v gumgang_uploaded_files:/data \
        -v "${BACKUP_DIR}:/backup" \
        alpine tar czf /backup/uploaded_files.tar.gz -C /data . 2>/dev/null || true

    # 환경 설정 백업
    cp "${PROJECT_ROOT}/.env.${ENVIRONMENT}" "${BACKUP_DIR}/" 2>/dev/null || true

    # 현재 이미지 태그 저장
    docker-compose images --quiet > "${BACKUP_DIR}/images.txt" 2>/dev/null || true

    log SUCCESS "백업 완료: ${BACKUP_DIR}"
}

# 함수: Git 업데이트
update_code() {
    log INFO "코드 업데이트 중..."

    cd "${PROJECT_ROOT}"

    # 현재 브랜치 확인
    CURRENT_BRANCH=$(git branch --show-current)
    log INFO "현재 브랜치: ${CURRENT_BRANCH}"

    # 변경사항 확인
    if [ -n "$(git status --porcelain)" ]; then
        log WARNING "커밋되지 않은 변경사항이 있습니다"
        git stash
    fi

    # 최신 코드 풀
    git fetch origin
    git pull origin "${CURRENT_BRANCH}"

    # 커밋 정보 기록
    LATEST_COMMIT=$(git rev-parse HEAD)
    echo "${LATEST_COMMIT}" > "${PROJECT_ROOT}/.deploy_commit"

    log SUCCESS "코드 업데이트 완료: ${LATEST_COMMIT:0:8}"
}

# 함수: Docker 이미지 빌드
build_images() {
    log INFO "Docker 이미지 빌드 중..."

    # 빌드 인자 설정
    export BUILDKIT_PROGRESS=plain
    export DOCKER_BUILDKIT=1

    # 환경 파일 로드
    set -a
    source "${PROJECT_ROOT}/.env.${ENVIRONMENT}"
    set +a

    # 이미지 빌드
    if [ "$DRY_RUN" = true ]; then
        log INFO "[DRY RUN] docker-compose build --no-cache"
    else
        docker-compose -f docker-compose.yml -f docker-compose.${ENVIRONMENT}.yml build --no-cache
    fi

    log SUCCESS "이미지 빌드 완료"
}

# 함수: 블루-그린 배포
deploy_blue_green() {
    log INFO "블루-그린 배포 시작..."

    # 현재 실행 중인 컨테이너 확인
    CURRENT_COLOR=$(docker-compose ps -q backend | xargs docker inspect -f '{{.Config.Labels.color}}' 2>/dev/null || echo "blue")
    NEW_COLOR=$([[ "$CURRENT_COLOR" == "blue" ]] && echo "green" || echo "blue")

    log INFO "현재: ${CURRENT_COLOR}, 새로운: ${NEW_COLOR}"

    # 새 컨테이너 시작
    if [ "$DRY_RUN" = true ]; then
        log INFO "[DRY RUN] 새 컨테이너 시작: ${NEW_COLOR}"
    else
        docker-compose -f docker-compose.yml -f docker-compose.${ENVIRONMENT}.yml \
            up -d --no-deps --scale backend=2 \
            --label color="${NEW_COLOR}" \
            backend
    fi

    # 헬스체크 대기
    log INFO "헬스체크 수행 중..."
    if ! health_check; then
        log ERROR "헬스체크 실패"
        if [ "$FORCE" != true ]; then
            rollback_deployment
            exit 1
        fi
    fi

    # 트래픽 전환
    log INFO "트래픽 전환 중..."
    if [ "$DRY_RUN" != true ]; then
        # nginx 설정 업데이트
        update_nginx_config "${NEW_COLOR}"

        # 이전 컨테이너 종료
        sleep 10
        docker-compose stop backend_${CURRENT_COLOR} 2>/dev/null || true
        docker-compose rm -f backend_${CURRENT_COLOR} 2>/dev/null || true
    fi

    log SUCCESS "블루-그린 배포 완료"
}

# 함수: 일반 배포
deploy_standard() {
    log INFO "표준 배포 시작..."

    if [ "$DRY_RUN" = true ]; then
        log INFO "[DRY RUN] docker-compose up -d"
    else
        docker-compose -f docker-compose.yml -f docker-compose.${ENVIRONMENT}.yml up -d
    fi

    # 헬스체크
    if ! health_check; then
        log ERROR "헬스체크 실패"
        if [ "$FORCE" != true ]; then
            rollback_deployment
            exit 1
        fi
    fi

    log SUCCESS "표준 배포 완료"
}

# 함수: 헬스체크
health_check() {
    local max_attempts=30
    local attempt=1
    local health_url="http://localhost:8001/health"

    if [ "$ENVIRONMENT" = "production" ]; then
        health_url="https://gumgang.com/health"
    fi

    while [ $attempt -le $max_attempts ]; do
        log INFO "헬스체크 시도 ${attempt}/${max_attempts}"

        if curl -f -s "${health_url}" > /dev/null; then
            log SUCCESS "헬스체크 성공"
            return 0
        fi

        attempt=$((attempt + 1))
        sleep 10
    done

    return 1
}

# 함수: nginx 설정 업데이트
update_nginx_config() {
    local color=$1
    log INFO "Nginx 설정 업데이트: ${color}"

    if [ "$DRY_RUN" != true ]; then
        # upstream 서버 변경
        sed -i "s/backend_blue/backend_${color}/g" "${PROJECT_ROOT}/nginx/conf.d/upstream.conf"

        # nginx 리로드
        docker-compose exec nginx nginx -s reload
    fi
}

# 함수: 롤백
rollback_deployment() {
    log WARNING "배포 롤백 시작..."

    # 이전 커밋으로 복원
    if [ -f "${PROJECT_ROOT}/.deploy_commit.prev" ]; then
        PREV_COMMIT=$(cat "${PROJECT_ROOT}/.deploy_commit.prev")
        git reset --hard "${PREV_COMMIT}"
        log INFO "코드 롤백: ${PREV_COMMIT:0:8}"
    fi

    # 이전 컨테이너로 복원
    docker-compose -f docker-compose.yml -f docker-compose.${ENVIRONMENT}.yml down
    docker-compose -f docker-compose.yml -f docker-compose.${ENVIRONMENT}.yml up -d

    log SUCCESS "롤백 완료"
}

# 함수: 정리 작업
cleanup() {
    log INFO "정리 작업 수행 중..."

    # 오래된 이미지 삭제
    docker image prune -f

    # 사용하지 않는 볼륨 삭제
    docker volume prune -f

    # 오래된 백업 삭제 (7일 이상)
    find "${PROJECT_ROOT}/backups" -type d -mtime +7 -exec rm -rf {} \; 2>/dev/null || true

    # 오래된 로그 삭제 (30일 이상)
    find "${LOG_DIR}" -name "*.log" -mtime +30 -delete 2>/dev/null || true

    log SUCCESS "정리 작업 완료"
}

# 함수: 배포 완료 알림
send_notification() {
    local status=$1
    local message=$2

    # Slack 알림
    if [ -n "${SLACK_WEBHOOK_URL}" ]; then
        curl -X POST "${SLACK_WEBHOOK_URL}" \
            -H 'Content-Type: application/json' \
            -d "{
                \"text\": \"${ROCKET} 금강 2.0 배포 ${status}\",
                \"attachments\": [{
                    \"color\": \"$([ \"$status\" = \"성공\" ] && echo \"good\" || echo \"danger\")\",
                    \"fields\": [
                        {\"title\": \"환경\", \"value\": \"${ENVIRONMENT}\", \"short\": true},
                        {\"title\": \"시간\", \"value\": \"$(date '+%Y-%m-%d %H:%M:%S')\", \"short\": true},
                        {\"title\": \"메시지\", \"value\": \"${message}\", \"short\": false}
                    ]
                }]
            }" 2>/dev/null || true
    fi

    # 이메일 알림
    if [ -n "${NOTIFY_EMAIL}" ]; then
        echo "${message}" | mail -s "금강 2.0 배포 ${status} - ${ENVIRONMENT}" "${NOTIFY_EMAIL}" 2>/dev/null || true
    fi
}

# 함수: 배포 요약
print_summary() {
    local end_time=$(date +%s)
    local duration=$((end_time - START_TIME))
    local minutes=$((duration / 60))
    local seconds=$((duration % 60))

    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}배포 요약${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "환경: ${BOLD}${ENVIRONMENT}${NC}"
    echo -e "상태: ${BOLD}${1}${NC}"
    echo -e "소요 시간: ${BOLD}${minutes}분 ${seconds}초${NC}"
    echo -e "커밋: ${BOLD}$(git rev-parse --short HEAD)${NC}"
    echo -e "로그: ${LOG_FILE}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# 메인 실행 함수
main() {
    START_TIME=$(date +%s)

    # 로그 디렉토리 생성
    mkdir -p "${LOG_DIR}"

    # 옵션 파싱
    shift
    while [[ $# -gt 0 ]]; do
        case $1 in
            --rollback)
                ROLLBACK=true
                ;;
            --force)
                FORCE=true
                ;;
            --dry-run)
                DRY_RUN=true
                ;;
            *)
                log ERROR "알 수 없는 옵션: $1"
                exit 1
                ;;
        esac
        shift
    done

    # 헤더 출력
    print_header

    # 환경 검증
    if [[ ! "${ENV_CONFIG[$ENVIRONMENT]+isset}" ]]; then
        log ERROR "잘못된 환경: ${ENVIRONMENT}"
        echo "사용 가능한 환경: ${!ENV_CONFIG[@]}"
        exit 1
    fi

    # 롤백 모드
    if [ "$ROLLBACK" = true ]; then
        log INFO "롤백 모드 실행"
        rollback_deployment
        print_summary "${GREEN}롤백 성공${NC}"
        send_notification "롤백 성공" "환경: ${ENVIRONMENT}"
        exit 0
    fi

    # 배포 프로세스
    trap 'log ERROR "배포 중단"; cleanup; exit 1' INT TERM

    pre_check
    create_backup
    update_code
    build_images

    # 프로덕션은 블루-그린, 스테이징은 표준 배포
    if [ "$ENVIRONMENT" = "production" ]; then
        deploy_blue_green
    else
        deploy_standard
    fi

    cleanup

    # 배포 성공
    print_summary "${GREEN}배포 성공${NC}"
    send_notification "배포 성공" "환경: ${ENVIRONMENT}, 커밋: $(git rev-parse --short HEAD)"

    log SUCCESS "${ROCKET} 금강 2.0 배포 완료!"
}

# 스크립트 실행
main "$@"
