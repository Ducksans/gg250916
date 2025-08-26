/**
 * bridge/server.js
 *
 * Minimal local bridge that:
 * - Loads project .env (OPENAI_API_KEY, OPENAI_MODEL, OPENAI_ORG_ID)
 * - Exposes a CORS-enabled HTTP API for chat completions
 * - Proxies requests to OpenAI and returns the assistant reply
 * - Logs each turn into conversations/{session}/{task}/{conv}.json (append-only)
 * - Serves static UI under /ui/* with safe path resolution and content types
 *
 * Run:
 *   node gumgang_meeting/bridge/server.js
 *
 * Default port:
 *   PORT=3037 (override via environment variable)
 *
 * Endpoint:
 *   POST /api/chat
 *   Body: {
 *     messages: [{ role: "user"|"assistant"|"system", content: string }, ...],
 *     sessionId?: string,  // optional; generated if missing
 *     taskId?: string,     // optional; generated if missing
 *     convId?: string,     // optional; generated if missing
 *     model?: string,      // optional; falls back to OPENAI_MODEL or default
 *     temperature?: number // optional
 *   }
 *
 *   Response: {
 *     ok: boolean,
 *     error?: { message: string },
 *     data?: {
 *       sessionId, taskId, convId,
 *       model, message: { role: "assistant", content: string },
 *       usage?: { prompt_tokens, completion_tokens, total_tokens }
 *     }
 *   }
 */

const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");
const { spawn } = require("child_process");

// ---------- Config / ENV ----------

const PROJECT_ROOT = path.resolve(__dirname, ".."); // gumgang_meeting
const DOTENV_PATH = path.join(PROJECT_ROOT, ".env");
const CONV_ROOT = path.join(PROJECT_ROOT, "conversations");
const UI_ROOT = path.join(PROJECT_ROOT, "ui");
const SESS_ROOT = path.join(PROJECT_ROOT, "sessions");
const STATUS_ROOT = path.join(PROJECT_ROOT, "status");

const DEFAULT_PORT = Number(process.env.PORT || 3037);
const DEFAULT_MODEL = "gpt-4o-mini"; // if OPENAI_MODEL missing
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

/**
 * Load .env key=value pairs (no dependencies).
 * Priority: process.env > .env file values
 */
function loadEnv(dotenvPath) {
  const env = {};
  try {
    const raw = fs.readFileSync(dotenvPath, "utf8");
    raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"))
      .forEach((line) => {
        const eq = line.indexOf("=");
        if (eq === -1) return;
        const k = line.slice(0, eq).trim();
        let v = line.slice(eq + 1).trim();
        if (
          (v.startsWith('"') && v.endsWith('"')) ||
          (v.startsWith("'") && v.endsWith("'"))
        ) {
          v = v.slice(1, -1);
        }
        env[k] = v;
      });
  } catch (e) {
    // no .env — acceptable; may come from process.env
  }
  // merge with process.env (process.env wins)
  return new Proxy(env, {
    get(target, prop) {
      const key = String(prop);
      return process.env[key] != null ? process.env[key] : target[key];
    },
  });
}

const ENV = loadEnv(DOTENV_PATH);
const OPENAI_API_KEY =
  ENV.OPENAI_API_KEY || ENV.OPENAI_APIKEY || ENV.OPENAI_KEY;
const OPENAI_ORG_ID = ENV.OPENAI_ORG_ID || ENV.OPENAI_ORGANIZATION;
const OPENAI_MODEL = ENV.OPENAI_MODEL || DEFAULT_MODEL;

// ---------- Read-only Mode & RO FS Config ----------

const READ_ONLY_MODE =
  String(ENV.READ_ONLY_MODE || "true").toLowerCase() === "true";

// List of allowed roots for RO file system browsing.
// ENV.FS_ALLOWLIST should be a JSON array like:
//   [{"id":"ws","path":"/home/duksan/바탕화면/gumgang_0_5"}]
const FS_ALLOWLIST = (() => {
  try {
    const raw = ENV.FS_ALLOWLIST || "[]";
    const arr = JSON.parse(raw);
    if (Array.isArray(arr) && arr.length > 0) {
      return arr
        .map((r) => ({
          id: String(r.id || "").trim(),
          path: String(r.path || "").trim(),
        }))
        .filter((r) => r.id && r.path);
    }
  } catch (_) {
    // ignore and fallback below
  }
  // Fallback defaults to enable basic fs.read/open for status/ui without extra env
  return [
    { id: "status", path: path.join(PROJECT_ROOT, "status") },
    { id: "ui", path: UI_ROOT },
  ];
})();

const FS_EXCLUDE = new Set(
  String(
    ENV.FS_EXCLUDE ||
      "node_modules,.git,.next,venv,.venv,dist,build,target,.cache,coverage,__pycache__,tmp,logs",
  )
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
);

const MAX_PREVIEW_BYTES = Number(ENV.MAX_PREVIEW_BYTES || 131072);
const MAX_INDEX = Number(ENV.MAX_INDEX || 8000);

function a4Meta(req, usage) {
  const reqId =
    (req.headers["x-request-id"] &&
      String(req.headers["x-request-id"]).trim()) ||
    `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const upstream =
    (req.headers["x-upstream-model"] &&
      String(req.headers["x-upstream-model"]).trim()) ||
    null;
  const cacheRatio = Number(req.headers["x-cache-ratio"] || 0) || 0;
  return {
    request_id: reqId,
    upstream_model: upstream,
    cache_ratio: cacheRatio,
    usage: usage || undefined,
    server_ts: nowISO(),
  };
}

function fsFindRoot(rootId) {
  if (!rootId) return null;
  const r = (FS_ALLOWLIST || []).find((x) => x.id === rootId);
  return r || null;
}

function fsResolveSafe(root, rel) {
  const base = path.resolve(String(root.path || ""));
  const rootReal = fs.realpathSync.native
    ? fs.realpathSync.native(base)
    : fs.realpathSync(base);
  const candidate = path.resolve(rootReal, rel || ".");
  let candReal;
  try {
    candReal = fs.realpathSync.native
      ? fs.realpathSync.native(candidate)
      : fs.realpathSync(candidate);
  } catch (_) {
    candReal = candidate;
  }
  if (!candReal.startsWith(rootReal)) {
    const err = new Error("Path traversal blocked");
    err.status = 400;
    throw err;
  }
  const relSegs = path
    .relative(rootReal, candReal)
    .split(path.sep)
    .filter(Boolean);
  for (const seg of relSegs) {
    if (FS_EXCLUDE.has(seg)) {
      const err = new Error(`Access to excluded path: ${seg}`);
      err.status = 403;
      throw err;
    }
  }
  return candReal;
}

// ---------- Utilities ----------

function jsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req
      .on("data", (chunk) => {
        data += chunk;
        // Protect against giant payloads
        if (data.length > 5 * 1024 * 1024) {
          req.destroy();
          reject(new Error("Payload too large"));
        }
      })
      .on("end", () => {
        if (!data) return resolve(null);
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error("Invalid JSON"));
        }
      })
      .on("error", (err) => reject(err));
  });
}

function sendJSON(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function setCORS(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, X-Requested-With, X-Request-ID, X-Upstream-Model, X-Cache-Ratio",
  );
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return true;
  }
  return false;
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function safeId(s) {
  return (
    String(s || "")
      .trim()
      .replace(/[^A-Za-z0-9._-]/g, "_")
      .slice(0, 120) || "UNSET"
  );
}

function nowISO() {
  return new Date().toISOString();
}

function genId(prefix) {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${y}${m}${dd}-${hh}${mm}${ss}-${rand}`;
}

// Conversation file structure helpers
function convPath(sessionId, taskId, convId) {
  const s = safeId(sessionId || genId("GG-SESS"));
  const t = safeId(taskId || "TASK-ROOT");
  const c = safeId(convId || genId("CONV"));
  const dir = path.join(CONV_ROOT, s, t);
  const file = path.join(dir, `${c}.json`);
  return { dir, file, sessionId: s, taskId: t, convId: c };
}

function readJSONSafe(p) {
  try {
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, "utf8");
      return JSON.parse(raw);
    }
  } catch (_) {}
  return null;
}

function writeJSONPretty(p, obj) {
  const txt = JSON.stringify(obj, null, 2);
  fs.writeFileSync(p, txt, "utf8");
}

function appendConversation({
  sessionId,
  taskId,
  convId,
  userTurn,
  assistantTurn,
  model,
}) {
  const {
    dir,
    file,
    sessionId: s,
    taskId: t,
    convId: c,
  } = convPath(sessionId, taskId, convId);
  ensureDir(dir);
  const base = readJSONSafe(file) || {
    meta: {
      sessionId: s,
      taskId: t,
      convId: c,
      model,
      created_at: nowISO(),
      updated_at: nowISO(),
      type: "chat",
      version: 1,
    },
    turns: [],
  };
  if (userTurn) base.turns.push(userTurn);
  if (assistantTurn) base.turns.push(assistantTurn);
  base.meta.model = model || base.meta.model || OPENAI_MODEL;
  // Persist vendor/model/request id hints for auditing
  if (assistantTurn && assistantTurn.provider)
    base.meta.provider = assistantTurn.provider;
  if (assistantTurn && assistantTurn.upstream_model)
    base.meta.upstream_model = assistantTurn.upstream_model;
  if (assistantTurn && assistantTurn.request_id)
    base.meta.last_request_id = assistantTurn.request_id;
  base.meta.updated_at = nowISO();
  writeJSONPretty(file, base);
  return { sessionId: s, taskId: t, convId: c, path: file };
}

// ---------- OpenAI Proxy ----------

async function openaiChat({ apiKey, orgId, model, messages, temperature }) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
  if (orgId) headers["OpenAI-Organization"] = orgId;

  const body = {
    model: model || OPENAI_MODEL,
    messages,
  };
  if (typeof temperature === "number") {
    body.temperature = temperature;
  }

  // Prefer global fetch if available (Node >= 18)
  if (typeof fetch === "function") {
    const resp = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      const msg =
        data && data.error && data.error.message
          ? data.error.message
          : `OpenAI error ${resp.status}`;
      const err = new Error(msg);
      err.status = resp.status;
      err.details = data;
      throw err;
    }
    // Return both body and response headers (for x-request-id, etc.)
    return { data, headers: Object.fromEntries(resp.headers.entries()) };
  }

  // Fallback using https
  const url = new URL(OPENAI_API_URL);
  const payload = JSON.stringify(body);
  const opts = {
    method: "POST",
    hostname: url.hostname,
    path: url.pathname,
    headers: {
      ...headers,
      "Content-Length": Buffer.byteLength(payload),
    },
  };
  const result = await new Promise((resolve, reject) => {
    const req = https.request(opts, (res) => {
      let raw = "";
      res.on("data", (d) => (raw += d));
      res.on("end", () => {
        try {
          const json = JSON.parse(raw);
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(json);
          else {
            const msg =
              json && json.error && json.error.message
                ? json.error.message
                : `OpenAI error ${res.statusCode}`;
            const err = new Error(msg);
            err.status = res.statusCode;
            err.details = json;
            reject(err);
          }
        } catch (e) {
          reject(new Error("Invalid JSON from OpenAI"));
        }
      });
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
  return { data: result, headers: {} };
}

// ---------- Static UI Serving ----------

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

function contentTypeFor(p) {
  const ext = path.extname(p).toLowerCase();
  return MIME_TYPES[ext] || "application/octet-stream";
}

function safeResolveUiPath(relPath) {
  const clean = path.normalize(relPath || "").replace(/^([/\\]+)/, "");
  const full = path.resolve(path.join(UI_ROOT, clean));
  if (!full.startsWith(path.resolve(UI_ROOT))) return null; // prevent traversal
  return full;
}

// ---------- HTTP Server ----------

const server = http.createServer(async (req, res) => {
  try {
    if (setCORS(req, res)) return;

    // Enforce READ_ONLY_MODE: block chat writes
    if (
      READ_ONLY_MODE &&
      req.method === "POST" &&
      req.url.startsWith("/api/chat")
    ) {
      return sendJSON(res, 403, {
        ok: false,
        error: { message: "READ_ONLY_MODE: writes disabled" },
      });
    }

    // ODP orchestrator stub (no writes, rounds=1)
    if (req.method === "POST" && req.url.startsWith("/api/orchestrate")) {
      let body = {};
      try {
        body = (await jsonBody(req)) || {};
      } catch (e) {
        return sendJSON(res, 400, {
          ok: false,
          error: { message: e.message || "Invalid JSON" },
        });
      }
      const judge = body.judge === "human" ? "human" : "none";
      const prompt = String(body.prompt || "");
      const output = prompt ? `ECHO: ${prompt}` : "";
      const meta = a4Meta(req, { tokens_in: 0, tokens_out: 0, rounds: 1 });
      return sendJSON(res, 200, {
        ok: true,
        data: { output, rounds: 1, judge },
        meta,
      });
    }

    // RO FS: roots — expose allowed roots (ids only + paths) for UI dropdown
    if (req.method === "GET" && req.url.startsWith("/api/fs/roots")) {
      const meta = a4Meta(req);
      const roots = (FS_ALLOWLIST || []).map((r) => ({
        id: String(r.id || ""),
        path: String(r.path || ""),
      }));
      return sendJSON(res, 200, { roots, meta });
    }

    // RO FS: list
    if (req.method === "GET" && req.url.startsWith("/api/fs/list")) {
      const u = new URL(req.url, "http://localhost");
      const rootId = u.searchParams.get("rootId") || "";
      const relPath = u.searchParams.get("path") || "";
      const recursive = (u.searchParams.get("recursive") || "") === "true";
      const q = (u.searchParams.get("q") || "").toLowerCase().trim();
      const page = Math.max(1, Number(u.searchParams.get("page") || "1"));
      const pageSize = Math.min(
        500,
        Math.max(1, Number(u.searchParams.get("pageSize") || "200")),
      );
      // Sorting controls (M0+ B)
      const sortRaw = (u.searchParams.get("sort") || "name").toLowerCase();
      const orderRaw = (u.searchParams.get("order") || "asc").toLowerCase();
      const foldersFirstRaw = (
        u.searchParams.get("foldersFirst") || "true"
      ).toLowerCase();
      const SORT = ["name", "size", "mtime"].includes(sortRaw)
        ? sortRaw
        : "name";
      const ORDER = orderRaw === "desc" ? "desc" : "asc";
      const FOLDERS_FIRST = foldersFirstRaw === "true";
      const root = fsFindRoot(rootId);
      const meta = a4Meta(req);
      if (!root) return sendJSON(res, 400, { error: "Invalid rootId", meta });

      let target;
      try {
        target = fsResolveSafe(root, relPath);
      } catch (e) {
        const status = e.status || 500;
        return sendJSON(res, status, {
          error: e.message || "Path error",
          meta,
        });
      }
      let st;
      try {
        st = fs.lstatSync(target);
      } catch (_) {
        return sendJSON(res, 404, { error: "Not found", meta });
      }
      if (!st.isDirectory())
        return sendJSON(res, 400, { error: "Not a directory", meta });

      const results = [];
      function pushItem(base, entry) {
        if (FS_EXCLUDE.has(entry)) return;
        const full = path.join(base, entry);
        let s;
        try {
          s = fs.lstatSync(full);
        } catch (_) {
          return;
        }
        const rel = path.relative(root.path, full);
        if (q && !entry.toLowerCase().includes(q)) return;
        results.push({
          name: entry,
          path: rel,
          type: s.isDirectory() ? "dir" : "file",
          size: s.isFile() ? s.size : undefined,
          mtimeMs: s.mtimeMs,
        });
      }

      if (!recursive) {
        let entries = [];
        try {
          entries = fs.readdirSync(target);
        } catch (_) {
          entries = [];
        }
        for (const entry of entries) {
          if (results.length >= MAX_INDEX) break;
          pushItem(target, entry);
        }
      } else {
        const queue = [target];
        while (queue.length && results.length < MAX_INDEX) {
          const cur = queue.shift();
          let entries = [];
          try {
            entries = fs.readdirSync(cur);
          } catch (_) {
            entries = [];
          }
          for (const entry of entries) {
            if (results.length >= MAX_INDEX) break;
            const full = path.join(cur, entry);
            let s;
            try {
              s = fs.lstatSync(full);
            } catch (_) {
              continue;
            }
            if (s.isDirectory()) {
              if (!FS_EXCLUDE.has(entry)) {
                pushItem(cur, entry);
                queue.push(full);
              }
            } else {
              pushItem(cur, entry);
            }
          }
        }
      }

      // Apply sorting before pagination (M0+ B)
      try {
        const cmp = (a, b) => {
          // Optional folder-first tier
          if (FOLDERS_FIRST && a.type !== b.type) {
            return a.type === "dir" ? -1 : 1;
          }
          // Key by requested sort
          if (SORT === "name") {
            const an = String(a.name || "").toLowerCase();
            const bn = String(b.name || "").toLowerCase();
            const c = an.localeCompare(bn);
            if (c !== 0) return ORDER === "desc" ? -c : c;
            const t = String(a.path || "").localeCompare(String(b.path || ""));
            return ORDER === "desc" ? -t : t;
          }
          if (SORT === "size") {
            const asz = typeof a.size === "number" ? a.size : -1; // dirs → -1
            const bsz = typeof b.size === "number" ? b.size : -1;
            if (asz !== bsz) return ORDER === "desc" ? bsz - asz : asz - bsz;
            const t = String(a.name || "").localeCompare(String(b.name || ""));
            return ORDER === "desc" ? -t : t;
          }
          if (SORT === "mtime") {
            const am = typeof a.mtimeMs === "number" ? a.mtimeMs : 0;
            const bm = typeof b.mtimeMs === "number" ? b.mtimeMs : 0;
            if (am !== bm) return ORDER === "desc" ? bm - am : am - bm;
            const t = String(a.name || "").localeCompare(String(b.name || ""));
            return ORDER === "desc" ? -t : t;
          }
          return 0;
        };
        results.sort(cmp);
      } catch (_) {}

      const total = results.length;
      const start = (page - 1) * pageSize;
      const end = Math.min(total, start + pageSize);
      const items = results.slice(start, end);
      return sendJSON(res, 200, {
        items,
        page,
        pageSize,
        total,
        meta,
        sort: SORT,
        order: ORDER,
        foldersFirst: FOLDERS_FIRST,
      });
    }

    // RO FS: read
    if (req.method === "GET" && req.url.startsWith("/api/fs/read")) {
      const u = new URL(req.url, "http://localhost");
      const rootId = u.searchParams.get("rootId") || "";
      const relPath = u.searchParams.get("path") || "";
      const offset = Math.max(0, Number(u.searchParams.get("offset") || "0"));
      const limit = Math.min(
        MAX_PREVIEW_BYTES,
        Math.max(
          1,
          Number(u.searchParams.get("limit") || String(MAX_PREVIEW_BYTES)),
        ),
      );
      const metaBase = a4Meta(req);
      const root = fsFindRoot(rootId);
      if (!root)
        return sendJSON(res, 400, { error: "Invalid rootId", meta: metaBase });

      let target;
      try {
        target = fsResolveSafe(root, relPath);
      } catch (e) {
        const status = e.status || 500;
        return sendJSON(res, status, {
          error: e.message || "Path error",
          meta: metaBase,
        });
      }
      let st;
      try {
        st = fs.lstatSync(target);
      } catch (_) {
        return sendJSON(res, 404, { error: "Not found", meta: metaBase });
      }
      if (!st.isFile())
        return sendJSON(res, 400, { error: "Not a file", meta: metaBase });

      const fd = fs.openSync(target, "r");
      try {
        const toRead = Math.min(limit, MAX_PREVIEW_BYTES);
        const buffer = Buffer.allocUnsafe(toRead);
        const bytesRead = fs.readSync(fd, buffer, 0, toRead, offset);
        const slice = buffer.subarray(0, bytesRead);
        // UTF-8 aware text detection: allow valid multibyte sequences and common controls
        function looksLikeUtf8(buf) {
          let i = 0;
          let controlCount = 0;
          let nulCount = 0;
          while (i < buf.length) {
            const byte = buf[i];
            // NUL byte is a strong indicator of binary
            if (byte === 0x00) {
              nulCount++;
              i++;
              continue;
            }
            // ASCII
            if (byte <= 0x7f) {
              if (
                byte < 0x20 &&
                byte !== 0x09 &&
                byte !== 0x0a &&
                byte !== 0x0d
              )
                controlCount++;
              i++;
              continue;
            }
            // UTF-8 leading byte classes: 110xxxxx, 1110xxxx, 11110xxx
            let size = 0;
            if ((byte & 0xe0) === 0xc0) size = 2;
            else if ((byte & 0xf0) === 0xe0) size = 3;
            else if ((byte & 0xf8) === 0xf0) size = 4;
            else return false; // invalid start byte
            if (i + size - 1 >= buf.length) return false; // incomplete sequence at end
            for (let j = 1; j < size; j++) {
              if ((buf[i + j] & 0xc0) !== 0x80) return false; // invalid continuation
            }
            i += size;
          }
          if (nulCount > 0) return false;
          const controlRatio = controlCount / (buf.length || 1);
          return controlRatio < 0.05;
        }
        const isText = looksLikeUtf8(slice);
        const isBinary = !isText;
        const content = isText ? slice.toString("utf8") : undefined;
        const meta = a4Meta(req, { bytes_read: bytesRead });
        return sendJSON(res, 200, {
          path: path.relative(root.path, target),
          size: st.size,
          offset,
          read: bytesRead,
          is_binary: isBinary,
          content: isBinary ? undefined : content,
          meta,
        });
      } finally {
        try {
          fs.closeSync(fd);
        } catch (_) {}
      }
    }

    // Health check
    if (req.method === "GET" && req.url.startsWith("/health")) {
      return sendJSON(res, 200, {
        ok: true,
        ts: nowISO(),
        env: {
          model: OPENAI_MODEL,
          hasApiKey: !!OPENAI_API_KEY,
        },
      });
    }

    // POST /api/save — save text file within WRITE_ALLOW roots
    if (req.method === "POST" && req.url.startsWith("/api/save")) {
      let body;
      try {
        body = (await jsonBody(req)) || {};
      } catch (e) {
        return sendJSON(res, 400, {
          ok: false,
          error: { message: e.message || "Invalid JSON" },
        });
      }

      const rootKey = String(body.root || "").toLowerCase();
      const relPath = String(body.path || "").trim();
      const content = typeof body.content === "string" ? body.content : null;
      const overwrite = Boolean(body.overwrite ?? true);
      const ensureDirs = Boolean(body.ensureDirs ?? true);

      const roots = {
        ui: UI_ROOT,
        conversations: CONV_ROOT,
        sessions: SESS_ROOT,
        status: STATUS_ROOT,
      };
      const base = roots[rootKey];
      if (!base) {
        return sendJSON(res, 400, {
          ok: false,
          error: {
            message: "Invalid root. Allowed: ui|conversations|sessions|status",
          },
        });
      }
      if (!relPath || path.isAbsolute(relPath)) {
        return sendJSON(res, 400, {
          ok: false,
          error: { message: "Path must be a non-empty relative path" },
        });
      }

      // Resolve and guard (no traversal; must stay under base)
      const baseReal = fs.realpathSync.native
        ? fs.realpathSync.native(base)
        : fs.realpathSync(base);
      const target = path.resolve(baseReal, path.normalize(relPath));
      if (!target.startsWith(baseReal)) {
        return sendJSON(res, 403, {
          ok: false,
          error: { message: "Path traversal blocked" },
        });
      }

      const dir = path.dirname(target);
      try {
        if (ensureDirs) fs.mkdirSync(dir, { recursive: true });
        if (!overwrite && fs.existsSync(target)) {
          return sendJSON(res, 409, {
            ok: false,
            error: { message: "File exists" },
          });
        }
        fs.writeFileSync(target, content ?? "", "utf8");
        const meta = a4Meta(req);
        return sendJSON(res, 200, {
          ok: true,
          data: {
            root: rootKey,
            path: path.relative(PROJECT_ROOT, target),
            bytes: Buffer.byteLength(content ?? "", "utf8"),
          },
          meta,
        });
      } catch (e) {
        return sendJSON(res, 500, {
          ok: false,
          error: { message: e.message || "Write failed" },
        });
      }
    }

    // POST /api/open — open a file path via OS (xdg-open/open/start)
    if (req.method === "POST" && req.url.startsWith("/api/open")) {
      let body;
      try {
        body = (await jsonBody(req)) || {};
      } catch (e) {
        return sendJSON(res, 400, {
          ok: false,
          error: { message: e.message || "Invalid JSON" },
        });
      }
      const rootKey = String(body.root || "").toLowerCase();
      const relPath = String(body.path || "").trim();
      const roots = {
        ui: UI_ROOT,
        conversations: CONV_ROOT,
        sessions: SESS_ROOT,
        status: STATUS_ROOT,
      };
      const base = roots[rootKey];
      if (!base) {
        return sendJSON(res, 400, {
          ok: false,
          error: {
            message: "Invalid root. Allowed: ui|conversations|sessions|status",
          },
        });
      }
      if (!relPath || path.isAbsolute(relPath)) {
        return sendJSON(res, 400, {
          ok: false,
          error: { message: "Path must be a non-empty relative path" },
        });
      }
      // Resolve target under base
      let target;
      try {
        const baseReal = fs.realpathSync.native
          ? fs.realpathSync.native(base)
          : fs.realpathSync(base);
        target = path.resolve(baseReal, path.normalize(relPath));
        if (!target.startsWith(baseReal)) {
          return sendJSON(res, 403, {
            ok: false,
            error: { message: "Path traversal blocked" },
          });
        }
        if (!fs.existsSync(target)) {
          return sendJSON(res, 404, {
            ok: false,
            error: { message: "File not found" },
          });
        }
      } catch (e) {
        return sendJSON(res, 500, {
          ok: false,
          error: { message: e.message || "Resolve failed" },
        });
      }
      // OS open
      try {
        const plat = process.platform;
        let cmd, args;
        if (plat === "darwin") {
          cmd = "open";
          args = [target];
        } else if (plat === "win32") {
          cmd = "cmd";
          args = ["/c", "start", "", target];
        } else {
          cmd = "xdg-open";
          args = [target];
        }
        const child = spawn(cmd, args, { detached: true, stdio: "ignore" });
        if (child.unref) child.unref();
        const meta = a4Meta(req);
        return sendJSON(res, 200, {
          ok: true,
          data: {
            path: path.relative(PROJECT_ROOT, target),
            platform: plat,
            cmd,
            args,
          },
          meta,
        });
      } catch (e) {
        return sendJSON(res, 500, {
          ok: false,
          error: { message: e.message || "Open failed" },
        });
      }
    }

    // GET/HEAD /api/health — basic health/version and route support
    if (
      (req.method === "GET" || req.method === "HEAD") &&
      req.url.startsWith("/api/health")
    ) {
      const meta = a4Meta(req);
      try {
        return sendJSON(res, 200, {
          ok: true,
          data: {
            ts: new Date().toISOString(),
            node: process.version,
            pid: process.pid,
            uptime_sec: Math.floor(process.uptime()),
            read_only_mode: !!READ_ONLY_MODE,
            routes: {
              save: true,
              open: true,
              fs_roots: true,
              fs_list: true,
              ui: true,
            },
          },
          meta,
        });
      } catch (e) {
        return sendJSON(res, 500, {
          ok: false,
          error: { message: e.message || "Health error" },
          meta,
        });
      }
    }

    // Static UI (GET/HEAD) under /ui/*
    if (
      (req.method === "GET" || req.method === "HEAD") &&
      req.url.startsWith("/ui")
    ) {
      const u = new URL(req.url, "http://localhost");
      let rel = u.pathname.replace(/^\/ui\/?/, "");
      // Default document: unified snapshot if no specific file requested
      if (!rel || rel === "") {
        rel = "snapshots/unified_A1-A4_v0/index.html";
      }
      let filePath = safeResolveUiPath(rel);
      if (!filePath) {
        res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Forbidden");
        return;
      }
      // If directory, try index.html
      try {
        const st = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
        if (st && st.isDirectory()) {
          filePath = path.join(filePath, "index.html");
        }
      } catch (_) {}
      if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Not Found");
        return;
      }
      const ct = contentTypeFor(filePath);
      try {
        if (req.method === "HEAD") {
          res.writeHead(200, {
            "Content-Type": ct,
            "Cache-Control": "no-store",
          });
          res.end();
          return;
        }
        const data = fs.readFileSync(filePath);
        res.writeHead(200, {
          "Content-Type": ct,
          "Content-Length": data.length,
          "Cache-Control": "no-store",
        });
        res.end(data);
        return;
      } catch (e) {
        res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Static file error");
        return;
      }
    }

    // Chat proxy
    if (req.method === "POST" && req.url.startsWith("/api/chat")) {
      if (!OPENAI_API_KEY) {
        return sendJSON(res, 500, {
          ok: false,
          error: {
            message:
              "OPENAI_API_KEY is missing in environment (.env or process env)",
          },
        });
      }

      let body;
      try {
        body = (await jsonBody(req)) || {};
      } catch (e) {
        return sendJSON(res, 400, {
          ok: false,
          error: { message: e.message || "Invalid JSON" },
        });
      }

      const messages = Array.isArray(body.messages) ? body.messages : null;
      if (!messages || messages.length === 0) {
        return sendJSON(res, 400, {
          ok: false,
          error: { message: "Body must include non-empty 'messages' array" },
        });
      }

      const sessionId = body.sessionId || genId("GG-SESS");
      const taskId = body.taskId || "TASK-ROOT";
      const convId = body.convId || genId("CONV");
      const model = body.model || OPENAI_MODEL;
      const temperature =
        typeof body.temperature === "number" ? body.temperature : undefined;

      // Prepare turns (user is assumed to be last message; we log both)
      const ts = nowISO();
      const last = messages[messages.length - 1] || {};
      const userTurn = {
        role: last.role || "user",
        content: String(last.content || ""),
        ts,
      };

      let apiResult;
      try {
        apiResult = await openaiChat({
          apiKey: OPENAI_API_KEY,
          orgId: OPENAI_ORG_ID,
          model,
          messages,
          temperature,
        });
      } catch (err) {
        // Log failed try as well (append only meta)
        appendConversation({
          sessionId,
          taskId,
          convId,
          userTurn,
          assistantTurn: {
            role: "assistant",
            content: "",
            ts: nowISO(),
            error: String(err.message || "OpenAI error"),
          },
          model,
        });
        const status = err.status || 500;
        return sendJSON(res, status, {
          ok: false,
          error: {
            message: err.message || "OpenAI proxy failed",
            details: err.details || null,
          },
        });
      }

      // Extract assistant content and metadata
      const oaHeaders = (apiResult && apiResult.headers) || {};
      const oaBody = (apiResult && apiResult.data) || {};
      const upstreamModel = (oaBody && oaBody.model) || model;
      const reqId =
        oaHeaders["x-request-id"] || oaHeaders["X-Request-Id"] || null;

      const choice = oaBody && oaBody.choices && oaBody.choices[0];
      const assistantMsg = (choice && choice.message) || {
        role: "assistant",
        content: "",
      };
      const usage = oaBody && oaBody.usage;

      const assistantTurn = {
        role: assistantMsg.role || "assistant",
        content: String(assistantMsg.content || ""),
        ts: nowISO(),
        usage: usage || undefined,
        provider: "openai",
        upstream_model: upstreamModel,
        request_id: reqId || undefined,
      };

      const saved = appendConversation({
        sessionId,
        taskId,
        convId,
        userTurn,
        assistantTurn,
        model,
      });

      return sendJSON(res, 200, {
        ok: true,
        data: {
          sessionId: saved.sessionId,
          taskId: saved.taskId,
          convId: saved.convId,
          model,
          upstream_model: upstreamModel,
          provider: "openai",
          request_id: reqId || null,
          message: assistantMsg,
          usage: usage || null,
          path: saved.path.replace(PROJECT_ROOT + path.sep, ""),
        },
      });
    }

    // Not found
    res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: false, error: { message: "Not Found" } }));
  } catch (e) {
    sendJSON(res, 500, {
      ok: false,
      error: { message: e.message || "Server error" },
    });
  }
});

// ---------- Startup ----------

server.listen(DEFAULT_PORT, "127.0.0.1", () => {
  const keyStatus = OPENAI_API_KEY
    ? "✓ OPENAI_API_KEY loaded"
    : "✗ OPENAI_API_KEY missing";
  const envPath = fs.existsSync(DOTENV_PATH) ? DOTENV_PATH : "(not found)";
  console.log("[Gumgang Bridge] listening on http://127.0.0.1:" + DEFAULT_PORT);
  console.log("[Gumgang Bridge] .env:", envPath);
  console.log("[Gumgang Bridge] model:", OPENAI_MODEL);
  console.log("[Gumgang Bridge] key:", keyStatus);
  console.log("[Gumgang Bridge] conversations root:", CONV_ROOT);
  console.log("[Gumgang Bridge] ui root:", UI_ROOT);
});
server.on("error", (err) => {
  console.error(
    "[Gumgang Bridge] server error:",
    err && err.message ? err.message : err,
  );
  if (err && err.code === "EADDRINUSE") {
    console.error(
      "[Gumgang Bridge] Port in use. Try: PORT=3038 node gumgang_meeting/bridge/server.js",
    );
  }
});
