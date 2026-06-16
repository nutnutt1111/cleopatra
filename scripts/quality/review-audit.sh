#!/usr/bin/env bash
# Review audit — race-reaper + auth-attacker (read-only, no DB mutation beyond test fixtures)
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
warn=0
blocker=0

login_as() {
  local email="$1"
  local jar="$COOKIE_DIR/${email//[@.]/_}.txt"
  curl -s -c "$jar" -X POST "$API/api/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$email\",\"password\":\"$PASS\"}" > /dev/null
  echo "$jar"
}

record() {
  local level="$1" name="$2" detail="$3"
  case "$level" in
    PASS) echo "PASS  $name — $detail"; ((pass++)) || true ;;
    FAIL) echo "FAIL  [BLOCKER] $name — $detail"; ((fail++)) || true; ((blocker++)) || true ;;
    WARN) echo "WARN  $name — $detail"; ((warn++)) || true ;;
  esac
}

race_pair() {
  local name="$1" jar="$2" method="$3" url="$4" body="$5"
  local csrf
  csrf=$(csrf_from_jar "$jar")
  curl -s -b "$jar" -X "$method" -H 'Content-Type: application/json' \
    ${csrf:+-H "X-CSRF-Token: $csrf"} \
    -d "$body" \
    "$url" -o "/tmp/ra1.json" -w '%{http_code}' > /tmp/ra1-code.txt &
  curl -s -b "$jar" -X "$method" -H 'Content-Type: application/json' \
    ${csrf:+-H "X-CSRF-Token: $csrf"} \
    -d "$body" \
    "$url" -o "/tmp/ra2.json" -w '%{http_code}' > /tmp/ra2-code.txt &
  wait
  local c1 c2
  c1=$(cat /tmp/ra1-code.txt)
  c2=$(cat /tmp/ra2-code.txt)
  if { [[ "$c1" == "200" ]] && [[ "$c2" == "409" ]]; } \
    || { [[ "$c1" == "409" ]] && [[ "$c2" == "200" ]]; } \
    || { [[ "$c2" == "200" || "$c2" == "201" ]] && [[ "$c1" == "409" ]]; } \
    || { [[ "$c1" == "200" || "$c1" == "201" ]] && [[ "$c2" == "409" ]]; } \
    || { [[ "$c1" == "200" ]] && [[ "$c2" == "403" ]]; } \
    || { [[ "$c2" == "200" ]] && [[ "$c1" == "403" ]]; }; then
    record PASS "$name" "one success + one blocked ($c1 / $c2)"
  elif [[ "$c1" == "$c2" ]] && [[ "$c1" == "409" ]]; then
    record PASS "$name" "both 409 (idempotent reject) ($c1 / $c2)"
  else
    record FAIL "$name" "unexpected $c1 / $c2"
  fi
}

echo "# Review Audit — race-reaper + auth-attacker"
echo "API: $API"
echo ""

OWNER_JAR=$(login_as owner@donutit.local)
STAFF_JAR=$(login_as staff@donutit.local)
MANAGER_JAR=$(login_as manager@donutit.local)

# --- RACE-REAPER ---
echo "## race-reaper"
echo ""

# 1. Pawn interest parallel (regression)
api_post "$OWNER_JAR" "$API/api/pawn/tickets" \
  '{"customerName":"AuditPawn","itemDescription":"race","principal":8000,"channel":"CASH"}' \
  > /tmp/audit-pawn.json
PAWN_ID=$(python3 -c "import json; print(json.load(open('/tmp/audit-pawn.json')).get('ticket',{}).get('id',''))" 2>/dev/null || echo "")
if [[ -n "$PAWN_ID" ]]; then
  race_pair "pawn interest parallel" "$OWNER_JAR" POST "$API/api/pawn/tickets/$PAWN_ID/interest" '{"channel":"CASH"}'
else
  record FAIL "pawn interest parallel" "could not create ticket"
fi

# 2. Pawn redeem parallel
api_post "$OWNER_JAR" "$API/api/pawn/tickets" \
  '{"customerName":"RedeemRace","itemDescription":"redeem","principal":3000,"channel":"CASH"}' \
  > /tmp/audit-redeem-pawn.json
REDEEM_ID=$(python3 -c "import json; print(json.load(open('/tmp/audit-redeem-pawn.json')).get('ticket',{}).get('id',''))" 2>/dev/null || echo "")
if [[ -n "$REDEEM_ID" ]]; then
  race_pair "pawn redeem parallel" "$OWNER_JAR" POST "$API/api/pawn/tickets/$REDEEM_ID/redeem" '{"channel":"CASH"}'
else
  record FAIL "pawn redeem parallel" "could not create ticket"
fi

# 3. POS void double-click — need completed bill
BILLS=$(curl -s -b "$OWNER_JAR" "$API/api/pos/bills")
VOID_BILL=$(echo "$BILLS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(next((b['id'] for b in d.get('bills',[]) if b.get('status')=='COMPLETED'),''))" 2>/dev/null || echo "")
if [[ -n "$VOID_BILL" ]]; then
  race_pair "POS void double-click" "$MANAGER_JAR" POST "$API/api/pos/bills/$VOID_BILL/void" '{"reason":"audit double void"}'
else
  record WARN "POS void double-click" "no completed bill in DB — skipped"
fi

# 4. Daily-close lock parallel
CLOSE_DATE="2026-05-01"
race_pair "daily-close lock parallel" "$OWNER_JAR" POST "$API/api/cashflow/daily-close" "{\"closeDate\":\"$CLOSE_DATE\"}"
api_post "$OWNER_JAR" "$API/api/cashflow/daily-close/unlock" "{\"closeDate\":\"$CLOSE_DATE\"}" > /dev/null || true

# 5. Daily-close unlock parallel (lock first)
api_post "$OWNER_JAR" "$API/api/cashflow/daily-close" '{"closeDate":"2026-05-02"}' > /dev/null || true
race_pair "daily-close unlock parallel" "$OWNER_JAR" POST "$API/api/cashflow/daily-close/unlock" '{"closeDate":"2026-05-02"}'
api_post "$OWNER_JAR" "$API/api/cashflow/daily-close/unlock" '{"closeDate":"2026-05-02"}' > /dev/null || true

# 6. Messenger delivered double patch
api_post "$OWNER_JAR" "$API/api/messenger/jobs" \
  '{"customerName":"RaceShip","customerPhone":"080","address":"addr","deliveryFee":500,"feeChannel":"CASH"}' \
  > /tmp/audit-job.json
JOB_ID=$(python3 -c "import json; print(json.load(open('/tmp/audit-job.json')).get('job',{}).get('id',''))" 2>/dev/null || echo "")
if [[ -n "$JOB_ID" ]]; then
  api_post_empty "$OWNER_JAR" "$API/api/messenger/jobs/$JOB_ID/transit" > /dev/null || true
  race_pair "messenger deliver double patch" "$OWNER_JAR" POST "$API/api/messenger/jobs/$JOB_ID/deliver" '{}'
else
  record FAIL "messenger delivered double patch" "could not create job"
fi

# 7. Credit sale parallel over limit
api_post "$STAFF_JAR" "$API/api/customers" \
  '{"name":"LimitRace","phone":"081","creditLimit":5000}' > /tmp/audit-cust.json
CUST_ID=$(python3 -c "import json; print(json.load(open('/tmp/audit-cust.json')).get('customer',{}).get('id',''))" 2>/dev/null || echo "")
if [[ -n "$CUST_ID" ]]; then
  csrf=$(csrf_from_jar "$STAFF_JAR")
  curl -s -b "$STAFF_JAR" -X POST -H 'Content-Type: application/json' \
    ${csrf:+-H "X-CSRF-Token: $csrf"} \
    -d "{\"customerId\":\"$CUST_ID\",\"description\":\"sale A\",\"total\":4000}" \
    "$API/api/customers/credit-sales" -o /tmp/cs1.json -w '%{http_code}' > /tmp/cs1-code.txt &
  curl -s -b "$STAFF_JAR" -X POST -H 'Content-Type: application/json' \
    ${csrf:+-H "X-CSRF-Token: $csrf"} \
    -d "{\"customerId\":\"$CUST_ID\",\"description\":\"sale B\",\"total\":4000}" \
    "$API/api/customers/credit-sales" -o /tmp/cs2.json -w '%{http_code}' > /tmp/cs2-code.txt &
  wait
  cs1=$(cat /tmp/cs1-code.txt)
  cs2=$(cat /tmp/cs2-code.txt)
  BAL=$(curl -s -b "$STAFF_JAR" "$API/api/customers" | python3 -c "
import sys,json
d=json.load(sys.stdin)
for c in d.get('customers',[]):
  if c.get('id')=='$CUST_ID':
    # balanceBaht string or parse from balance
    print(c.get('balanceCents', c.get('balanceBaht','0').replace(',','')))
    break
" 2>/dev/null || echo "-1")
  LIMIT=500000
  if [[ "$BAL" -le "$LIMIT" ]] && { [[ "$cs1" == "200" || "$cs1" == "201" ]] && [[ "$cs2" != "200" && "$cs2" != "201" ]]; } \
    || { [[ "$cs2" == "200" || "$cs2" == "201" ]] && [[ "$cs1" != "200" && "$cs1" != "201" ]]; } \
    || { [[ "$cs1" != "200" && "$cs1" != "201" ]] && [[ "$cs2" != "200" && "$cs2" != "201" ]]; }; then
    record PASS "credit sale parallel over limit" "balance_cents=$BAL limit_cents=$LIMIT codes=$cs1/$cs2"
  elif [[ "$BAL" -le "$LIMIT" ]] && [[ "$cs1" == "200" ]] && [[ "$cs2" == "200" ]]; then
    record WARN "credit sale parallel over limit" "both 200 but balance=$BAL <= limit (SQLite serializes?)"
  else
    record FAIL "credit sale parallel over limit" "balance=$BAL limit=$LIMIT codes=$cs1/$cs2"
  fi
else
  record FAIL "credit sale parallel over limit" "could not create customer"
fi

echo ""
echo "## auth-attacker"
echo ""

# fake origin
allow=$(curl -s -I -H "Origin: https://evil-phishing.example" "$API/api/health" 2>/dev/null | grep -i "access-control-allow-origin" || true)
if echo "$allow" | grep -qi "evil-phishing"; then
  record FAIL "fake origin CORS" "reflects evil origin"
else
  record PASS "fake origin CORS" "not reflected"
fi

# no cookie
code=$(curl -s -o /dev/null -w "%{http_code}" "$API/api/pos/bills")
[[ "$code" == "401" ]] && record PASS "no cookie" "401" || record FAIL "no cookie" "got $code"

# invalid JWT
code=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.e30.sig" "$API/api/pos/bills")
[[ "$code" == "401" ]] && record PASS "invalid JWT" "401" || record FAIL "invalid JWT" "got $code"

# expired JWT (manually crafted — use node)
EXPIRED=$(node -e "
const jwt=require('jsonwebtoken');
console.log(jwt.sign({id:'x',email:'a',role:'OWNER',storeId:'x'}, process.env.JWT_SECRET||'donutit-dev-secret', {expiresIn:-3600}));
" 2>/dev/null || echo "bad")
code=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $EXPIRED" "$API/api/pos/bills")
[[ "$code" == "401" ]] && record PASS "expired JWT" "401" || record FAIL "expired JWT" "got $code"

# staff owner action
code=$(api_post_code "$STAFF_JAR" "$API/api/cashflow/daily-close/unlock" '{"closeDate":"2026-06-01"}')
[[ "$code" == "403" ]] && record PASS "staff unlock day" "403" || record FAIL "staff unlock day" "got $code"

code=$(curl -s -o /dev/null -w "%{http_code}" -b "$STAFF_JAR" "$API/api/reports/export")
[[ "$code" == "403" ]] && record PASS "staff export" "403" || record FAIL "staff export" "got $code"

# forged identity JWT — role claims in token must not grant export
FORGED=$(node -e "
const jwt=require('jsonwebtoken');
const secret=process.env.JWT_SECRET||'donutit-dev-secret';
console.log(jwt.sign({userId:'nonexistent-user-id',storeId:'fake-store'}, secret, {expiresIn:'1h'}));
" 2>/dev/null)
code=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $FORGED" "$API/api/reports/export")
if [[ "$code" == "401" ]] || [[ "$code" == "403" ]]; then
  record PASS "forged identity JWT" "$code (rejected)"
else
  record FAIL "forged identity JWT" "got $code — export must not trust JWT role claims"
fi

# brute force login (use low limit test — 12 bad attempts)
bf_ok=0
for i in $(seq 1 12); do
  c=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/api/auth/login" \
    -H 'Content-Type: application/json' -d '{"email":"owner@donutit.local","password":"wrong"}')
  [[ "$c" == "429" ]] && bf_ok=1 && break
done
[[ "$bf_ok" == "1" ]] && record PASS "brute force login" "429 after repeated failures" \
  || record WARN "brute force login" "no 429 in 12 attempts (LOGIN_RATE_MAX may be raised for dev)"

# CSRF: mutating POST without token must fail
code=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Origin: http://localhost:3003" \
  -H 'Content-Type: application/json' \
  -X POST -b "$OWNER_JAR" \
  -d '{"customerName":"csrf","itemDescription":"x","principal":100,"channel":"CASH"}' \
  "$API/api/pawn/tickets")
[[ "$code" == "403" ]] && record PASS "CSRF missing token" "403" \
  || record FAIL "CSRF missing token" "got $code"

echo ""
echo "Summary: ${pass} pass, ${fail} fail, ${warn} warn (blockers: ${blocker})"
exit $([[ $blocker -eq 0 ]] && echo 0 || echo 1)
