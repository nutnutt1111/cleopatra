import { useState } from 'react';
import { saveTradeInDraft, listTradeInDrafts, formatDraftLabel } from '@shared/trade-in-draft';
import { useToast } from '../ui/Toast';

/** POS trade-in draft flow — save here, import on /inventory (no legacy toggle). */
export function TradeInSection() {
  const toast = useToast();
  const [form, setForm] = useState({
    deviceName: '',
    serialNumber: '',
    sku: '',
    costBaht: '',
    priceBaht: '',
    customerName: '',
    notes: '',
  });
  const [drafts, setDrafts] = useState(listTradeInDrafts());

  function saveDraft() {
    if (!form.deviceName.trim()) return toast.show('กรอกชื่อเครื่องก่อนบันทึกดราฟ', 'warning');
    saveTradeInDraft({
      deviceName: form.deviceName,
      serialNumber: form.serialNumber,
      sku: form.sku,
      costBaht: Number(form.costBaht) || 0,
      priceBaht: Number(form.priceBaht) || 0,
      customerName: form.customerName,
      notes: form.notes,
    });
    setDrafts(listTradeInDrafts());
    setForm({ deviceName: '', serialNumber: '', sku: '', costBaht: '', priceBaht: '', customerName: '', notes: '' });
    toast.show('บันทึกดราฟ Trade-in แล้ว — ไปดึงที่หน้าสินค้าคงคลัง', 'success');
  }

  return (
    <div className="card" id="pos-trade-in-panel">
      <h3 className="font-medium mb-2">Trade-in (รับเครื่องแลก)</h3>
      <p className="text-xs text-[var(--muted-foreground)] mb-3">บันทึกดราฟเพื่อนำไปเพิ่มสินค้าในคลังภายหลัง</p>
      <div className="form-grid-2">
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="pos-trade-device">ชื่อเครื่อง / รุ่น</label>
          <input
            id="pos-trade-device"
            value={form.deviceName}
            onChange={(e) => setForm({ ...form, deviceName: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="pos-trade-serial">Serial / IMEI</label>
          <input
            id="pos-trade-serial"
            value={form.serialNumber}
            onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="pos-trade-sku">SKU (ถ้ามี)</label>
          <input id="pos-trade-sku" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="pos-trade-cost">ต้นทุนรับเข้า (บาท)</label>
          <input
            id="pos-trade-cost"
            type="number"
            value={form.costBaht}
            onChange={(e) => setForm({ ...form, costBaht: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="pos-trade-price">ราคาขายเป้า (บาท)</label>
          <input
            id="pos-trade-price"
            type="number"
            value={form.priceBaht}
            onChange={(e) => setForm({ ...form, priceBaht: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="pos-trade-customer">ลูกค้า</label>
          <input
            id="pos-trade-customer"
            value={form.customerName}
            onChange={(e) => setForm({ ...form, customerName: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="pos-trade-notes">หมายเหตุ</label>
          <input
            id="pos-trade-notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>
      </div>
      <button id="btn-save-trade-draft" type="button" className="btn w-full mt-3" onClick={saveDraft}>
        บันทึกดราฟ Trade-in
      </button>
      <div id="pos-trade-drafts" className="mt-2 text-xs text-[var(--muted-foreground)] max-h-24 overflow-y-auto">
        {drafts.length === 0 ? (
          <p>ยังไม่มีดราฟ — บันทึกแล้วไปหน้าสินค้าคงคลัง</p>
        ) : (
          drafts.slice(0, 5).map((d) => <div key={d.id}>{formatDraftLabel(d)}</div>)
        )}
      </div>
    </div>
  );
}
