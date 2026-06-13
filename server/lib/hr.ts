import { prisma } from './prisma.js';
import type { AuthUser } from './auth.js';
import { assertHrManageAccess, assertHrPayrollAccess } from './auth.js';
import { assertDateNotLocked, postLedgerEntry } from './ledger.js';
import { toDateOnly } from './ledger-utils.js';

export class HrError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = 'HrError';
    this.status = status;
  }
}

async function nextEmployeeCode(storeId: string): Promise<string> {
  const count = await prisma.employee.count({ where: { storeId } });
  return `EMP-${String(count + 1).padStart(3, '0')}`;
}

export async function createEmployee(
  user: AuthUser,
  input: {
    name: string;
    phone?: string;
    position?: string;
    salaryCents: number;
    hireDate?: string | Date;
  },
) {
  assertHrManageAccess(user);

  if (!input.name.trim()) throw new HrError('กรุณาระบุชื่อพนักงาน');
  if (input.salaryCents < 0) throw new HrError('เงินเดือนต้องไม่ต่ำกว่า 0');

  const employeeCode = await nextEmployeeCode(user.storeId);
  const hireDate = toDateOnly(input.hireDate ?? new Date());

  const employee = await prisma.employee.create({
    data: {
      storeId: user.storeId,
      employeeCode,
      name: input.name.trim(),
      phone: input.phone?.trim() ?? null,
      position: input.position?.trim() ?? null,
      salaryCents: input.salaryCents,
      hireDate,
      createdById: user.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      storeId: user.storeId,
      userId: user.id,
      action: 'HR_EMPLOYEE_CREATE',
      entityType: 'Employee',
      entityId: employee.id,
      payload: JSON.stringify({ employeeCode, salaryCents: input.salaryCents }),
    },
  });

  return employee;
}

export async function createPayrollRun(
  user: AuthUser,
  input: {
    periodLabel: string;
    periodStart: string | Date;
    periodEnd: string | Date;
  },
) {
  assertHrPayrollAccess(user);

  if (!input.periodLabel.trim()) throw new HrError('กรุณาระบุชื่อรอบเงินเดือน');

  const periodStart = toDateOnly(input.periodStart);
  const periodEnd = toDateOnly(input.periodEnd);
  if (periodEnd < periodStart) throw new HrError('วันสิ้นสุดต้องไม่ก่อนวันเริ่ม');

  const employees = await prisma.employee.findMany({
    where: { storeId: user.storeId, isActive: true },
  });
  if (!employees.length) throw new HrError('ไม่มีพนักงานที่ใช้งานอยู่');

  const lines = employees.map((e) => ({
    employeeId: e.id,
    amountCents: e.salaryCents,
  }));
  const totalCents = lines.reduce((s, l) => s + l.amountCents, 0);

  return prisma.$transaction(async (tx) => {
    const run = await tx.payrollRun.create({
      data: {
        storeId: user.storeId,
        periodLabel: input.periodLabel.trim(),
        periodStart,
        periodEnd,
        totalCents,
        createdById: user.id,
        lines: { create: lines },
      },
      include: { lines: { include: { employee: true } } },
    });

    await tx.auditLog.create({
      data: {
        storeId: user.storeId,
        userId: user.id,
        action: 'PAYROLL_RUN',
        entityType: 'PayrollRun',
        entityId: run.id,
        payload: JSON.stringify({ periodLabel: run.periodLabel, totalCents, employeeCount: lines.length }),
      },
    });

    return run;
  });
}

export async function payPayrollRun(user: AuthUser, runId: string) {
  assertHrPayrollAccess(user);

  const run = await prisma.payrollRun.findFirst({
    where: { id: runId, storeId: user.storeId },
    include: { lines: { include: { employee: true } } },
  });
  if (!run) throw new HrError('ไม่พบรอบเงินเดือน', 404);
  if (run.status === 'PAID') throw new HrError('รอบนี้จ่ายเงินเดือนแล้ว');
  if (run.totalCents <= 0) throw new HrError('ยอดเงินเดือนรวมต้องมากกว่า 0');

  const entryDate = toDateOnly(new Date());
  await assertDateNotLocked(user.storeId, entryDate);

  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const updated = await tx.payrollRun.update({
      where: { id: run.id },
      data: {
        status: 'PAID',
        paidAt: now,
        paidById: user.id,
      },
      include: { lines: { include: { employee: true } } },
    });

    await postLedgerEntry(
      {
        storeId: user.storeId,
        userId: user.id,
        entryDate,
        type: 'EXPENSE',
        channel: 'TRANSFER',
        amountCents: run.totalCents,
        description: `เงินเดือน ${run.periodLabel}`,
        referenceType: 'PAYROLL',
        referenceId: run.id,
      },
      tx,
    );

    await tx.auditLog.create({
      data: {
        storeId: user.storeId,
        userId: user.id,
        action: 'PAYROLL_PAY',
        entityType: 'PayrollRun',
        entityId: run.id,
        payload: JSON.stringify({ periodLabel: run.periodLabel, totalCents: run.totalCents }),
      },
    });

    return updated;
  });
}
