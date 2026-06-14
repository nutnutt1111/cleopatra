#!/usr/bin/env bash
# Grumpy HARDTEST — abusive user / race-condition simulation
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
blocker=0

login_as() {
  local email="$1"
  local jar="$COOKIE_DIR/${email//[@.]/_}.txt"
  curl -s -c "$jar" -X POST "$API/api/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$email\",\"password\":\"$PASS\"}" > /dev/null
  echo "$jar"
}

assert_block() {
  local name="$1" expected="$2" actual="$3"
  if [[ "$actual" == "$expected" ]]; then
    echo "PASS  [blocked] $name → HTTP $actual"
    ((pass++)) || true
  else
    echo "FAIL  [BLOCKER] $name → expected HTTP $expected, got $actual"
    ((fail++)) || true
    ((blocker++)) || true
  fi
}

assert_ok() {
  local name="$1" expected="$2" actual="$3"
  if [[ "$actual" == "$expected" ]]; then
    echo "PASS  $name → HTTP $actual"
    ((pass++)) || true
  else
    echo "FAIL  $name → expected HTTP $expected, got $actual"
    ((fail++)) || true
    ((blocker++)) || true
  fi
}

echo "# Grumpy HARDTEST"
echo "API: $API"
echo ""

OWNER_JAR=$(login_as owner@donutit.local)
STAFF_JAR=$(login_as staff@donutit.local)
MANAGER_JAR=$(login_as manager@donutit.local)

# Auth bypass
code=$(curl -s -o /dev/null -w "%{http_code}" "$API/api/pos/bills")
assert_block "no auth → bills" "401" "$code"

code=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer bad.token" "$API/api/pos/bills")
assert_block "garbage JWT" "401" "$code"

# Cookie auth works
code=$(curl -s -o /dev/null -w "%{http_code}" -b "$OWNER_JAR" "$API/api/pos/bills")
assert_ok "cookie auth owner" "200" "$code"

# Privilege escalation
code=$(curl -s -o /dev/null -w "%{http_code}" -b "$STAFF_JAR" -X POST \
  -H 'Content-Type: application/json' -d '{"closeDate":"2026-06-13"}' "$API/api/cashflow/daily-close")
assert_block "staff daily-close" "403" "$code"

code=$(curl -s -o /dev/null -w "%{http_code}" -b "$MANAGER_JAR" -X POST \
  -H 'Content-Type: application/json' -d '{"closeDate":"2026-06-13"}' "$API/api/cashflow/daily-close/unlock")
assert_block "manager unlock day" "403" "$code"

code=$(curl -s -o /dev/null -w "%{http_code}" -b "$STAFF_JAR" "$API/api/cashflow/audit")
assert_block "staff audit logs" "403" "$code"

# Input abuse
code=$(curl -s -o /dev/null -w "%{http_code}" -b "$STAFF_JAR" -X POST -H 'Content-Type: application/json' \
  -d '{"customerName":"x","itemDescription":"x","principal":-100}' "$API/api/pawn/tickets")
assert_block "negative pawn principal" "400" "$code"

# Credit limit zero — no credit sales
curl -s -b "$STAFF_JAR" -X POST -H 'Content-Type: application/json' \
  -d '{"name":"ZeroLimit","creditLimit":0}' "$API/api/customers" > /tmp/ht-zero-cust.json
zero_cid=$(python3 -c "import json; print(json.load(open('/tmp/ht-zero-cust.json')).get('customer',{}).get('id',''))" 2>/dev/null || echo "")
if [[ -n "$zero_cid" ]]; then
  code=$(curl -s -o /dev/null -w "%{http_code}" -b "$STAFF_JAR" -X POST -H 'Content-Type: application/json' \
    -d "{\"customerId\":\"$zero_cid\",\"description\":\"เกินวงเงิน\",\"total\":1000}" \
    "$API/api/customers/credit-sales")
  assert_block "credit sale with limit=0" "400" "$code"
else
  echo "FAIL  [BLOCKER] could not create zero-limit customer"
  ((fail++)) || true
  ((blocker++)) || true
fi

# Parallel pawn interest race — exactly one must succeed
curl -s -b "$OWNER_JAR" -X POST -H 'Content-Type: application/json' \
  -d '{"customerName":"RacePawn","itemDescription":"test","principal":5000,"channel":"CASH"}' \
  "$API/api/pawn/tickets" > /tmp/ht-race-pawn.json
race_tid=$(python3 -c "import json; print(json.load(open('/tmp/ht-race-pawn.json')).get('ticket',{}).get('id',''))" 2>/dev/null || echo "")
if [[ -n "$race_tid" ]]; then
  curl -s -b "$OWNER_JAR" -X POST -H 'Content-Type: application/json' -d '{"channel":"CASH"}' \
    "$API/api/pawn/tickets/$race_tid/interest" -o /tmp/ht-int1.json -w "%{http_code}" > /tmp/ht-int1-code.txt &
  curl -s -b "$OWNER_JAR" -X POST -H 'Content-Type: application/json' -d '{"channel":"CASH"}' \
    "$API/api/pawn/tickets/$race_tid/interest" -o /tmp/ht-int2.json -w "%{http_code}" > /tmp/ht-int2-code.txt &
  wait
  c1=$(cat /tmp/ht-int1-code.txt)
  c2=$(cat /tmp/ht-int2-code.txt)
  if { [[ "$c1" == "200" ]] && [[ "$c2" == "409" ]]; } || { [[ "$c1" == "409" ]] && [[ "$c2" == "200" ]]; }; then
    echo "PASS  [race] parallel pawn interest → one 200, one 409 ($c1 / $c2)"
    ((pass++)) || true
  else
    echo "FAIL  [BLOCKER] parallel pawn interest → $c1 / $c2 (expected 200+409)"
    ((fail++)) || true
    ((blocker++)) || true
  fi
else
  echo "FAIL  [BLOCKER] could not create pawn ticket for race test"
  ((fail++)) || true
  ((blocker++)) || true
fi

# Staff void blocked
bills=$(curl -s -b "$OWNER_JAR" "$API/api/pos/bills")
bill_id=$(echo "$bills" | python3 -c "import sys,json; d=json.load(sys.stdin); print(next((b['id'] for b in d.get('bills',[]) if b.get('status')=='COMPLETED'),''))")
if [[ -n "$bill_id" ]]; then
  code=$(curl -s -o /dev/null -w "%{http_code}" -b "$STAFF_JAR" -X POST -H 'Content-Type: application/json' \
    -d '{"reason":"hack"}' "$API/api/pos/bills/$bill_id/void")
  assert_block "staff void bill" "403" "$code"
fi

# Locked day blocks ledger post
TODAY=$(date -u +%Y-%m-%d)
curl -s -b "$OWNER_JAR" -X POST -H 'Content-Type: application/json' \
  -d "{\"closeDate\":\"$TODAY\"}" "$API/api/cashflow/daily-close" > /dev/null || true
code=$(curl -s -o /dev/null -w "%{http_code}" -b "$STAFF_JAR" -X POST -H 'Content-Type: application/json' \
  -d "{\"entryDate\":\"$TODAY\",\"type\":\"INCOME\",\"channel\":\"CASH\",\"amount\":100,\"description\":\"after close\"}" \
  "$API/api/cashflow/ledger")
assert_block "ledger on locked day" "423" "$code"
curl -s -b "$OWNER_JAR" -X POST -H 'Content-Type: application/json' \
  -d "{\"closeDate\":\"$TODAY\"}" "$API/api/cashflow/daily-close/unlock" > /dev/null || true

# CORS rejects evil origin
cors_code=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Origin: https://evil-phishing.example" \
  -H "Access-Control-Request-Method: GET" \
  -X OPTIONS "$API/api/health")
if [[ "$cors_code" == "204" ]] || [[ "$cors_code" == "200" ]]; then
  allow=$(curl -s -I -H "Origin: https://evil-phishing.example" "$API/api/health" 2>/dev/null | grep -i "access-control-allow-origin" || true)
  if echo "$allow" | grep -qi "evil-phishing"; then
    echo "FAIL  [BLOCKER] CORS reflects evil origin"
    ((fail++)) || true
    ((blocker++)) || true
  else
    echo "PASS  CORS does not reflect evil origin"
    ((pass++)) || true
  fi
else
  echo "PASS  CORS preflight blocked evil origin ($cors_code)"
  ((pass++)) || true
fi

echo ""
echo "Summary: ${pass} pass, ${fail} fail (blockers: ${blocker})"
if [[ $blocker -gt 0 ]]; then
  exit 1
fi
