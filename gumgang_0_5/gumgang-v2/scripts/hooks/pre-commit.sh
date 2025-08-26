#!/bin/bash
# Pre-commit hook to enforce TypeScript strict mode guardrails
# Blocks: as any, @ts-ignore, @ts-expect-error without reason

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Running TypeScript guardrail checks..."

# Get list of staged TypeScript/JavaScript files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx|js|jsx)$' || true)

if [ -z "$STAGED_FILES" ]; then
  echo "✅ No TypeScript/JavaScript files to check"
  exit 0
fi

VIOLATIONS=0
VIOLATION_FILES=""

# Check each staged file
for FILE in $STAGED_FILES; do
  if [ ! -f "$FILE" ]; then
    continue
  fi

  # Check for 'as any'
  if grep -n "as any" "$FILE" 2>/dev/null | grep -v "// *@ts-expect-error:" > /dev/null; then
    echo -e "${RED}❌ Found 'as any' in $FILE${NC}"
    grep -n "as any" "$FILE" | head -3
    VIOLATIONS=$((VIOLATIONS + 1))
    VIOLATION_FILES="$VIOLATION_FILES\n  - $FILE (as any)"
  fi

  # Check for '@ts-ignore'
  if grep -n "@ts-ignore" "$FILE" 2>/dev/null > /dev/null; then
    echo -e "${RED}❌ Found '@ts-ignore' in $FILE${NC}"
    grep -n "@ts-ignore" "$FILE" | head -3
    VIOLATIONS=$((VIOLATIONS + 1))
    VIOLATION_FILES="$VIOLATION_FILES\n  - $FILE (@ts-ignore)"
  fi

  # Check for '@ts-expect-error' without reason (colon)
  if grep -n "@ts-expect-error\s*$\|@ts-expect-error\s*[^:]" "$FILE" 2>/dev/null > /dev/null; then
    echo -e "${YELLOW}⚠️  Found '@ts-expect-error' without reason in $FILE${NC}"
    grep -n "@ts-expect-error" "$FILE" | grep -v "@ts-expect-error:" | head -3
    VIOLATIONS=$((VIOLATIONS + 1))
    VIOLATION_FILES="$VIOLATION_FILES\n  - $FILE (@ts-expect-error without reason)"
  fi
done

# Summary
echo ""
if [ $VIOLATIONS -gt 0 ]; then
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${RED}✘ TypeScript guardrail check failed!${NC}"
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo "Found $VIOLATIONS violation(s) in:"
  echo -e "$VIOLATION_FILES"
  echo ""
  echo "📝 How to fix:"
  echo "  • Remove 'as any' - use proper types or unknown"
  echo "  • Remove '@ts-ignore' - fix the actual type issue"
  echo "  • Add reason to '@ts-expect-error' - use '@ts-expect-error: <reason>'"
  echo ""
  echo "To bypass (not recommended):"
  echo "  git commit --no-verify"
  echo ""
  exit 1
else
  echo -e "${GREEN}✅ All TypeScript guardrail checks passed!${NC}"
fi

# Additional check: warn about large files
LARGE_FILES=$(git diff --cached --name-only --diff-filter=ACM | while read FILE; do
  if [ -f "$FILE" ]; then
    SIZE=$(wc -c < "$FILE")
    if [ $SIZE -gt 524288 ]; then # 512KB
      echo "$FILE"
    fi
  fi
done)

if [ ! -z "$LARGE_FILES" ]; then
  echo ""
  echo -e "${YELLOW}⚠️  Warning: Large files detected (>512KB):${NC}"
  echo "$LARGE_FILES"
  echo "Consider using Git LFS for large files"
fi

exit 0
