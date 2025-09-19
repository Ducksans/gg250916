#!/bin/bash
# 금강 프로젝트 개발 서버 3개의 상태를 확인하는 헬스 체크 스크립트

echo "금강 프로젝트 서버 상태를 확인합니다..."
echo "--------------------------------------"

# Function to check a port and print its status
check_server() {
    local name=$1
    local port=$2
    local url="http://127.0.0.1:$port"

    # Health target: backend/bridge → /api/health, UI(Vite) → /
    if [ "$name" == "백엔드 (FastAPI)" ] || [ "$name" == "브릿지 (Node.js)" ]; then
        url="$url/api/health"
    fi

    # Perform a GET and inspect status code (HEAD can return 405)
    local code
    code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 "$url" || echo "000")

    # Vite preview(5175) may return 302; consider 200 OK for all, and 302 OK for Vite ports
    if [ "$port" = "5173" ] || [ "$port" = "5175" ]; then
        if [ "$code" = "200" ] || [ "$code" = "302" ]; then
            echo "✅ $name (포트 $port): 정상 작동 중"
        else
            echo "❌ $name (포트 $port): 응답 코드 $code"
        fi
    else
        if [ "$code" = "200" ]; then
            echo "✅ $name (포트 $port): 정상 작동 중"
        else
            echo "❌ $name (포트 $port): 응답 코드 $code"
        fi
    fi
}

# Check each server
check_server "백엔드 (FastAPI)" 8000
check_server "브릿지 (Node.js)" 3037
check_server "프론트엔드 (Vite)" 5173
check_server "프리뷰 (Vite)" 5175

echo "--------------------------------------"
echo "헬스 체크 완료."
