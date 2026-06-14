#!/usr/bin/env bash
# Wave 5 hardening — full automated quality gate
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== DonutiT Hardening Gate (Wave 5) ==="
echo ""

bash "$SCRIPT_DIR/route-smoke.sh"
echo ""
bash "$SCRIPT_DIR/api-smoke.sh"
echo ""
bash "$SCRIPT_DIR/hardtest.sh"
echo ""
bash "$SCRIPT_DIR/seed-verify.sh"
echo ""
bash "$SCRIPT_DIR/ux-patrol.sh"

echo ""
echo "=== Hardening gate: ALL PASS ==="
