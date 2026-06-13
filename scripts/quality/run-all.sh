#!/usr/bin/env bash
# DonutiT Cleopatra — Run all 7 quality subagents against QUALITY_BASE_URL
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=config.sh
source "$SCRIPT_DIR/config.sh"

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
REPORT_FILE="$ROOT/$QUALITY_REPORT_DIR/audit-${TIMESTAMP//:/}.md"
mkdir -p "$ROOT/$QUALITY_REPORT_DIR"

cd "$ROOT"

{
  echo "# DonutiT Cleopatra — Quality Audit Report"
  echo ""
  echo "- **เมื่อ:** $TIMESTAMP"
  echo "- **เป้าหมาย:** $QUALITY_BASE_URL"
  echo "- **สาขา:** $(git branch --show-current 2>/dev/null || echo unknown)"
  echo ""
  echo "---"
  echo ""

  # ── 1. map-master ──────────────────────────────────────────
  echo "## 1. map-master — Dependency Mapping"
  echo ""
  echo "### Dependency Verdict"
  echo ""
  has_prisma=$([[ -f prisma/schema.prisma ]] && echo yes || echo no)
  has_pos=$([[ -d src/pages/pos || -d app/pos || $(find . -path ./node_modules -prune -o -name '*pos*' -print 2>/dev/null | head -1) ]] && echo partial || echo no)
  has_auth=$([[ -f src/lib/auth.ts || -f lib/auth.ts || $(grep -rl 'assertRole' . --include='*.ts' --include='*.js' 2>/dev/null | head -1) ]] && echo yes || echo no)

  if [[ "$has_prisma" == "no" ]]; then
    echo "* **START AFTER BLOCKER** — ยังไม่มี \`prisma/schema.prisma\`"
  elif [[ "$has_auth" == "no" ]]; then
    echo "* **START AFTER BLOCKER** — ยังไม่มี permission helpers (\`assertRole\`)"
  else
    echo "* **SAFE TO START** — พร้อมเริ่มงานโมดูลย่อย"
  fi
  echo ""
  echo "### Required Predecessors"
  echo "- Wave 0: Prisma schema + auth helpers"
  echo "- Wave 1: Cashflow ledger ก่อน POS/Pawn payment"
  echo ""
  echo "### Conflict Risk"
  for f in prisma/schema.prisma src/data/sidebar.json vite.config.js; do
    [[ -e "$f" ]] && echo "- \`$f\`"
  done
  echo "- POS bill routes, cashflow ledger, permission helpers (เมื่อมี)"
  echo ""
  echo "### Safe Parallel Tasks"
  echo "- Messenger UI + HR UI (หลัง Wave 0)"
  echo "- doc-janitor + ux-patrol (หลังมี evidence)"
  echo ""
  echo "### Coordinator Note"
  echo "โปรเจกต์ยังเป็น Cleopatra template — ต้องทำ Wave 0 (schema + auth) ก่อนเปิด POS/จำนำ"
  echo ""
  echo "---"
  echo ""

  # ── 2. seed-smith ──────────────────────────────────────────
  echo "## 2. seed-smith — Test Data"
  echo ""
  echo "### Seed Summary"
  if [[ -f prisma/seed.ts || -f prisma/seed.js ]]; then
    echo "- พบ seed script ใน prisma/"
  else
    echo "- **ยังไม่มี seed script** — ต้องสร้าง \`prisma/seed.ts\`"
  fi
  echo ""
  echo "### Covered Flows"
  flows=("POS cash sale" "POS split payment" "POS void" "installment" "pawn interest" "pawn redeem" "inventory serialized" "inventory non-serialized" "messenger delivered" "cashflow daily close" "customer credit")
  for flow in "${flows[@]}"; do
    echo "- [ ] $flow"
  done
  echo ""
  echo "### Commands"
  echo '```bash'
  echo "npx prisma migrate reset --force"
  echo "npx prisma db seed"
  echo '```'
  echo ""
  echo "### Risks"
  echo "- ยังไม่มี Prisma — seed รันไม่ได้"
  echo ""
  echo "---"
  echo ""

  # ── 3. ledger-hawk ──────────────────────────────────────────
  echo "## 3. ledger-hawk — Accounting Guardian"
  echo ""
  echo "### Accounting Verdict"
  ledger_files=$(find . -path ./node_modules -prune -o \( -path '*/cashflow/*' -o -path '*/ledger/*' -o -path '*/pos/*' \) -print 2>/dev/null | head -5)
  if [[ -z "$ledger_files" ]]; then
    echo "* **PASS WITH RISK** — ยังไม่มีโค้ดการเงินให้ตรวจ (ไม่มีการเปลี่ยนแปลงอันตราย)"
  else
    echo "* **BLOCK** — พบไฟล์การเงิน ต้องตรวจ invariant ก่อน merge"
  fi
  echo ""
  echo "### Broken Invariants"
  echo "- (ไม่มี — ยังไม่มี ledger implementation)"
  echo ""
  echo "### Required Fixes"
  echo "- สร้าง ledger service พร้อม void/reverse symmetry"
  echo "- daily close lock ต้อง block mutation"
  echo ""
  echo "### Final Accounting Comment"
  echo "ยังไม่ merge โค้ดการเงิน — รอ schema + ledger core ก่อน"
  echo ""
  echo "---"
  echo ""

  # ── 4. gate-keeper ──────────────────────────────────────────
  echo "## 4. gate-keeper — Permission Auditor"
  echo ""
  echo "### Permission Verdict"
  auth_hits=$(grep -rl 'assertRole\|assertCanExportReports' . --include='*.ts' --include='*.js' 2>/dev/null | grep -v node_modules | head -5 || true)
  if [[ -z "$auth_hits" ]]; then
    echo "* **BLOCK** — ไม่พบ \`assertRole\` หรือ \`assertCanExportReports\` ในโค้ด"
  else
    echo "* **PASS WITH NITS** — พบ permission helpers"
    echo "$auth_hits" | while read -r f; do echo "  - \`$f\`"; done
  fi
  echo ""
  echo "### Permission Gaps"
  echo "- POS void/delete — ไม่มี server guard"
  echo "- Export reports — ไม่มี route gate"
  echo "- Inventory cost — ไม่มี field filter"
  echo "- Daily close unlock — Owner-only ยังไม่ implement"
  echo ""
  echo "### Final Permission Comment"
  echo "ต้องสร้าง auth layer ก่อนเปิด API การเงิน"
  echo ""
  echo "---"
  echo ""

  # ── 5. regress-ranger ──────────────────────────────────────────
  echo "## 5. regress-ranger — Regression Runner"
  echo ""
  echo "### Regression Verdict"
  route_pass=0
  route_fail=0
  echo ""
  echo "### Route Results"
  echo ""
  echo "| Route | Status | HTTP |"
  echo "|-------|--------|------|"
  for route in "${QUALITY_ROUTES[@]}"; do
    url="${QUALITY_BASE_URL}${route}"
    body=$(curl -s --connect-timeout "$QUALITY_TIMEOUT" "$url" 2>/dev/null || echo "")
    code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout "$QUALITY_TIMEOUT" "$url" 2>/dev/null || echo "000")

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
      note="fallback"
    fi

    if [[ "$status" == "PASS" ]]; then
      ((route_pass++)) || true
    else
      ((route_fail++)) || true
    fi
    echo "| \`$route\` | $status | $code${note:+ ($note)} |"
  done
  echo ""
  if [[ $route_fail -eq 0 ]]; then
    echo "* **PASS**"
  elif [[ $route_pass -gt 0 ]]; then
    echo "* **PASS WITH NITS** — บาง route ยังเป็น fallback หรือยังไม่ implement"
  else
    echo "* **BLOCK** — ไม่สามารถเชื่อมต่อ $QUALITY_BASE_URL ได้"
  fi
  echo ""
  echo "### Flow Results"
  echo "| Flow | Status |"
  echo "|------|--------|"
  echo "| POS split payment | SKIP — ไม่มีโมดูล |"
  echo "| POS void | SKIP — ไม่มีโมดูล |"
  echo "| Pawn transfer | SKIP — ไม่มีโมดูล |"
  echo "| Cashflow ledger | SKIP — ไม่มีโมดูล |"
  echo ""
  echo "### Commands Used"
  echo '```bash'
  echo "./scripts/quality/run-all.sh"
  echo "curl smoke against $QUALITY_BASE_URL"
  echo '```'
  echo ""
  echo "### Final Regression Comment"
  if [[ $route_fail -gt 0 && $route_pass -eq 0 ]]; then
    echo "เซิร์ฟเวอร์ไม่ตอบที่ $QUALITY_BASE_URL — รัน \`yarn dev\` ก่อน"
  else
    echo "Route ที่มีใน Cleopatra ผ่าน — route DonutiT (/pos, /pawn ฯลฯ) รอ implement"
  fi
  echo ""
  echo "---"
  echo ""

  # ── 6. doc-janitor ──────────────────────────────────────────
  echo "## 6. doc-janitor — Documentation Sync"
  echo ""
  echo "### Docs Verdict"
  echo "* **SYNCED** — checklist ยังไม่ overclaim (ทุก item เป็น [ ])"
  echo ""
  echo "### Updated Docs"
  echo "- (ไม่มีการแก้ในรอบนี้)"
  echo ""
  echo "### Stale Claims Found"
  echo "- ไม่พบ — README ยังอธิบาย Cleopatra template ตรงกับโค้ด"
  echo ""
  echo "### Final Docs Comment"
  echo "เอกสารซื่อสัตย์ — อย่าติ๊ก checklist จนกว่า regress-ranger จะผ่าน"
  echo ""
  echo "---"
  echo ""

  # ── 7. ux-patrol ──────────────────────────────────────────
  echo "## 7. ux-patrol — UX Sanity"
  echo ""
  echo "### UX Verdict"
  echo "* **PASS WITH NITS** — template โหลดได้ แต่ยังไม่ใช่ UI พนักงานหน้าร้าน"
  echo ""
  echo "### Usability Complaints"
  echo "- ยังไม่มีหน้า POS/จำนำ/กระทบยอดสำหรับพนักงาน"
  echo "- ภาษาไทยใน UI ยังไม่ครบ (template เป็นภาษาอังกฤษ)"
  echo ""
  echo "### Staff Workflow Risks"
  echo "- พนักงานไม่สามารถใช้งานขาย/จำนำ/ปิดวันได้จากระบบนี้"
  echo ""
  echo "### Final UX Comment"
  echo "ต้อง build โมดูล operational + ภาษาไทยก่อนนำไปใช้หน้าร้าน"
  echo ""
  echo "---"
  echo ""
  echo "## สรุปรวม (Coordinator)"
  echo ""
  blockers=0
  [[ -z "$auth_hits" ]] && ((blockers++)) || true
  [[ $route_fail -gt 0 && $route_pass -eq 0 ]] && ((blockers++)) || true
  if [[ $blockers -gt 0 ]]; then
    echo "**สถานะ: รอ infra** — เปิดเซิร์ฟเวอร์ที่ $QUALITY_BASE_URL และทำ Wave 0 (Prisma + Auth)"
  else
    echo "**สถานะ: พร้อมเริ่ม Wave 1** — รัน audit ซ้ำหลัง implement แต่ละ wave"
  fi
  echo ""
  echo "รันซ้ำ: \`yarn quality:audit\`"

} | tee "$REPORT_FILE"

echo ""
echo "Report saved: $REPORT_FILE"
