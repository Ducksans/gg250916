#!/usr/bin/env node
/**
 * GumGangCmd — 금강 전용 MCP 서버
 * - 프롬프트(한글 이름) + 툴(ASCII 안전 ID) 동시 제공
 * - gumgang_commands.json을 읽어 동적 등록
 * - stdout은 MCP 프레임만, 로그는 stderr
 */

import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const COMMANDS_FILE = path.join(__dirname, "gumgang_commands.json");

if (!fs.existsSync(COMMANDS_FILE)) {
  process.stderr.write(`❌ 명령어 파일이 없습니다: ${COMMANDS_FILE}\n`);
  process.exit(1);
}

let commandsData;
try {
  commandsData = JSON.parse(fs.readFileSync(COMMANDS_FILE, "utf8"));
} catch (e) {
  process.stderr.write(`❌ JSON 파싱 실패: ${e.message}\n`);
  process.exit(1);
}
process.stderr.write(`ℹ️  Loaded commands: ${Object.keys(commandsData).length}\n`);

const readText  = (p) => fs.readFileSync(p, "utf8");
const writeText = (p, t) => fs.writeFileSync(p, t, "utf8");

function editText(original, edits = []) {
  let out = original ?? "";
  for (const e of edits) {
    const oldText = String(e?.oldText ?? "");
    const newText = String(e?.newText ?? "");
    if (oldText) out = out.split(oldText).join(newText);
  }
  return out;
}

// ▶ 실행 공통 함수: 프롬프트/툴 모두 여기로
async function executeLocal(toolName, args) {
  if (toolName === "server_list_directory") {
    const base = args.path || ".";
    const entries = fs.readdirSync(base).map((f) => {
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
    return JSON.stringify(entries, null, 2);
  }

  if (toolName === "server_get_file_info") {
    const p = args.path;
    const stat = fs.statSync(p);
    const info = {
      path: p,
      size: stat.size,
      mtime: stat.mtime.toISOString(),
      mode: stat.mode.toString(8),
      isDir: stat.isDirectory(),
      owner: os.userInfo().username
    };
    return JSON.stringify(info, null, 2);
  }

  if (toolName === "server_read_text_file") {
    return readText(args.path);
  }

  if (toolName === "server_write_file") {
    writeText(args.path, String(args.content ?? ""));
    return `Wrote ${args.path}`;
  }

  if (toolName === "server_edit_file") {
    const p = args.path;
    const original = readText(p);
    const out = editText(original, args.edits || []);
    writeText(p, out);
    return `Edited ${p}`;
  }

  // 미지원: 페이로드만 반환
  return JSON.stringify({ tool: toolName, args }, null, 2);
}

function toJsonSchemaFromArgs(argsObj = {}) {
  const properties = {};
  for (const [key, val] of Object.entries(argsObj)) {
    let type = Array.isArray(val) ? "array" : (val === null ? "string" : typeof val);
    properties[key] =
      type === "string"  ? { type: "string",  default: val } :
      type === "number"  ? { type: "number",  default: val } :
      type === "boolean" ? { type: "boolean", default: val } :
      type === "array"   ? { type: "array", items: { type: "string" }, default: val } :
                           { type: "string", default: JSON.stringify(val) };
  }
  return { type: "object", properties, additionalProperties: true };
}

// ▶ 한글 명령 이름 → 안전한 툴 ID 매핑
const aliasByName = {
  "금강:전체분석": "gg_full_scan",
  "금강:파일정보": "gg_file_info",
  "금강:파일읽기": "gg_read_text",
  "금강:파일쓰기": "gg_write_file",
  "금강:파일수정": "gg_edit_file"
};
const makeSafeId = (name) =>
  aliasByName[name] || ("gg_" + name.replace(/[^A-Za-z0-9_.-]/g, "_"));

// ───────────────────────────────────────────────────────────────────────────────
const server = new McpServer(
  { name: "GumGangCmd", version: "1.4.0" },
  { capabilities: { prompts: {}, tools: {} } }
);

// 가시성용 ping
server.tool(
  "gumgang_ping",
  {
    description: "GumGangCmd MCP ping",
    inputSchema: { type: "object", properties: {}, additionalProperties: false }
  },
  async () => ({ content: [{ type: "text", text: "pong" }] })
);

// 동적 등록(프롬프트: 한글 / 툴: ASCII ID)
for (const [koreanName, cmd] of Object.entries(commandsData)) {
  if (!cmd || typeof cmd.tool !== "string") {
    process.stderr.write(`⚠️  스킵: "${koreanName}" → tool 누락\n`);
    continue;
  }
  const defaultArgs = (cmd.args && typeof cmd.args === "object") ? cmd.args : {};
  const argsSchema  = toJsonSchemaFromArgs(defaultArgs);
  const toolId      = makeSafeId(koreanName);

  // 프롬프트: 바로 실행 결과를 반환 (폼 UI가 없어도 동작)
  server.registerPrompt(
    koreanName,
    { title: koreanName, description: `금강 전용 명령: ${koreanName}`, argsSchema },
    async (inputArgs) => {
      const args = { ...defaultArgs, ...(inputArgs || {}) };
      const out  = await executeLocal(cmd.tool, args);
      return { messages: [{ role: "user", content: { type: "text", text: String(out) } }] };
    }
  );

  // 툴: ASCII 안전 ID로 등록
  server.tool(
    toolId,
    { description: `금강 전용 명령(로컬 실행): ${koreanName}`, inputSchema: argsSchema },
    async (input) => {
      try {
        const args = { ...defaultArgs, ...(input || {}) };
        const out  = await executeLocal(cmd.tool, args);
        return { content: [{ type: "text", text: String(out) }] };
      } catch (e) {
        return { content: [{ type: "text", text: `❌ Error: ${e.message}` }] };
      }
    }
  );

  process.stderr.write(`✓ Registered: prompt "${koreanName}" + tool "${toolId}"\n`);
}

// 예외/연결
process.on("uncaughtException", (err) => {
  process.stderr.write(`❌ uncaughtException: ${err.stack || err}\n`);
});
process.on("unhandledRejection", (reason) => {
  process.stderr.write(`❌ unhandledRejection: ${reason}\n`);
});

const transport = new StdioServerTransport();
try {
  await server.connect(transport);
  process.stderr.write("🚀 GumGangCmd connected (logs → stderr)\n");
} catch (e) {
  process.stderr.write(`❌ MCP 연결 실패: ${e.message}\n`);
  process.exit(1);
}
