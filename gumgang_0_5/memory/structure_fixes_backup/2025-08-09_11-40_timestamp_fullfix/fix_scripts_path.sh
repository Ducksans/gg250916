#!/bin/bash

echo "🔍 [1] gumgang_0_5 전체 디렉토리 구조 스캔 중..."
BASE_DIR=~/바탕화면/gumgang_0_5
TREE_FILE="$BASE_DIR/gumgang_file_tree.txt"

mkdir -p "$BASE_DIR"
find "$BASE_DIR" -type d -name ".git" -prune -o -print | sed -e 's;[^/]*/;|____;g;s;____|; |;g' > "$TREE_FILE"
echo "✅ 저장 완료: $TREE_FILE"

echo ""
echo "📁 [2] 'scripts' 폴더의 위치 찾기..."
OLD_SCRIPTS_PATH=$(find "$BASE_DIR" -type d -name "scripts" | grep "scripts" | head -n 1)
NEW_SCRIPTS_PARENT="$BASE_DIR/backend"
NEW_SCRIPTS_PATH="$NEW_SCRIPTS_PARENT/scripts"

if [ -z "$OLD_SCRIPTS_PATH" ]; then
    echo "❌ 기존 scripts 폴더를 찾을 수 없습니다."
    exit 1
fi

if [ "$OLD_SCRIPTS_PATH" != "$NEW_SCRIPTS_PATH" ]; then
    echo "📦 'scripts' 폴더를 이동: $OLD_SCRIPTS_PATH → $NEW_SCRIPTS_PATH"
    mv "$OLD_SCRIPTS_PATH" "$NEW_SCRIPTS_PATH"
else
    echo "ℹ️ scripts 폴더는 이미 올바른 위치에 있습니다."
fi

echo ""
echo "🛠️ [3] scripts 참조 중인 파일 경로 일괄 수정 중..."
TARGETS=$(grep -rl "scripts" "$BASE_DIR" --include "*.py" --include "*.sh")

for file in $TARGETS; do
    echo "✏️ 수정 중: $file"
    sed -i 's|scripts|scripts|g' "$file"
done

echo ""
echo "✅ 경로 수정 완료: $(echo "$TARGETS" | wc -l)개 파일 수정됨"
