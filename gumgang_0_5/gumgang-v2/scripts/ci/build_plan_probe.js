#!/usr/bin/env node
/**
 * build_plan_probe.js
 *
 * Audit Tauri/Next/Bridge config and expected paths without building.
 * Saves a JSON plan to status/evidence via Bridge /api/save, with local fallback.
 *
 * Usage:
 *   node scripts/ci/build_plan_probe.js
 *
 * Env:
 *   BRIDGE_URL=http://localhost:3037     # optional; defaults to http://localhost:3037
 *   BUILD_PLAN_FILENAME=build_plan_probe_YYYYMMDD.json  # optional override filename
 *   BUILD_PLAN_LOCAL_ONLY=1              # if set, skip bridge upload and only write local file
 *   BRIDGE_PING=0|1                      # default 1; set 0 to skip network ping
 */

"use strict";

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

// Expected files
const TAURI_CONF = path.join(PROJ_DIR, "src-tauri", "tauri.conf.json");
const PACKAGE_JSON = path.join(PROJ_DIR, "package.json");
const BRIDGE_JS = path.join(ROOT_DIR, "bridge", "server.js");
const UI_SNAPSHOT = path.join(ROOT_DIR, "ui", "snapshots", "unified_A1-A4_v0", "index.html");
const OVERLAY_DIR = path.join(ROOT_DIR, "ui", "overlays");
const FRONTEND_DIST = path.resolve(PROJ_DIR, "out"); // expected for Tauri build

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
function existsFile(p) {
  try {
    return fs.existsSync(p) && fs.statSync(p).isFile();
  } catch (_) {
    return false;
  }
}
function existsDir(p) {
  try {
    return fs.existsSync(p) && fs.statSync(p).isDirectory();
  } catch (_) {
    return false;
  }
}
function postJSON(bridgeUrl, bodyObj, pathName = "/api/save") {
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
        port: u.port || (u.protocol === "https:" ? 443 : 80),
        path: pathName,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
        timeout: 2000,
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
    req.on("error", (e) => resolve({ ok: false, status: 0, body: String(e && e.message || e) }));
    req.on("timeout", () => {
      try { req.destroy(new Error("timeout")); } catch (_) {}
    });
    req.write(payload);
    req.end();
  });
}
function head(bridgeUrl, pathName = "/ui") {
  return new Promise((resolve) => {
    let u;
    try {
      u = new URL(bridgeUrl);
    } catch (e) {
      return resolve({ ok: false, status: 0, error: "invalid URL" });
    }
    const mod = u.protocol === "https:" ? https : http;
    const req = mod.request(
      {
        hostname: u.hostname,
        port: u.port || (u.protocol === "https:" ? 443 : 80),
        path: pathName,
        method: "HEAD",
        timeout: 1000,
      },
      (res) => {
        resolve({ ok: res.statusCode >= 200 && res.statusCode < 400, status: res.statusCode });
      }
    );
    req.on("error", () => resolve({ ok: false, status: 0 }));
    req.on("timeout", () => {
      try { req.destroy(new Error("timeout")); } catch (_) {}
      resolve({ ok: false, status: 0, error: "timeout" });
    });
    req.end();
  });
}

// ---------- Probes ----------
function auditTauriConf(conf) {
  const out = {
    productName: null,
    version: null,
    build_frontendDist: null,
    build_devUrl: null,
    app_window_url: null,
    ok: true,
    issues: [],
  };
  if (!conf) {
    out.ok = false;
    out.issues.push("tauri.conf.json not found or invalid JSON");
    return out;
  }
  out.productName = conf.productName || null;
  out.version = conf.version || null;
  out.build_frontendDist = conf?.build?.frontendDist || null;
  out.build_devUrl = conf?.build?.devUrl || null;
  out.app_window_url = conf?.app?.windows?.[0]?.url || null;

  // Checks rooted in our contract
  if (out.build_frontendDist !== "../out") {
    out.ok = false;
    out.issues.push(`build.frontendDist should be "../out" but is "${out.build_frontendDist}"`);
  }
  if (out.build_devUrl !== "http://localhost:3000") {
    out.ok = false;
    out.issues.push(`build.devUrl should be "http://localhost:3000" but is "${out.build_devUrl}"`);
  }
  if (out.app_window_url !== "http://localhost:3037/ui") {
    out.ok = false;
    out.issues.push(`app.windows[0].url should be "http://localhost:3037/ui" but is "${out.app_window_url}"`);
  }
  return out;
}

function auditPackageJson(pkg) {
  const out = {
    has_next_dep: false,
    next_version: null,
    scripts: {},
    required_scripts_present: true,
    missing_scripts: [],
  };
  if (!pkg) {
    out.required_scripts_present = false;
    out.missing_scripts.push("package.json missing/invalid");
    return out;
  }
  out.has_next_dep = Boolean((pkg.dependencies && pkg.dependencies.next) || (pkg.devDependencies && pkg.devDependencies.next));
  out.next_version = (pkg.dependencies && pkg.dependencies.next) || (pkg.devDependencies && pkg.devDependencies.next) || null;
  out.scripts = pkg.scripts || {};

  const required = ["dev:fixed", "build", "tauri:dev", "tauri:build"];
  for (const k of required) {
    if (!out.scripts[k]) {
      out.required_scripts_present = false;
      out.missing_scripts.push(k);
    }
  }
  return out;
}

async function main() {
  const BRIDGE_URL = (process.env.BRIDGE_URL || "http://localhost:3037").replace(/\/+$/, "");
  const OUT_NAME = process.env.BUILD_PLAN_FILENAME || `build_plan_probe_${yyyymmdd()}.json`;
  const LOCAL_ONLY = (process.env.BUILD_PLAN_LOCAL_ONLY || "0") === "1";
  const DO_PING = (process.env.BRIDGE_PING || "1") === "1";

  ensureDir(EVIDENCE_DIR);

  // Collect meta
  const meta = {
    generated_at: nowISO(),
    platform: process.platform,
    arch: process.arch,
    node: process.version,
    cwd: process.cwd(),
    project_dir: PROJ_DIR,
    root_dir: ROOT_DIR,
    bridge_url: BRIDGE_URL,
  };

  // Read configs
  const tauriConf = readJSONSafe(TAURI_CONF);
  const pkgJson = readJSONSafe(PACKAGE_JSON);

  // Audit
  const tauriAudit = auditTauriConf(tauriConf);
  const pkgAudit = auditPackageJson(pkgJson);

  // Paths existence (no build)
  const paths = {
    tauri_conf_present: existsFile(TAURI_CONF),
    package_json_present: existsFile(PACKAGE_JSON),
    bridge_js_present: existsFile(BRIDGE_JS),
    ui_snapshot_present: existsFile(UI_SNAPSHOT),
    overlay_dir_present: existsDir(OVERLAY_DIR),
    frontend_out_present: existsDir(FRONTEND_DIST), // acceptable if false before export
  };

  // Optional ping
  let ping = null;
  if (DO_PING) {
    // Check /ui HEAD (Bridge static UI)
    ping = {
      ui_head: await head(BRIDGE_URL, "/ui"),
      api_save_head: await head(BRIDGE_URL, "/api/save"),
    };
  }

  // Derive plan steps (commands only; not executed)
  const plan = {
    dev: [
      "Start Bridge: node bridge/server.js  # PORT=3037 default",
      "Start Next dev: npm run dev:fixed    # port 3000",
      "Tauri dev: npm run tauri:dev         # devUrl http://localhost:3000; app window → http://localhost:3037/ui",
    ],
    build: [
      "Install deps: npm ci",
      "Next build: npm run build",
      "Export static: npx next export -o out  # produces ./out",
      "Tauri build: npm run tauri:build",
    ],
    notes: [
      "UI snapshot entry served at /ui → ui/snapshots/unified_A1-A4_v0/index.html",
      "Overlay auto-injection: ui/overlays/active.css/js (no rebuild)",
      "Evidence save via Bridge: POST /api/save (status/evidence/**)",
      "Evidence open via Bridge: POST /api/open",
    ],
  };

  // Overall status
  const ok =
    paths.tauri_conf_present &&
    paths.package_json_present &&
    paths.bridge_js_present &&
    paths.ui_snapshot_present &&
    tauriAudit.ok &&
    pkgAudit.required_scripts_present &&
    pkgAudit.has_next_dep;

  const result = {
    ...meta,
    ok,
    tauri_audit: tauriAudit,
    package_audit: pkgAudit,
    paths,
    expected: {
      frontendDist: "../out",
      devUrl: "http://localhost:3000",
      app_window_url: "http://localhost:3037/ui",
      frontend_out_dir: FRONTEND_DIST,
      ui_snapshot: UI_SNAPSHOT,
      overlays_dir: OVERLAY_DIR,
      bridge_js: BRIDGE_JS,
    },
    plan,
    ping,
  };

  // Save locally first
  const localPath = path.join(EVIDENCE_DIR, OUT_NAME);
  try {
    fs.writeFileSync(localPath, JSON.stringify(result, null, 2), "utf8");
    console.log("Local build-plan probe JSON saved:", localPath);
  } catch (e) {
    console.error("Failed to write local JSON:", e && e.message ? e.message : String(e));
  }

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

  // Exit code reflects overall ok
  process.exitCode = ok ? 0 : 1;
}

main().catch((e) => {
  console.error("Unexpected error:", e && e.message ? e.message : String(e));
  process.exitCode = 1;
});
