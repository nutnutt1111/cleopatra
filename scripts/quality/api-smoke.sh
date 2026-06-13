#!/usr/bin/env bash
# API flow smoke — regress-ranger business flows
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=config.sh
source "$SCRIPT_DIR/config.sh"

API="$QUALITY_API_URL"
PASS="${QUALITY_DEV_PASSWORD:-donutit-dev}"
pass=0
fail=0

login() {
  curl -s -X POST "$API/api/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$1\",\"password\":\"$PASS\"}" \
    | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))"
}

assert_http() {
  local name="$1" expected="$2" actual="$3"
  if [[ "$actual" == "$expected" ]]; then
    echo "PASS  $name → HTTP $actual"
    ((pass++)) || true
  else
    echo "FAIL  $name → expected HTTP $expected, got $actual"
    ((fail++)) || true
  fi
}

assert_json() {
  local name="$1" expr="$2" body="$3"
  if echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin); sys.exit(0 if ($expr) else 1)" 2>/dev/null; then
    echo "PASS  $name"
    ((pass++)) || true
  else
    echo "FAIL  $name"
    ((fail++)) || true
  fi
}

echo "# API Smoke — regress-ranger"
echo "API: $API"
echo ""

OWNER=$(login owner@donutit.local)
STAFF=$(login staff@donutit.local)
HR=$(login hr@donutit.local)
MANAGER=$(login manager@donutit.local)

if [[ -z "$OWNER" || -z "$STAFF" ]]; then
  echo "FAIL  login — cannot get tokens (is yarn dev:api running? yarn db:seed done?)"
  exit 1
fi
echo "PASS  login (owner, staff, hr, manager)"
((pass++)) || true
echo ""

# Health
code=$(curl -s -o /tmp/q-health.json -w "%{http_code}" "$API/api/health")
assert_http "GET /api/health" "200" "$code"
assert_json "health wave >= 4" "d.get('wave',0)>=4" "$(cat /tmp/q-health.json)"

# Export gate
code=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $STAFF" "$API/api/reports/export")
assert_http "export blocked for staff" "403" "$code"
code=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $OWNER" "$API/api/reports/export")
assert_http "export allowed for owner" "200" "$code"

# Inventory cost visibility
staff_products=$(curl -s -H "Authorization: Bearer $STAFF" "$API/api/inventory/products")
mgr_products=$(curl -s -H "Authorization: Bearer $MANAGER" "$API/api/inventory/products")
assert_json "staff cost hidden" "all(p.get('costBaht') is None for p in d.get('products',[]))" "$staff_products"
assert_json "manager cost visible" "any(p.get('costBaht') is not None for p in d.get('products',[]))" "$mgr_products"

# HR gate
code=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $STAFF" "$API/api/hr/employees")
assert_http "HR blocked for staff" "403" "$code"
code=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $HR" "$API/api/hr/employees")
assert_http "HR allowed for HR role" "200" "$code"

# Audit log (owner only — deleted/void visibility)
code=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $STAFF" "$API/api/cashflow/audit")
assert_http "audit logs blocked for staff" "403" "$code"
code=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $MANAGER" "$API/api/cashflow/audit")
assert_http "audit logs blocked for manager" "403" "$code"
code=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $OWNER" "$API/api/cashflow/audit")
assert_http "audit logs allowed for owner" "200" "$code"

# Core module APIs return data after seed
for ep in "/api/pos/bills" "/api/inventory/products" "/api/pawn/tickets" "/api/customers" "/api/messenger/jobs" "/api/cashflow/ledger"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $OWNER" "$API$ep")
  assert_http "GET $ep" "200" "$code"
done

# POS discount gate (staff cannot discount)
phone_id=$(echo "$staff_products" | python3 -c "import sys,json; d=json.load(sys.stdin); print(next((p['id'] for p in d['products'] if p['trackingType']=='SERIALIZED'),''))")
serial_id=$(echo "$staff_products" | python3 -c "import sys,json; d=json.load(sys.stdin); p=next((x for x in d['products'] if x['trackingType']=='SERIALIZED'),None); print(p['serials'][0]['id'] if p and p.get('serials') else '')")
if [[ -n "$phone_id" && -n "$serial_id" ]]; then
  price=$(echo "$staff_products" | python3 -c "import sys,json; d=json.load(sys.stdin); p=next(x for x in d['products'] if x['id']=='$phone_id'); print(p['priceCents']/100)")
  code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Authorization: Bearer $STAFF" -H 'Content-Type: application/json' \
    -d "{\"lines\":[{\"productId\":\"$phone_id\",\"serialItemId\":\"$serial_id\"}],\"payments\":[{\"channel\":\"CASH\",\"amount\":$price}],\"discount\":10}" \
    "$API/api/pos/bills")
  assert_http "staff discount blocked" "403" "$code"
fi

# Manager can void POS bill (no nested-tx crash)
bill_id=$(curl -s -H "Authorization: Bearer $OWNER" "$API/api/pos/bills" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(next((b['id'] for b in d.get('bills',[]) if b.get('status')=='COMPLETED'),''))")
if [[ -n "$bill_id" ]]; then
  code=$(curl -s -o /tmp/q-void.json -w "%{http_code}" -X POST -H "Authorization: Bearer $MANAGER" -H 'Content-Type: application/json' \
    -d '{"reason":"quality smoke void"}' \
    "$API/api/pos/bills/$bill_id/void")
  assert_http "manager can void bill" "200" "$code"
  assert_json "void response ok" "d.get('ok') is True" "$(cat /tmp/q-void.json)"
else
  echo "SKIP  manager void — no completed bill in seed"
fi

# Audit payload visible to owner
audit_body=$(curl -s -H "Authorization: Bearer $OWNER" "$API/api/cashflow/audit")
assert_json "audit includes payload field" "all('payload' in l for l in d.get('logs',[]))" "$audit_body"

echo ""
echo "Summary: ${pass} pass, ${fail} fail"
if [[ $fail -gt 0 ]]; then
  exit 1
fi
