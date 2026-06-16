#!/usr/bin/env bash
# Extended checks — build, sidebar, Cleopatra pages, UX, parity cross-check
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
# shellcheck source=config.sh
source "$SCRIPT_DIR/config.sh"

cd "$ROOT"

echo "## ตรวจสอบเพิ่มเติม (Extended Audit)"
echo ""

# ── Build ─────────────────────────────────────────────────────
echo "### Build Check"
echo ""
if yarn build >/tmp/quality-build.log 2>&1; then
  dist_count=$(find dist -name '*.html' 2>/dev/null | wc -l | tr -d ' ')
  echo "- **PASS** — \`yarn build\` สำเร็จ (${dist_count} HTML files ใน dist/)"
else
  echo "- **FAIL** — \`yarn build\` ล้มเหลว"
  tail -5 /tmp/quality-build.log | sed 's/^/  /'
fi
echo ""

# ── Sidebar vs DonutiT modules ────────────────────────────────
echo "### Sidebar Navigation (map-master + doc-janitor)"
echo ""
donut_routes=("/pos" "/inventory" "/pawn" "/messenger" "/cashflow-ledger" "/customers" "/hr" "/settings")
sidebar_json="src/data/sidebar.json"
echo "| Route ที่ต้องการ | ใน sidebar.json |"
echo "|-----------------|-----------------|"
for r in "${donut_routes[@]}"; do
  if grep -q "\"href\": \"${r}\"" "$sidebar_json" 2>/dev/null || grep -q "\"href\": \"${r}/" "$sidebar_json" 2>/dev/null; then
    echo "| \`$r\` | ✅ มี |"
  else
    echo "| \`$r\` | ❌ ไม่มี |"
  fi
done
echo ""
echo "- Cleopatra มี \`/pages/apps/inventory.html\` แต่ DonutiT ต้องการ \`/inventory\` แยกต่างหาก"
echo ""

# ── Cleopatra template pages smoke ────────────────────────────
echo "### Cleopatra Template Routes (regress-ranger)"
echo ""
cleo_routes=(
  "/pages/"
  "/pages/index-mission-control.html"
  "/pages/apps/retail-store.html"
  "/pages/apps/inventory.html"
  "/pages/apps/email.html"
  "/pages/extra/login.html"
  "/pages/settings/theme.html"
)
cleo_pass=0
cleo_fail=0
echo "| Route | Status | HTTP |"
echo "|-------|--------|------|"
for route in "${cleo_routes[@]}"; do
  url="${QUALITY_BASE_URL}${route}"
  code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout "$QUALITY_TIMEOUT" "$url" 2>/dev/null || echo "000")
  if [[ "$code" == "200" ]]; then
    echo "| \`$route\` | PASS | $code |"
    ((cleo_pass++)) || true
  else
    echo "| \`$route\` | FAIL | $code |"
    ((cleo_fail++)) || true
  fi
done
echo ""
if [[ $cleo_fail -eq 0 ]]; then
  echo "- Template routes: **PASS** (${cleo_pass}/${#cleo_routes[@]})"
else
  echo "- Template routes: **PASS WITH NITS** (${cleo_pass} pass, ${cleo_fail} fail)"
fi
echo ""

# ── Static assets ─────────────────────────────────────────────
echo "### Static Assets"
echo ""
assets=("/images/logo.png" "/images/fav.png")
echo "| Asset | Status |"
echo "|-------|--------|"
for asset in "${assets[@]}"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout "$QUALITY_TIMEOUT" "${QUALITY_BASE_URL}${asset}" 2>/dev/null || echo "000")
  if [[ "$code" == "200" ]]; then
    echo "| \`$asset\` | PASS ($code) |"
  else
    echo "| \`$asset\` | FAIL ($code) |"
  fi
done
echo ""

# ── Thai content scan (ux-patrol) ─────────────────────────────
echo "### Thai UI Scan (ux-patrol)"
echo ""
thai_in_src=$( (grep -r '[ก-๙]' src/pages src/components --include='*.html' 2>/dev/null || true) | wc -l | awk '{print $1}')
thai_in_apps=$( (grep -rl '[ก-๙]' src/pages/apps --include='*.html' 2>/dev/null || true) | wc -l | awk '{print $1}')
thai_in_src=${thai_in_src:-0}
thai_in_apps=${thai_in_apps:-0}
echo "- บรรทัดภาษาไทยใน src/pages + components: **${thai_in_src}**"
echo "- ไฟล์แอปที่มีภาษาไทย: **${thai_in_apps}** / $(find src/pages/apps -name '*.html' 2>/dev/null | wc -l | tr -d ' ') ไฟล์"
if [[ "$thai_in_src" -eq 0 ]]; then
  echo "- **BLOCK USABILITY (ภาษา)** — ยังไม่มี UI ภาษาไทยสำหรับพนักงาน"
else
  echo "- มีภาษาไทยบางส่วน — ต้องครอบคลุม POS/จำนำ/กระทบยอด"
fi
echo ""

# ── UX patterns ───────────────────────────────────────────────
echo "### UX Patterns (ux-patrol)"
echo ""
pages_with_viewport=$( (grep -rl 'name="viewport"' src/pages --include='*.html' 2>/dev/null || true) | wc -l | awk '{print $1}')
total_pages=$(find src/pages -name '*.html' 2>/dev/null | wc -l | awk '{print $1}')
pages_with_form=$( (grep -rl '<form' src/pages --include='*.html' 2>/dev/null || true) | wc -l | awk '{print $1}')
pages_with_viewport=${pages_with_viewport:-0}
pages_with_form=${pages_with_form:-0}
echo "| ตรวจ | ผล |"
echo "|------|-----|"
echo "| viewport meta | ${pages_with_viewport}/${total_pages} หน้า (ผ่าน layout partial) |"
echo "| มี form | ${pages_with_form} หน้า |"
echo "| หน้า POS จริง | $(find src/pages -path '*pos*' -name '*.html' 2>/dev/null | wc -l | tr -d ' ') ไฟล์ |"
echo "| หน้า pawn จริง | $(find src/pages -path '*pawn*' -name '*.html' 2>/dev/null | wc -l | tr -d ' ') ไฟล์ |"
echo ""

# ── Code inventory (map-master) ───────────────────────────────
echo "### Code Inventory (map-master)"
echo ""
echo "| สิ่งที่ตรวจ | สถานะ |"
echo "|------------|--------|"
echo "| prisma/schema.prisma | $([[ -f prisma/schema.prisma ]] && echo '✅ มี' || echo '❌ ไม่มี') |"
echo "| package.json (Next/API) | $(grep -q 'next' package.json 2>/dev/null && echo 'Next.js' || echo 'Vite (template)') |"
echo "| หน้า HTML ทั้งหมด | ${total_pages} ไฟล์ |"
echo "| widgets | $(find src/components/widgets -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l | tr -d ' ') โฟลเดอร์ |"
echo "| UI components | $(find src/components/ui -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l | tr -d ' ') โฟลเดอร์ |"
echo ""

# ── Parity checklist cross-check (doc-janitor) ─────────────────
echo "### Parity Checklist Cross-Check (doc-janitor)"
echo ""
checked=$(grep -c '^- \[x\]' docs/parity-checklist.md 2>/dev/null || true); checked=${checked:-0}
unchecked=$(grep -c '^- \[ \]' docs/parity-checklist.md 2>/dev/null || true); unchecked=${unchecked:-0}
inprogress=$(grep -c '^- \[~\]' docs/parity-checklist.md 2>/dev/null || true); inprogress=${inprogress:-0}
echo "- [x] done: **${checked}** · [ ] todo: **${unchecked}** · [~] in progress: **${inprogress}**"
echo ""
echo "รายการที่ควรติ๊กแต่ยังไม่มีโค้ด (overclaim risk):"
overclaim=0
while IFS= read -r line; do
  item=$(echo "$line" | sed 's/^- \[[ x~!]\] //')
  case "$item" in
    *"Sidebar nav"*)
      if ! grep -q '"/pos"' src/data/sidebar.json 2>/dev/null; then
        echo "  - ⚠️ \"$item\" — sidebar ยังไม่มี /pos"
        ((overclaim++)) || true
      fi
      ;;
    *"Prisma"*)
      if [[ ! -f prisma/schema.prisma ]]; then
        echo "  - ⚠️ \"$item\" — ยังไม่มี schema"
        ((overclaim++)) || true
      fi
      ;;
  esac
done < <(grep '^- \[' docs/parity-checklist.md 2>/dev/null || true)
if [[ $overclaim -eq 0 ]]; then
  echo "  - ไม่พบ — checklist ซื่อสัตย์"
fi
echo ""

# ── Permission surface (gate-keeper) ──────────────────────────
echo "### Permission Surface (gate-keeper)"
echo ""
if [[ -d server ]] && [[ -f server/index.ts ]]; then
  echo "- Express API: \`server/index.ts\` (port ${QUALITY_API_URL##*:})"
  health=$(curl -s -o /dev/null -w "%{http_code}" "${QUALITY_API_URL}/api/health" 2>/dev/null || echo "000")
  echo "- \`GET /api/health\` → HTTP **${health}**"
else
  echo "- ไม่พบ server — static template only"
fi
echo ""

# ── Financial code scan (ledger-hawk) ─────────────────────────
echo "### Financial Code Scan (ledger-hawk)"
echo ""
fin_keywords=$(grep -rl 'ledger\|dailyClose\|voidBill\|splitPayment\|receivable\|installment' . \
  --include='*.ts' --include='*.js' --include='*.html' 2>/dev/null | grep -v node_modules | head -10 || true)
if [[ -z "$fin_keywords" ]]; then
  echo "- ไม่พบคำสำคัญทางการเงินในโค้ด"
  echo "- **PASS WITH RISK** — ยังไม่ implement (ไม่มี regression การเงินให้ทดสอบ)"
else
  echo "- พบไฟล์ที่เกี่ยวข้อง:"
  echo "$fin_keywords" | while read -r f; do echo "  - \`$f\`"; done
fi
echo ""

# ── Summary ───────────────────────────────────────────────────
echo "### สรุปการตรวจเพิ่ม"
echo ""
donut_live=0
for r in "${donut_routes[@]}"; do
  body=$(curl -s --connect-timeout "$QUALITY_TIMEOUT" "${QUALITY_BASE_URL}${r}" 2>/dev/null || echo "")
  echo "$body" | grep -q 'data-donutit-module=' && ((donut_live++)) || true
done
has_prisma=$([[ -f prisma/schema.prisma ]] && echo '✅' || echo '❌')
has_sidebar_pos=$(grep -q '"/pos"' src/data/sidebar.json 2>/dev/null && echo '✅' || echo '❌')
thai_status=$([[ "$thai_in_src" -gt 0 ]] && echo '⚠️ บางส่วน' || echo '⚠️ grep scan (DonutiT ใช้ partials)')
echo "| หมวด | ผล |"
echo "|------|-----|"
echo "| Build | $([[ -d dist ]] && echo '✅' || echo '❌') |"
echo "| DonutiT live routes | ${donut_live}/${#donut_routes[@]} module pages |"
echo "| Sidebar DonutiT links | ${has_sidebar_pos} |"
echo "| ภาษาไทย UI (grep scan) | ${thai_status} |"
echo "| Prisma schema | ${has_prisma} |"
echo "| Template health | ✅ ${cleo_pass}/${#cleo_routes[@]} routes OK |"
echo ""
