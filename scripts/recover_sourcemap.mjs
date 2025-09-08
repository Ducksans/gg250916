#!/usr/bin/env node
/**
 * recover_sourcemap.mjs
 *
 * 목적
 * - .map(소스맵) 파일에 포함된 sources / sourcesContent를 읽어 원본 소스를 파일로 복원합니다.
 * - 빌드 산출물(dist/assets/*.js.map, *.css.map 등)에 inline source가 들어있을 경우에만 복원이 가능합니다.
 *
 * 사용 예 (Zed 터미널에서)
 *   1) 자동 탐색(권장, ui/(dist)/assets/*.map 등 우선 탐색)
 *      node gumgang_meeting/scripts/recover_sourcemap.mjs
 *
 *   2) 특정 소스맵 파일 지정
 *      node gumgang_meeting/scripts/recover_sourcemap.mjs --map ui/lc_app/dist/assets/index-XXXX.js.map
 *
 *   3) 출력 경로 지정(기본: ./_recovered_sources)
 *      node gumgang_meeting/scripts/recover_sourcemap.mjs --map ui/lc_app/dist/assets/index-XXXX.js.map --out ./ui/lc_app_recovered
 *
 *   4) 환경변수로 지정 (MAP, OUT)
 *      MAP=ui/lc_app/dist/assets/index-XXXX.js.map OUT=./ui/lc_app_recovered node gumgang_meeting/scripts/recover_sourcemap.mjs
 *
 * 안전장치
 * - 경로 정규화 및 디렉토리 탈출 차단(../ 등 제거)
 * - node_modules 등 외부 의존 경로는 기본적으로 건너뜀
 * - 바이너리/빈 콘텐츠는 자동 스킵
 */

import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const COLORS = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
};

function log(msg, color = "reset") {
  try {
    console.log(`${COLORS[color] || ""}${msg}${COLORS.reset}`);
  } catch {
    console.log(msg);
  }
}

function logHeader(title) {
  log(`\n${"=".repeat(60)}\n${title}\n${"=".repeat(60)}`, "cyan");
}

function usage(exitCode = 0) {
  const msg = `
recover_sourcemap.mjs — 소스맵에서 원본 소스 복원

사용:
  node gumgang_meeting/scripts/recover_sourcemap.mjs [--map <path|dir>] [--out <dir>] [--include-vendor]

옵션:
  --map <path|dir>   특정 .map 파일 경로 또는 .map이 들어있는 디렉토리
  --out <dir>        출력 디렉토리 (기본: ./_recovered_sources)
  --include-vendor   node_modules, vendor 경로도 포함(기본은 제외)
  --help             도움말 표시

환경변수:
  MAP=/path/to/file.map   (또는 디렉토리)
  OUT=./output_dir
`;
  console.log(msg.trim() + "\n");
  process.exit(exitCode);
}

function parseArgs(argv) {
  const args = { includeVendor: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") usage(0);
    else if (a === "--map") args.map = argv[++i];
    else if (a === "--out") args.out = argv[++i];
    else if (a === "--include-vendor") args.includeVendor = true;
    else if (a.startsWith("--")) {
      log(`알 수 없는 옵션: ${a}`, "yellow");
    } else {
      // 위치 인자: map 경로로 간주
      if (!args.map) args.map = a;
    }
  }
  // ENV fallback
  if (!args.map && process.env.MAP) args.map = process.env.MAP;
  if (!args.out && process.env.OUT) args.out = process.env.OUT;
  return args;
}

async function pathExists(p) {
  try {
    await fsp.access(p, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

async function* walk(
  dir,
  { maxDepth = 5, pattern = /\.map$/i } = {},
  depth = 0,
) {
  if (depth > maxDepth) return;
  let entries;
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      yield* walk(full, { maxDepth, pattern }, depth + 1);
    } else if (pattern.test(ent.name)) {
      yield full;
    }
  }
}

async function autoDiscoverMapCandidates() {
  // 우선순위 높은 후보
  const roots = [
    "ui", // ui/**/dist/**/assets/*.map
    "gumgang_0_5", // 혹시 프론트 빌드 산출물이 here에 위치할 수도 있음
    ".", // 레포 루트 전체(마지막 수단)
  ];
  const found = new Set();
  for (const r of roots) {
    const base = path.resolve(process.cwd(), r);
    if (!(await pathExists(base))) continue;
    for await (const f of walk(base, { maxDepth: 6, pattern: /\.map$/i })) {
      // assets 또는 dist 하위 파일들 우선
      if (/\/(assets|dist)\//.test(f.replace(/\\/g, "/"))) {
        found.add(f);
      }
    }
  }
  // 후보가 없으면 모든 .map 수집
  if (found.size === 0) {
    for (const r of roots) {
      const base = path.resolve(process.cwd(), r);
      if (!(await pathExists(base))) continue;
      for await (const f of walk(base, { maxDepth: 6, pattern: /\.map$/i })) {
        found.add(f);
      }
    }
  }
  return Array.from(found).sort();
}

function isProbablyText(content) {
  // 매우 단순한 휴리스틱: 널바이트 포함 -> 바이너리 가능성 큼
  if (!content) return false;
  if (content.includes("\u0000")) return false;
  return true;
}

function sanitizeRelPath(srcPath) {
  // 소스맵 내 경로 정규화: 절대/상대/URL 형태 등 다양한 것 정리
  let rel = String(srcPath || "")
    .replace(/^(\w+:)?\/\//, "") // 스킴 제거
    .replace(/^\/+/, "") // 선행 슬래시 제거
    .replace(/^(\.\.\/)+/, "") // 상위 경로 제거
    .replace(/\0/g, "") // 널 제거
    .replace(/[:*?"<>|]/g, "_"); // 위험 문자 치환

  // 흔한 가짜 prefix 제거
  rel = rel.replace(/^webpack:\/\/\//, "");
  rel = rel.replace(/^\/?src\//, "src/"); // src는 유지
  return rel || "unknown.txt";
}

function shouldSkipPath(rel, includeVendor) {
  const p = rel.toLowerCase();
  if (!includeVendor) {
    if (p.includes("node_modules/") || p.includes("/node_modules/"))
      return true;
    if (p.includes("vendor/") || p.includes("/vendor/")) return true;
  }
  // .map 내부에 test/helper 등 불필요 자산이 있을 경우 향후 여기에 규칙 추가 가능
  return false;
}

async function ensureDir(dir) {
  await fsp.mkdir(dir, { recursive: true });
}

async function writeFileSafe(root, rel, content) {
  const dest = path.join(root, rel);
  // 디렉토리 경로 생성
  await ensureDir(path.dirname(dest));
  await fsp.writeFile(dest, content, "utf8");
  return dest;
}

async function recoverFromMapFile(
  mapFile,
  outDir,
  { includeVendor = false } = {},
) {
  let json;
  try {
    const raw = await fsp.readFile(mapFile, "utf8");
    json = JSON.parse(raw);
  } catch (e) {
    log(`❌ 소스맵 파싱 실패: ${mapFile}\n   ${e?.message || e}`, "red");
    return { ok: false, written: 0, skipped: 0, file: mapFile };
  }

  const sources = json.sources || [];
  const sourcesContent = json.sourcesContent || [];
  if (
    !Array.isArray(sources) ||
    !Array.isArray(sourcesContent) ||
    sources.length !== sourcesContent.length
  ) {
    log(
      `⚠️ 소스맵에 sources/sourcesContent가 없거나 길이가 다릅니다: ${mapFile}`,
      "yellow",
    );
    return { ok: false, written: 0, skipped: 0, file: mapFile };
  }

  let written = 0;
  let skipped = 0;
  const errors = [];

  for (let i = 0; i < sources.length; i++) {
    const src = sources[i];
    const body = sourcesContent[i];

    if (typeof body !== "string" || !isProbablyText(body)) {
      skipped++;
      continue;
    }

    let rel = sanitizeRelPath(src);

    if (shouldSkipPath(rel, includeVendor)) {
      skipped++;
      continue;
    }

    try {
      const dest = await writeFileSafe(outDir, rel, body);
      written++;
      if (written <= 3) {
        log(`  ➕ ${dest}`, "dim");
      }
    } catch (e) {
      errors.push({ src, error: e?.message || String(e) });
    }
  }

  if (errors.length) {
    log(`⚠️ 일부 파일 쓰기 실패 ${errors.length}건`, "yellow");
  }
  return { ok: written > 0, written, skipped, file: mapFile, errors };
}

async function main() {
  const args = parseArgs(process.argv);
  const outDir = path.resolve(
    process.cwd(),
    args.out || "./_recovered_sources",
  );

  logHeader("소스맵 복원 시작");

  let mapTargets = [];

  if (args.map) {
    const p = path.resolve(process.cwd(), args.map);
    if (!(await pathExists(p))) {
      log(`❌ 경로가 존재하지 않습니다: ${p}`, "red");
      usage(2);
    }
    const stat = await fsp.stat(p);
    if (stat.isDirectory()) {
      log(`📁 디렉토리 지정됨 — 내부 *.map 자동 탐색: ${p}`);
      for await (const f of walk(p, { maxDepth: 6, pattern: /\.map$/i })) {
        mapTargets.push(f);
      }
    } else {
      mapTargets.push(p);
    }
  } else {
    log(
      "🔎 --map 미지정 — 레포 내에서 자동 탐색(ui/**/dist/**/assets/*.map 우선)",
    );
    mapTargets = await autoDiscoverMapCandidates();
  }

  if (mapTargets.length === 0) {
    log("❌ 소스맵(.map) 파일을 찾지 못했습니다.", "red");
    log("   힌트: --map <파일> 또는 --map <디렉토리> 옵션을 사용하세요.");
    usage(3);
  }

  // 출력 경로 준비
  await ensureDir(outDir);
  log(`📦 출력 디렉토리: ${outDir}`);

  // 너무 많은 대상일 경우 상위 20개로 제한(과도한 시간 방지)
  const MAX_TARGETS = 50;
  if (mapTargets.length > MAX_TARGETS) {
    log(
      `⚠️ 소스맵 파일이 ${mapTargets.length}개 발견 — 상위 ${MAX_TARGETS}개만 처리`,
      "yellow",
    );
    mapTargets = mapTargets.slice(0, MAX_TARGETS);
  }

  let totalWritten = 0;
  let totalSkipped = 0;
  const results = [];

  for (const m of mapTargets) {
    log(`\n🗺️  처리: ${m}`);
    const r = await recoverFromMapFile(m, outDir, {
      includeVendor: args.includeVendor,
    });
    totalWritten += r.written || 0;
    totalSkipped += r.skipped || 0;
    results.push(r);
  }

  logHeader("요약");
  log(`대상 소스맵: ${mapTargets.length}개`);
  log(`복원 파일:   ${totalWritten}개`, totalWritten > 0 ? "green" : "red");
  log(`스킵 파일:   ${totalSkipped}개`);
  log(`출력 폴더:   ${outDir}`);

  // 상위 디렉토리 목록 샘플 보여주기
  try {
    const tree = {};
    for (const r of results) {
      // nothing to aggregate here; optional enhancement
    }
    const children = await fsp.readdir(outDir, { withFileTypes: true });
    const sampleDirs = children
      .filter((d) => d.isDirectory())
      .slice(0, 10)
      .map((d) => d.name);
    if (sampleDirs.length) {
      log(
        `\n샘플 상위 디렉토리(최대 10개):\n  - ${sampleDirs.join("\n  - ")}`,
        "dim",
      );
    }
  } catch {
    // ignore
  }

  if (totalWritten === 0) {
    log("\n⚠️ 복원된 파일이 없습니다.", "yellow");
    log("   원인 후보:");
    log(
      "   - 이 빌드는 sourcesContent가 포함되지 않은 설정(예: sourcemap 옵션 OFF)으로 생성됨",
      "dim",
    );
    log(
      "   - 지정한 .map 파일이 런타임 번들만 포함하고 원본 소스는 포함하지 않음",
      "dim",
    );
    log("   - --map 경로가 잘못되었거나 권한 문제", "dim");
    process.exit(4);
  }

  log("\n✅ 완료", "green");
  process.exit(0);
}

// 엔트리 포인트
main().catch((e) => {
  log(`\n❌ 예상치 못한 오류: ${e?.message || e}`, "red");
  process.exit(1);
});
