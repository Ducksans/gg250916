#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# timestamp: 2025-09-16T18:28Z (UTC) / 2025-09-17 03:28 (KST)
# author: Codex (AI Agent)
# summary: 문서 관리 게이트(메타/Dataview/체크포인트 규약) 점검 스캐너
# document_type: gate_script
# tags: #gate #doc-gate #dataview #meta
# DOCS_TIME_SPEC: GG_TIME_SPEC_V1
# -----------------------------------------------------------------------------
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DOCS_DIR="${1:-$ROOT_DIR/status}"
LOG_DIR="$ROOT_DIR/status/logs/document_gate"
UTC_TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
DATE_D="${UTC_TS%%T*}"
OUT_FILE="$LOG_DIR/${DATE_D}.md"

mkdir -p "$LOG_DIR"

scan_md_files() {
  find "$DOCS_DIR" -type f -name "*.md" \
    -not -path "*/node_modules/*" \
    -not -path "*/dist/*" \
    -not -path "*/build/*" \
    -not -path "*/.git/*" | sort -u
}

has_meta() { # $1=file
  local f="$1"
  # Must start with front matter and contain required keys
  head -n 50 "$f" | awk 'BEGIN{inY=0} /^---[[:space:]]*$/{c++; if(c==1) inY=1; else inY=0} {if(inY) print}' | grep -q "timestamp:" && \
  head -n 50 "$f" | grep -q "author:" && \
  head -n 50 "$f" | grep -q "summary:" && \
  head -n 50 "$f" | grep -q "document_type:"
}

check_ssot_sitemap() {
  local p="$ROOT_DIR/status/catalog/SSOT_SITEMAP.md"
  if [[ ! -f "$p" ]]; then
    echo "MISSING:$p"
    return 0
  fi
  if ! rg -n '^```dataview' "$p" >/dev/null 2>&1; then
    echo "NODV:$p"
    return 0
  fi
  echo "OK:$p"
}

main() {
  local files
  mapfile -t files < <(scan_md_files)
  local total=${#files[@]}
  local -a missing
  for f in "${files[@]}"; do
    if ! has_meta "$f"; then
      missing+=("$f")
    fi
  done
  local miss_n=${#missing[@]}

  local ssot_check
  ssot_check=$(check_ssot_sitemap)

  {
    echo "---"
    echo "timestamp:"
    echo "  utc: $UTC_TS"
    echo "  kst: $(TZ=Asia/Seoul date +%Y-%m-%d' '%H:%M)"
    echo "author: Codex (AI Agent)"
    echo "summary: 문서 관리 게이트 자동 점검 보고(메타/Dataview/색인)"
    echo "document_type: gate_report"
    echo "tags:"
    echo "  - #doc-gate"
    echo "  - #report"
    echo "BT: none"
    echo "ST: none"
    echo "RT: none"
    echo "DOCS_TIME_SPEC: GG_TIME_SPEC_V1"
    echo "---"
    echo
    echo "# Document Gate Report ($DATE_D)"
    echo
    echo "## Summary"
    echo "- Scanned: $total markdown files under $(realpath --relative-to="$ROOT_DIR" "$DOCS_DIR")"
    echo "- Missing meta: $miss_n"
    case "$ssot_check" in
      OK:*) echo "- SSOT_SITEMAP: OK (dataview block found)";;
      MISSING:*) echo "- SSOT_SITEMAP: MISSING";;
      NODV:*) echo "- SSOT_SITEMAP: Missing dataview block";;
    esac
    echo
    echo "## Missing Metadata Files"
    if [[ $miss_n -eq 0 ]]; then
      echo "(none)"
    else
      for m in "${missing[@]}"; do
        echo "- $(realpath --relative-to="$ROOT_DIR" "$m")"
      done
    fi
    echo
    echo "## Checks"
    echo "- SSOT_SITEMAP status: $ssot_check"
    echo "- Note: Only checks for front matter keys (timestamp/author/summary/document_type) within first 50 lines."
  } >"$OUT_FILE"

  echo "$OUT_FILE"
}

main "$@"
