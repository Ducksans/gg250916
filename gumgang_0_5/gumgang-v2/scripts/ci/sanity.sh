#!/bin/bash
# CI Sanity Check - Local validation without network dependencies
# Usage: bash scripts/ci/sanity.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}🔧 Gumgang 2.0 - CI Sanity Check${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

TOTAL_ERRORS=0
CHECKS_PASSED=0
CHECKS_FAILED=0

# Function to run a check
run_check() {
  local NAME=$1
  local CMD=$2

  echo -e "${CYAN}▶ $NAME${NC}"

  if eval "$CMD"; then
    echo -e "${GREEN}  ✅ Passed${NC}"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
    return 0
  else
    echo -e "${RED}  ❌ Failed${NC}"
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
    TOTAL_ERRORS=$((TOTAL_ERRORS + 1))
    return 1
  fi
}

# 1. TypeScript Type Check
echo "1️⃣ TypeScript Type Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━"

if command -v npx &> /dev/null; then
  npx tsc -p tsconfig.json --noEmit 2> .tsc.out || true
  TSC_ERRORS=$(grep -cE 'error TS[0-9]+' .tsc.out 2>/dev/null || echo 0)

  if [ "$TSC_ERRORS" -eq 0 ]; then
    echo -e "${GREEN}✅ No TypeScript errors found${NC}"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
  else
    echo -e "${RED}❌ Found $TSC_ERRORS TypeScript errors${NC}"
    echo "   First 5 errors:"
    grep -E 'error TS[0-9]+' .tsc.out | head -5 | sed 's/^/   /'
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
    TOTAL_ERRORS=$((TOTAL_ERRORS + TSC_ERRORS))
  fi
else
  echo -e "${YELLOW}⚠️  TypeScript not available, skipping type check${NC}"
fi

echo ""

# 2. Guard Scan - Check for forbidden patterns
echo "2️⃣ TypeScript Guard Scan"
echo "━━━━━━━━━━━━━━━━━━━━━━━━"

GUARD_VIOLATIONS=0

# Check for 'as any'
echo -n "   Checking for 'as any'... "
AS_ANY_COUNT=$(grep -r "as any" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . 2>/dev/null | grep -v node_modules | grep -v "scripts/" | wc -l || echo 0)
if [ "$AS_ANY_COUNT" -eq 0 ]; then
  echo -e "${GREEN}✓${NC}"
else
  echo -e "${RED}✗ Found $AS_ANY_COUNT instances${NC}"
  GUARD_VIOLATIONS=$((GUARD_VIOLATIONS + AS_ANY_COUNT))
fi

# Check for '@ts-ignore'
echo -n "   Checking for '@ts-ignore'... "
TS_IGNORE_COUNT=$(grep -r "@ts-ignore" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . 2>/dev/null | grep -v node_modules | grep -v "scripts/" | wc -l || echo 0)
if [ "$TS_IGNORE_COUNT" -eq 0 ]; then
  echo -e "${GREEN}✓${NC}"
else
  echo -e "${RED}✗ Found $TS_IGNORE_COUNT instances${NC}"
  GUARD_VIOLATIONS=$((GUARD_VIOLATIONS + TS_IGNORE_COUNT))
fi

# Check for '@ts-expect-error' without reason
echo -n "   Checking for '@ts-expect-error' without reason... "
TS_EXPECT_NO_REASON=$(grep -r "@ts-expect-error" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . 2>/dev/null | grep -v node_modules | grep -v "scripts/" | grep -v "@ts-expect-error:" | wc -l || echo 0)
if [ "$TS_EXPECT_NO_REASON" -eq 0 ]; then
  echo -e "${GREEN}✓${NC}"
else
  echo -e "${YELLOW}⚠️  Found $TS_EXPECT_NO_REASON instances without reason${NC}"
  GUARD_VIOLATIONS=$((GUARD_VIOLATIONS + TS_EXPECT_NO_REASON))
fi

if [ "$GUARD_VIOLATIONS" -eq 0 ]; then
  echo -e "${GREEN}✅ All guard checks passed${NC}"
  CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
  echo -e "${RED}❌ Found $GUARD_VIOLATIONS guard violations${NC}"
  CHECKS_FAILED=$((CHECKS_FAILED + 1))
  TOTAL_ERRORS=$((TOTAL_ERRORS + GUARD_VIOLATIONS))
fi

echo ""

# 3. Performance Markers Check
echo "3️⃣ Performance Markers Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━"

MARKER_VIOLATIONS=0
REQUIRED_MARKERS=("boot" "editorReady" "firstRender")

if [ -f "scripts/perf/dev_probe.ts" ]; then
  echo -n "   Checking for required markers... "

  MISSING_MARKERS=""
  for MARKER in "${REQUIRED_MARKERS[@]}"; do
    if ! grep -q "\"$MARKER\"" scripts/perf/dev_probe.ts && ! grep -q "'$MARKER'" scripts/perf/dev_probe.ts; then
      MISSING_MARKERS="$MISSING_MARKERS $MARKER"
      MARKER_VIOLATIONS=$((MARKER_VIOLATIONS + 1))
    fi
  done

  if [ "$MARKER_VIOLATIONS" -eq 0 ]; then
    echo -e "${GREEN}✓ All required markers present${NC}"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
  else
    echo -e "${RED}✗ Missing markers:$MISSING_MARKERS${NC}"
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
    TOTAL_ERRORS=$((TOTAL_ERRORS + MARKER_VIOLATIONS))
  fi
else
  echo -e "${RED}❌ Performance probe not found at scripts/perf/dev_probe.ts${NC}"
  CHECKS_FAILED=$((CHECKS_FAILED + 1))
  TOTAL_ERRORS=$((TOTAL_ERRORS + 1))
fi

echo ""

# 4. Bundle Size Analysis
echo "4️⃣ Bundle Size Analysis"
echo "━━━━━━━━━━━━━━━━━━━━━━━"

# Find output directory
OUTPUT_DIR=""
for DIR in dist .next build out; do
  if [ -d "$DIR" ]; then
    OUTPUT_DIR="$DIR"
    break
  fi
done

if [ -n "$OUTPUT_DIR" ]; then
  echo "   Found build output in: $OUTPUT_DIR"

  # Count files and calculate total size
  FILE_COUNT=$(find "$OUTPUT_DIR" -type f | wc -l)
  TOTAL_SIZE=$(du -sb "$OUTPUT_DIR" 2>/dev/null | cut -f1)
  TOTAL_SIZE_MB=$((TOTAL_SIZE / 1048576))

  echo "   Total files: $FILE_COUNT"
  echo "   Total size: ${TOTAL_SIZE_MB}MB"

  # Check for large files
  LARGE_FILES=$(find "$OUTPUT_DIR" -type f -size +500k 2>/dev/null | wc -l)
  if [ "$LARGE_FILES" -gt 0 ]; then
    echo -e "${YELLOW}   ⚠️  Found $LARGE_FILES files larger than 500KB${NC}"
  fi

  # Generate detailed report if script exists
  if [ -f "scripts/bundle/report.js" ]; then
    echo "   Generating detailed bundle report..."
    node scripts/bundle/report.js "$OUTPUT_DIR" > docs/reports/S4_bundle.md 2>/dev/null || true
    if [ -f "docs/reports/S4_bundle.md" ]; then
      echo -e "${GREEN}   ✅ Bundle report saved to docs/reports/S4_bundle.md${NC}"
    fi
  fi

  CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
  echo -e "${YELLOW}⚠️  No build output found (looked for: dist, .next, build, out)${NC}"
  echo "   Run your build command first to analyze bundle size"
fi

echo ""

# 5. File Count Check
echo "5️⃣ Project Statistics"
echo "━━━━━━━━━━━━━━━━━━━━━━"

TS_FILES=$(find . -name "*.ts" -o -name "*.tsx" 2>/dev/null | grep -v node_modules | wc -l)
JS_FILES=$(find . -name "*.js" -o -name "*.jsx" 2>/dev/null | grep -v node_modules | wc -l)
COMPONENT_FILES=$(find components -name "*.tsx" 2>/dev/null | wc -l || echo 0)
SERVICE_FILES=$(find services -name "*.ts" 2>/dev/null | wc -l || echo 0)

echo "   TypeScript files: $TS_FILES"
echo "   JavaScript files: $JS_FILES"
echo "   Components: $COMPONENT_FILES"
echo "   Services: $SERVICE_FILES"

echo ""

# 6. Dependencies Check
echo "6️⃣ Dependencies Check"
echo "━━━━━━━━━━━━━━━━━━━━━"

if [ -f "package.json" ]; then
  PROD_DEPS=$(grep -c '"' package.json | grep -A 1000 '"dependencies"' | grep -c '"' || echo 0)
  DEV_DEPS=$(grep -c '"' package.json | grep -A 1000 '"devDependencies"' | grep -c '"' || echo 0)

  echo "   Production dependencies: ~$((PROD_DEPS / 2))"
  echo "   Dev dependencies: ~$((DEV_DEPS / 2))"

  # Check for security advisories marker files (if any exist)
  if [ -f ".npm-audit-report" ] || [ -f ".yarn-audit-report" ]; then
    echo -e "${YELLOW}   ⚠️  Security audit report found - review recommended${NC}"
  fi
fi

echo ""

# Final Summary
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}📊 Summary${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ "$TOTAL_ERRORS" -eq 0 ]; then
  echo -e "${GREEN}✅ All checks passed! ($CHECKS_PASSED passed, $CHECKS_FAILED failed)${NC}"
  echo ""
  echo -e "${GREEN}🎉 Project is in good shape!${NC}"
  EXIT_CODE=0
else
  echo -e "${RED}❌ Issues found: $TOTAL_ERRORS total${NC}"
  echo "   Checks passed: $CHECKS_PASSED"
  echo "   Checks failed: $CHECKS_FAILED"
  echo ""
  echo "📝 Recommendations:"

  if [ "$TSC_ERRORS" -gt 0 ]; then
    echo "   • Fix TypeScript errors: npx tsc --noEmit"
  fi

  if [ "$GUARD_VIOLATIONS" -gt 0 ]; then
    echo "   • Remove 'as any' and '@ts-ignore' patterns"
    echo "   • Add reasons to '@ts-expect-error' directives"
  fi

  if [ "$LARGE_FILES" -gt 0 ]; then
    echo "   • Consider code splitting for large bundle files"
  fi

  if [ "$MARKER_VIOLATIONS" -gt 0 ]; then
    echo "   • Add missing performance markers to dev_probe.ts"
  fi

  EXIT_CODE=1
fi

echo ""
echo "Run this check regularly with: npm run ci:sanity"
echo ""

# Cleanup
rm -f .tsc.out 2>/dev/null || true

exit $EXIT_CODE
