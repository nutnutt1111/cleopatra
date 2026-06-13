import 'dotenv/config';
import { prisma } from '../server/lib/prisma.js';
import { postLedgerEntry } from '../server/lib/ledger.js';
import { closeDay } from '../server/lib/daily-close.js';
import { toAuthUser } from '../server/lib/auth.js';
import { createPosBill } from '../server/lib/pos.js';
import bcrypt from 'bcryptjs';

const DEV_PASSWORD = 'donutit-dev';

function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

async function main() {
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);

  const store = await prisma.store.upsert({
    where: { code: 'DNT-001' },
    update: {},
    create: {
      name: 'DonutiT สาขาหลัก',
      code: 'DNT-001',
    },
  });

  const users = [
    { email: 'owner@donutit.local', name: 'เจ้าของร้าน', role: 'OWNER' as const, canExportReports: true },
    { email: 'manager@donutit.local', name: 'ผู้จัดการ', role: 'MANAGER' as const, canExportReports: true },
    { email: 'staff@donutit.local', name: 'พนักงานขาย', role: 'STAFF' as const, canExportReports: false },
    { email: 'hr@donutit.local', name: 'ฝ่ายบุคคล', role: 'HR' as const, canExportReports: false },
  ];

  const userRecords = [];
  for (const u of users) {
    const rec = await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash, name: u.name, role: u.role, canExportReports: u.canExportReports },
      create: { ...u, passwordHash, storeId: store.id },
    });
    userRecords.push(rec);
  }

  const owner = userRecords.find((u) => u.role === 'OWNER')!;

  // Clear seed data (order matters for FKs)
  await prisma.stockMovement.deleteMany({ where: { storeId: store.id } });
  await prisma.posPayment.deleteMany({ where: { bill: { storeId: store.id } } });
  await prisma.posBillLine.deleteMany({ where: { bill: { storeId: store.id } } });
  await prisma.posBill.deleteMany({ where: { storeId: store.id } });
  await prisma.serialItem.deleteMany({ where: { storeId: store.id } });
  await prisma.product.deleteMany({ where: { storeId: store.id } });
  await prisma.auditLog.deleteMany({ where: { storeId: store.id } });
  await prisma.ledgerEntry.deleteMany({ where: { storeId: store.id } });
  await prisma.dailyClose.deleteMany({ where: { storeId: store.id } });

  const today = daysAgo(0);
  const yesterday = daysAgo(1);
  const twoDaysAgo = daysAgo(2);

  // วันก่อนเมื่อวาน — ปิดแล้ว (locked)
  await postLedgerEntry({
    storeId: store.id,
    userId: owner.id,
    entryDate: twoDaysAgo,
    type: 'INCOME',
    channel: 'CASH',
    amountCents: 150000,
    description: 'ขายสดเปิดร้าน',
    referenceType: 'SEED',
  });
  await postLedgerEntry({
    storeId: store.id,
    userId: owner.id,
    entryDate: twoDaysAgo,
    type: 'EXPENSE',
    channel: 'CASH',
    amountCents: 35000,
    description: 'ค่าใช้จ่ายเบ็ดเตล็ด',
    referenceType: 'SEED',
  });

  await closeDay(toAuthUser(owner), twoDaysAgo, 'ปิดวันทดสอบ (seed)');

  // เมื่อวาน — มีรายการ ยังไม่ปิด
  await postLedgerEntry({
    storeId: store.id,
    userId: owner.id,
    entryDate: yesterday,
    type: 'INCOME',
    channel: 'TRANSFER',
    amountCents: 89000,
    description: 'โอนเข้าจากลูกค้า',
    referenceType: 'SEED',
  });

  // วันนี้
  await postLedgerEntry({
    storeId: store.id,
    userId: owner.id,
    entryDate: today,
    type: 'INCOME',
    channel: 'CASH',
    amountCents: 25000,
    description: 'เปิดกะเช้า',
    referenceType: 'SEED',
  });

  // Wave 2 — Products
  const phone = await prisma.product.create({
    data: {
      storeId: store.id,
      sku: 'PHONE-001',
      name: 'มือถือมือสอง',
      trackingType: 'SERIALIZED',
      priceCents: 890000,
      costCents: 750000,
    },
  });
  const serial1 = await prisma.serialItem.create({
    data: { storeId: store.id, productId: phone.id, serialNumber: 'SN-001-A', costCents: 750000 },
  });
  const serial2 = await prisma.serialItem.create({
    data: { storeId: store.id, productId: phone.id, serialNumber: 'SN-001-B', costCents: 760000 },
  });

  const cable = await prisma.product.create({
    data: {
      storeId: store.id,
      sku: 'CABLE-USB',
      name: 'สายชาร์จ USB',
      trackingType: 'QUANTITY',
      priceCents: 15000,
      costCents: 8000,
      qtyOnHand: 50,
    },
  });

  const staff = userRecords.find((u) => u.role === 'STAFF')!;

  // Sample split-payment bill (cash + transfer) — uses serial1
  const sampleBill = await createPosBill(toAuthUser(staff), {
    lines: [{ productId: phone.id, serialItemId: serial1.id }],
    payments: [
      { channel: 'CASH', amountCents: 500000 },
      { channel: 'TRANSFER', amountCents: 390000 },
    ],
  });

  console.log('Seed complete — store:', store.code);
  console.log('Ledger: 4 manual entries + POS bill', sampleBill.billNumber);
  console.log('Products: phone (2 serial), cable (qty 50→49 after sale)');
  console.log('Dev password:', DEV_PASSWORD);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
