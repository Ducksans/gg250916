#!/usr/bin/env bash
# 🚩 Gumgang 2.0 — Repo Clean (WRITE)
# 목적: 멀티스택(.py/Next/Tauri) .gitignore 정규화 + 캐시 제거 + 커밋
# 규칙: .rules 불가침, 해로운 삭제 없음(추적만 해제), KST 타임스탬프 출력
set -euo pipefail

ROOT="/home/duksan/바탕화면/gumgang_0_5"
cd "$ROOT"

TS="$(TZ=Asia/Seoul date '+%Y-%m-%d %H:%M')"
BACKUP_DIR="${ROOT}/memory/structure_fixes_backup/$(TZ=Asia/Seoul date '+%Y-%m-%d_%H-%M')/gitclean"
mkdir -p "$BACKUP_DIR"

echo "[ASK APPROVAL] .gitignore를 정규화하고, 대용량 산출물(venv/node_modules/target 등)을 추적 해제합니다. 진행할까요? (yes/no)"
read -r APPROVE
if [[ "${APPROVE:-no}" != "yes" && "${APPROVE:-no}" != "y" ]]; then
  echo "중단합니다."; exit 0
fi

# 1) 기존 .gitignore 백업
if [[ -f ".gitignore" ]]; then
  cp -f ".gitignore" "${BACKUP_DIR}/.gitignore.backup"
  echo "→ 기존 .gitignore 백업: ${BACKUP_DIR}/.gitignore.backup"
fi

# 2) 멀티스택 .gitignore 생성/갱신
cat > .gitignore <<'EOF'
# ===== Python =====
__pycache__/
*.py[cod]
*.pyo
*.pyd
.venv/
venv/
.mypy_cache/
.pytest_cache/
.coverage
htmlcov/
.ruff_cache/
.ipynb_checkpoints/

# ===== Node / Next / Web =====
node_modules/
.pnpm-store/
.yarn/cache/
.yarn/unplugged/
.next/
out/
dist/
build/
.turbo/
.vite/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# ===== Tauri / Rust =====
src-tauri/target/
target/

# ===== Env / Secrets (예외: 예시 파일은 추적) =====
.env
.env.*
!.env.example

# ===== Logs =====
logs/
*.log

# ===== IDE / OS =====
.vscode/
.idea/
.DS_Store
Thumbs.db
*.swp
*.swo
*~

# ===== Caches (general) =====
.cache/
.parcel-cache/
.tmp/
temp/
tmp/
EOF

# 3) 무시 대상 추적 해제 (존재하는 항목만)
echo "→ 캐시된 무시대상 추적 해제"
git rm -r --cached --ignore-unmatch \
  venv .venv node_modules .pnpm-store .yarn .next out dist build .turbo .vite \
  src-tauri/target target \
  __pycache__ .pytest_cache .mypy_cache htmlcov .ruff_cache \
  logs "*.log" 2>/dev/null || true

# 4) 변경 스테이징 및 커밋
git add .gitignore
# 새로 추적 해제된 파일들의 index 제거 반영
git add -A
git commit -m "chore(git): normalize .gitignore and untrack build/cache outputs (${TS} KST)" || {
  echo "커밋할 변경이 없습니다."
}

# 5) 결과 요약
echo
echo "=== Git Clean 완료(KST ${TS}) ==="
echo "- .gitignore 갱신 및 백업: ${BACKUP_DIR}/.gitignore.backup (있을 경우)"
echo "- 추적 해제 완료. 현재 상태 요약:"
git status -s
echo
echo "[NEXT] 권장 다음 단계: WS 스키마 v0.1 문서 봉인 → 캐논 5종 스켈레톤 생성."
