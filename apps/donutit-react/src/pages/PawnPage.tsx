import { FormEvent, useEffect, useState } from 'react';
import { apiFetch } from '@shared/api';
import { useToast } from '../components/ui/Toast';

type Ticket = {
  id: string;
  ticketNumber: string;
  customerName: string;
  customerPhone: string | null;
  itemDescription: string;
  principalBaht: string;
  interestPerPeriodBaht: string;
  interestRatePercent: string;
  nextInterestDueAt: string;
  status: string;
  voidReason: string | null;
  transferDetail: string | null;
  payments: unknown[];
};

export function PawnPage() {
  const toast = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    itemDescription: '',
    principal: '',
    interestRatePercent: '2',
    channel: 'CASH',
    transferDetail: '',
  });

  async function reload() {
    const res = await apiFetch('/api/pawn/tickets');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    setTickets(data.tickets);
  }

  useEffect(() => {
    reload().catch((e) => toast.show(e.message, 'error'));
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!form.customerName.trim() || !form.itemDescription.trim() || Number(form.principal) <= 0) {
      return toast.show('กรอกชื่อลูกค้า รายละเอียด และเงินต้น', 'warning');
    }
    const res = await apiFetch('/api/pawn/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone.trim() || undefined,
        itemDescription: form.itemDescription.trim(),
        principal: Number(form.principal),
        interestRatePercent: Number(form.interestRatePercent),
        channel: form.channel,
        transferDetail: form.channel === 'TRANSFER' ? form.transferDetail.trim() : undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) return toast.show(data.error, 'error');
    toast.show(`เปิดตั๋ว ${data.ticket.ticketNumber} สำเร็จ`, 'success');
    setForm({ ...form, customerName: '', customerPhone: '', itemDescription: '', principal: '' });
    reload();
  }

  async function postAction(path: string, okMsg: string) {
    const res = await apiFetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: 'CASH' }),
    });
    const data = await res.json();
    if (!res.ok) return toast.show(data.error, 'error');
    toast.show(okMsg.replace('{amount}', data.amountBaht ?? ''), 'success');
    reload();
  }

  return (
    <main data-donutit-module="pawn">
      <h1 className="text-xl font-semibold mb-4">จำนำ</h1>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <form className="card space-y-3" onSubmit={onCreate}>
          <h2 className="font-medium">เปิดตั๋วจำนำ</h2>
          <input className="input w-full" placeholder="ชื่อลูกค้า" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
          <input className="input w-full" placeholder="เบอร์โทร" value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} />
          <input className="input w-full" placeholder="รายละเอียดสิ่งของ" value={form.itemDescription} onChange={(e) => setForm({ ...form, itemDescription: e.target.value })} />
          <input className="input w-full" type="number" placeholder="เงินต้น (บาท)" value={form.principal} onChange={(e) => setForm({ ...form, principal: e.target.value })} />
          <button type="submit" className="btn btn-primary w-full" id="btn-create-ticket">
            บันทึกตั๋ว
          </button>
        </form>
        <div className="card">
          <h2 className="font-medium mb-3">ตั๋วจำนำ</h2>
          <div id="pawn-tickets" className="space-y-2 max-h-[70vh] overflow-y-auto">
            {tickets.map((t) => (
              <div key={t.id} className={`cleo-panel p-3 text-sm ${t.status !== 'ACTIVE' ? 'opacity-70' : ''}`}>
                <p className="font-medium">{t.ticketNumber}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{t.customerName}</p>
                <p className="mt-1">{t.itemDescription}</p>
                <p>
                  เงินต้น <strong>{t.principalBaht}</strong> บาท
                </p>
                {t.status === 'ACTIVE' && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    <button type="button" className="btn btn-sm" onClick={() => postAction(`/api/pawn/tickets/${t.id}/interest`, 'รับดอกเบี้ย {amount} บาท')}>
                      รับดอกเบี้ย
                    </button>
                    <button type="button" className="btn btn-sm btn-primary" onClick={() => postAction(`/api/pawn/tickets/${t.id}/redeem`, 'ไถ่ถอน {amount} บาท')}>
                      ไถ่ถอน
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost text-red-400"
                      onClick={async () => {
                        const reason = window.prompt('เหตุผลยกเลิกตั๋ว:');
                        if (!reason?.trim()) return;
                        const res = await apiFetch(`/api/pawn/tickets/${t.id}/void`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ reason: reason.trim() }),
                        });
                        const data = await res.json();
                        if (!res.ok) return toast.show(data.error, 'error');
                        toast.show('ยกเลิกตั๋วแล้ว', 'success');
                        reload();
                      }}
                    >
                      ยกเลิก
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
