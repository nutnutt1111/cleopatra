#!/usr/bin/env bash
# money-invariant-auditor — post-hardening DB integrity checks (read-only)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

echo "# money-invariant-auditor"
echo ""

tsx -e "
import { prisma } from './server/lib/prisma.js';

const issues = [];

// Duplicate pawn interest periodKey
const pawnPay = await prisma.pawnPayment.findMany({ where: { type: 'INTEREST', periodKey: { not: null } } });
const pk = new Set();
for (const p of pawnPay) {
  if (pk.has(p.periodKey!)) issues.push('duplicate periodKey ' + p.periodKey);
  pk.add(p.periodKey!);
}

// Customer balance = sales - payments
const customers = await prisma.customer.findMany();
for (const c of customers) {
  const sales = await prisma.creditSale.aggregate({ where: { customerId: c.id }, _sum: { totalCents: true } });
  const pays = await prisma.customerPayment.aggregate({ where: { customerId: c.id }, _sum: { amountCents: true } });
  const expected = (sales._sum.totalCents || 0) - (pays._sum.amountCents || 0);
  if (expected !== c.balanceCents) {
    issues.push('customer ' + c.name + ' balance mismatch: stored=' + c.balanceCents + ' expected=' + expected);
  }
  if (c.creditLimitCents > 0 && c.balanceCents > c.creditLimitCents) {
    console.log('WARN  customer ' + c.name + ' over limit (owner override?)');
  }
}

// Void bills — original INCOME entries must be voided
const voidBills = await prisma.posBill.findMany({ where: { status: 'VOIDED' } });
for (const b of voidBills) {
  const activeIncome = await prisma.ledgerEntry.count({
    where: { referenceType: 'POS', referenceId: b.id, type: 'INCOME', isVoided: false },
  });
  if (activeIncome > 0) issues.push('void bill ' + b.billNumber + ' has unvoided INCOME ledger');
}

// Messenger — one active fee ledger per delivered job
const delivered = await prisma.deliveryJob.findMany({ where: { status: 'DELIVERED', deliveryFeeCents: { gt: 0 } } });
for (const j of delivered) {
  const active = await prisma.ledgerEntry.count({ where: { referenceType: 'MESSENGER', referenceId: j.id, isVoided: false } });
  if (active !== 1) issues.push('job ' + j.jobNumber + ' active ledger count=' + active + ' (expected 1)');
}

await prisma.\$disconnect();

if (issues.length === 0) {
  console.log('PASS  all money invariants checked');
  process.exit(0);
}
for (const i of issues) console.log('FAIL  ' + i);
process.exit(1);
"
