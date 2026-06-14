#!/usr/bin/env bash
# seed-smith coverage verification
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=config.sh
source "$SCRIPT_DIR/config.sh"

API="$QUALITY_API_URL"
PASS="${QUALITY_DEV_PASSWORD:-donutit-dev}"
COOKIE_JAR=$(mktemp)
trap 'rm -f "$COOKIE_JAR"' EXIT

pass=0
fail=0

login() {
  curl -s -c "$COOKIE_JAR" -X POST "$API/api/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"owner@donutit.local\",\"password\":\"$PASS\"}" > /dev/null
}

check_min() {
  local name="$1" expr="$2" body="$3"
  if echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin); sys.exit(0 if ($expr) else 1)" 2>/dev/null; then
    echo "PASS  $name"
    ((pass++)) || true
  else
    echo "FAIL  $name"
    ((fail++)) || true
  fi
}

echo "# Seed Verify — seed-smith"
echo "API: $API"
echo ""

login
if [[ ! -s "$COOKIE_JAR" ]]; then
  echo "FAIL  login — run yarn db:seed and yarn dev:api first"
  exit 1
fi

pos=$(curl -s -b "$COOKIE_JAR" "$API/api/pos/bills")
check_min "POS bills seeded" "len(d.get('bills',[]))>=1" "$pos"
check_min "POS split payment" "any(len(b.get('payments',[]))>=2 for b in d.get('bills',[]))" "$pos"

inv=$(curl -s -b "$COOKIE_JAR" "$API/api/inventory/products")
check_min "serialized product" "any(p.get('trackingType')=='SERIALIZED' for p in d.get('products',[]))" "$inv"
check_min "quantity product" "any(p.get('trackingType')=='QUANTITY' for p in d.get('products',[]))" "$inv"

pawn=$(curl -s -b "$COOKIE_JAR" "$API/api/pawn/tickets")
check_min "pawn ticket" "len(d.get('tickets',[]))>=1" "$pawn"
check_min "pawn interest payment" "any(len(t.get('payments',[]))>=1 for t in d.get('tickets',[]))" "$pawn"

cust=$(curl -s -b "$COOKIE_JAR" "$API/api/customers")
check_min "customers seeded" "len(d.get('customers',[]))>=2" "$cust"
check_min "credit sale + partial pay" "any(c.get('balanceCents',0)>0 for c in d.get('customers',[]))" "$cust"
check_min "installment plan" "any(s.get('installment') for c in d.get('customers',[]) for s in c.get('openSales',[]))" "$cust"

msg=$(curl -s -b "$COOKIE_JAR" "$API/api/messenger/jobs")
check_min "messenger jobs" "len(d.get('jobs',[]))>=1" "$msg"
check_min "delivered job" "any(j.get('status')=='DELIVERED' for j in d.get('jobs',[]))" "$msg"

hr=$(curl -s -b "$COOKIE_JAR" "$API/api/hr/employees")
check_min "employees seeded" "len(d.get('employees',[]))>=2" "$hr"

payroll=$(curl -s -b "$COOKIE_JAR" "$API/api/hr/payroll")
check_min "payroll run" "len(d.get('runs',[]))>=1" "$payroll"

ledger=$(curl -s -b "$COOKIE_JAR" "$API/api/cashflow/ledger")
check_min "ledger entries" "len(d.get('entries',[]))>=4" "$ledger"

closes=$(curl -s -b "$COOKIE_JAR" "$API/api/cashflow/daily-close")
check_min "daily close seeded" "len(d.get('closes',[]))>=1" "$closes"

echo ""
echo "Summary: ${pass} pass, ${fail} fail"
if [[ $fail -gt 0 ]]; then
  exit 1
fi
