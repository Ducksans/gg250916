#!/usr/bin/env bash
set -euo pipefail

# watch_last_green.sh — Follow CI "last-green" tag and keep a worktree updated.
# When the tag advances, the worktree is force-checked-out to it.
# Optionally runs Vite dev on that worktree so you can open a local port
# (default 5175) to view the latest CI-passing source.

CORE_DIR="exports/gumgang_meeting_core"
GREEN_TAG="last-green"
PORT="5175"
INTERVAL="5"
RUN_SERVE=1
FORCE_RECREATE=0

usage() {
  cat <<EOF
Usage: $0 [--core <path>] [--tag <name>] [--port <5175>] [--interval <sec>] [--no-serve] [--force-recreate]
  --core       Path to core repo (default: exports/gumgang_meeting_core)
  --tag        CI success pointer tag (default: last-green)
  --port       Vite dev port for preview worktree (default: 5175)
  --interval   Poll interval seconds (default: 5)
  --no-serve   Do not start dev server (only update worktree)
  --force-recreate  Force initial cleanup (git worktree prune + delete preview dir)
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --core) CORE_DIR="$2"; shift 2;;
    --tag) GREEN_TAG="$2"; shift 2;;
    --port) PORT="$2"; shift 2;;
    --interval) INTERVAL="$2"; shift 2;;
    --no-serve) RUN_SERVE=0; shift;;
    --force-recreate) FORCE_RECREATE=1; shift;;
    -h|--help) usage; exit 0;;
    *) echo "Unknown arg: $1"; usage; exit 1;;
  esac
done

if [[ ! -d "$CORE_DIR/.git" ]]; then
  echo "[ERR] CORE_DIR does not look like a git repo: $CORE_DIR" >&2
  exit 1
fi

# Worktree path (sibling folder)
PREVIEW_DIR="${CORE_DIR}_last_green"

echo "[watch] core=$CORE_DIR tag=$GREEN_TAG preview_dir=$PREVIEW_DIR port=$PORT interval=${INTERVAL}s force_recreate=${FORCE_RECREATE}"

safe_force_recreate() {
  # Always prune stale worktree metadata first
  git -C "$CORE_DIR" worktree prune || true

  # Resolve absolute paths
  local ABS_CORE ABS_PREVIEW ABS_CORE_DIRNAME ABS_PREVIEW_DIRNAME
  ABS_CORE=$(realpath -m "$CORE_DIR")
  ABS_PREVIEW=$(realpath -m "$PREVIEW_DIR")
  ABS_CORE_DIRNAME=$(dirname "$ABS_CORE")
  ABS_PREVIEW_DIRNAME=$(dirname "$ABS_PREVIEW")

  # Safety guards before rm -rf
  # 1) Must end with suffix "_last_green"
  if [[ "${ABS_PREVIEW}" != *_last_green ]]; then
    echo "[guard] REFUSE delete: preview path does not end with _last_green: $ABS_PREVIEW" >&2
    return 0
  fi
  # 2) Parent directory of preview must equal parent of core
  if [[ "$ABS_CORE_DIRNAME" != "$ABS_PREVIEW_DIRNAME" ]]; then
    echo "[guard] REFUSE delete: preview not sibling of core ($ABS_PREVIEW_DIRNAME != $ABS_CORE_DIRNAME)" >&2
    return 0
  fi
  # 3) Must be a directory under current filesystem (avoid /)
  if [[ "$ABS_PREVIEW" = "/" || "$ABS_PREVIEW" = "." ]]; then
    echo "[guard] REFUSE delete: dangerous preview path: $ABS_PREVIEW" >&2
    return 0
  fi
  # 4) Only delete if it actually exists
  if [[ -d "$ABS_PREVIEW" ]]; then
    echo "[force] removing preview dir: $ABS_PREVIEW"
    rm -rf -- "$ABS_PREVIEW"
  fi
}

ensure_worktree() {
  # Resolve absolute paths to avoid nesting preview under core dir accidentally
  local ABS_CORE ABS_PREVIEW
  ABS_CORE=$(realpath -m "$CORE_DIR")
  ABS_PREVIEW=$(realpath -m "$PREVIEW_DIR")

  # Always prune stale worktree metadata first (guards against deleted dirs)
  git -C "$ABS_CORE" worktree prune || true
  # Ensure tag is fetched at least once
  git -C "$ABS_CORE" fetch --tags -q || true

  # If preview dir exists but is not a registered worktree, back it up
  if [[ -d "$PREVIEW_DIR" ]] && [[ ! -d "$PREVIEW_DIR/.git" ]]; then
    mv "$PREVIEW_DIR" "${PREVIEW_DIR}.old.$(date +%s)" || true
  fi

  # If registered but target directory no longer exists, pruning above removed it.
  # Check whether PREVIEW_DIR is already a registered worktree of CORE_DIR
  if git -C "$ABS_CORE" worktree list --porcelain | grep -Fq "worktree $ABS_PREVIEW"; then
    # Directory should exist; if not, recreate fresh
    if [[ ! -d "$ABS_PREVIEW" || ! -d "$ABS_PREVIEW/.git" ]]; then
      git -C "$ABS_CORE" worktree remove -f "$ABS_PREVIEW" 2>/dev/null || true
    else
      return 0
    fi
  fi

  # If directory exists but not registered as worktree, back it up safely
  if [[ -d "$ABS_PREVIEW" ]]; then
    mv "$ABS_PREVIEW" "${ABS_PREVIEW}.old.$(date +%s)" || true
  fi

  # Choose base ref: prefer GREEN_TAG, else HEAD
  local BASE_REF="$GREEN_TAG"
  if ! git -C "$ABS_CORE" rev-parse "$GREEN_TAG^{commit}" >/dev/null 2>&1; then
    BASE_REF="HEAD"
  fi
  git -C "$ABS_CORE" worktree add -f "$ABS_PREVIEW" "$BASE_REF"
}

if [[ "$FORCE_RECREATE" -eq 1 ]]; then
  safe_force_recreate
fi

ensure_worktree

# One-time checkout to tag if exists
ABS_CORE=$(realpath -m "$CORE_DIR")
ABS_PREVIEW=$(realpath -m "$PREVIEW_DIR")
if git -C "$ABS_CORE" rev-parse "$GREEN_TAG^{commit}" >/dev/null 2>&1; then
  git -C "$ABS_PREVIEW" checkout -qf "$GREEN_TAG" || true
fi

# ---------- UI deps management ----------
UI_DIR="$ABS_PREVIEW/ui/dev_a1_vite"
CORE_UI_DIR="$ABS_CORE/ui/dev_a1_vite"
LOCK_FILE_PREVIEW="$UI_DIR/package-lock.json"
LOCK_FILE_CORE="$CORE_UI_DIR/package-lock.json"
LOCK_HASH_FILE="$UI_DIR/.lock_hash"

hash_file() {
  local f="$1"
  [ -f "$f" ] || { echo ""; return; }
  if command -v sha256sum >/dev/null 2>&1; then sha256sum "$f" | awk '{print $1}';
  elif command -v shasum >/dev/null 2>&1; then shasum -a 256 "$f" | awk '{print $1}';
  else python3 - <<PY 2>/dev/null || echo ""
import hashlib,sys
try:
  h=hashlib.sha256(open(sys.argv[1],'rb').read()).hexdigest()
  print(h)
except Exception:
  pass
PY
  fi
}

ensure_ui_deps() {
  # If UI dir missing, recreate worktree (safety)
  if [[ ! -d "$UI_DIR" ]]; then
    git -C "$ABS_CORE" worktree remove -f "$ABS_PREVIEW" 2>/dev/null || true
    ensure_worktree
  fi

  local h_prev h_now h_core
  h_prev=""; [ -f "$LOCK_HASH_FILE" ] && h_prev="$(cat "$LOCK_HASH_FILE" 2>/dev/null || echo "")"
  h_now="$(hash_file "$LOCK_FILE_PREVIEW")"
  h_core="$(hash_file "$LOCK_FILE_CORE")"

  if [[ ! -d "$UI_DIR/node_modules" ]]; then
    if [[ -n "$h_now" && -n "$h_core" && "$h_now" = "$h_core" && -d "$CORE_UI_DIR/node_modules" ]]; then
      echo "[deps] linking node_modules from core (hash=$h_now)"
      ln -s "$CORE_UI_DIR/node_modules" "$UI_DIR/node_modules" 2>/dev/null || true
    else
      echo "[deps] installing node_modules via npm ci (no matching cache)"
      (cd "$UI_DIR" && npm ci)
    fi
    [ -n "$h_now" ] && echo "$h_now" > "$LOCK_HASH_FILE" || true
    return
  fi

  if [[ -n "$h_now" && "$h_now" != "$h_prev" ]]; then
    echo "[deps] lock change detected ($h_prev -> $h_now), reinstalling"
    rm -rf "$UI_DIR/node_modules"
    (cd "$UI_DIR" && npm ci)
    echo "$h_now" > "$LOCK_HASH_FILE"
  else
    echo "[deps] node_modules up-to-date (hash=${h_now:-none})"
  fi
}

# Prepare UI deps initially
ensure_ui_deps

# Start Vite dev (optional)
SERVE_PID=""
if [[ "$RUN_SERVE" -eq 1 ]]; then
  (
    cd "$ABS_PREVIEW/ui/dev_a1_vite"
    echo "[serve] starting vite dev on :$PORT"
    npx vite --port "$PORT"
  ) &
  SERVE_PID=$!
  echo "[serve] pid=$SERVE_PID"
fi

cleanup() {
  if [[ -n "$SERVE_PID" ]] && kill -0 "$SERVE_PID" 2>/dev/null; then
    echo "[serve] stopping $SERVE_PID"; kill "$SERVE_PID" || true
  fi
}
trap cleanup EXIT

# Poll for tag changes
while true; do
  git -C "$CORE_DIR" fetch --tags -q || true
  REMOTE_COMMIT=$(git -C "$CORE_DIR" rev-parse "$GREEN_TAG^{commit}" 2>/dev/null || echo "")
  LOCAL_COMMIT=$(git -C "$PREVIEW_DIR" rev-parse HEAD^{commit} 2>/dev/null || echo "")
  if [[ -n "$REMOTE_COMMIT" && "$REMOTE_COMMIT" != "$LOCAL_COMMIT" ]]; then
    echo "[watch] updating worktree to $GREEN_TAG ($REMOTE_COMMIT)"
    git -C "$PREVIEW_DIR" checkout -qf "$GREEN_TAG" || true
    date > "$PREVIEW_DIR/.ci_last_green"
    ensure_ui_deps
  fi
  sleep "$INTERVAL"
done
