#!/usr/bin/env bash
# money-invariant-auditor — post-hardening DB integrity checks (read-only)
set -euo pipefail
cd "$(dirname "$0")/../.."

pass=0
fail=0
warn=0

ok() { echo "PASS  $1"; ((pass++)) || true; }
bad() { echo "FAIL  $1"; ((fail++)) || true; }
nit() { echo "WARN  $1"; ((warn++)) || true; }

echo "# money-invariant-auditor"
echo ""

node --input-type=module -e "
import { PrismaClient } from './src/generated/prisma/client.js';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { resolve } from 'path';

const url = process.env.DATABASE_URL || 'file:./dev.db';
const dbPath = url.startsWith('file:') ? resolve(process.cwd(), url.replace('file:', '')) : url;
const adapter = new PrismaBetterSqlite3({ url: dbPath.startsWith('file:') ? dbPath : 'file:' + dbPath });
const prisma = new PrismaClient({ adapter });

const issues = [];
const passes = [];

// Duplicate non-void ledger by reference
const ledger = await prisma.ledgerEntry.findMany({ where: { isVoided: false } });
const refMap = new Map();
for (const e of ledger) {
  const k = e.referenceType + ':' + e.referenceId;
  if (e.referenceId) {
    const arr = refMap.get(k) || [];
    arr.push(e.id);
    refMap.set(k, arr);
  }
}
for (const [k, ids] of refMap) {
  if (ids.length > 1 && !k.startsWith('MANUAL')) {
    issues.push('duplicate active ledger ref ' + k + ' ids=' + ids.join(','));
  }
}

// Duplicate pawn interest periodKey
const pawnPay = await prisma.pawnPayment.findMany({ where: { type: 'INTEREST', periodKey: { not: null } } });
const pk = new Map();
for (const p of pawnPay) {
  if (pk.has(p.periodKey)) issues.push('duplicate periodKey ' + p.periodKey);
  pk.set(p.periodKey, p.id);
}

// Customer balance vs credit sales - payments
const customers = await prisma.customer.findMany();
for (const c of customers) {
  const sales = await prisma.creditSale.aggregate({ where: { customerId: c.id }, _sum: { totalCents: true } });
  const pays = await prisma.customerPayment.aggregate({ where: { customerId: c.id }, _sum: { amountCents: true } });
  const expected = (sales._sum.totalCents || 0) - (pays._sum.amountCents || 0);
  if (expected !== c.balanceCents) {
    issues.push('customer ' + c.name + ' balance mismatch: stored=' + c.balanceCents + ' expected=' + expected);
  }
  if (c.creditLimitCents > 0 && c.balanceCents > c.creditLimitCents) {
    // owner override allowed — check audit
    nit('customer ' + c.name + ' balance ' + c.balanceCents + ' > limit ' + c.creditLimitCents + ' (owner override?)');
  }
}

// Pawn payment count vs ticket state
const tickets = await prisma.pawnTicket.findMany({ include: { payments: true } });
for (const t of tickets) {
  const interest = t.payments.filter(p => p.type === 'INTEREST').length;
  if (t.status === 'REDEEMED' && t.payments.filter(p => p.type === 'REDEEM').length !== 1) {
    issues.push('ticket ' + t.ticketNumber + ' REDEEMED but redeem payments != 1');
  }
  if (interest > 0 && t.status === 'ACTIVE') {
    passes.push('ticket ' + t.ticketNumber + ' interest payments=' + interest);
  }
}

// Void bills should have voided ledger
const voidBills = await prisma.posBill.findMany({ where: { status: 'VOIDED' } });
for (const b of voidBills) {
  const active = await prisma.ledgerEntry.count({ where: { referenceType: 'POS', referenceId: b.id, isVoided: false } });
  if (active > 0) issues.push('void bill ' + b.billNumber + ' still has active ledger entries');
}

// Messenger delivered — one income ledger per job
const delivered = await prisma.deliveryJob.findMany({ where: { status: 'DELIVERED', deliveryFeeCents: { gt: 0 } } });
for (const j of delivered) {
  const active = await prisma.ledgerEntry.count({ where: { referenceType: 'MESSENGER', referenceId: j.id, isVoided: false } });
  if (active > 1) issues.push('job ' + j.jobNumber + ' has ' + active + ' active ledger entries');
  if (active === 0) issues.push('job ' + j.jobNumber + ' delivered with fee but no ledger');
}

await prisma.\$disconnect();

for (const p of passes.slice(0, 3)) console.log('INFO  ' + p);
if (issues.length === 0) {
  console.log('PASS  all money invariants checked');
  process.exit(0);
} else {
  for (const i of issues) console.log('FAIL  ' + i);
  process.exit(1);
}
" 2>&1 | tee /tmp/money-audit.txt

exit_code=${PIPESTATUS[0]}
grep -q '^PASS' /tmp/money-audit.txt && ok "money invariant scan" || true
grep '^FAIL' /tmp/money-audit.txt | while read -r line; do bad "$line"; done || true

echo ""
echo "Summary: scan exit=$exit_code"
