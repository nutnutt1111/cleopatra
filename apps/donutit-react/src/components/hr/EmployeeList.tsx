import type { Employee } from '../../hooks/useHrEmployees';

export function EmployeeList({
  employees,
  loading,
  emptyText = 'ยังไม่มีพนักงาน',
}: {
  employees: Employee[];
  loading?: boolean;
  emptyText?: string;
}) {
  if (loading) return <p className="text-sm text-[var(--muted-foreground)]">กำลังโหลด…</p>;
  if (!employees.length) return <p className="text-sm text-[var(--muted-foreground)]">{emptyText}</p>;

  return (
    <div className="space-y-2">
      {employees.map((e) => (
        <div key={e.id} className="cleo-panel p-3">
          <p className="font-medium text-sm">
            {e.name}{' '}
            <span className="text-xs text-[var(--muted-foreground)]">({e.employeeCode})</span>
          </p>
          <p className="text-xs text-[var(--muted-foreground)]">
            {e.position || '—'} · {e.phone || '—'}
          </p>
          <p className="text-sm mt-1">
            {e.salaryBaht != null ? (
              <>
                เงินเดือน <strong>{e.salaryBaht}</strong> บาท
              </>
            ) : (
              <span className="text-xs text-[var(--muted-foreground)]">เงินเดือน — ซ่อนตามสิทธิ์</span>
            )}
          </p>
        </div>
      ))}
    </div>
  );
}
