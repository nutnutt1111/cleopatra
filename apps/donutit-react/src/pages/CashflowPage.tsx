import { useEffect, useState } from 'react';
import { apiFetch } from '@shared/api';
import { useToast } from '../components/ui/Toast';

type LedgerEntry = {
  id: string;
  entryDate: string;
  type: string;
  channel: string;
  amountBaht: string;
  description: string;
  isVoided: boolean;
  isReversal: boolean;
};

const TYPE_LABELS: Record<string, string> = {
  INCOME: 'รายรับ',
  EXPENSE: 'รายจ่าย',
  TRANSFER_IN: 'โอนเข้า',
  TRANSFER_OUT: 'โอนออก',
};

export function CashflowPage() {
  const toast = useToast();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);

  async function reload() {
    const res = await apiFetch('/api/cashflow/ledger');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    setEntries(data.entries);
  }

  useEffect(() => {
    reload().catch((e) => toast.show(e.message, 'error'));
  }, []);

  async function voidEntry(id: string) {
    const reason = window.prompt('เหตุผลยกเลิกรายการ:');
    if (!reason?.trim()) return;
    const res = await apiFetch(`/api/cashflow/ledger/${id}/void`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: reason.trim() }),
    });
    const data = await res.json();
    if (!res.ok) return toast.show(data.error, 'error');
    toast.show('ยกเลิกรายการแล้ว', 'success');
    reload();
  }

  return (
    <main data-donutit-module="cashflow-ledger">
      <h1 className="text-xl font-semibold mb-4">กระแสเงินสด</h1>
      <div className="card overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>วันที่</th>
              <th>ประเภท</th>
              <th>ช่องทาง</th>
              <th>จำนวน</th>
              <th>รายละเอียด</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="ledger-tbody">
            {entries.map((e) => (
              <tr key={e.id} className={e.isVoided ? 'opacity-50 line-through' : ''}>
                <td>{e.entryDate}</td>
                <td>{TYPE_LABELS[e.type] ?? e.type}</td>
                <td>{e.channel}</td>
                <td>{e.amountBaht}</td>
                <td>
                  {e.description}
                  {e.isReversal && <span className="text-xs text-amber-400 ml-1">(กลับรายการ)</span>}
                </td>
                <td>
                  {!e.isVoided && !e.isReversal && (
                    <button type="button" className="text-xs text-red-400" onClick={() => voidEntry(e.id)}>
                      ยกเลิก
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
