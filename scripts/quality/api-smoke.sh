#!/usr/bin/env bash
# API flow smoke — regress-ranger business flows
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=config.sh
source "$SCRIPT_DIR/config.sh"

API="$QUALITY_API_URL"
PASS="${QUALITY_DEV_PASSWORD:-donutit-dev}"
COOKIE_DIR=$(mktemp -d)
trap 'rm -rf "$COOKIE_DIR"' EXIT

pass=0
fail=0

login_as() {
  local email="$1"
  local jar="$COOKIE_DIR/${email//[@.]/_}.txt"
  curl -s -c "$jar" -X POST "$API/api/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$email\",\"password\":\"$PASS\"}" > /dev/null
  echo "$jar"
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

OWNER_JAR=$(login_as owner@donutit.local)
STAFF_JAR=$(login_as staff@donutit.local)
HR_JAR=$(login_as hr@donutit.local)
MANAGER_JAR=$(login_as manager@donutit.local)

if [[ ! -s "$OWNER_JAR" || ! -s "$STAFF_JAR" ]]; then
  echo "FAIL  login — cookie auth failed (is yarn dev:api running? yarn db:seed done?)"
  exit 1
fi
echo "PASS  login (owner, staff, hr, manager) via cookie"
((pass++)) || true
echo ""

# Health
code=$(curl -s -o /tmp/q-health.json -w "%{http_code}" "$API/api/health")
assert_http "GET /api/health" "200" "$code"
assert_json "health wave >= 4" "d.get('wave',0)>=4" "$(cat /tmp/q-health.json)"

# Export gate
code=$(curl -s -o /dev/null -w "%{http_code}" -b "$STAFF_JAR" "$API/api/reports/export")
assert_http "export blocked for staff" "403" "$code"
code=$(curl -s -o /dev/null -w "%{http_code}" -b "$OWNER_JAR" "$API/api/reports/export")
assert_http "export allowed for owner" "200" "$code"

# Inventory cost visibility
staff_products=$(curl -s -b "$STAFF_JAR" "$API/api/inventory/products")
mgr_products=$(curl -s -b "$MANAGER_JAR" "$API/api/inventory/products")
assert_json "staff cost hidden" "all(p.get('costBaht') is None for p in d.get('products',[]))" "$staff_products"
assert_json "manager cost visible" "any(p.get('costBaht') is not None for p in d.get('products',[]))" "$mgr_products"

# HR gate
code=$(curl -s -o /dev/null -w "%{http_code}" -b "$STAFF_JAR" "$API/api/hr/employees")
assert_http "HR blocked for staff" "403" "$code"
code=$(curl -s -o /dev/null -w "%{http_code}" -b "$HR_JAR" "$API/api/hr/employees")
assert_http "HR allowed for HR role" "200" "$code"

# Audit log (owner only)
code=$(curl -s -o /dev/null -w "%{http_code}" -b "$STAFF_JAR" "$API/api/cashflow/audit")
assert_http "audit logs blocked for staff" "403" "$code"
code=$(curl -s -o /dev/null -w "%{http_code}" -b "$MANAGER_JAR" "$API/api/cashflow/audit")
assert_http "audit logs blocked for manager" "403" "$code"
code=$(curl -s -o /dev/null -w "%{http_code}" -b "$OWNER_JAR" "$API/api/cashflow/audit")
assert_http "audit logs allowed for owner" "200" "$code"

# Core module APIs
for ep in "/api/pos/bills" "/api/inventory/products" "/api/pawn/tickets" "/api/customers" "/api/messenger/jobs" "/api/cashflow/ledger"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" -b "$OWNER_JAR" "$API$ep")
  assert_http "GET $ep" "200" "$code"
done

# POS discount gate
phone_id=$(echo "$staff_products" | python3 -c "import sys,json; d=json.load(sys.stdin); print(next((p['id'] for p in d['products'] if p['trackingType']=='SERIALIZED'),''))")
serial_id=$(echo "$staff_products" | python3 -c "import sys,json; d=json.load(sys.stdin); p=next((x for x in d['products'] if x['trackingType']=='SERIALIZED'),None); print(p['serials'][0]['id'] if p and p.get('serials') else '')")
if [[ -n "$phone_id" && -n "$serial_id" ]]; then
  price=$(echo "$staff_products" | python3 -c "import sys,json; d=json.load(sys.stdin); p=next(x for x in d['products'] if x['id']=='$phone_id'); print(p['priceCents']/100)")
  code=$(curl -s -o /dev/null -w "%{http_code}" -b "$STAFF_JAR" -X POST -H 'Content-Type: application/json' \
    -d "{\"lines\":[{\"productId\":\"$phone_id\",\"serialItemId\":\"$serial_id\"}],\"payments\":[{\"channel\":\"CASH\",\"amount\":$price}],\"discount\":10}" \
    "$API/api/pos/bills")
  assert_http "staff discount blocked" "403" "$code"
fi

# Manager can void POS bill
bill_id=$(curl -s -b "$OWNER_JAR" "$API/api/pos/bills" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(next((b['id'] for b in d.get('bills',[]) if b.get('status')=='COMPLETED'),''))")
if [[ -n "$bill_id" ]]; then
  code=$(curl -s -o /tmp/q-void.json -w "%{http_code}" -b "$MANAGER_JAR" -X POST -H 'Content-Type: application/json' \
    -d '{"reason":"quality smoke void"}' \
    "$API/api/pos/bills/$bill_id/void")
  assert_http "manager can void bill" "200" "$code"
  assert_json "void response ok" "d.get('ok') is True" "$(cat /tmp/q-void.json)"
else
  echo "SKIP  manager void — no completed bill in seed"
fi

# Audit payload visible
audit_body=$(curl -s -b "$OWNER_JAR" "$API/api/cashflow/audit")
assert_json "audit includes payload field" "all('payload' in l for l in d.get('logs',[]))" "$audit_body"

echo ""
echo "Summary: ${pass} pass, ${fail} fail"
if [[ $fail -gt 0 ]]; then
  exit 1
fi
