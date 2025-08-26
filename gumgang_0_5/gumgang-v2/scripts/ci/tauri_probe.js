#!/usr/bin/env node
/**
 * tauri_probe.js
 *
 * Capture Tauri CLI version and environment info, then save a JSON report
 * to status/evidence via Bridge /api/save with a local file fallback.
 *
 * Usage:
 *   node scripts/ci/tauri_probe.js
 *
 * Env:
 *   BRIDGE_URL=http://localhost:3037               # optional; defaults to http://localhost:3037
 *   TAURI_PROBE_FILENAME=tauri_probe_YYYYMMDD.json # optional override filename
 *   TAURI_PROBE_LOCAL_ONLY=1                       # if set, skip bridge upload and only write local file
 *   TAURI_TIMEOUT_MS=4000                          # per-command timeout (default 4000)
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const http = require("http");
const https = require("https");

// ---------- Paths ----------
const SCRIPT_DIR = __dirname; // .../gumgang-v2/scripts/ci
const PROJ_DIR = path.resolve(SCRIPT_DIR, "..", ".."); // .../gumgang-v2
const ROOT_DIR = path.resolve(PROJ_DIR, "..", ".."); // .../gumgang_meeting
const STATUS_DIR = path.join(ROOT_DIR, "status");
const EVIDENCE_DIR = path.join(STATUS_DIR, "evidence");
const PKG_JSON = path.join(PROJ_DIR, "package.json");

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
  try { fs.mkdirSync(p, { recursive: true }); } catch (_) {}
}
function readJSONSafe(p) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch (_) { return null; }
}
function existsFile(p) {
  try { return fs.existsSync(p) && fs.statSync(p).isFile(); } catch (_) { return false; }
}
function postJSON(bridgeUrl, bodyObj, pathName = "/api/save") {
  return new Promise((resolve) => {
    let u;
    try { u = new URL(bridgeUrl); } catch (e) {
      return resolve({ ok: false, status: 0, body: "Invalid BRIDGE_URL" });
    }
    const payload = JSON.stringify(bodyObj || {});
    const mod = u.protocol === "https:" ? https : http;
    const req = mod.request({
      hostname: u.hostname,
      port: u.port || (u.protocol === "https:" ? 443 : 80),
      path: pathName,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
      },
      timeout: 2000,
    }, (res) => {
      let chunks = "";
      res.on("data", d => chunks += d);
      res.on("end", () => resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, body: chunks }));
    });
    req.on("error", (e) => resolve({ ok: false, status: 0, body: String(e && e.message || e) }));
    req.on("timeout", () => { try { req.destroy(new Error("timeout")); } catch (_) {} });
    req.write(payload);
    req.end();
  });
}
function run(cmd, args, opts) {
  const timeoutMs = Number(process.env.TAURI_TIMEOUT_MS || 4000);
  return new Promise((resolve) => {
    let killed = false;
    const child = spawn(cmd, args || [], {
      cwd: opts && opts.cwd ? opts.cwd : PROJ_DIR,
      env: process.env,
      shell: false,
    });
    let out = "", err = "";
    const timer = setTimeout(() => {
      killed = true;
      try { child.kill("SIGKILL"); } catch (_) {}
    }, timeoutMs);
    child.stdout && child.stdout.on("data", d => out += d.toString("utf8"));
    child.stderr && child.stderr.on("data", d => err += d.toString("utf8"));
    child.on("error", (e) => {
      clearTimeout(timer);
      resolve({ ok: false, code: 127, stdout: out, stderr: err || String(e && e.message || e), killed });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ ok: code === 0 && !killed, code: code ?? 1, stdout: out, stderr: err, killed });
    });
  });
}

// ---------- Probe logic ----------
function findLocalTauriBin() {
  // Cross-platform: bin path under node_modules/.bin
  const posix = path.join(PROJ_DIR, "node_modules", ".bin", "tauri");
  const win = path.join(PROJ_DIR, "node_modules", ".bin", "tauri.cmd");
  if (existsFile(posix)) return posix;
  if (existsFile(win)) return win;
  return null;
}

async function probeTauri() {
  const local = findLocalTauriBin();
  const results = {
    tried: [],
    best: null,
  };

  // 1) Try local bin -v
  if (local) {
    const r = await run(local, ["-v"]);
    results.tried.push({ kind: "local:-v", bin: local, ...r });
    if (r.ok && r.stdout.trim()) results.best = { source: "local", version: r.stdout.trim() };
  }

  // 2) Try npx --no-install tauri -v
  if (!results.best) {
    const r = await run("npx", ["--no-install", "tauri", "-v"]);
    results.tried.push({ kind: "npx_no_install:-v", bin: "npx tauri", ...r });
    if (r.ok && r.stdout.trim()) results.best = { source: "npx_no_install", version: r.stdout.trim() };
  }

  // 3) Optionally try "tauri -v" on PATH (no install)
  if (!results.best) {
    const r = await run("tauri", ["-v"]);
    results.tried.push({ kind: "path:-v", bin: "tauri", ...r });
    if (r.ok && r.stdout.trim()) results.best = { source: "path", version: r.stdout.trim() };
  }

  // Info command (best-effort) using first available runner
  let info = null;
  async function tryInfo(cmd, args, tag) {
    const r = await run(cmd, args);
    results.tried.push({ kind: tag, bin: cmd + " " + args.join(" "), ...r });
    return r.ok ? (r.stdout || "").trim() : null;
  }
  if (local) {
    info = await tryInfo(local, ["info"], "local:info");
  }
  if (!info) {
    const r = await tryInfo("npx", ["--no-install", "tauri", "info"], "npx_no_install:info");
    info = info || r;
  }
  if (!info) {
    const r = await tryInfo("tauri", ["info"], "path:info");
    info = info || r;
  }

  return { local_bin: local, results, best: results.best, info };
}

// ---------- Main ----------
(async function main() {
  const BRIDGE_URL = (process.env.BRIDGE_URL || "http://localhost:3037").replace(/\/+$/, "");
  const OUT_NAME = process.env.TAURI_PROBE_FILENAME || `tauri_probe_${yyyymmdd()}.json`;
  const LOCAL_ONLY = (process.env.TAURI_PROBE_LOCAL_ONLY || "0") === "1";

  ensureDir(EVIDENCE_DIR);

  const pkg = readJSONSafe(PKG_JSON);
  const devCli = pkg && pkg.devDependencies ? pkg.devDependencies["@tauri-apps/cli"] : null;
  const depCli = pkg && pkg.dependencies ? pkg.dependencies["@tauri-apps/cli"] : null;

  const meta = {
    generated_at: nowISO(),
    platform: process.platform,
    arch: process.arch,
    node: process.version,
    cwd: process.cwd(),
    project_dir: PROJ_DIR,
    bridge_url: BRIDGE_URL,
  };

  const tauri = await probeTauri();

  const ok = Boolean(tauri.best || devCli || depCli);
  const result = {
    ...meta,
    ok,
    package: {
      dev_cli: devCli || null,
      dep_cli: depCli || null,
      has_cli: Boolean(devCli || depCli),
      scripts: (pkg && pkg.scripts) || {},
    },
    cli: {
      local_bin: tauri.local_bin,
      detected_version: tauri.best ? tauri.best.version : null,
      detected_source: tauri.best ? tauri.best.source : null,
      info: tauri.info || null,
      attempts: tauri.results.tried.map(t => ({
        kind: t.kind,
        bin: t.bin,
        ok: t.ok,
        code: t.code,
        killed: !!t.killed,
        stdout_preview: (t.stdout || "").slice(0, 240),
        stderr_preview: (t.stderr || "").slice(0, 240),
      })),
    },
    guidance: ok ? [
      "CLI detected or declared. You can run: npm run tauri:dev / npm run tauri:build",
      "If dev/build fails, ensure native deps installed; see preflight script.",
    ] : [
      "Tauri CLI not detected. Install devDependency: npm i -D @tauri-apps/cli",
      "Re-run probe. Avoid network installs in CI unless explicitly allowed.",
    ],
  };

  // Save locally first
  const localPath = path.join(EVIDENCE_DIR, OUT_NAME);
  try {
    fs.writeFileSync(localPath, JSON.stringify(result, null, 2), "utf8");
    console.log("Local tauri-probe JSON saved:", localPath);
  } catch (e) {
    console.error("Failed to write local JSON:", e && e.message ? e.message : String(e));
  }

  // Save via Bridge
  if (!LOCAL_ONLY) {
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
  }

  process.exitCode = ok ? 0 : 1;
})().catch((e) => {
  console.error("Unexpected error:", e && e.message ? e.message : String(e));
  process.exitCode = 1;
});
