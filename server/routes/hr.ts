import { Router } from 'express';
import type { AuthUser } from '../lib/auth.js';
import {
  assertHrManageAccess,
  assertHrPayrollAccess,
  AuthError,
  canViewEmployees,
  canViewSalary,
} from '../lib/auth.js';
import { createEmployee, createPayrollRun, HrError, payPayrollRun } from '../lib/hr.js';
import { formatBaht } from '../lib/ledger-utils.js';
import { prisma } from '../lib/prisma.js';

type AuthedRequest = { user: AuthUser };

export function createHrRouter(
  requireAuth: (req: AuthedRequest, res: unknown, next: () => void) => void,
  handleError: (err: unknown, res: { status: (n: number) => { json: (b: unknown) => void } }) => void,
) {
  const router = Router();

  router.get('/employees', requireAuth, async (req, res) => {
    try {
      const user = (req as AuthedRequest).user;
      if (!canViewEmployees(user)) {
        throw new AuthError('ไม่มีสิทธิ์ดูข้อมูลพนักงาน', 403);
      }

      const showSalary = canViewSalary(user);
      const employees = await prisma.employee.findMany({
        where: { storeId: user.storeId, isActive: true },
        orderBy: { name: 'asc' },
      });

      res.json({
        employees: employees.map((e) => ({
          id: e.id,
          employeeCode: e.employeeCode,
          name: e.name,
          phone: e.phone,
          position: e.position,
          hireDate: e.hireDate.toISOString().slice(0, 10),
          salaryBaht: showSalary ? formatBaht(e.salaryCents) : null,
          salaryCents: showSalary ? e.salaryCents : null,
        })),
        canManage: user.role === 'OWNER' || user.role === 'HR',
        canViewPayroll: showSalary,
      });
    } catch (err) {
      handleError(err, res);
    }
  });

  router.post('/employees', requireAuth, async (req, res) => {
    try {
      const user = (req as AuthedRequest).user;
      assertHrManageAccess(user);

      const body = req.body as {
        name?: string;
        phone?: string;
        position?: string;
        salary?: number;
        hireDate?: string;
      };

      const employee = await createEmployee(user, {
        name: body.name ?? '',
        phone: body.phone,
        position: body.position,
        salaryCents: Math.round((body.salary ?? 0) * 100),
        hireDate: body.hireDate,
      });

      res.status(201).json({
        employee: {
          id: employee.id,
          employeeCode: employee.employeeCode,
          name: employee.name,
          salaryBaht: formatBaht(employee.salaryCents),
        },
      });
    } catch (err) {
      handleError(err, res);
    }
  });

  router.get('/payroll', requireAuth, async (req, res) => {
    try {
      const user = (req as AuthedRequest).user;
      assertHrPayrollAccess(user);

      const runs = await prisma.payrollRun.findMany({
        where: { storeId: user.storeId },
        include: {
          lines: { include: { employee: true } },
          createdBy: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });

      res.json({
        runs: runs.map((r) => ({
          id: r.id,
          periodLabel: r.periodLabel,
          periodStart: r.periodStart.toISOString().slice(0, 10),
          periodEnd: r.periodEnd.toISOString().slice(0, 10),
          totalBaht: formatBaht(r.totalCents),
          totalCents: r.totalCents,
          status: r.status,
          paidAt: r.paidAt?.toISOString() ?? null,
          createdByName: r.createdBy.name,
          lines: r.lines.map((l) => ({
            employeeName: l.employee.name,
            employeeCode: l.employee.employeeCode,
            amountBaht: formatBaht(l.amountCents),
          })),
        })),
      });
    } catch (err) {
      handleError(err, res);
    }
  });

  router.post('/payroll', requireAuth, async (req, res) => {
    try {
      const user = (req as AuthedRequest).user;
      assertHrPayrollAccess(user);

      const body = req.body as {
        periodLabel?: string;
        periodStart?: string;
        periodEnd?: string;
      };

      const run = await createPayrollRun(user, {
        periodLabel: body.periodLabel ?? '',
        periodStart: body.periodStart ?? new Date().toISOString().slice(0, 10),
        periodEnd: body.periodEnd ?? new Date().toISOString().slice(0, 10),
      });

      res.status(201).json({
        run: {
          id: run.id,
          periodLabel: run.periodLabel,
          totalBaht: formatBaht(run.totalCents),
          employeeCount: run.lines.length,
        },
      });
    } catch (err) {
      handleError(err, res);
    }
  });

  router.post('/payroll/:id/pay', requireAuth, async (req, res) => {
    try {
      const user = (req as AuthedRequest).user;
      assertHrPayrollAccess(user);

      const run = await payPayrollRun(user, req.params.id);
      res.json({
        ok: true,
        periodLabel: run.periodLabel,
        totalBaht: formatBaht(run.totalCents),
      });
    } catch (err) {
      handleError(err, res);
    }
  });

  return router;
}

export function handleHrError(err: unknown, res: { status: (n: number) => { json: (b: unknown) => void } }) {
  if (err instanceof HrError) {
    res.status(err.status).json({ error: err.message });
    return true;
  }
  return false;
}
