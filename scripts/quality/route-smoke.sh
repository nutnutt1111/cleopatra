#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=config.sh
source "$SCRIPT_DIR/config.sh"

echo "# Route Smoke — regress-ranger"
echo "Base URL: $QUALITY_BASE_URL"
echo ""

pass=0
fail=0
declare -a failures=()

for route in "${QUALITY_ROUTES[@]}"; do
  url="${QUALITY_BASE_URL}${route}"
  body=$(curl -s --connect-timeout "$QUALITY_TIMEOUT" "$url" 2>/dev/null || echo "")
  code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout "$QUALITY_TIMEOUT" "$url" 2>/dev/null || echo "000")

  # DonutiT business routes must not be Vite SPA fallback (landing page)
  is_business_route=false
  case "$route" in
    /pos|/inventory|/pawn|/messenger|/cashflow-ledger|/customers|/hr) is_business_route=true ;;
  esac

  status="PASS"
  note=""
  if [[ "$code" != "200" ]]; then
    status="FAIL"
    note="http ${code}"
  elif [[ "$is_business_route" == "true" ]] && echo "$body" | grep -q "Build beautiful dashboards"; then
    status="FAIL"
    note="fallback (ยังไม่มีหน้าโมดูลจริง)"
  fi

  if [[ "$status" == "PASS" ]]; then
    echo "PASS  ${route} → ${code}${note:+ ($note)}"
    ((pass++)) || true
  else
    echo "FAIL  ${route} → ${code}${note:+ ($note)}"
    ((fail++)) || true
    failures+=("${route} (${note:-$code})")
  fi
done

echo ""
echo "Summary: ${pass} pass, ${fail} fail"
if [[ $fail -gt 0 ]]; then
  exit 1
fi
