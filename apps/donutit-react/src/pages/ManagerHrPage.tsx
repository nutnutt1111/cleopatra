import { Navigate } from 'react-router-dom';
import { getSessionUser } from '@shared/api';
import { EmployeeList } from '../components/hr/EmployeeList';
import { useHrEmployees } from '../hooks/useHrEmployees';

export function ManagerHrPage() {
  const user = getSessionUser();
  const { employees, loading, error } = useHrEmployees();

  if (user?.role === 'OWNER' || user?.role === 'HR') return <Navigate to="/hr" replace />;
  if (user?.role !== 'MANAGER') {
    return <p className="text-sm text-red-400">ไม่มีสิทธิ์เข้าหน้านี้</p>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold">บุคลากร (ผู้จัดการ)</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          ดูรายชื่อพนักงานได้ — เงินเดือนและจ่ายเงินเดือนเฉพาะ Owner/HR
        </p>
      </div>
      {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

      <div className="cleo-sheet cleo-sheet__body max-w-2xl">
        <h2 className="font-medium mb-3">พนักงาน</h2>
        <EmployeeList employees={employees} loading={loading} />
      </div>
    </div>
  );
}
