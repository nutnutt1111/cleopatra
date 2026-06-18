import { FormEvent, useCallback, useEffect, useState } from 'react';
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
    id: string;
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
  recentPayments: { amountBaht: string; channel: string }[];
};

export function CustomersPage() {
  const toast = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [addForm, setAddForm] = useState({ name: '', phone: '', creditLimit: '' });
  const [saleForm, setSaleForm] = useState({
    customerId: '',
    description: '',
    total: '',
    installmentCount: '0',
  });
  const [payForm, setPayForm] = useState({
    customerId: '',
    creditSaleId: '',
    amount: '',
    channel: 'CASH',
    transferDetail: '',
  });

  const reload = useCallback(async () => {
    const res = await apiFetch('/api/customers');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    setCustomers(data.customers);
  }, []);

  useEffect(() => {
    reload().catch((e) => toast.show(e.message, 'error'));
  }, [reload, toast]);

  const payCustomer = customers.find((c) => c.id === payForm.customerId);

  async function addCustomer(e: FormEvent) {
    e.preventDefault();
    if (!addForm.name.trim()) return toast.show('กรอกชื่อลูกค้า', 'warning');
    const res = await apiFetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: addForm.name.trim(),
        phone: addForm.phone.trim() || undefined,
        creditLimit: parseFloat(addForm.creditLimit || '0'),
      }),
    });
    const data = await res.json();
    if (!res.ok) return toast.show(data.error, 'error');
    setAddForm({ name: '', phone: '', creditLimit: '' });
    toast.show('เพิ่มลูกค้าแล้ว', 'success');
    reload();
  }

  async function creditSale(e: FormEvent) {
    e.preventDefault();
    if (!saleForm.customerId || !saleForm.description.trim() || Number(saleForm.total) <= 0) {
      return toast.show('เลือกลูกค้า กรอกรายละเอียดและยอด', 'warning');
    }
    const res = await apiFetch('/api/customers/credit-sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: saleForm.customerId,
        description: saleForm.description.trim(),
        total: Number(saleForm.total),
        installmentCount: parseInt(saleForm.installmentCount, 10) || 0,
      }),
    });
    const data = await res.json();
    if (!res.ok) return toast.show(data.error, 'error');
    toast.show(`ขายเครดิต ${data.sale.saleNumber} — ${data.sale.totalBaht} บาท`, 'success');
    setSaleForm({ ...saleForm, description: '', total: '' });
    reload();
  }

  async function recordPayment(e: FormEvent) {
    e.preventDefault();
    if (!payForm.customerId || Number(payForm.amount) <= 0) {
      return toast.show('เลือกลูกค้าและจำนวนเงิน', 'warning');
    }
    const res = await apiFetch('/api/customers/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: payForm.customerId,
        amount: Number(payForm.amount),
        channel: payForm.channel,
        creditSaleId: payForm.creditSaleId || undefined,
        transferDetail: payForm.channel === 'TRANSFER' ? payForm.transferDetail.trim() : undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) return toast.show(data.error, 'error');
    toast.show(`รับชำระ ${data.payment.amountBaht} บาทสำเร็จ`, 'success');
    setPayForm({ ...payForm, amount: '' });
    reload();
  }

  return (
    <main data-donutit-module="customers">
      <h1 className="text-xl font-semibold mb-4">ลูกค้า</h1>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
        <form className="card space-y-2" onSubmit={addCustomer}>
          <h2 className="font-medium text-sm">เพิ่มลูกค้า</h2>
          <input className="input w-full" placeholder="ชื่อ" value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} />
          <input className="input w-full" placeholder="เบอร์โทร" value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} />
          <input className="input w-full" type="number" placeholder="วงเงินเครดิต" value={addForm.creditLimit} onChange={(e) => setAddForm({ ...addForm, creditLimit: e.target.value })} />
          <button type="submit" className="btn btn-sm w-full" id="btn-add-customer">
            บันทึก
          </button>
        </form>
        <form className="card space-y-2" onSubmit={creditSale}>
          <h2 className="font-medium text-sm">ขายเครดิต</h2>
          <select className="input w-full" value={saleForm.customerId} onChange={(e) => setSaleForm({ ...saleForm, customerId: e.target.value })}>
            <option value="">-- เลือกลูกค้า --</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} (ค้าง {c.balanceBaht})
              </option>
            ))}
          </select>
          <input className="input w-full" placeholder="รายละเอียด" value={saleForm.description} onChange={(e) => setSaleForm({ ...saleForm, description: e.target.value })} />
          <input className="input w-full" type="number" placeholder="ยอด (บาท)" value={saleForm.total} onChange={(e) => setSaleForm({ ...saleForm, total: e.target.value })} />
          <input className="input w-full" type="number" placeholder="จำนวนงวด (0=ไม่ผ่อน)" value={saleForm.installmentCount} onChange={(e) => setSaleForm({ ...saleForm, installmentCount: e.target.value })} />
          <button type="submit" className="btn btn-sm btn-primary w-full" id="btn-credit-sale">
            บันทึกขายเครดิต
          </button>
        </form>
        <form className="card space-y-2" onSubmit={recordPayment}>
          <h2 className="font-medium text-sm">รับชำระ</h2>
          <select
            className="input w-full"
            value={payForm.customerId}
            onChange={(e) => setPayForm({ ...payForm, customerId: e.target.value, creditSaleId: '' })}
          >
            <option value="">-- เลือกลูกค้า --</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select className="input w-full" value={payForm.creditSaleId} onChange={(e) => setPayForm({ ...payForm, creditSaleId: e.target.value })}>
            <option value="">— ชำระทั่วไป —</option>
            {payCustomer?.openSales.map((s) => (
              <option key={s.id} value={s.id}>
                {s.saleNumber} — ค้าง {s.remainingBaht}
              </option>
            ))}
          </select>
          <input className="input w-full" type="number" placeholder="จำนวน (บาท)" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} />
          <button type="submit" className="btn btn-sm btn-primary w-full" id="btn-customer-pay">
            บันทึกรับชำระ
          </button>
        </form>
      </div>
      <div className="card">
        <div id="customers-list" className="space-y-2">
          {customers.map((c) => (
            <div key={c.id} className="cleo-panel p-3 text-sm">
              <p className="font-medium">{c.name}</p>
              <p className="text-xs text-[var(--muted-foreground)]">
                {c.phone || '—'} · วงเงิน {c.creditLimitBaht} บาท
              </p>
              <p className="mt-1">
                ลูกหนี้คงค้าง <strong className={c.balanceCents > 0 ? 'text-amber-400' : ''}>{c.balanceBaht}</strong> บาท
              </p>
              {c.openSales.length > 0 && (
                <div className="mt-2 space-y-1 border-l-2 border-[var(--primary)] pl-2">
                  {c.openSales.map((s) => (
                    <p key={s.id} className="text-xs">
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
