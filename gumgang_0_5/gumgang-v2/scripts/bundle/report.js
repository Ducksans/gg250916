#!/usr/bin/env node
// Bundle Size Report Generator
// Usage: node scripts/bundle/report.js <output-dir>
// No external dependencies

const fs = require("fs");
const path = require("path");

function getAllFiles(dirPath, files = []) {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // Skip node_modules and hidden directories
        if (!entry.name.startsWith(".") && entry.name !== "node_modules") {
          getAllFiles(fullPath, files);
        }
      } else if (entry.isFile()) {
        const stats = fs.statSync(fullPath);
        files.push({
          path: fullPath,
          size: stats.size,
          relativePath: path.relative(process.cwd(), fullPath),
        });
      }
    }
  } catch (err) {
    console.error(`Error reading ${dirPath}:`, err.message);
  }

  return files;
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(2) + " " + sizes[i];
}

function loadBudget() {
  const budgetPath = path.join(__dirname, "budget.json");
  if (fs.existsSync(budgetPath)) {
    try {
      return JSON.parse(fs.readFileSync(budgetPath, "utf-8"));
    } catch (err) {
      console.error("Warning: Failed to load budget.json:", err.message);
    }
  }
  return null;
}

function generateReport(outputDir) {
  if (!fs.existsSync(outputDir)) {
    console.error(`Directory ${outputDir} does not exist`);
    process.exit(1);
  }

  console.error(`Analyzing ${outputDir}...`);

  const budget = loadBudget();
  const violations = [];
  const warnings = [];

  const files = getAllFiles(outputDir);

  if (files.length === 0) {
    console.log("# Bundle Size Report\n\nNo files found in " + outputDir);
    return;
  }

  // Sort by size descending
  files.sort((a, b) => b.size - a.size);

  // Calculate totals
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const top20 = files.slice(0, 20);
  const top20Size = top20.reduce((sum, file) => sum + file.size, 0);

  // Check budget violations
  if (budget) {
    // Total size check
    if (budget.budgets.total) {
      if (totalSize > budget.budgets.total.max) {
        violations.push(
          `Total size (${formatBytes(totalSize)}) exceeds budget (${formatBytes(budget.budgets.total.max)})`,
        );
      } else if (totalSize > budget.budgets.total.warning) {
        warnings.push(
          `Total size (${formatBytes(totalSize)}) approaches budget limit (${formatBytes(budget.budgets.total.max)})`,
        );
      }
    }

    // Single file checks
    if (budget.budgets.singleFile) {
      files.forEach((file) => {
        if (file.size > budget.budgets.singleFile.max) {
          violations.push(
            `${file.relativePath} (${formatBytes(file.size)}) exceeds single file budget (${formatBytes(budget.budgets.singleFile.max)})`,
          );
        }
      });
    }

    // File type budget checks
    const jsFiles = files.filter((f) =>
      [".js", ".mjs", ".cjs"].includes(path.extname(f.path)),
    );
    const cssFiles = files.filter((f) =>
      [".css"].includes(path.extname(f.path)),
    );

    if (budget.budgets.javascript && jsFiles.length > 0) {
      const jsTotal = jsFiles.reduce((sum, f) => sum + f.size, 0);
      if (jsTotal > budget.budgets.javascript.max) {
        violations.push(
          `JavaScript total (${formatBytes(jsTotal)}) exceeds budget (${formatBytes(budget.budgets.javascript.max)})`,
        );
      }
    }

    if (budget.budgets.css && cssFiles.length > 0) {
      const cssTotal = cssFiles.reduce((sum, f) => sum + f.size, 0);
      if (cssTotal > budget.budgets.css.max) {
        violations.push(
          `CSS total (${formatBytes(cssTotal)}) exceeds budget (${formatBytes(budget.budgets.css.max)})`,
        );
      }
    }
  }

  // Group by extension
  const byExtension = {};
  files.forEach((file) => {
    const ext = path.extname(file.path) || "no-ext";
    if (!byExtension[ext]) {
      byExtension[ext] = { count: 0, size: 0 };
    }
    byExtension[ext].count++;
    byExtension[ext].size += file.size;
  });

  // Sort extensions by total size
  const extensions = Object.entries(byExtension)
    .map(([ext, data]) => ({ ext, ...data }))
    .sort((a, b) => b.size - a.size)
    .slice(0, 10);

  // Generate markdown report
  console.log("# Bundle Size Report");
  console.log(`\n> Generated: ${new Date().toISOString()}`);
  console.log(`> Directory: ${outputDir}`);
  console.log(`> Total Files: ${files.length}`);
  console.log(`> Total Size: ${formatBytes(totalSize)}`);

  // Display budget status
  if (budget) {
    console.log(
      `> Budget Check: ${violations.length > 0 ? "❌ FAILED" : "✅ PASSED"}`,
    );
    if (violations.length > 0) {
      console.log(`> Violations: ${violations.length}`);
    }
    if (warnings.length > 0) {
      console.log(`> Warnings: ${warnings.length}`);
    }
  }

  console.log("\n## Summary Statistics\n");
  console.log("| Metric | Value |");
  console.log("|--------|-------|");
  console.log(`| Total Files | ${files.length} |`);
  console.log(`| Total Size | ${formatBytes(totalSize)} |`);
  console.log(
    `| Average File Size | ${formatBytes(totalSize / files.length)} |`,
  );
  console.log(`| Largest File | ${formatBytes(files[0]?.size || 0)} |`);
  console.log(
    `| Top 20 Combined | ${formatBytes(top20Size)} (${((top20Size / totalSize) * 100).toFixed(1)}%) |`,
  );

  console.log("\n## Top 20 Largest Files\n");
  console.log("| # | File | Size | % of Total |");
  console.log("|---|------|------|------------|");

  top20.forEach((file, index) => {
    const percent = ((file.size / totalSize) * 100).toFixed(2);
    const shortPath =
      file.relativePath.length > 60
        ? "..." + file.relativePath.slice(-57)
        : file.relativePath;
    console.log(
      `| ${index + 1} | \`${shortPath}\` | ${formatBytes(file.size)} | ${percent}% |`,
    );
  });

  console.log("\n## Size by File Type\n");
  console.log("| Extension | Count | Total Size | % of Total |");
  console.log("|-----------|-------|------------|------------|");

  extensions.forEach(({ ext, count, size }) => {
    const percent = ((size / totalSize) * 100).toFixed(2);
    console.log(`| ${ext} | ${count} | ${formatBytes(size)} | ${percent}% |`);
  });

  // Recommendations
  console.log("\n## Recommendations\n");

  const jsFiles = files.filter((f) =>
    [".js", ".mjs", ".cjs"].includes(path.extname(f.path)),
  );
  const cssFiles = files.filter((f) => [".css"].includes(path.extname(f.path)));
  const largeFiles = files.filter((f) => f.size > 500 * 1024); // > 500KB

  if (largeFiles.length > 0) {
    console.log(
      `- ⚠️ ${largeFiles.length} files exceed 500KB. Consider code splitting or lazy loading.`,
    );
  }

  if (jsFiles.length > 0) {
    const jsTotal = jsFiles.reduce((sum, f) => sum + f.size, 0);
    console.log(
      `- 📦 JavaScript: ${formatBytes(jsTotal)} across ${jsFiles.length} files`,
    );
    if (jsTotal > 1024 * 1024) {
      console.log("  - Consider enabling tree-shaking and minification");
    }
  }

  if (cssFiles.length > 0) {
    const cssTotal = cssFiles.reduce((sum, f) => sum + f.size, 0);
    console.log(
      `- 🎨 CSS: ${formatBytes(cssTotal)} across ${cssFiles.length} files`,
    );
    if (cssTotal > 200 * 1024) {
      console.log("  - Consider using CSS purging to remove unused styles");
    }
  }

  // Find potential duplicates (files with same size)
  const sizeGroups = {};
  files.forEach((file) => {
    if (file.size > 1024) {
      // Only check files > 1KB
      if (!sizeGroups[file.size]) {
        sizeGroups[file.size] = [];
      }
      sizeGroups[file.size].push(file);
    }
  });

  const duplicates = Object.values(sizeGroups).filter(
    (group) => group.length > 1,
  );
  if (duplicates.length > 0) {
    console.log(
      `- 🔍 ${duplicates.length} potential duplicate file groups detected (same size)`,
    );
  }

  // Budget violations section
  if (violations.length > 0) {
    console.log("\n## ❌ Budget Violations\n");
    violations.forEach((v) => console.log(`- ${v}`));
  }

  if (warnings.length > 0) {
    console.log("\n## ⚠️ Budget Warnings\n");
    warnings.forEach((w) => console.log(`- ${w}`));
  }

  console.log("\n---\n");
  console.log("*Bundle analysis complete*");

  // Exit with error if budget violations
  if (
    budget &&
    budget.thresholds &&
    budget.thresholds.failOnViolation &&
    violations.length > 0
  ) {
    console.error(
      `\n❌ Exiting with error: ${violations.length} budget violation(s) found`,
    );
    process.exit(1);
  }
}

// Main
const outputDir = process.argv[2];

if (!outputDir) {
  // Try to auto-detect
  const candidates = ["dist", ".next", "build", "out"];
  const found = candidates.find((dir) => fs.existsSync(dir));

  if (found) {
    console.error(`Auto-detected output directory: ${found}`);
    generateReport(found);
  } else {
    console.error("Usage: node scripts/bundle/report.js <output-dir>");
    console.error(
      "Or ensure one of these directories exists: dist, .next, build, out",
    );
    process.exit(1);
  }
} else {
  generateReport(outputDir);
}
