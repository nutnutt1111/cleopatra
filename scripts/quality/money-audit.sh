#!/usr/bin/env bash
# money-invariant-auditor — post-hardening DB integrity checks (read-only)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

echo "# money-invariant-auditor"
echo ""

"$ROOT/node_modules/.bin/tsx" "$ROOT/scripts/quality/money-audit.ts"
