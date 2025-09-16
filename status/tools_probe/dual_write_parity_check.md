---
phase: past
---

# Dual-Write Parity Check (Bridge-only stub)
Purpose
- Verify that writing Evidence via both paths produces identical bytes:
  1) Bridge: POST /api/save
  2) Tauri: invoke gg_save (src-tauri command)
- This is a bridge-side stub: it generates payloads, writes via /api/save, and helps you compare hashes once you write the same payload via gg_save.

Scope and assumptions
- Run from project root: gumgang_meeting
- Bridge server: http://localhost:3037
- Status root (target): gumgang_meeting/status/**
- Tauri command gg_save is available in the desktop app (src-tauri/src/main.rs)

Acceptance criteria
- SHA-256(bridge_written_file) == SHA-256(tauri_written_file)
- A JSON report is saved under status/evidence/dual_write_reports/**

How to use
1) Save this file and copy the script below into: bridge/tools/dual_write_parity_check.js
2) Generate a test payload and write via Bridge:
   - node bridge/tools/dual_write_parity_check.js generate
   - Output shows:
     - ID used
     - Bridge file path written (status/evidence/dual_parity/BRIDGE_<ID>.txt)
     - The exact payload string (copy it)
     - A ready-to-paste gg_save snippet
3) In the Tauri window (DevTools Console) or in your app code, write the identical payload via gg_save:
   window.__TAURI__.invoke('gg_save', {
     root: 'status',
     path: 'evidence/dual_parity/TAURI_<ID>.txt',
     content: '<PASTE_EXACT_PAYLOAD>',
     overwrite: true,
     ensureDirs: true
   })
4) Compare the two files’ hashes and save a parity report:
   - node bridge/tools/dual_write_parity_check.js compare --id <ID>
   - Or explicitly:
     node bridge/tools/dual_write_parity_check.js compare \
       --bridge evidence/dual_parity/BRIDGE_<ID>.txt \
       --tauri  evidence/dual_parity/TAURI_<ID>.txt

Troubleshooting
- If /api/save 404/400: ensure Bridge is restarted and you’re POSTing JSON.
- If gg_save fails: check GUMGANG_ROOT env (see src-tauri/src/main.rs), permissions, and that the path is relative under status/**.
- Always paste the payload string exactly. Any difference changes the hash.

Node script (copy to bridge/tools/dual_write_parity_check.js)
```/dev/null/dual_write_parity_check.js#L1-999
#!/usr/bin/env node
/**
 * Dual-write parity check (Bridge-only stub).
 * - generate: writes payload via /api/save and prints gg_save snippet
 * - compare:  computes SHA-256 for BRIDGE_* and TAURI_* files and saves a JSON report
 *
 * Usage (run from gumgang_meeting/):
 *   node bridge/tools/dual_write_parity_check.js generate
 *   node bridge/tools/dual_write_parity_check.js compare --id <ID>
 *   node bridge/tools/dual_write_parity_check.js compare --bridge <rel> --tauri <rel>
 */

"use strict";
const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");
const crypto = require("crypto");

const BRIDGE_URL = (process.env.BRIDGE_URL || "http://localhost:3037").replace(/\/+$/, "");
const PROJECT_ROOT = process.cwd();
const STATUS_DIR = path.join(PROJECT_ROOT, "status");

function nowISO() { try { return new Date().toISOString(); } catch(_) { return String(Date.now()); } }
function genId() {
  const s = crypto.randomBytes(6).toString("hex");
  const d = new Date();
  const ymd = "" + d.getFullYear() + String(d.getMonth()+1).padStart(2,"0") + String(d.getDate()).padStart(2,"0");
  return ymd + "_" + s;
}
function jsonPost(url, body) {
  return new Promise((resolve, reject) => {
    let u; try { u = new URL(url); } catch(e) { return reject(new Error("Invalid URL: "+url)); }
    const payload = JSON.stringify(body || {});
    const mod = u.protocol === "https:" ? https : http;
    const req = mod.request({
      hostname: u.hostname,
      port: u.port || (u.protocol === "https:" ? 443 : 80),
      path: u.pathname + (u.search || ""),
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) }
    }, (res) => {
      let data = ""; res.on("data", d => data += d);
      res.on("end", () => resolve({ status: res.statusCode, ok: res.statusCode>=200 && res.statusCode<300, body: data }));
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}
function sha256OfFile(absPath) {
  return new Promise((resolve, reject) => {
    try {
      const h = crypto.createHash("sha256");
      const s = fs.createReadStream(absPath);
      s.on("error", reject);
      s.on("data", (chunk) => h.update(chunk));
      s.on("end", () => resolve(h.digest("hex")));
    } catch (e) { reject(e); }
  });
}

async function cmdGenerate() {
  const id = genId();
  const relBridge = `evidence/dual_parity/BRIDGE_${id}.txt`;
  const payload = JSON.stringify({
    kind: "dual_write_parity_test",
    id,
    generated_at: nowISO(),
    random: crypto.randomBytes(16).toString("base64url"),
    note: "Write this exact JSON as content via gg_save to TAURI_<ID>.txt"
  });

  // Bridge write
  const save = await jsonPost(BRIDGE_URL + "/api/save", {
    root: "status",
    path: relBridge,
    content: payload,
    overwrite: true,
    ensureDirs: true
  });

  console.log("== GENERATE ==");
  console.log("Bridge /api/save:", save.status, save.ok ? "OK" : "FAIL", save.body);
  console.log("ID:", id);
  console.log("Bridge file (relative to status/):", relBridge);
  console.log("\nPayload (copy exactly; including quotes):\n" + payload + "\n");
  console.log("Tauri gg_save snippet (paste in DevTools Console or use in code):");
  console.log(
`window.__TAURI__ && window.__TAURI__.invoke('gg_save', {
  root: 'status',
  path: 'evidence/dual_parity/TAURI_${id}.txt',
  content: ${JSON.stringify(payload)},
  overwrite: true,
  ensureDirs: true
}).then(console.log).catch(console.error);`
  );
  console.log("\nNext:");
  console.log("- Run the above gg_save snippet to write the TAURI file.");
  console.log(`- Then compare: node bridge/tools/dual_write_parity_check.js compare --id ${id}`);
}

async function cmdCompareById(id) {
  const relBridge = `evidence/dual_parity/BRIDGE_${id}.txt`;
  const relTauri  = `evidence/dual_parity/TAURI_${id}.txt`;
  return cmdCompareExplicit(relBridge, relTauri, id);
}

async function cmdCompareExplicit(relBridge, relTauri, idOpt) {
  const absBridge = path.join(STATUS_DIR, relBridge);
  const absTauri  = path.join(STATUS_DIR, relTauri);
  if (!fs.existsSync(absBridge)) { console.error("Missing bridge file:", absBridge); process.exitCode=1; return; }
  if (!fs.existsSync(absTauri))  { console.error("Missing tauri file:", absTauri);   process.exitCode=1; return; }

  const hBridge = await sha256OfFile(absBridge);
  const hTauri  = await sha256OfFile(absTauri);
  const equal = hBridge === hTauri;

  const report = {
    generated_at: nowISO(),
    bridge_url: BRIDGE_URL,
    status_root: STATUS_DIR,
    inputs: { bridge_rel: relBridge, tauri_rel: relTauri },
    sha256: { bridge: hBridge, tauri: hTauri, equal },
    id_hint: idOpt || null
  };

  const outRel = `evidence/dual_write_reports/parity_${(idOpt||genId())}.json`;
  const save = await jsonPost(BRIDGE_URL + "/api/save", {
    root: "status",
    path: outRel,
    content: JSON.stringify(report, null, 2),
    overwrite: true,
    ensureDirs: true
  });

  console.log("== COMPARE ==");
  console.log("BRIDGE hash:", hBridge);
  console.log("TAURI  hash:", hTauri);
  console.log("EQUAL:", equal ? "YES" : "NO");
  console.log("Report save:", save.status, save.ok ? "OK" : "FAIL", "→", outRel);
  if (!equal) process.exitCode = 2;
}

(async function main(){
  const [,, cmd, ...rest] = process.argv;
  if (cmd === "generate") {
    await cmdGenerate();
    return;
  }
  if (cmd === "compare") {
    // compare by --id or explicit --bridge/--tauri
    let id = null, bridge = null, tauri = null;
    for (let i=0;i<rest.length;i++){
      const k = rest[i];
      if (k === "--id") id = rest[++i];
      else if (k === "--bridge") bridge = rest[++i];
      else if (k === "--tauri") tauri = rest[++i];
    }
    if (id) return cmdCompareById(id);
    if (bridge && tauri) return cmdCompareExplicit(bridge, tauri, null);
    console.error("Usage:");
    console.error("  compare --id <ID>");
    console.error("  compare --bridge <relPath> --tauri <relPath>");
    process.exitCode = 1;
    return;
  }
  console.log("Usage:");
  console.log("  generate");
  console.log("  compare --id <ID>");
  console.log("  compare --bridge <relPath> --tauri <relPath>");
})();
```

Notes
- This is a stub focusing on Bridge-side operations. The Tauri gg_save call must be executed within the desktop app context.
- If you want to automate gg_save parity inside Tauri later, add a tiny UI/dev-only action to call gg_save with the same payload and then run the compare step.

Checklist (BT-09)
- [ ] Generate payload → /api/save OK
- [ ] gg_save writes identical payload → OK
- [ ] Parity report saved under status/evidence/dual_write_reports/**
- [ ] SHA-256 equal → PASS