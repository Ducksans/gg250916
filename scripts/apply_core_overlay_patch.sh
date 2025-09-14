#!/usr/bin/env bash
set -euo pipefail

# Small helper to apply the guard:ui overlay placeholder patch
# Usage:
#   scripts/apply_core_overlay_patch.sh /path/to/gumgang_meeting_core [--dry-run]

if [[ ${1:-} == "" ]]; then
  echo "[ERR] Usage: $0 /path/to/gumgang_meeting_core [--dry-run]" >&2
  exit 2
fi

TARGET_DIR="$1"
DRY_RUN="false"
if [[ ${2:-} == "--dry-run" ]]; then
  DRY_RUN="true"
fi

PATCH_FILE="$(cd "$(dirname "$0")/.." && pwd)/patches/fix-guard-ui-overlay-default.patch"

if [[ ! -d "$TARGET_DIR/.git" ]]; then
  echo "[ERR] Not a git repo: $TARGET_DIR" >&2
  exit 3
fi
if [[ ! -f "$PATCH_FILE" ]]; then
  echo "[ERR] Patch file not found: $PATCH_FILE" >&2
  exit 4
fi

pushd "$TARGET_DIR" >/dev/null

if [[ $(git status --porcelain) != "" ]]; then
  echo "[ERR] Working tree not clean. Commit or stash first." >&2
  exit 5
fi

BR="fix/guard-ui-overlay-default"
if git rev-parse --verify "$BR" >/dev/null 2>&1; then
  git switch "$BR"
else
  git switch -c "$BR"
fi

echo "[INFO] Applying patch: $PATCH_FILE"
if [[ "$DRY_RUN" == "true" ]]; then
  git apply --check "$PATCH_FILE"
  echo "[OK] Dry-run successful. No changes made."
else
  git apply "$PATCH_FILE"
  git add -A
  git commit -m "chore(ui): add default overlay placeholder for guard:ui"
  echo "[OK] Patch applied and committed on branch $BR"
  echo "[NEXT] Push and create PR:"
  echo "       git push -u origin $BR"
fi

popd >/dev/null

