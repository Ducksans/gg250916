#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE_URL:-http://127.0.0.1:8000}"

echo "[SD] Breadcrumbs JSON-LD smoke test..."
BR=$(curl -sG "$BASE/api/v2/content/jsonld/breadcrumbs" \
  --data-urlencode 'region_name=서울특별시' \
  --data-urlencode 'region_slug=seoul' \
  --data-urlencode 'category_name=매물' \
  --data-urlencode 'category_slug=listings' \
  --data-urlencode 'title=역삼동 아파트 매물' \
  --data-urlencode 'canonical=https://hub.example.com/listings/yeoksam-apt-123')
echo "$BR" | jq -e '."@type"=="BreadcrumbList" and (.itemListElement|type)=="array"' >/dev/null \
  && echo "[OK] Breadcrumbs JSON-LD shape valid" \
  || { echo "[FAIL] Invalid Breadcrumbs JSON-LD" >&2; exit 1; }

echo "[SD] Sitemap Areas XML smoke test..."
SM=$(curl -sG "$BASE/api/v2/content/sitemap/areas" --data-urlencode 'areas=seoul/junggu,seoul/jongno')
echo "$SM" | grep -q "<urlset" && echo "$SM" | grep -q "<loc>" \
  && echo "[OK] Sitemap XML shape valid" \
  || { echo "[FAIL] Invalid Sitemap XML" >&2; exit 1; }

echo "All structured data smoke tests passed."

# Extra checks (Article, LocalBusiness, Sitemap index)
echo "[SD] Article JSON-LD smoke test..."
AR=$(curl -sG "$BASE/api/v2/content/jsonld/article" --data-urlencode 'headline=테스트 기사')
echo "$AR" | jq -e '."@type"=="Article" and (.headline|type)=="string"' >/dev/null \
  && echo "[OK] Article JSON-LD shape valid" \
  || { echo "[FAIL] Invalid Article JSON-LD" >&2; exit 1; }

echo "[SD] LocalBusiness JSON-LD smoke test..."
LB=$(curl -sG "$BASE/api/v2/content/jsonld/localbusiness" --data-urlencode 'name=테스트 상호')
echo "$LB" | jq -e '."@type"=="LocalBusiness" and (.name|type)=="string"' >/dev/null \
  && echo "[OK] LocalBusiness JSON-LD shape valid" \
  || { echo "[FAIL] Invalid LocalBusiness JSON-LD" >&2; exit 1; }

echo "[SD] Sitemap index XML smoke test..."
SI=$(curl -sG "$BASE/api/v2/content/sitemap/index" --data-urlencode 'sitemaps=sitemaps/areas.xml,sitemaps/categories.xml')
echo "$SI" | grep -q "<sitemapindex" && echo "$SI" | grep -q "<loc>" \
  && echo "[OK] Sitemap index XML shape valid" \
  || { echo "[FAIL] Invalid sitemap index XML" >&2; exit 1; }
