#!/bin/bash
# 금강 프로젝트 개발 서버 통합 실행 스크립트 (디버깅 모드)

SESSION_NAME="gumgang-debug"

# 1. 기존 디버깅 세션이 있다면 정리합니다.
if tmux has-session -t $SESSION_NAME 2>/dev/null; then
    echo "기존 'gumgang-debug' 세션을 종료합니다..."
    tmux kill-session -t $SESSION_NAME
fi

# 2. 새로운 detached tmux 세션을 생성하고 서버를 실행합니다.
#    '; bash' 를 추가하여 dev_all.sh가 실패하더라도 세션과 창이 살아남도록 합니다.
echo "디버깅 모드로 새로운 '$SESSION_NAME' tmux 세션을 생성합니다..."
tmux new-session -d -s $SESSION_NAME "$(pwd)/scripts/dev_all.sh tmux; bash"

# 3. 성공 메시지를 출력합니다.
echo "🎉 디버깅 세션이 생성되었습니다."
echo "지금 바로 'tmux attach -t $SESSION_NAME' 명령어로 접속하여 내부 로그를 확인해주십시오."
echo "세션 종료는 'tmux kill-session -t $SESSION_NAME' 입니다."
