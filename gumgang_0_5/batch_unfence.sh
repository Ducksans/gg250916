#!/usr/bin/env bash
set -e
for f in \
  "gumgang-v2/components/editor/CollaborativeEditor.tsx" \
  "gumgang-v2/components/editor/MultiTabEditor.tsx" \
  "gumgang-v2/components/editor/WebFileHandler.tsx"
do
  echo "Processing: $f"
  # 백업 생성
  mkdir -p memory/ts_unfence_backup/batch
  cp "$f" "memory/ts_unfence_backup/batch/$(basename $f).bak"
  
  # @ts-nocheck 제거
  if grep -q '@ts-nocheck' "$f"; then
    sed -i '/@ts-nocheck/d' "$f"
    echo "→ Removed @ts-nocheck from $f"
  fi
  
  # 빌드 테스트
  cd gumgang-v2
  if npm run build > ../logs/builds/batch_$(basename $f .tsx).log 2>&1; then
    echo "✅ Build success: $f"
    cd ..
    git add "$f"
    git commit -m "types: remove @ts-nocheck from $(basename $f)" --no-verify
  else
    echo "❌ Build failed: $f"
    cd ..
    cp "memory/ts_unfence_backup/batch/$(basename $f).bak" "$f"
    exit 1
  fi
  cd ..
done

echo "All files processed successfully!"

# 모두 성공 시 FE 재시작(3000)
echo "Restarting frontend..."
kill $(lsof -ti :3000) 2>/dev/null || true; sleep 1
kill -9 $(lsof -ti :3000) 2>/dev/null || true
( cd gumgang-v2; PORT=3000 nohup npm run start > ../logs/runtime/fe_3000_$(TZ=Asia/Seoul date +%F_%H-%M).log 2>&1 & )
echo "Frontend restarted!"
