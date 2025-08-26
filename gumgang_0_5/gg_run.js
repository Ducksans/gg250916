#!/usr/bin/env node
// gg_run.js — gg_* 툴 로컬 실행기
// 사용: node gg_run.js gg_full_scan '{"path":"/home/duksan/바탕화면/gumgang_0_5"}'

import fs from "fs";
import path from "path";
import os from "os";

const [,, tool, jsonArgsRaw = "{}"] = process.argv;
if (!tool) {
  console.error('Usage: node gg_run.js <tool_id> [json_args]');
  process.exit(1);
}

let args = {};
try { args = JSON.parse(jsonArgsRaw); } catch(e) {
  console.error('Invalid JSON args:', e.message);
  process.exit(1);
}

const readText  = (p) => fs.readFileSync(p, "utf8");
const writeText = (p, t) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, t, "utf8");
};
const editText = (original, edits=[]) => {
  let out = original ?? "";
  for (const e of edits) {
    const oldText = String(e?.oldText ?? "");
    const newText = String(e?.newText ?? "");
    if (oldText) out = out.split(oldText).join(newText);
  }
  return out;
};

function listDirectoryOnce(base) {
  const entries = fs.readdirSync(base).map(f => {
    const full = path.join(base, f);
    const stat = fs.statSync(full);
    return {
      name: f,
      path: full,
      type: stat.isDirectory() ? "dir" : "file",
      size: stat.isDirectory() ? 0 : stat.size,
      mtime: stat.mtime.toISOString()
    };
  });
  return entries;
}

(async () => {
  try {
    if (tool === "gg_full_scan") {
      const base = args.path || ".";
      const entries = listDirectoryOnce(base);
      console.log(JSON.stringify(entries, null, 2));
      return;
    }
    if (tool === "gg_file_info") {
      const p = args.path;
      const st = fs.statSync(p);
      console.log(JSON.stringify({
        path: p,
        size: st.size,
        mtime: st.mtime.toISOString(),
        mode: st.mode.toString(8),
        isDir: st.isDirectory(),
        owner: os.userInfo().username
      }, null, 2));
      return;
    }
    if (tool === "gg_read_text") {
      const p = args.path;
      process.stdout.write(readText(p));
      return;
    }
    if (tool === "gg_write_file") {
      const p = args.path;
      writeText(p, String(args.content ?? ""));
      console.log(`Wrote ${p}`);
      return;
    }
    if (tool === "gg_edit_file") {
      const p = args.path;
      const original = readText(p);
      const out = editText(original, args.edits || []);
      writeText(p, out);
      console.log(`Edited ${p}`);
      return;
    }
    // 미지정: 그대로 에코
    console.log(JSON.stringify({ tool, args }, null, 2));
  } catch (e) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  }
})();
