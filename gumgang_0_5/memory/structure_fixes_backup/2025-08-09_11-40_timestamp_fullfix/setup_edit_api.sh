#!/bin/bash

# 루트 기준 위치 정의
APP_DIR="gumgang_0_5/backend/app"
MAIN_FILE="gumgang_0_5/backend/main.py"
HTTP_FILE="gumgang_0_5/backend/test_api.http"

mkdir -p "$APP_DIR"

# ✅ 1. edit.py 생성
cat <<EOF > "$APP_DIR/edit.py"
from fastapi import APIRouter, HTTPException
import os

router = APIRouter()

@router.post("/edit")
def edit_file(filepath: str, find: str, replace: str):
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="File not found")
    with open(filepath, "r") as f:
        content = f.read()
    if find not in content:
        raise HTTPException(status_code=400, detail="Text to replace not found")
    new_content = content.replace(find, replace)
    with open(filepath, "w") as f:
        f.write(new_content)
    return {"status": "success", "message": f"'{find}' → '{replace}' replaced."}
EOF

echo "✅ edit.py 생성됨: $APP_DIR/edit.py"

# ✅ 2. main.py 수정
if [ -f "$MAIN_FILE" ]; then
  grep -q "from app import edit" "$MAIN_FILE" || sed -i '1s/^/from app import edit\n/' "$MAIN_FILE"
  grep -q "edit.router" "$MAIN_FILE" || sed -i '/app = FastAPI()/a\\napp.include_router(edit.router)' "$MAIN_FILE"
  echo "✅ main.py 수정 완료: edit API 라우터 연결됨"
else
  echo "⚠️ main.py 파일을 찾을 수 없습니다: $MAIN_FILE"
fi

# ✅ 3. test_api.http 샘플 추가
cat <<EOF >> "$HTTP_FILE"

###
# 🛠 코드 수정 테스트
POST http://localhost:8000/edit
Content-Type: application/json

{
  "filepath": "gumgang_0_5/backend/app/graph.py",
  "find": "temperature=0",
  "replace": "temperature=0.7"
}
EOF

echo "✅ test_api.http에 edit API 테스트 추가됨"

# ✅ 종료 메시지
echo "🎉 edit API 구성 완료: 이제 금강이 파일을 직접 수정할 수 있습니다."
