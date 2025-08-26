#!/usr/bin/env node
/**
 * save_preflight_linux.js
 *
 * Wrapper to run linux_preflight.sh and save the result as JSON via Bridge /api/save,
 * with a local file fallback under status/evidence/.
 *
 * Usage:
 *   node scripts/ci/save_preflight_linux.js
 *
 * Env:
 *   BRIDGE_URL=http://localhost:3037   # optional; defaults to http://localhost:3037
 *   PRE_LINUX_FILENAME=preflight_linux_YYYYMMDD.json  # optional override filename
 *   PRE_LINUX_LOCAL_ONLY=1             # if set, skip bridge upload and only write local file
 */

"use strict";

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");

// ---------- Paths ----------
const SCRIPT_DIR = __dirname; // .../gumgang-v2/scripts/ci
const PROJ_DIR = path.resolve(SCRIPT_DIR, "..", ".."); // .../gumgang-v2
const ROOT_DIR = path.resolve(PROJ_DIR, "..", ".."); // .../gumgang_meeting
const STATUS_DIR = path.join(ROOT_DIR, "status");
const EVIDENCE_DIR = path.join(STATUS_DIR, "evidence");
const PREFLIGHT_SH = path.join(SCRIPT_DIR, "linux_preflight.sh");
const TAURI_CONF = path.join(PROJ_DIR, "src-tauri", "tauri.conf.json");

// ---------- Helpers ----------
function yyyymmdd(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}
function nowISO() {
  try {
    return new Date().toISOString();
  } catch (_) {
    return String(Date.now());
  }
}
function ensureDir(p) {
  try {
    fs.mkdirSync(p, { recursive: true });
  } catch (_) {}
}
function readJSONSafe(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (_) {
    return null;
  }
}
function postJSON(bridgeUrl, bodyObj) {
  return new Promise((resolve, reject) => {
    let u;
    try {
      u = new URL(bridgeUrl);
    } catch (e) {
      return reject(new Error("Invalid BRIDGE_URL"));
    }
    const payload = JSON.stringify(bodyObj || {});
    const mod = u.protocol === "https:" ? https : http;
    const req = mod.request(
      {
        hostname: u.hostname,
        port:
          u.port ||
          (u.protocol === "https:" ? 443 : 80),
        path: "/api/save",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
      },
      (res) => {
        let chunks = "";
        res.on("data", (d) => (chunks += d));
        res.on("end", () => {
          const ok = res.statusCode >= 200 && res.statusCode < 300;
          resolve({ ok, status: res.statusCode, body: chunks });
        });
      }
    );
    req.on("error", (e) => reject(e));
    req.write(payload);
    req.end();
  });
}

// Try to extract a boolean "ok" and counts from text summary
function analyzeSummary(stdout, stderr, exitCode) {
  const text = String(stdout || "") + "\n" + String(stderr || "");
  const okByExit = exitCode === 0;
  const okByText =
    /✅ Required checks passed/i.test(text) ||
    /All checks passed/i.test(text);
  const failedByText =
    /❌ .*required check\(s\) failed/i.test(text) ||
    /Issues found/i.test(text);
  let warnings = null;
  const mWarn = text.match(/With\s+(\d+)\s+warnings/i);
  if (mWarn) warnings = Number(mWarn[1]);
  return {
    ok: okByExit || okByText,
    failed_hint: failedByText,
    warnings,
  };
}

// ---------- Main flow ----------
(async function main() {
  const BRIDGE_URL =
    (process.env.BRIDGE_URL || "http://localhost:3037").replace(/\/+$/, "");
  const OUT_NAME =
    process.env.PRE_LINUX_FILENAME ||
    `preflight_linux_${yyyymmdd()}.json`;
  const LOCAL_ONLY = (process.env.PRE_LINUX_LOCAL_ONLY || "0") === "1";

  // Ensure directories for local fallback
  ensureDir(EVIDENCE_DIR);

  // Collect quick meta
  const meta = {
    generated_at: nowISO(),
    platform: process.platform,
    arch: process.arch,
    node: process.version,
    cwd: process.cwd(),
    project_dir: PROJ_DIR,
    tauri_conf_present: fs.existsSync(TAURI_CONF),
    bridge_url: BRIDGE_URL,
  };

  if (!fs.existsSync(PREFLIGHT_SH)) {
    const result = {
      ...meta,
      error: "linux_preflight.sh not found",
    };
    const localPath = path.join(EVIDENCE_DIR, OUT_NAME);
    fs.writeFileSync(localPath, JSON.stringify(result, null, 2), "utf8");
    console.error("Preflight script not found. Saved minimal JSON to:", localPath);
    process.exitCode = 1;
    return;
  }

  console.log("Running preflight:", PREFLIGHT_SH);
  const child = spawn("bash", [PREFLIGHT_SH], {
    cwd: PROJ_DIR,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let out = "";
  let err = "";
  child.stdout.on("data", (d) => (out += d.toString("utf8")));
  child.stderr.on("data", (d) => (err += d.toString("utf8")));

  const exitCode = await new Promise((resolve) => {
    child.on("close", (code) => resolve(code ?? 1));
    child.on("error", () => resolve(1));
  });

  const tauriConf = readJSONSafe(TAURI_CONF);
  const summary = analyzeSummary(out, err, exitCode);

  const result = {
    ...meta,
    preflight: {
      exit_code: exitCode,
      ok: summary.ok,
      failed_hint: summary.failed_hint,
      warnings: summary.warnings,
    },
    tauri_conf: tauriConf
      ? {
          productName: tauriConf.productName || null,
          version: tauriConf.version || null,
          app_url:
            tauriConf?.app?.windows?.[0]?.url || null,
          devUrl: tauriConf?.build?.devUrl || null,
        }
      : null,
    stdout: out,
    stderr: err,
  };

  // Save locally first (append-only directory)
  const localPath = path.join(EVIDENCE_DIR, OUT_NAME);
  try {
    fs.writeFileSync(localPath, JSON.stringify(result, null, 2), "utf8");
    console.log("Local preflight JSON saved:", localPath);
  } catch (e) {
    console.error("Failed to write local JSON:", e && e.message);
  }

  if (LOCAL_ONLY) {
    process.exitCode = summary.ok ? 0 : 1;
    return;
  }

  // Save via Bridge /api/save
  try {
    const relPath = path.posix.join("evidence", OUT_NAME);
    const resp = await postJSON(BRIDGE_URL, {
      root: "status",
      path: relPath,
      content: JSON.stringify(result, null, 2),
      overwrite: true,
      ensureDirs: true,
    });
    if (resp.ok) {
      console.log("Bridge save OK:", `${BRIDGE_URL}/api/save -> ${relPath}`);
    } else {
      console.error("Bridge save failed:", resp.status, resp.body || "");
    }
  } catch (e) {
    console.error("Bridge error:", e && e.message ? e.message : String(e));
  }

  process.exitCode = summary.ok ? 0 : 1;
})().catch((e) => {
  console.error("Unexpected error:", e && e.message ? e.message : String(e));
  process.exitCode = 1;
});
