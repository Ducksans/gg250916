#!/bin/bash
# 금강 프로젝트 개발 서버 3개의 상태를 확인하는 헬스 체크 스크립트

echo "금강 프로젝트 서버 상태를 확인합니다..."
echo "--------------------------------------"

# Function to check a port and print its status
check_server() {
    local name=$1
    local port=$2
    local url="http://127.0.0.1:$port"

    # We add a specific health endpoint for backend/bridge, and check root for Vite
    if [ "$name" == "백엔드 (FastAPI)" ]; then
        url="$url/api/health"
    elif [ "$name" == "브릿지 (Node.js)" ]; then
        url="$url/api/health"
    fi

    # Use curl with a short timeout. -s for silent, -o /dev/null to discard output.
    if curl -s --head --fail --max-time 2 "$url" > /dev/null; then
        echo "✅ $name (포트 $port): 정상 작동 중"
    else
        echo "❌ $name (포트 $port): 응답 없음"
    fi
}

# Check each server
check_server "백엔드 (FastAPI)" 8000
check_server "브릿지 (Node.js)" 3037
check_server "프론트엔드 (Vite)" 5173

echo "--------------------------------------"
echo "헬스 체크 완료."
