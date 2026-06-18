import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@shared/api';

export type Employee = {
  id: string;
  employeeCode: string;
  name: string;
  phone: string | null;
  position: string | null;
  hireDate: string;
  salaryBaht: string | null;
};

export type PayrollRun = {
  id: string;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  totalBaht: string;
  status: string;
  lines: { employeeName: string; employeeCode: string; amountBaht: string }[];
};

type HrMeta = { canManage: boolean; canViewPayroll: boolean };

export function useHrEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [meta, setMeta] = useState<HrMeta>({ canManage: false, canViewPayroll: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/api/hr/employees');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'โหลดพนักงานไม่สำเร็จ');
      setEmployees(data.employees);
      setMeta({ canManage: data.canManage, canViewPayroll: data.canViewPayroll });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดพนักงานไม่สำเร็จ');
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { employees, meta, loading, error, reload };
}

export function usePayrollRuns(enabled: boolean) {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/api/hr/payroll');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'โหลดเงินเดือนไม่สำเร็จ');
      setRuns(data.runs);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดเงินเดือนไม่สำเร็จ');
      setRuns([]);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { runs, loading, error, reload };
}

function monthStartStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function defaultPayrollPeriod() {
  return { periodStart: monthStartStr(), periodEnd: todayStr() };
}
