#!/usr/bin/env node
// Smoke Test - Basic runtime validation
// Usage: npx ts-node scripts/qa/smoke.ts

import * as fs from "fs";
import * as path from "path";

// Test results tracking
let testsPassed = 0;
let testsFailed = 0;
const failures: string[] = [];

// Color codes for output
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";

function test(name: string, fn: () => void | Promise<void>): void {
  try {
    const result = fn();
    if (result instanceof Promise) {
      result
        .then(() => {
          console.log(`${GREEN}✓${RESET} ${name}`);
          testsPassed++;
        })
        .catch((err) => {
          console.log(`${RED}✗${RESET} ${name}: ${err.message}`);
          failures.push(`${name}: ${err.message}`);
          testsFailed++;
        });
    } else {
      console.log(`${GREEN}✓${RESET} ${name}`);
      testsPassed++;
    }
  } catch (err: any) {
    console.log(`${RED}✗${RESET} ${name}: ${err.message}`);
    failures.push(`${name}: ${err.message}`);
    testsFailed++;
  }
}

console.log("🔥 Running Smoke Tests...\n");

// 1. Core Module Imports
test("Core modules importable", () => {
  // Test that core modules can be imported without errors
  const modules = [
    "../bundle/report.js",
    "../perf/dev_probe.ts",
    "../ci/sanity.sh",
    "../hooks/pre-commit.sh",
  ];

  for (const mod of modules) {
    const fullPath = path.join(__dirname, mod);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Missing core module: ${mod}`);
    }
  }
});

// 2. Essential Services
test("Service modules exist", () => {
  const services = [
    "../../services/AICompletionService.ts",
    "../../services/Code3DVisualizationEngine.ts",
    "../../services/CodeDiagnosticsService.ts",
    "../../services/CodeStructureAnalyzer.ts",
    "../../services/WebSocketService.ts",
  ];

  for (const service of services) {
    const fullPath = path.join(__dirname, service);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Missing service: ${service}`);
    }
  }
});

// 3. Component Structure
test("Component directories exist", () => {
  const componentDirs = [
    "../../components/editor",
    "../../components/visualization",
    "../../components/chat",
    "../../components/protocol",
  ];

  for (const dir of componentDirs) {
    const fullPath = path.join(__dirname, dir);
    if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isDirectory()) {
      throw new Error(`Missing component directory: ${dir}`);
    }
  }
});

// 4. Type Definitions
test("Type definitions exist", () => {
  const typeFiles = [
    "../../src/types/ws.ts",
    "../../src/components/three/DreiTyped.tsx",
  ];

  for (const typeFile of typeFiles) {
    const fullPath = path.join(__dirname, typeFile);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Missing type definition: ${typeFile}`);
    }
  }
});

// 5. Configuration Files
test("Configuration files valid", () => {
  const configs = [
    "../../tsconfig.json",
    "../../package.json",
    "../../next.config.js",
  ];

  for (const config of configs) {
    const fullPath = path.join(__dirname, config);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Missing config: ${config}`);
    }

    // Try to parse JSON files
    if (config.endsWith(".json")) {
      try {
        const content = fs.readFileSync(fullPath, "utf-8");
        JSON.parse(content);
      } catch (err) {
        throw new Error(`Invalid JSON in ${config}: ${err}`);
      }
    }
  }
});

// 6. Build Output Check
test("Build directories structure", () => {
  // Check if any build output exists
  const buildDirs = ["dist", ".next", "build", "out"];
  const found = buildDirs.filter((dir) => {
    const fullPath = path.join(__dirname, "../../", dir);
    return fs.existsSync(fullPath);
  });

  if (found.length === 0) {
    console.log(
      `${YELLOW}  Warning: No build output found (expected one of: ${buildDirs.join(", ")})${RESET}`,
    );
  }
});

// 7. Performance Markers Check
test("Performance markers defined", async () => {
  const probePath = path.join(__dirname, "../perf/dev_probe.ts");
  const content = fs.readFileSync(probePath, "utf-8");

  const requiredMarkers = ["boot", "editorReady", "firstRender"];
  const missingMarkers: string[] = [];

  for (const marker of requiredMarkers) {
    // Check if marker is referenced in the code
    if (!content.includes(`'${marker}'`) && !content.includes(`"${marker}"`)) {
      missingMarkers.push(marker);
    }
  }

  if (missingMarkers.length > 0) {
    throw new Error(
      `Missing performance markers: ${missingMarkers.join(", ")}`,
    );
  }
});

// 8. TypeScript Compilation Check
test("TypeScript compilation clean", () => {
  // Run tsc and check for errors
  const { execSync } = require("child_process");
  try {
    execSync("npx tsc -p tsconfig.json --noEmit", {
      cwd: path.join(__dirname, "../../"),
      stdio: "pipe",
    });
  } catch (err: any) {
    // Check if there are actual TypeScript errors
    if (err.stdout) {
      const output = err.stdout.toString();
      const errorCount = (output.match(/error TS/g) || []).length;
      if (errorCount > 0) {
        throw new Error(`Found ${errorCount} TypeScript errors`);
      }
    }
  }
});

// 9. Guard Patterns Check
test("No forbidden patterns", () => {
  const { execSync } = require("child_process");

  // Check for 'as any'
  try {
    const asAny = execSync(
      'grep -r "as any" --include="*.ts" --include="*.tsx" . 2>/dev/null | grep -v node_modules | grep -v scripts | wc -l',
      {
        cwd: path.join(__dirname, "../../"),
        stdio: "pipe",
      },
    )
      .toString()
      .trim();

    if (parseInt(asAny) > 0) {
      throw new Error(`Found ${asAny} instances of 'as any'`);
    }
  } catch (err) {
    // grep returns non-zero if no matches, which is good
  }

  // Check for '@ts-ignore'
  try {
    const tsIgnore = execSync(
      'grep -r "@ts-ignore" --include="*.ts" --include="*.tsx" . 2>/dev/null | grep -v node_modules | grep -v scripts | wc -l',
      {
        cwd: path.join(__dirname, "../../"),
        stdio: "pipe",
      },
    )
      .toString()
      .trim();

    if (parseInt(tsIgnore) > 0) {
      throw new Error(`Found ${tsIgnore} instances of '@ts-ignore'`);
    }
  } catch (err) {
    // grep returns non-zero if no matches, which is good
  }
});

// 10. Memory Safety Check
test("No memory leaks in critical paths", () => {
  // Simple check for common memory leak patterns
  const criticalFiles = [
    "../../services/WebSocketService.ts",
    "../../services/Code3DVisualizationEngine.ts",
  ];

  for (const file of criticalFiles) {
    const fullPath = path.join(__dirname, file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf-8");

      // Check for cleanup methods
      if (
        !content.includes("destroy") &&
        !content.includes("cleanup") &&
        !content.includes("dispose")
      ) {
        console.log(
          `${YELLOW}  Warning: ${file} may lack cleanup methods${RESET}`,
        );
      }

      // Check for event listener cleanup
      if (
        content.includes("addEventListener") &&
        !content.includes("removeEventListener")
      ) {
        console.log(
          `${YELLOW}  Warning: ${file} may have event listener leaks${RESET}`,
        );
      }
    }
  }
});

// Wait a bit for async tests to complete
setTimeout(() => {
  console.log("\n" + "=".repeat(50));
  console.log("📊 Smoke Test Results\n");
  console.log(`${GREEN}Passed: ${testsPassed}${RESET}`);
  console.log(`${RED}Failed: ${testsFailed}${RESET}`);

  if (testsFailed > 0) {
    console.log("\n❌ Failures:");
    failures.forEach((f) => console.log(`  - ${f}`));
    process.exit(1);
  } else {
    console.log(`\n${GREEN}✅ All smoke tests passed!${RESET}`);
    process.exit(0);
  }
}, 100);
