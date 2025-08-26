#!/usr/bin/env bash
set -euo pipefail

VAULT="$HOME/바탕화면/gumgang_0_5/docs/gumgang_2_0"
MEETING_NOTE="$VAULT/금강_회의실.md"
LOG_DIR="$VAULT/금강_로그"

mkdir -p "$LOG_DIR"

if [ ! -f "$MEETING_NOTE" ]; then
  cat > "$MEETING_NOTE" <<'MD'
# 🧭 금강 2.0 회의실 (실시간 대시보드)

- 마지막 분석: **미확인**
- 변경된 파일 수: **미확인**
- 오류 상태: **정상**

---

## 실행 로그
(아래에 MCP 결과가 자동으로 쌓입니다)
MD
  echo "✅ 생성: $MEETING_NOTE"
else
  echo "ℹ️  기존 회의 노트 유지: $MEETING_NOTE"
fi

echo "✅ 로그 디렉터리: $LOG_DIR"
echo "완료!"
