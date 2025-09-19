#!/bin/bash
# 금강 프로젝트 개발 서버 통합 실행 스크립트 (디버깅 모드)

SESSION_NAME="${DEV_ALL_SESSION:-gg_dev}"

# 1. 과거 스크립트에서 사용하던 세션(gumgang-debug)을 정리합니다.
if tmux has-session -t gumgang-debug 2>/dev/null; then
    echo "기존 'gumgang-debug' 세션을 종료합니다..."
    tmux kill-session -t gumgang-debug
fi

# 2. 동일 세션이 남아 있다면 종료합니다.
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo "기존 '$SESSION_NAME' 세션을 종료합니다..."
    tmux kill-session -t "$SESSION_NAME"
fi

# 3. 통합 dev_launcher 실행(tmux 자동 부착).
echo "'$SESSION_NAME' tmux 세션을 생성하고 바로 접속합니다..."
DEV_ALL_SESSION="$SESSION_NAME" "$(pwd)/scripts/dev_all.sh" tmux

# scripts/dev_all.sh 내에서 attach 후 사용자가 빠져나오면 여기로 되돌아옵니다.
echo "세션에서 분리(detach)되었거나 종료되었습니다. 필요 시 다시 './start_servers.sh' 실행 후 접속하세요."
