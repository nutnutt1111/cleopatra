#!/usr/bin/env bash
# UX patrol — DonutiT staff-facing modules
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
# shellcheck source=config.sh
source "$SCRIPT_DIR/config.sh"

pass=0
fail=0
nits=0

check_file() {
  local name="$1" file="$2"
  if [[ ! -f "$ROOT/$file" ]]; then
    echo "FAIL  $name — missing $file"
    ((fail++)) || true
    return
  fi
  local content
  content=$(cat "$ROOT/$file")

  # Thai labels (Unicode range U+0E00–U+0E7F)
  if python3 -c "import re,sys; sys.exit(0 if re.search(r'[\u0E00-\u0E7F]', open('$ROOT/$file', encoding='utf-8').read()) else 1)" 2>/dev/null; then
    echo "PASS  $name — Thai labels"
    ((pass++)) || true
  else
    echo "FAIL  $name — no Thai text"
    ((fail++)) || true
  fi

  # Module marker
  if echo "$content" | grep -q 'data-donutit-module='; then
    echo "PASS  $name — data-donutit-module"
    ((pass++)) || true
  else
    echo "FAIL  $name — missing data-donutit-module"
    ((fail++)) || true
  fi

  # Responsive layout (tablet-friendly grid)
  if echo "$content" | grep -qE 'grid-cols|xl:grid-cols|lg:grid-cols'; then
    echo "PASS  $name — responsive grid"
    ((pass++)) || true
  else
    echo "NIT   $name — no responsive grid classes"
    ((nits++)) || true
  fi
}

check_js_confirm() {
  local name="$1" file="$2"
  if [[ ! -f "$ROOT/$file" ]]; then
    echo "FAIL  $name JS — missing"
    ((fail++)) || true
    return
  fi
  local content
  content=$(cat "$ROOT/$file")
  if echo "$content" | grep -qE 'confirm\(|prompt\('; then
    echo "PASS  $name — destructive confirmation"
    ((pass++)) || true
  else
    echo "NIT   $name — no confirm/prompt (may be OK)"
    ((nits++)) || true
  fi
}

echo "# UX Patrol — DonutiT modules"
echo "Base URL: $QUALITY_BASE_URL"
echo ""

modules=(
  "POS|src/pages/donutit/pos.html|src/components/widgets/donutit/pos.js"
  "Inventory|src/pages/donutit/inventory.html|src/components/widgets/donutit/inventory.js"
  "Pawn|src/pages/donutit/pawn.html|src/components/widgets/donutit/pawn.js"
  "Messenger|src/pages/donutit/messenger.html|src/components/widgets/donutit/messenger.js"
  "Cashflow|src/pages/donutit/cashflow-ledger.html|src/components/widgets/donutit/cashflow-ledger.js"
  "Customers|src/pages/donutit/customers.html|src/components/widgets/donutit/customers.js"
  "HR|src/pages/donutit/hr.html|src/components/widgets/donutit/hr.js"
  "Settings|src/pages/donutit/settings.html|src/components/widgets/donutit/donutit-api.js"
)

for entry in "${modules[@]}"; do
  IFS='|' read -r name html js <<< "$entry"
  echo "### $name"
  check_file "$name HTML" "$html"
  check_js_confirm "$name" "$js"
  echo ""
done

# Live route check — business pages not SPA fallback
echo "### Live routes"
for route in /pos /inventory /pawn /messenger /cashflow-ledger /customers /hr /settings; do
  body=$(curl -s --connect-timeout "$QUALITY_TIMEOUT" "${QUALITY_BASE_URL}${route}" 2>/dev/null || echo "")
  if echo "$body" | grep -q 'data-donutit-module='; then
    echo "PASS  $route — real module page"
    ((pass++)) || true
  else
    echo "FAIL  $route — not a DonutiT module page"
    ((fail++)) || true
  fi
done

echo ""
echo "Summary: ${pass} pass, ${fail} fail, ${nits} nits"
if [[ $fail -gt 0 ]]; then
  exit 1
fi
