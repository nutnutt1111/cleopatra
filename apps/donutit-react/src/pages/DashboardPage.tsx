import { useEffect, useState } from 'react';
import { apiFetch } from '@shared/api';
import { useToast } from '../components/ui/Toast';

export function DashboardPage() {
  const toast = useToast();
  const [stats, setStats] = useState({
    todaySales: '0.00',
    billCount: 0,
    lowStock: 0,
    pendingDeliveries: 0,
  });

  useEffect(() => {
    Promise.all([
      apiFetch('/api/pos/bills'),
      apiFetch('/api/inventory/products'),
      apiFetch('/api/messenger/jobs'),
    ])
      .then(async ([billsRes, prodRes, jobsRes]) => {
        const bills = (await billsRes.json()).bills ?? [];
        const products = (await prodRes.json()).products ?? [];
        const jobs = (await jobsRes.json()).jobs ?? [];
        const today = new Date().toISOString().slice(0, 10);
        const todayBills = bills.filter(
          (b: { status: string; createdAt: string }) =>
            b.status === 'COMPLETED' && b.createdAt.startsWith(today),
        );
        const todayCents = todayBills.reduce(
          (s: number, b: { totalCents: number }) => s + (b.totalCents || 0),
          0,
        );
        const lowStock = products.filter(
          (p: { trackingType: string; qtyOnHand?: number; serials: unknown[] }) =>
            p.trackingType === 'QUANTITY' ? (p.qtyOnHand ?? 0) <= 5 : p.serials.length <= 1,
        ).length;
        const pending = jobs.filter((j: { status: string }) => j.status === 'PENDING' || j.status === 'IN_TRANSIT').length;
        setStats({
          todaySales: (todayCents / 100).toFixed(2),
          billCount: todayBills.length,
          lowStock,
          pendingDeliveries: pending,
        });
      })
      .catch((e) => toast.show(e.message, 'error'));
  }, [toast]);

  return (
    <main data-donutit-module="dashboard">
      <h1 className="text-xl font-semibold mb-4">แดชบอร์ด</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card">
          <p className="text-xs text-[var(--muted-foreground)]">ยอดขายวันนี้</p>
          <p id="dash-kpi-sales" className="text-2xl font-semibold">
            {stats.todaySales}
          </p>
        </div>
        <div className="card">
          <p className="text-xs text-[var(--muted-foreground)]">บิลวันนี้</p>
          <p id="dash-kpi-bills" className="text-2xl font-semibold">
            {stats.billCount}
          </p>
        </div>
        <div className="card">
          <p className="text-xs text-[var(--muted-foreground)]">สต็อกต่ำ</p>
          <p id="dash-kpi-lowstock" className="text-2xl font-semibold">
            {stats.lowStock}
          </p>
        </div>
        <div className="card">
          <p className="text-xs text-[var(--muted-foreground)]">งานส่งค้าง</p>
          <p id="dash-kpi-deliveries" className="text-2xl font-semibold">
            {stats.pendingDeliveries}
          </p>
        </div>
      </div>
    </main>
  );
}
