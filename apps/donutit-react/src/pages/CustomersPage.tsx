import { useEffect, useState } from 'react';
import { apiFetch } from '@shared/api';
import { useToast } from '../components/ui/Toast';

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  creditLimitBaht: string;
  balanceBaht: string;
  balanceCents: number;
  openSales: {
    saleNumber: string;
    description: string;
    remainingBaht: string;
    installment?: {
      paidInstallments: number;
      installmentCount: number;
      installmentAmountBaht: string;
      nextDueDate: string;
    };
  }[];
};

export function CustomersPage() {
  const toast = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    apiFetch('/api/customers')
      .then((r) => r.json())
      .then((d) => {
        if (!d.customers) throw new Error(d.error);
        setCustomers(d.customers);
      })
      .catch((e) => toast.show(e.message, 'error'));
  }, []);

  return (
    <main data-donutit-module="customers">
      <h1 className="text-xl font-semibold mb-4">ลูกค้า</h1>
      <div className="card">
        <div id="customers-list" className="space-y-2">
          {customers.map((c) => (
            <div key={c.id} className="cleo-panel p-3 text-sm">
              <p className="font-medium">{c.name}</p>
              <p className="text-xs text-[var(--muted-foreground)]">
                {c.phone || '—'} · วงเงิน {c.creditLimitBaht} บาท
              </p>
              <p className="mt-1">
                ลูกหนี้คงค้าง <strong>{c.balanceBaht}</strong> บาท
              </p>
              {c.openSales.length > 0 && (
                <div className="mt-2 space-y-1 border-l-2 border-[var(--primary)] pl-2">
                  {c.openSales.map((s) => (
                    <p key={s.saleNumber} className="text-xs">
                      {s.saleNumber}: {s.description} — ค้าง {s.remainingBaht} บาท
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
          {!customers.length && <p className="text-sm text-[var(--muted-foreground)]">ยังไม่มีลูกค้า</p>}
        </div>
      </div>
    </main>
  );
}
