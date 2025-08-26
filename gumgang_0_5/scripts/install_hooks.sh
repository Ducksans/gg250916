#!/usr/bin/env bash
# Gumgang 2.0 — Guard Hooks Installer
# Installs/uninstalls Git hooks that auto-record changes into:
#   - logs/guard_audit.log
#   - .session/session_manifest.json
#
# Hooks provided (templates):
#   scripts/hooks/commit-msg
#   scripts/hooks/pre-commit
#   scripts/hooks/pre-push
#
# Usage:
#   ./scripts/install_hooks.sh install      # install or update symlinks
#   ./scripts/install_hooks.sh uninstall    # remove symlinks (backup left intact)
#   ./scripts/install_hooks.sh status       # show current hook link status
#   ./scripts/install_hooks.sh repair       # re-create missing/incorrect links
#
# Notes:
#   - This script uses symlinks into .git/hooks so that template updates are picked up automatically.
#   - For stricter policy (block commit when Task ID missing), export before committing:
#       export GUARD_ENFORCE_TASK=1        # commit-msg enforcement
#       export GUARD_ENFORCE_TASK_PRE=1    # pre-commit enforcement
#   - Hooks rely on Python available (prefer .venv/bin/python, fallback to python3/python).
#   - No logs/manifest are modified by this script itself; recording happens at commit time.

set -euo pipefail

# ----------------------------
# Helpers
# ----------------------------

msg()  { printf "\033[1;34m[hooks]\033[0m %s\n" "$*"; }
ok()   { printf "\033[1;32m[ok]\033[0m %s\n" "$*"; }
warn() { printf "\033[1;33m[warn]\033[0m %s\n" "$*"; }
err()  { printf "\033[1;31m[err]\033[0m %s\n" "$*" >&2; }

# Resolve repo root
if ! ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"; then
  err "Not a git repository. Run inside your repo."
  exit 1
fi

HOOK_DIR="$(git rev-parse --git-path hooks)"
TEMPLATES_DIR="${ROOT}/scripts/hooks"

HOOKS=("commit-msg" "pre-commit" "pre-push")

ensure_templates_exist() {
  local missing=0
  for h in "${HOOKS[@]}"; do
    if [[ ! -f "${TEMPLATES_DIR}/${h}" ]]; then
      warn "Template missing: ${TEMPLATES_DIR}/${h}"
      missing=1
    fi
  done
  if [[ "${missing}" -eq 1 ]]; then
    err "Cannot proceed: one or more hook templates are missing."
    exit 2
  fi
}

ensure_hook_dir() {
  if [[ ! -d "${HOOK_DIR}" ]]; then
    mkdir -p "${HOOK_DIR}"
    ok "Created hooks dir: ${HOOK_DIR}"
  fi
}

link_hook() {
  local name="$1"
  local src="${TEMPLATES_DIR}/${name}"
  local dst="${HOOK_DIR}/${name}"

  # backup non-symlink existing hook (user-customized)
  if [[ -e "${dst}" && ! -L "${dst}" ]]; then
    local ts
    ts="$(date +%Y-%m-%d_%H-%M)"
    local bak="${dst}.backup.${ts}"
    mv -f "${dst}" "${bak}"
    warn "Existing non-symlink hook backed up: ${bak}"
  fi

  ln -sfn "${src}" "${dst}"
  chmod +x "${dst}" || true
}

is_link_correct() {
  local name="$1"
  local dst="${HOOK_DIR}/${name}"
  local expected="${TEMPLATES_DIR}/${name}"

  if [[ -L "${dst}" ]]; then
    # readlink -f resolves symlink target (portable enough in Git Bash/WSL)
    local target
    target="$(readlink "${dst}" || true)"
    # If readlink returns relative path, normalize
    if [[ -n "${target}" && ! "${target}" = /* ]]; then
      target="$(cd "${HOOK_DIR}" && readlink "${name}")"
      target="$(cd "${HOOK_DIR}" && realpath "${target}" 2>/dev/null || echo "${expected}")"
    fi
    local exp_abs
    exp_abs="$(realpath "${expected}" 2>/dev/null || echo "${expected}")"
    [[ -f "${expected}" && -n "${target}" ]] || return 1
    # Relaxed: just ensure it points to template path basename
    [[ "$(basename "${target}")" == "$(basename "${expected}")" ]]
    return $?
  fi
  return 1
}

show_status() {
  msg "Git hooks status (.git/hooks)"
  for h in "${HOOKS[@]}"; do
    local dst="${HOOK_DIR}/${h}"
    if [[ -L "${dst}" ]]; then
      if is_link_correct "${h}"; then
        ok "${h}: linked -> $(readlink "${dst}")"
      else
        warn "${h}: symlink present but points elsewhere -> $(readlink "${dst}")"
      fi
    elif [[ -f "${dst}" ]]; then
      warn "${h}: regular file present (not a symlink). Consider backup+replace."
    else
      warn "${h}: not installed"
    fi
  done
}

install_hooks() {
  ensure_templates_exist
  ensure_hook_dir
  for h in "${HOOKS[@]}"; do
    link_hook "${h}"
    ok "Installed: ${h}"
  done
  msg "Installation complete."
  msg "If you want to ENFORCE presence of Task ID on commit:"
  echo "  export GUARD_ENFORCE_TASK=1        # commit-msg"
  echo "  export GUARD_ENFORCE_TASK_PRE=1    # pre-commit"
}

uninstall_hooks() {
  local removed=0
  for h in "${HOOKS[@]}"; do
    local dst="${HOOK_DIR}/${h}"
    if [[ -L "${dst}" ]]; then
      rm -f "${dst}"
      ok "Removed symlink: ${h}"
      removed=$((removed+1))
    elif [[ -f "${dst}" ]]; then
      warn "Skipping ${h}: regular file present (not a symlink)."
    else
      warn "Not installed: ${h}"
    fi
  done
  msg "Uninstall complete. Removed=${removed}"
}

repair_hooks() {
  ensure_templates_exist
  ensure_hook_dir
  local repaired=0
  for h in "${HOOKS[@]}"; do
    if is_link_correct "${h}"; then
      ok "${h}: up-to-date"
    else
      link_hook "${h}"
      ok "${h}: repaired"
      repaired=$((repaired+1))
    fi
  done
  msg "Repair complete. Repaired=${repaired}"
}

usage() {
  cat <<EOF
Gumgang 2.0 — Guard Hooks Installer

Usage:
  $(basename "$0") install     Install or update symlinks for hooks
  $(basename "$0") uninstall   Remove symlinked hooks (backups retained if any)
  $(basename "$0") status      Show current hook link status
  $(basename "$0") repair      Re-create/fix symlinks if broken

Hooks (templates):
  ${TEMPLATES_DIR}/commit-msg
  ${TEMPLATES_DIR}/pre-commit
  ${TEMPLATES_DIR}/pre-push

Notes:
  - These hooks auto-record changes via scripts/guard_record.py using KST timestamps.
  - To enforce presence of Task ID on commit:
      export GUARD_ENFORCE_TASK=1
      export GUARD_ENFORCE_TASK_PRE=1
EOF
}

# ----------------------------
# Entry
# ----------------------------

cmd="${1:-status}"
case "${cmd}" in
  install)   install_hooks ;;
  uninstall) uninstall_hooks ;;
  status)    show_status ;;
  repair)    repair_hooks ;;
  -h|--help|help) usage ;;
  *)
    warn "Unknown command: ${cmd}"
    usage
    exit 1
    ;;
esac
