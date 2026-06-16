import { prisma } from '../../server/lib/prisma.js';

const issues: string[] = [];

const pawnPay = await prisma.pawnPayment.findMany({
  where: { type: 'INTEREST', periodKey: { not: null } },
});
const pk = new Set<string>();
for (const p of pawnPay) {
  if (p.periodKey && pk.has(p.periodKey)) issues.push(`duplicate periodKey ${p.periodKey}`);
  if (p.periodKey) pk.add(p.periodKey);
}

const customers = await prisma.customer.findMany();
for (const c of customers) {
  const sales = await prisma.creditSale.aggregate({
    where: { customerId: c.id },
    _sum: { totalCents: true },
  });
  const pays = await prisma.customerPayment.aggregate({
    where: { customerId: c.id },
    _sum: { amountCents: true },
  });
  const expected = (sales._sum.totalCents || 0) - (pays._sum.amountCents || 0);
  if (expected !== c.balanceCents) {
    issues.push(
      `customer ${c.name} balance mismatch: stored=${c.balanceCents} expected=${expected}`,
    );
  }
  if (c.creditLimitCents > 0 && c.balanceCents > c.creditLimitCents) {
    console.log(`WARN  customer ${c.name} over limit (owner override?)`);
  }
}

const voidBills = await prisma.posBill.findMany({ where: { status: 'VOIDED' } });
for (const b of voidBills) {
  const activeIncome = await prisma.ledgerEntry.count({
    where: { referenceType: 'POS', referenceId: b.id, type: 'INCOME', isVoided: false },
  });
  if (activeIncome > 0) {
    issues.push(`void bill ${b.billNumber} has unvoided INCOME ledger`);
  }
}

const delivered = await prisma.deliveryJob.findMany({
  where: { status: 'DELIVERED', deliveryFeeCents: { gt: 0 } },
});
for (const j of delivered) {
  const active = await prisma.ledgerEntry.count({
    where: { referenceType: 'MESSENGER', referenceId: j.id, isVoided: false },
  });
  if (active !== 1) {
    issues.push(`job ${j.jobNumber} active ledger count=${active} (expected 1)`);
  }
}

await prisma.$disconnect();

if (issues.length === 0) {
  console.log('PASS  all money invariants checked');
  process.exit(0);
}
for (const i of issues) console.log(`FAIL  ${i}`);
process.exit(1);
