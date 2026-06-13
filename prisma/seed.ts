import 'dotenv/config';
import { prisma } from '../server/lib/prisma.js';
import bcrypt from 'bcryptjs';

const DEV_PASSWORD = 'donutit-dev';

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
    {
      email: 'owner@donutit.local',
      name: 'เจ้าของร้าน',
      role: 'OWNER' as const,
      canExportReports: true,
    },
    {
      email: 'manager@donutit.local',
      name: 'ผู้จัดการ',
      role: 'MANAGER' as const,
      canExportReports: true,
    },
    {
      email: 'staff@donutit.local',
      name: 'พนักงานขาย',
      role: 'STAFF' as const,
      canExportReports: false,
    },
    {
      email: 'hr@donutit.local',
      name: 'ฝ่ายบุคคล',
      role: 'HR' as const,
      canExportReports: false,
    },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash, name: u.name, role: u.role, canExportReports: u.canExportReports },
      create: {
        ...u,
        passwordHash,
        storeId: store.id,
      },
    });
  }

  console.log('Seed complete — store:', store.code);
  console.log('Dev password for all users:', DEV_PASSWORD);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
