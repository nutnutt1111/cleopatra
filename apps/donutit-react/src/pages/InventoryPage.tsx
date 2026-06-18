import { FormEvent, useEffect, useState } from 'react';
import { apiFetch, getSessionUser } from '@shared/api';
import {
  formatDraftLabel,
  getTradeInDraft,
  listTradeInDrafts,
  removeTradeInDraft,
  suggestSkuFromDraft,
  type TradeInDraft,
} from '@shared/trade-in-draft';
import { CategoryField } from '../components/inventory/CategoryField';
import { Sheet } from '../components/ui/Sheet';
import { useToast } from '../components/ui/Toast';

type Product = {
  id: string;
  sku: string;
  name: string;
  categoryName?: string | null;
  trackingType: string;
  priceBaht: string;
  costBaht?: string | null;
  qtyOnHand?: number | null;
  serials: { serialNumber: string; status?: string; statusLabel?: string }[];
};

type Movement = {
  id: string;
  productName: string;
  serialNumber: string | null;
  qtyDelta: number;
  reason: string;
  createdAt: string;
};

const emptyForm = {
  sku: '',
  name: '',
  categoryId: '',
  trackingType: 'QUANTITY',
  price: '',
  cost: '',
  qty: '0',
  serials: '',
};

export function InventoryPage() {
  const toast = useToast();
  const user = getSessionUser();
  const canAdd = user?.role === 'OWNER' || user?.role === 'MANAGER';
  const [products, setProducts] = useState<Product[]>([]);
  const [drafts, setDrafts] = useState<TradeInDraft[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState('');
  const [importedDraftId, setImportedDraftId] = useState('');
  const [draftHint, setDraftHint] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [movements, setMovements] = useState<Movement[]>([]);

  async function loadMovements() {
    const res = await apiFetch('/api/inventory/movements');
    if (!res.ok) return;
    const data = await res.json();
    setMovements(data.movements);
  }

  async function loadProducts() {
    const res = await apiFetch('/api/inventory/products');
    if (!res.ok) throw new Error((await res.json()).error);
    const data = await res.json();
    setProducts(data.products);
  }

  async function refreshAll() {
    await Promise.all([loadProducts(), loadMovements()]);
  }

  useEffect(() => {
    refreshAll().catch((e) => toast.show(e.message, 'error'));
    setDrafts(listTradeInDrafts());
  }, []);

  function refreshDrafts() {
    setDrafts(listTradeInDrafts());
  }

  function importDraft() {
    if (!selectedDraftId) return toast.show('เลือกดราฟก่อน', 'warning');
    const draft = getTradeInDraft(selectedDraftId);
    if (!draft) {
      refreshDrafts();
      return toast.show('ไม่พบดราฟ — อาจถูกลบแล้ว', 'error');
    }
    setForm((f) => ({
      ...f,
      name: draft.deviceName,
      sku: draft.sku || suggestSkuFromDraft(draft),
      cost: String(draft.costBaht || ''),
      price: String(draft.priceBaht || ''),
      trackingType: draft.serialNumber ? 'SERIALIZED' : f.trackingType,
      serials: draft.serialNumber || f.serials,
    }));
    const parts = [draft.customerName, draft.notes].filter(Boolean);
    setDraftHint(parts.length ? `จากดราฟ: ${parts.join(' · ')}` : 'ดึงข้อมูลจากดราฟแล้ว');
    setImportedDraftId(selectedDraftId);
    toast.show(`ดึงข้อมูล "${draft.deviceName}" จากดราฟแล้ว`, 'success');
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const body: Record<string, unknown> = {
      sku: form.sku.trim(),
      name: form.name.trim(),
      trackingType: form.trackingType,
      price: Number(form.price),
      cost: Number(form.cost) || 0,
      categoryId: form.categoryId || undefined,
    };
    if (form.trackingType === 'SERIALIZED') {
      body.serialNumbers = form.serials.split(',').map((s) => s.trim()).filter(Boolean);
    } else {
      body.qtyOnHand = Number(form.qty) || 0;
    }
    const res = await apiFetch('/api/inventory/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) return toast.show(data.error || 'เพิ่มสินค้าไม่สำเร็จ', 'error');
    const draftToRemove = importedDraftId || selectedDraftId;
    if (draftToRemove) {
      removeTradeInDraft(draftToRemove);
      setSelectedDraftId('');
      setImportedDraftId('');
      setDraftHint('');
      refreshDrafts();
    }
    toast.show(`เพิ่มสินค้า ${data.product.name} แล้ว`, 'success');
    setForm({ ...emptyForm, categoryId: form.categoryId });
    await refreshAll();
  }

  return (
    <main className="inventory-page" data-donutit-module="inventory">
      <div className="mb-4">
        <h1 className="text-xl font-semibold">สินค้าคงคลัง</h1>
        <p className="text-sm text-[var(--muted-foreground)]">เพิ่มสินค้า · ดู serial · ประวัติ movement</p>
      </div>

      {canAdd && (
        <Sheet title="เพิ่มสินค้าใหม่">
          <form className="inventory-form space-y-4" onSubmit={onSubmit}>
            <div className="inventory-form__draft">
              <label className="text-xs text-[var(--muted-foreground)]">ดึงจากดราฟ Trade-in (POS)</label>
              <div className="flex flex-wrap gap-2 mt-1">
                <select
                  id="inv-trade-draft"
                  className="flex-1 min-w-[200px]"
                  value={selectedDraftId}
                  onChange={(e) => setSelectedDraftId(e.target.value)}
                >
                  <option value="">— เลือกดราฟจาก POS —</option>
                  {drafts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {formatDraftLabel(d)}
                    </option>
                  ))}
                </select>
                <button type="button" id="inv-btn-import-draft" className="btn btn-sm" onClick={importDraft}>
                  ดึงข้อมูล
                </button>
                <button
                  type="button"
                  id="inv-btn-delete-draft"
                  className="btn btn-sm btn-ghost"
                  onClick={() => {
                    if (!selectedDraftId) return toast.show('เลือกดราฟที่จะลบ', 'warning');
                    if (!window.confirm('ลบดราฟ Trade-in นี้?')) return;
                    removeTradeInDraft(selectedDraftId);
                    setSelectedDraftId('');
                    setImportedDraftId('');
                    setDraftHint('');
                    refreshDrafts();
                    toast.show('ลบดราฟแล้ว', 'success');
                  }}
                >
                  ลบดราฟ
                </button>
              </div>
              {draftHint && <p id="inv-draft-hint" className="text-xs text-[var(--muted-foreground)] mt-2">{draftHint}</p>}
            </div>

            <div className="form-grid-2">
              <div className="field">
                <label htmlFor="inv-sku">SKU</label>
                <input id="inv-sku" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="inv-name">ชื่อสินค้า</label>
                <input id="inv-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <CategoryField
                  value={form.categoryId}
                  onChange={(categoryId) => setForm({ ...form, categoryId })}
                  onCreated={(c) => toast.show(`เพิ่มหมวดหมู่ "${c.name}" แล้ว`, 'success')}
                />
              </div>
              <div className="field">
                <label htmlFor="inv-type">ประเภท</label>
                <select id="inv-type" value={form.trackingType} onChange={(e) => setForm({ ...form, trackingType: e.target.value })}>
                  <option value="QUANTITY">นับจำนวน</option>
                  <option value="SERIALIZED">มี Serial</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="inv-price">ราคาขาย (บาท)</label>
                <input id="inv-price" type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
              </div>
              <div className="field">
                <label htmlFor="inv-cost">ต้นทุน (บาท)</label>
                <input id="inv-cost" type="number" min="0" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
              </div>
              {form.trackingType === 'QUANTITY' ? (
                <div className="field" id="inv-qty-wrap">
                  <label htmlFor="inv-qty">จำนวนเริ่มต้น</label>
                  <input id="inv-qty" type="number" min="0" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} />
                </div>
              ) : (
                <div className="field" id="inv-serial-wrap" style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="inv-serials-input">หมายเลข Serial (คั่นด้วย comma)</label>
                  <input id="inv-serials-input" value={form.serials} onChange={(e) => setForm({ ...form, serials: e.target.value })} />
                </div>
              )}
            </div>
            <button id="inv-btn-add" type="submit" className="btn btn-primary">
              บันทึกสินค้า
            </button>
          </form>
        </Sheet>
      )}

      <div className="card overflow-x-auto mt-4">
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>ชื่อ</th>
              <th>หมวดหมู่</th>
              <th>ประเภท</th>
              <th>สต็อก</th>
              <th>ราคาขาย</th>
            </tr>
          </thead>
          <tbody id="inv-tbody">
            {products.map((p) => (
              <tr key={p.id}>
                <td>{p.sku}</td>
                <td>{p.name}</td>
                <td>{p.categoryName ?? '—'}</td>
                <td>{p.trackingType === 'SERIALIZED' ? 'มี Serial' : 'นับจำนวน'}</td>
                <td>
                  {p.trackingType === 'QUANTITY'
                    ? `${p.qtyOnHand ?? 0} ชิ้น`
                    : `${p.serials.length} serial`}
                </td>
                <td>{p.priceBaht}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div className="card" id="inv-serials-panel">
          <h2 className="font-medium mb-3">Serial</h2>
          <div id="inv-serials" className="flex flex-wrap gap-2">
            {products.flatMap((p) =>
              p.serials.map((s) => (
                <span key={`${p.id}-${s.serialNumber}`} className="badge">
                  {s.serialNumber} · {p.name}
                  {s.statusLabel && (
                    <span className="ml-1 text-[var(--muted-foreground)]">({s.statusLabel})</span>
                  )}
                </span>
              )),
            )}
            {!products.some((p) => p.serials.length) && (
              <p className="text-sm text-[var(--muted-foreground)]">ไม่มี serial</p>
            )}
          </div>
        </div>
        <div className="card" id="inv-moves-panel">
          <h2 className="font-medium mb-3">Movement ล่าสุด</h2>
          <div id="inv-moves" className="max-h-64 overflow-y-auto text-xs space-y-1">
            {movements.map((m) => (
              <div key={m.id} className="py-1 border-b border-[var(--border)]">
                {new Date(m.createdAt).toLocaleString('th-TH')} · {m.productName}
                {m.serialNumber ? ` [${m.serialNumber}]` : ''} · {m.qtyDelta > 0 ? '+' : ''}
                {m.qtyDelta} · {m.reason}
              </div>
            ))}
            {!movements.length && (
              <p className="text-sm text-[var(--muted-foreground)]">ยังไม่มี movement</p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
