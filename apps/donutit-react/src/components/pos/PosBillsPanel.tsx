import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@shared/api';
import { useToast } from '../ui/Toast';

type Bill = {
  id: string;
  billNumber: string;
  status: string;
  totalBaht: string;
  createdAt: string;
  createdByName: string;
  voidReason: string | null;
  lines: { productName: string }[];
  payments: { channel: string; amountBaht: string; transferDetail?: string | null }[];
};

export function PosBillsPanel({ refreshKey }: { refreshKey: number }) {
  const toast = useToast();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/pos/bills');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBills(data.bills);
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'โหลดบิลไม่สำเร็จ', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    reload();
  }, [reload, refreshKey]);

  async function voidBill(id: string) {
    const reason = window.prompt('เหตุผลยกเลิกบิล:');
    if (!reason?.trim()) return;
    const res = await apiFetch(`/api/pos/bills/${id}/void`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: reason.trim() }),
    });
    const data = await res.json();
    if (!res.ok) return toast.show(data.error || 'ยกเลิกไม่สำเร็จ', 'error');
    toast.show('ยกเลิกบิลแล้ว', 'success');
    reload();
  }

  return (
    <div className="card" id="pos-bills-panel">
      <h3 className="font-medium mb-2">บิลล่าสุด</h3>
      {loading && <p className="text-sm text-[var(--muted-foreground)]">กำลังโหลด…</p>}
      {!loading && bills.length === 0 && (
        <p className="text-sm text-[var(--muted-foreground)]">ยังไม่มีบิล</p>
      )}
      <div id="pos-bills" className="max-h-[600px] overflow-y-auto space-y-2">
        {bills.map((b) => (
          <div
            key={b.id}
            className={`cleo-panel p-3 text-sm ${b.status === 'VOIDED' ? 'opacity-60' : ''}`}
          >
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0">
                <p className="font-medium">{b.billNumber}</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {b.createdByName} · {new Date(b.createdAt).toLocaleString('th-TH')}
                </p>
                <p className="mt-1">
                  รวม <strong>{b.totalBaht}</strong> บาท
                  {b.payments.length > 1 && (
                    <span className="text-xs text-[var(--primary)] ml-1">
                      (แยกจ่าย {b.payments.length} ช่องทาง)
                    </span>
                  )}
                </p>
                {b.payments.some((p) => p.transferDetail) && (
                  <p className="text-xs text-[var(--primary)]">
                    {b.payments
                      .filter((p) => p.transferDetail)
                      .map((p) => p.transferDetail)
                      .join(' · ')}
                  </p>
                )}
                <p className="text-xs text-[var(--muted-foreground)]">
                  {b.lines.map((l) => l.productName).join(', ')}
                </p>
                {b.status === 'VOIDED' && b.voidReason && (
                  <p className="text-xs text-red-400">ยกเลิก: {b.voidReason}</p>
                )}
              </div>
              {b.status === 'COMPLETED' ? (
                <button
                  type="button"
                  className="text-xs text-red-400 hover:underline shrink-0"
                  data-void-bill={b.id}
                  onClick={() => voidBill(b.id)}
                >
                  ยกเลิก
                </button>
              ) : (
                <span className="text-xs text-[var(--muted-foreground)]">ยกเลิกแล้ว</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
