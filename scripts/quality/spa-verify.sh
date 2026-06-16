#!/usr/bin/env bash
# E1 Ponytail Verify — SPA + nav checks (automated substitute for manual test)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=config.sh
source "$SCRIPT_DIR/config.sh"

BASE="$QUALITY_BASE_URL"
API="$QUALITY_API_URL"
PASS="${QUALITY_DEV_PASSWORD:-donutit-dev}"

pass=0
fail=0

record() {
  local ok="$1" name="$2" detail="$3"
  if [[ "$ok" == "1" ]]; then
    echo "PASS  $name — $detail"
    ((pass++)) || true
  else
    echo "FAIL  $name — $detail"
    ((fail++)) || true
  fi
}

echo "# SPA Verify — E1 Ponytail (V1)"
echo "Base: $BASE"
echo ""

# 1. DonutiT routes serve real module pages (not SPA fallback shell only)
routes=(/dashboard /pos /inventory /pawn /messenger /cashflow-ledger /customers /hr /settings)
for route in "${routes[@]}"; do
  body=$(curl -s --connect-timeout "$QUALITY_TIMEOUT" "${BASE}${route}" 2>/dev/null || echo "")
  if echo "$body" | grep -q 'data-donutit-module='; then
    record 1 "route $route" "data-donutit-module present"
  else
    record 0 "route $route" "missing data-donutit-module"
  fi
done

# 2. No inline module scripts on DonutiT pages
inline=$(grep -rc 'script type="module"' src/pages/donutit --include='*.html' 2>/dev/null | awk -F: '{s+=$2} END {print s+0}' || true)
inline=${inline:-0}
if [[ "$inline" == "0" ]]; then
  record 1 "no inline scripts" "0 inline module scripts in donutit pages"
else
  record 0 "no inline scripts" "${inline} inline scripts remain"
fi

# 3. Sidebar JSON — DONUTIT block + all module hrefs
grep -q '"label": "DONUTIT"' src/data/sidebar.json && record 1 "sidebar DONUTIT block" "label present" \
  || record 0 "sidebar DONUTIT block" "missing"
for href in /pos /inventory /pawn /messenger /cashflow-ledger /customers /hr /settings; do
  grep -q "\"href\": \"${href}\"" src/data/sidebar.json && record 1 "sidebar $href" "linked" \
    || record 0 "sidebar $href" "missing"
done

# 4. Rebrand in start.html
grep -q 'DonutiT' src/components/layout/start.html && record 1 "header rebrand" "DonutiT in start.html" \
  || record 0 "header rebrand" "Cleopatra only"

# 5. Registry covers 9 modules
mods=$(grep -c 'data-donutit-module=' src/js/donutit-init.js || echo 0)
[[ "$mods" -ge 9 ]] && record 1 "donutit-init registry" "$mods modules" \
  || record 0 "donutit-init registry" "expected 9+, got $mods"

# 6. Login + cookie session (settings flow prerequisite)
jar=$(mktemp)
trap 'rm -f "$jar"' EXIT
code=$(curl -s -o /dev/null -w "%{http_code}" -c "$jar" -X POST "$API/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"owner@donutit.local\",\"password\":\"$PASS\"}")
[[ "$code" == "200" ]] && record 1 "login API" "HTTP 200" || record 0 "login API" "HTTP $code"

me=$(curl -s -o /dev/null -w "%{http_code}" -b "$jar" "$API/api/auth/me")
[[ "$me" == "200" ]] && record 1 "session cookie" "/api/auth/me → 200" || record 0 "session cookie" "HTTP $me"

# 7. SPA navigate simulation — sequential fetches (module markers persist)
nav_ok=1
for route in /pos /inventory /pos; do
  body=$(curl -s "${BASE}${route}")
  echo "$body" | grep -q 'data-donutit-module=' || nav_ok=0
done
[[ "$nav_ok" == "1" ]] && record 1 "SPA nav simulation" "POS → Inventory → POS markers OK" \
  || record 0 "SPA nav simulation" "module marker missing after nav"

echo ""
echo "Summary: ${pass} pass, ${fail} fail"
exit $([[ $fail -eq 0 ]] && echo 0 || echo 1)
