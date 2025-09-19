#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
UI_DIR="$ROOT_DIR/ui/dev_a1_vite"
EVIDENCE_DIR="$ROOT_DIR/status/evidence/ui"
DIST_ZIP_DIR="$EVIDENCE_DIR/dist"
LOG_PREFIX="$(date -u +%Y%m%dT%H%MZ)"
LINT_LOG="$EVIDENCE_DIR/lint_${LOG_PREFIX}.log"
BUILD_LOG="$EVIDENCE_DIR/build_${LOG_PREFIX}.log"
TEST_LOG="$EVIDENCE_DIR/test_${LOG_PREFIX}.log"
GUARD_LOG="$EVIDENCE_DIR/guardrails_${LOG_PREFIX}.log"
CHECKPOINT_NOTE="$ROOT_DIR/status/checkpoints/CKPT_72H_RUN.jsonl"
PREVIEW_NOTE="$EVIDENCE_DIR/preview_${LOG_PREFIX}.txt"
DIST_ZIP="$DIST_ZIP_DIR/dev_ui_dist_${LOG_PREFIX}.zip"

DRY_RUN=false
SKIP_PREVIEW=false
RUN_GUARD=true

usage() {
  cat <<USAGE
ST0102 Runner Script
Usage: $(basename "$0") [--dry-run] [--skip-preview] [--no-guard]

--dry-run       출력만 안내하고 명령은 실행하지 않습니다.
--skip-preview  dist 압축과 프리뷰 안내를 생략합니다.
--no-guard      guard:ui 단계를 생략합니다.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --skip-preview)
      SKIP_PREVIEW=true
      shift
      ;;
    --no-guard)
      RUN_GUARD=false
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "[WARN] 알 수 없는 인자: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ ! -d "$UI_DIR" ]]; then
  echo "[ERROR] UI 디렉터리를 찾을 수 없습니다: $UI_DIR" >&2
  exit 2
fi

mkdir -p "$EVIDENCE_DIR" "$DIST_ZIP_DIR"

has_npm_script() {
  node -e "const pkg=require('./package.json');process.exit(pkg && pkg.scripts && Object.prototype.hasOwnProperty.call(pkg.scripts,'$1')?0:1)" >/dev/null 2>&1
}

run_step() {
  local name="$1"
  shift
  local log_file="$1"
  shift
  local cmd=("$@")

  echo "\n[STEP] $name" >&2
  if "${DRY_RUN}"; then
    echo "[DRY-RUN] ${cmd[*]}" >&2
    return 0
  fi

  local exit_code
  if [[ "$log_file" == "-" ]]; then
    # shellcheck disable=SC2068
    "${cmd[@]}"
    exit_code=$?
  else
    # shellcheck disable=SC2068
    "${cmd[@]}" |& tee "$log_file"
    exit_code=${PIPESTATUS[0]}
  fi
  if [[ $exit_code -ne 0 ]]; then
    echo "[FAIL] $name (exit ${exit_code}). 로그: $log_file" >&2
    exit $exit_code
  fi
  echo "[DONE] $name" >&2
}

pushd "$UI_DIR" >/dev/null

run_step "npm install (ensure deps)" "-" npm install --no-audit --prefer-offline
if has_npm_script lint; then
  run_step "npm run lint" "$LINT_LOG" npm run lint
else
  echo "[INFO] npm script 'lint' 미정의 — 단계를 건너뜁니다." >&2
  LINT_LOG="(not-run: lint script missing)"
fi

if has_npm_script test; then
  run_step "npm run test -- --watch=false" "$TEST_LOG" npm run test -- --watch=false
else
  echo "[INFO] npm script 'test' 미정의 — 단계를 건너뜁니다." >&2
  TEST_LOG="(not-run: test script missing)"
fi
run_step "npm run build" "$BUILD_LOG" npm run build

if "$RUN_GUARD"; then
  run_step "npm run guard:ui" "$GUARD_LOG" npm run guard:ui
fi

popd >/dev/null

if ! "$DRY_RUN" && ! "$SKIP_PREVIEW"; then
  if [[ -d "$UI_DIR/dist" ]]; then
    if command -v zip >/dev/null 2>&1; then
      (cd "$UI_DIR" && zip -qr "$DIST_ZIP" dist)
    else
      echo "[WARN] zip 명령을 찾을 수 없어 dist 압축을 건너뜁니다." >&2
    fi
    cat <<PREVIEW_NOTE > "$PREVIEW_NOTE"
5175 프리뷰 실행 명령 예시:
npm --prefix "$UI_DIR" run preview -- --host --port 5175

승인 시:
npm --prefix "$UI_DIR" run preview -- --host --port 5173
PREVIEW_NOTE
  else
    echo "[WARN] dist 디렉터리를 찾을 수 없어 압축을 건너뜁니다." >&2
  fi
fi

cat <<SUMMARY
========================================
ST0102 Runner 완료 요약
- Lint 로그: $LINT_LOG
- Test 로그: $TEST_LOG
- Build 로그: $BUILD_LOG
- Guardrails 로그: $GUARD_LOG
- dist 아카이브: $DIST_ZIP
- 프리뷰 안내: $PREVIEW_NOTE
- 체크포인트 파일: $CHECKPOINT_NOTE
========================================
SUMMARY

if "$DRY_RUN"; then
  echo "(DRY-RUN) 위 경로는 예상 위치입니다. 실제 실행 시 로그가 생성됩니다." >&2
fi

exit 0
