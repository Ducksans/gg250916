#!/usr/bin/env bash
# capture_with_overlay.sh — Headless Chromium screenshot with text overlay
# Usage:
#   scripts/capture_with_overlay.sh "<URL>" "<OVERLAY_TEXT>" [out_png] [delay_ms] [widthxheight]
# Example:
#   scripts/capture_with_overlay.sh \
#     "http://127.0.0.1:5173/ui-dev/" \
#     "Search: 금강 (Source=DB, API=Bridge)" \
#     status/evidence/ui/ui_search_overlay_$(date -u +%Y%m%dT%H%M%SZ).png

set -euo pipefail
URL=${1:-}
TEXT=${2:-}
OUT=${3:-}
DELAY_MS=${4:-12000}
VIEWPORT=${5:-1600x1000}

if [[ -z "$URL" || -z "$TEXT" ]]; then
  echo "Usage: $0 <URL> <OVERLAY_TEXT> [out_png]" >&2
  exit 2
fi

TS=$(date -u +%Y%m%dT%H%M%SZ)
OUT=${OUT:-status/evidence/ui/ui_capture_${TS}.png}
HTML_DIR="status/tools"
HTML_PATH="$HTML_DIR/tmp_overlay_${TS}.html"
mkdir -p "$(dirname "$OUT")" "$HTML_DIR"

# Resolve absolute path for file://
ABS_HTML=$(cd "$(dirname "$HTML_PATH")" && pwd)/$(basename "$HTML_PATH")

cat > "$HTML_PATH" <<EOF
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' data: blob: filesystem: *; frame-src *; img-src * data: blob:; connect-src *;" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Overlay Capture</title>
  <style>
    html, body { margin: 0; height: 100%; background: #111; }
    .wrap { position: relative; width: 100%; height: 100vh; }
    iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; background: #000; }
    .overlay {
      position: fixed; left: 16px; top: 16px; z-index: 9999;
      background: rgba(0,0,0,0.6); color: #fff; padding: 10px 14px; border-radius: 8px;
      font: 14px/1.35 system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji";
      max-width: 85vw; box-shadow: 0 2px 10px rgba(0,0,0,0.4);
    }
    .overlay small { opacity: 0.8; }
  </style>
</head>
<body>
  <div class="wrap">
    <iframe src="${URL}"></iframe>
    <div class="overlay">
      <div>${TEXT}</div>
      <small>UTC ${TS}</small>
    </div>
  </div>
</body>
</html>
EOF

# Find Chromium/Chrome
CHROME=$(command -v chromium || command -v chromium-browser || command -v google-chrome || command -v google-chrome-stable || true)
if [[ -z "$CHROME" ]]; then
  echo "[ERR] Chromium/Chrome not found in PATH" >&2
  exit 3
fi

"$CHROME" --headless=new --disable-gpu --hide-scrollbars \
  --window-size="${VIEWPORT/x/,}" --virtual-time-budget="${DELAY_MS}" \
  --screenshot="$OUT" "file://$ABS_HTML" >/dev/null 2>&1 || true

if [[ -f "$OUT" ]]; then
  echo "$OUT"
else
  echo "[ERR] Screenshot failed (see $HTML_PATH)" >&2
  exit 4
fi
