#!/usr/bin/env node
/**
 * ST-1206 UI Guardrails — Static Checker (CJS)
 *
 * Usage:
 *   node scripts/check_ui_guardrails.cjs
 *
 * What it checks (heuristics, fast-fail):
 * 1) body.simple #a1-wrap must be grid and define row template.
 * 2) Exactly two scroll containers are allowed within A1: #gg-threads, #chat-msgs.
 *    - Find CSS rules with overflow:auto (or overflow-y:auto) scoped to body.simple or A1 IDs.
 *    - Fail if any selector other than the two allowed uses overflow:auto.
 * 3) Snapshot HTML must not contain self-closing #a1-wrap and should include composer-actions mark.
 *    - <div id="a1-wrap"></div> → FAIL
 *    - data-gg="composer-actions" → WARN if absent (runtime injection possible)
 */

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
/**
 * Resolve a project-relative path whether cwd is repo root or gumgang_meeting/
 * Tries in order:
 *  - CWD/<path>
 *  - CWD/gumgang_meeting/<path>
 *  - parent-of-CWD/<path>
 *  - parent-of-CWD/gumgang_meeting/<path>
 */
function resolveProjectPath() {
  const segs = Array.from(arguments);
  const tries = [
    path.join(ROOT, ...segs),
    path.join(ROOT, "gumgang_meeting", ...segs),
    path.join(path.dirname(ROOT), ...segs),
    path.join(path.dirname(ROOT), "gumgang_meeting", ...segs),
  ];
  for (const t of tries) {
    try {
      if (fs.existsSync(t)) return t;
    } catch (_) {}
  }
  // Fallback to first guess
  return tries[0];
}

const CSS_PATH = resolveProjectPath("ui", "overlays", "active.css");
const HTML_PATH = resolveProjectPath(
  "ui",
  "snapshots",
  "unified_A1-A4_v0",
  "index.html",
);

function fail(msg) {
  console.error("[GUARDRAIL][FAIL]", msg);
  process.exit(1);
}
function warn(msg) {
  console.warn("[GUARDRAIL][WARN]", msg);
}
function info(msg) {
  console.log("[GUARDRAIL][INFO]", msg);
}

function readText(p) {
  try {
    return fs.readFileSync(p, "utf8");
  } catch (e) {
    fail(`파일을 읽을 수 없습니다: ${p}\n${e && e.message}`);
  }
}

function findCssBlocks(cssText) {
  // Very light CSS block splitter (not a full parser)
  // Splits on '}' and expects 'selector { declarations }'
  return cssText
    .split("}")
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const i = chunk.indexOf("{");
      if (i < 0) return null;
      const sel = chunk.slice(0, i).trim();
      const body = chunk.slice(i + 1).trim();
      return { selector: sel.replace(/\s+/g, " "), body };
    })
    .filter(Boolean);
}

function hasGridForA1Wrap(blocks) {
  const target = blocks.find(
    (b) =>
      /body\.simple\s+#a1-wrap\b/i.test(b.selector) &&
      /\bdisplay\s*:\s*grid\b/i.test(b.body),
  );
  if (!target) return false;
  // Also check rows template hint: 1fr or minmax(0,1fr)
  const rowsOk =
    /\bgrid-template-rows\s*:\s*auto\s+1fr\s+auto\b/i.test(target.body) ||
    /\bgrid-template-rows\s*:\s*auto\s+minmax\(\s*0\s*,\s*1fr\s*\)\s+auto\b/i.test(
      target.body,
    );
  return rowsOk;
}

function collectOverflowAutoSelectors(blocks) {
  // Return selectors that set overflow:auto (or overflow-y:auto)
  const result = [];
  for (const b of blocks) {
    if (/\boverflow(-y)?\s*:\s*auto\b/i.test(b.body)) {
      result.push(b.selector);
    }
  }
  return result;
}

function isA1ScopeSelector(sel) {
  // Heuristic: only analyze selectors that matter to the A1 subtree or simple mode
  // We include:
  //  - body.simple ...
  //  - ... #a1 ...
  //  - ... #chat-msgs or #gg-threads (even if not explicitly under body.simple)
  return (
    /\bbody\.simple\b/.test(sel) ||
    /#a1\b/.test(sel) ||
    /#chat-msgs\b/.test(sel) ||
    /#gg-threads\b/.test(sel)
  );
}

function normalizeSelector(sel) {
  // Keep only the first simple segment for reporting
  return sel.replace(/\s+/g, " ").trim();
}

function main() {
  info("ST-1206 UI Guardrails 정적 검사 시작");

  const css = readText(CSS_PATH);
  const html = readText(HTML_PATH);

  const blocks = findCssBlocks(css);

  // 1) #a1-wrap grid
  if (!hasGridForA1Wrap(blocks)) {
    fail(
      "body.simple #a1-wrap 가 grid가 아니거나 grid-template-rows 설정이 누락되었습니다.",
    );
  } else {
    info("✔ #a1-wrap grid OK");
  }

  // 2) Exactly two scroll containers
  const overflowAutoSelectors = collectOverflowAutoSelectors(blocks)
    .filter(isA1ScopeSelector)
    .map(normalizeSelector);

  // Reduce to unique selectors
  const uniq = Array.from(new Set(overflowAutoSelectors));

  // Allowed selector keywords
  const allowedKeys = ["#gg-threads", "#chat-msgs"];
  const offenders = uniq.filter(
    (sel) => !allowedKeys.some((k) => sel.includes(k)),
  );

  // Ensure both allowed are present at least once
  const missingAllowed = allowedKeys.filter(
    (k) => !uniq.some((s) => s.includes(k)),
  );
  if (missingAllowed.length) {
    fail(`허용 스크롤러 규칙 누락: ${missingAllowed.join(", ")}`);
  }

  if (offenders.length) {
    fail(
      `허용 목록 외 overflow:auto 컨테이너가 발견되었습니다:\n - ${offenders.join(
        "\n - ",
      )}\n(허용: ${allowedKeys.join(", ")})`,
    );
  } else {
    info("✔ 스크롤러 허용 집합 OK (gg-threads, chat-msgs 만 감지)");
  }

  // 3) Snapshot HTML checks
  if (/<div\s+id=["']a1-wrap["']\s*><\/div>/i.test(html)) {
    fail(
      '스냅샷 HTML에 #a1-wrap 즉시닫힘(<div id="a1-wrap"></div>)이 발견되었습니다.',
    );
  } else {
    info("✔ #a1-wrap 즉시닫힘 없음");
  }

  if (!/data-gg=["']composer-actions["']/.test(html)) {
    warn(
      "composer-actions 마킹이 스냅샷 HTML에서 발견되지 않았습니다(런타임 주입일 수 있음).",
    );
  } else {
    info("✔ composer-actions 마킹이 스냅샷에 존재합니다");
  }

  console.log("[GUARDRAIL] 정적 검사 OK");
  process.exit(0);
}

main();
