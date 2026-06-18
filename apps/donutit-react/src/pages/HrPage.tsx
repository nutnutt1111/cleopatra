import { FormEvent, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { apiFetch, getSessionUser } from '@shared/api';
import { EmployeeList } from '../components/hr/EmployeeList';
import { useHrEmployees, usePayrollRuns, defaultPayrollPeriod, type PayrollRun } from '../hooks/useHrEmployees';
import { useToast } from '../components/ui/Toast';

function PayrollHistory({ runs, loading }: { runs: PayrollRun[]; loading: boolean }) {
  if (loading) return <p className="text-sm text-[var(--muted-foreground)]">กำลังโหลด…</p>;
  if (!runs.length) return <p className="text-sm text-[var(--muted-foreground)]">ยังไม่มีประวัติ</p>;

  return (
    <div className="space-y-2 max-h-[280px] overflow-y-auto">
      {runs.map((r) => (
        <div key={r.id} className="cleo-panel p-3 text-sm">
          <p className="font-medium">{r.periodLabel}</p>
          <p className="text-xs text-[var(--muted-foreground)]">
            {r.periodStart} — {r.periodEnd}
          </p>
          <p className="mt-1">
            รวม <strong>{r.totalBaht}</strong> บาท · {r.lines.length} คน{' '}
            <span
              className={`text-xs px-2 py-0.5 rounded-full ml-1 ${
                r.status === 'PAID' ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'
              }`}
            >
              {r.status === 'PAID' ? 'จ่ายแล้ว' : 'รอจ่าย'}
            </span>
          </p>
        </div>
      ))}
    </div>
  );
}

export function HrPage() {
  const user = getSessionUser();
  const toast = useToast();
  const { employees, meta, loading, error, reload } = useHrEmployees();
  const payroll = usePayrollRuns(meta.canViewPayroll);
  const defaults = defaultPayrollPeriod();

  const [empForm, setEmpForm] = useState({ name: '', phone: '', position: '', salary: '' });
  const [payrollForm, setPayrollForm] = useState({
    periodLabel: '',
    periodStart: defaults.periodStart,
    periodEnd: defaults.periodEnd,
  });

  if (user?.role === 'MANAGER') return <Navigate to="/manager-hr" replace />;
  if (user && user.role !== 'OWNER' && user.role !== 'HR') {
    return <p className="text-sm text-red-400">ไม่มีสิทธิ์เข้าหน้านี้</p>;
  }

  async function addEmployee(e: FormEvent) {
    e.preventDefault();
    if (!empForm.name.trim()) return toast.show('กรอกชื่อพนักงาน', 'warning');
    try {
      const res = await apiFetch('/api/hr/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: empForm.name.trim(),
          phone: empForm.phone.trim() || undefined,
          position: empForm.position.trim() || undefined,
          salary: parseFloat(empForm.salary || '0'),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEmpForm({ name: '', phone: '', position: '', salary: '' });
      await reload();
      toast.show('บันทึกพนักงานแล้ว', 'success');
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ', 'error');
    }
  }

  async function runPayroll() {
    if (!payrollForm.periodLabel.trim()) return toast.show('กรอกชื่อรอบเงินเดือน', 'warning');
    if (!confirm(`จ่ายเงินเดือนรอบ "${payrollForm.periodLabel}"? จะบันทึกเป็นรายจ่ายใน ledger`)) return;
    try {
      const createRes = await apiFetch('/api/hr/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payrollForm),
      });
      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.error);

      const payRes = await apiFetch(`/api/hr/payroll/${createData.run.id}/pay`, { method: 'POST' });
      const payData = await payRes.json();
      if (!payRes.ok) throw new Error(payData.error);

      toast.show(`จ่ายเงินเดือน ${payData.periodLabel} — ${payData.totalBaht} บาทสำเร็จ`, 'success');
      setPayrollForm((f) => ({ ...f, periodLabel: '' }));
      payroll.reload();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'จ่ายเงินเดือนไม่สำเร็จ', 'error');
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold">บุคลากร (HR)</h1>
        <p className="text-sm text-[var(--muted-foreground)]">พนักงาน · เงินเดือน — Owner/HR</p>
      </div>
      {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="space-y-4">
          {meta.canManage && (
            <form onSubmit={addEmployee} className="cleo-sheet cleo-sheet__body space-y-3">
              <h2 className="font-medium">เพิ่มพนักงาน</h2>
              <input
                className="input w-full"
                placeholder="ชื่อ"
                value={empForm.name}
                onChange={(e) => setEmpForm((f) => ({ ...f, name: e.target.value }))}
              />
              <input
                className="input w-full"
                placeholder="เบอร์โทร"
                value={empForm.phone}
                onChange={(e) => setEmpForm((f) => ({ ...f, phone: e.target.value }))}
              />
              <input
                className="input w-full"
                placeholder="ตำแหน่ง"
                value={empForm.position}
                onChange={(e) => setEmpForm((f) => ({ ...f, position: e.target.value }))}
              />
              <input
                className="input w-full"
                type="number"
                min="0"
                step="0.01"
                placeholder="เงินเดือน (บาท)"
                value={empForm.salary}
                onChange={(e) => setEmpForm((f) => ({ ...f, salary: e.target.value }))}
              />
              <button type="submit" className="btn w-full">
                บันทึกพนักงาน
              </button>
            </form>
          )}

          {meta.canViewPayroll && (
            <div className="cleo-sheet cleo-sheet__body space-y-3">
              <h2 className="font-medium">เงินเดือน</h2>
              <input
                className="input w-full"
                placeholder="ชื่อรอบ เช่น มิ.ย. 2026"
                value={payrollForm.periodLabel}
                onChange={(e) => setPayrollForm((f) => ({ ...f, periodLabel: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  className="input w-full"
                  type="date"
                  value={payrollForm.periodStart}
                  onChange={(e) => setPayrollForm((f) => ({ ...f, periodStart: e.target.value }))}
                />
                <input
                  className="input w-full"
                  type="date"
                  value={payrollForm.periodEnd}
                  onChange={(e) => setPayrollForm((f) => ({ ...f, periodEnd: e.target.value }))}
                />
              </div>
              <button type="button" className="btn w-full" onClick={runPayroll}>
                คำนวณและจ่ายเงินเดือน
              </button>
              <div className="pt-4 border-t border-[var(--border)]">
                <h3 className="text-sm font-medium text-[var(--muted-foreground)] mb-2">ประวัติรอบจ่าย</h3>
                <PayrollHistory runs={payroll.runs} loading={payroll.loading} />
              </div>
            </div>
          )}
        </div>

        <div className="cleo-sheet cleo-sheet__body">
          <h2 className="font-medium mb-3">พนักงาน</h2>
          <EmployeeList employees={employees} loading={loading} />
        </div>
      </div>
    </div>
  );
}
