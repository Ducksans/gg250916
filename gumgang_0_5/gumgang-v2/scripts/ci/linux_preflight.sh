#!/usr/bin/env bash
# Linux Preflight for Tauri (v2) — checks native deps and toolchains
# - Verifies: pkg-config, webkit2gtk-4.1, libsoup-3.0
# - Verifies: Node.js (>=18), npm, Rust (rustc >=1.70), cargo, rustup (recommended)
# - Verifies: @tauri-apps/cli presence (local), tauri.conf.json basics, xdg-open
# Usage:
#   bash scripts/ci/linux_preflight.sh
# Exit codes:
#   0 = all required checks passed
#   1 = one or more required checks failed

set -u

# Colors
RED="$(printf '\033[0;31m')"
GREEN="$(printf '\033[0;32m')"
YELLOW="$(printf '\033[1;33m')"
CYAN="$(printf '\033[0;36m')"
NC="$(printf '\033[0m')"

REQUIRED_ERRORS=0
WARNINGS=0

say() { printf "%b%s%b\n" "$CYAN" "$*" "$NC"; }
ok()  { printf "%b%s%b\n" "$GREEN" "  ✅ $*" "$NC"; }
warn(){ printf "%b%s%b\n" "$YELLOW" "  ⚠️  $*" "$NC"; WARNINGS=$((WARNINGS+1)); }
fail(){ printf "%b%s%b\n" "$RED" "  ❌ $*" "$NC"; REQUIRED_ERRORS=$((REQUIRED_ERRORS+1)); }

have_cmd() { command -v "$1" >/dev/null 2>&1; }

# Compare versions: version_ge A B -> true if A >= B (numeric, dot-separated)
version_ge() {
  # shellcheck disable=SC2206
  local IFS=.
  local -a a=($1) b=($2)
  local i
  # pad with zeros
  for ((i=${#a[@]}; i<${#b[@]}; i++)); do a[i]=0; done
  for ((i=${#b[@]}; i<${#a[@]}; i++)); do b[i]=0; done
  for ((i=0; i<${#a[@]}; i++)); do
    if ((10#${a[i]} > 10#${b[i]})); then return 0; fi
    if ((10#${a[i]} < 10#${b[i]})); then return 1; fi
  done
  return 0
}

# Discover repo layout
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJ_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"               # gumgang_meeting/gumgang_0_5/gumgang-v2
ROOT_DIR="$(cd "$PROJ_DIR/../../" && pwd)"                # gumgang_meeting (expected)
TAURI_CONF="$PROJ_DIR/src-tauri/tauri.conf.json"
PACKAGE_JSON="$PROJ_DIR/package.json"
LOCAL_TAURI_BIN="$PROJ_DIR/node_modules/.bin/tauri"
BRIDGE_JS="$ROOT_DIR/bridge/server.js"

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}🔧 Linux Preflight — Tauri v2 Native Deps & Toolchains${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# OS info
if [ -f /etc/os-release ]; then
  # shellcheck disable=SC1091
  . /etc/os-release
  DISTRO="${NAME:-Linux}"
  VER="${VERSION_ID:-}"
else
  DISTRO="$(uname -s)"
  VER="$(uname -r)"
fi
say "Detected OS: ${DISTRO} ${VER}"

# Detect package manager for hints
PKG_MGR=""
if have_cmd apt-get; then PKG_MGR="apt"; fi
if have_cmd dnf; then PKG_MGR="dnf"; fi
if have_cmd pacman; then PKG_MGR="pacman"; fi
if have_cmd zypper; then PKG_MGR="zypper"; fi

# 1) Base toolchain and helpers
say "1) Base tools"
if have_cmd xdg-open; then ok "xdg-open found"; else warn "xdg-open missing (used for opening files/URLs)"; fi
if have_cmd pkg-config; then ok "pkg-config found"; else fail "pkg-config is required"; fi
if have_cmd gcc || have_cmd clang; then ok "C/C++ compiler found (gcc/clang)"; else warn "No C/C++ compiler found (install build-essential or base-devel)"; fi
echo ""

# 2) Node.js and npm
say "2) Node.js / npm"
if have_cmd node; then
  NODE_RAW="$(node -v 2>/dev/null || echo "v0.0.0")"
  NODE_VER="${NODE_RAW#v}"
  if version_ge "$NODE_VER" "18.0.0"; then
    ok "Node.js $NODE_VER (>= 18)"
  else
    fail "Node.js $NODE_VER (< 18). Install Node 18+"
  fi
else
  fail "Node.js not found"
fi

if have_cmd npm; then
  NPM_VER="$(npm -v 2>/dev/null || echo "0.0.0")"
  ok "npm $NPM_VER"
else
  warn "npm not found (Node.js distribution may include corepack; ensure your workflow can install deps)"
fi
echo ""

# 3) Rust toolchain
say "3) Rust toolchain"
if have_cmd rustc; then
  RUSTC_RAW="$(rustc --version 2>/dev/null || echo "")"
  RUSTC_VER="$(printf "%s" "$RUSTC_RAW" | awk '{print $2}')"
  if [ -n "$RUSTC_VER" ] && version_ge "$RUSTC_VER" "1.70.0"; then
    ok "rustc $RUSTC_VER (>= 1.70)"
  else
    fail "rustc version too old or unreadable ($RUSTC_RAW). Need >= 1.70"
  fi
else
  fail "rustc not found"
fi

if have_cmd cargo; then
  CARGO_RAW="$(cargo --version 2>/dev/null || echo "")"
  ok "cargo detected ($CARGO_RAW)"
else
  fail "cargo not found"
fi

if have_cmd rustup; then
  ok "rustup detected (recommended for managing toolchains)"
else
  warn "rustup not found (recommended to manage Rust toolchains)"
fi
echo ""

# 4) Tauri CLI
say "4) Tauri CLI"
if [ -f "$PACKAGE_JSON" ] && grep -q '"@tauri-apps/cli"' "$PACKAGE_JSON"; then
  ok "@tauri-apps/cli listed in devDependencies"
else
  warn "@tauri-apps/cli not listed in package.json devDependencies"
fi

if [ -x "$LOCAL_TAURI_BIN" ]; then
  TAURI_V="$("$LOCAL_TAURI_BIN" -v 2>/dev/null || true)"
  if [ -n "$TAURI_V" ]; then
    ok "Local tauri CLI: $TAURI_V"
  else
    # Fallback: try npx --no-install to avoid false negative when local binary exists but -v output is empty
    if have_cmd npx && npx --no-install tauri -v >/dev/null 2>&1; then
      TAURI_NPX_V="$(npx --no-install tauri -v 2>/dev/null || true)"
      if [ -n "$TAURI_NPX_V" ]; then
        ok "tauri CLI available via npx --no-install: $TAURI_NPX_V"
      else
        ok "tauri CLI available via npx --no-install"
      fi
    else
      if [ -f "$PACKAGE_JSON" ] && grep -q '"@tauri-apps/cli"' "$PACKAGE_JSON"; then
        ok "Local tauri present; version check inconclusive, devDependency detected (treating as OK)"
      else
        warn "Local tauri binary present but version check failed"
      fi
    fi
  fi
else
  if have_cmd npx; then
    if npx --no-install tauri -v >/dev/null 2>&1; then
      ok "tauri CLI available via npx --no-install"
    else
      warn "tauri CLI not installed locally (run: npm i -D @tauri-apps/cli)"
    fi
  else
    warn "npx not found; cannot probe tauri CLI"
  fi
fi
echo ""

# 5) Linux native libraries (webkit2gtk-4.1, libsoup-3.0)
say "5) Native libraries (GTK/WebKit + Soup3)"
PKGCFG_OK=1
if have_cmd pkg-config; then
  if pkg-config --exists webkit2gtk-4.1; then
    WK_VER="$(pkg-config --modversion webkit2gtk-4.1 2>/dev/null || echo "?")"
    ok "webkit2gtk-4.1 detected (version: $WK_VER)"
  else
    fail "webkit2gtk-4.1 not found"
    PKGCFG_OK=0
  fi

  if pkg-config --exists libsoup-3.0; then
    SOUP_VER="$(pkg-config --modversion libsoup-3.0 2>/dev/null || echo "?")"
    ok "libsoup-3.0 detected (version: $SOUP_VER)"
  else
    fail "libsoup-3.0 not found"
    PKGCFG_OK=0
  fi
else
  # already failed in section 1
  PKGCFG_OK=0
fi

# Package manager hints
if [ "$PKGCFG_OK" -eq 0 ]; then
  say "Install hints (choose your distro):"
  case "$PKG_MGR" in
    apt)
      cat <<'APT' | sed 's/^/  - /'
Ubuntu/Debian:
sudo apt update
sudo apt install -y libwebkit2gtk-4.1-dev libsoup-3.0-dev libglib2.0-dev build-essential pkg-config
APT
      ;;
    dnf)
      cat <<'DNF' | sed 's/^/  - /'
Fedora:
sudo dnf install -y webkit2gtk4.1-devel libsoup3-devel gcc-c++ pkgconf-pkg-config glib2-devel
DNF
      ;;
    pacman)
      cat <<'PAC' | sed 's/^/  - /'
Arch:
sudo pacman -S --needed webkit2gtk-4.1 libsoup3 base-devel pkgconf glib2
PAC
      ;;
    zypper)
      cat <<'ZYP' | sed 's/^/  - /'
openSUSE:
sudo zypper install -y webkit2gtk4.1-devel libsoup3-devel gcc-c++ pkgconf-pkg-config glib2-devel
ZYP
      ;;
    *)
      cat <<'GEN' | sed 's/^/  - /'
General:
Install development packages for WebKitGTK 4.1 and libsoup 3, plus build tools and pkg-config.
GEN
      ;;
  esac
  warn "If packages are installed but not detected, ensure PKG_CONFIG_PATH includes their .pc locations."
fi
echo ""

# 6) Project config sanity (tauri.conf.json and bridge)
say "6) Project config sanity"
if [ -f "$TAURI_CONF" ]; then
  ok "Found $TAURI_CONF"
  if grep -q '"devUrl": "http://localhost:3000"' "$TAURI_CONF"; then
    ok "tauri.conf.json devUrl points to localhost:3000"
  else
    warn "devUrl not set to http://localhost:3000"
  fi
  if grep -q '"url": "http://localhost:3037/ui"' "$TAURI_CONF"; then
    ok "tauri window url points to bridge at :3037/ui"
  else
    warn "window url not set to http://localhost:3037/ui"
  fi
else
  fail "Missing tauri.conf.json at src-tauri/tauri.conf.json"
fi

if [ -f "$BRIDGE_JS" ]; then
  ok "Bridge server present: $(realpath "$BRIDGE_JS")"
else
  warn "Bridge server not found at expected path ($BRIDGE_JS)"
fi
echo ""

# Summary
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}📊 Summary${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [ "$REQUIRED_ERRORS" -eq 0 ]; then
  echo -e "${GREEN}✅ Required checks passed${NC}"
  if [ "$WARNINGS" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  With $WARNINGS warnings${NC}"
  fi
  EXIT_CODE=0
else
  echo -e "${RED}❌ $REQUIRED_ERRORS required check(s) failed${NC}"
  echo "   Fix the issues above, then re-run: bash scripts/ci/linux_preflight.sh"
  EXIT_CODE=1
fi

# Next recommendations
echo ""
echo "Next steps:"
echo "  - Install missing native libs (see hints above)"
echo "  - Ensure Node deps: npm ci"
echo "  - Ensure Rust toolchain: rustup toolchain install stable"
echo "  - Verify Tauri CLI: npm i -D @tauri-apps/cli && npx tauri -v"
echo ""

exit $EXIT_CODE
