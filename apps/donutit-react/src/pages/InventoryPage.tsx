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
import { Sheet } from '../components/ui/Sheet';
import { useToast } from '../components/ui/Toast';

type Category = { id: string; name: string };
type Product = {
  id: string;
  sku: string;
  name: string;
  categoryName?: string | null;
  trackingType: string;
  priceBaht: string;
  costBaht?: string | null;
  qtyOnHand?: number | null;
  serials: { serialNumber: string }[];
};

export function InventoryPage() {
  const toast = useToast();
  const user = getSessionUser();
  const canAdd = user?.role === 'OWNER' || user?.role === 'MANAGER';
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [drafts, setDrafts] = useState<TradeInDraft[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState('');
  const [draftHint, setDraftHint] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState({
    sku: '',
    name: '',
    categoryId: '',
    trackingType: 'QUANTITY',
    price: '',
    cost: '',
    qty: '0',
    serials: '',
  });

  async function loadCategories() {
    const res = await apiFetch('/api/inventory/categories');
    if (!res.ok) throw new Error((await res.json()).error);
    const data = await res.json();
    setCategories(data.categories);
  }

  async function loadProducts() {
    const res = await apiFetch('/api/inventory/products');
    if (!res.ok) throw new Error((await res.json()).error);
    const data = await res.json();
    setProducts(data.products);
  }

  useEffect(() => {
    loadCategories().catch((e) => toast.show(e.message, 'error'));
    loadProducts().catch((e) => toast.show(e.message, 'error'));
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
    toast.show(`ดึงข้อมูล "${draft.deviceName}" จากดราฟแล้ว`, 'success');
  }

  async function addCategory() {
    const name = window.prompt('ชื่อหมวดหมู่ใหม่');
    if (!name?.trim()) return;
    const res = await apiFetch('/api/inventory/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    });
    const data = await res.json();
    if (!res.ok) return toast.show(data.error || 'เพิ่มหมวดหมู่ไม่สำเร็จ', 'error');
    await loadCategories();
    setForm((f) => ({ ...f, categoryId: data.category.id }));
    toast.show(`เพิ่มหมวดหมู่ "${data.category.name}" แล้ว`, 'success');
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
    if (selectedDraftId) {
      removeTradeInDraft(selectedDraftId);
      setSelectedDraftId('');
      setDraftHint('');
      refreshDrafts();
    }
    toast.show(`เพิ่มสินค้า ${data.product.name} แล้ว`, 'success');
    setForm({ sku: '', name: '', categoryId: form.categoryId, trackingType: 'QUANTITY', price: '', cost: '', qty: '0', serials: '' });
    setSheetOpen(false);
    await loadProducts();
  }

  return (
    <main className="inventory-page space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">สินค้าคงคลัง</h1>
        {canAdd && (
          <button type="button" className="btn btn-primary" onClick={() => setSheetOpen(true)}>
            + เพิ่มสินค้า
          </button>
        )}
      </div>

      <Sheet title="เพิ่มสินค้าใหม่" open={sheetOpen}>
        <form className="inventory-form space-y-4" onSubmit={onSubmit}>
          <div className="inventory-form__draft">
            <label className="text-xs text-[var(--muted-foreground)]">ดึงจากดราฟ Trade-in (POS)</label>
            <div className="flex flex-wrap gap-2 mt-1">
              <select
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
              <button type="button" className="btn btn-sm" onClick={importDraft}>
                ดึงข้อมูล
              </button>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => {
                  if (!selectedDraftId) return toast.show('เลือกดราฟที่จะลบ', 'warning');
                  if (!window.confirm('ลบดราฟ Trade-in นี้?')) return;
                  removeTradeInDraft(selectedDraftId);
                  setSelectedDraftId('');
                  setDraftHint('');
                  refreshDrafts();
                  toast.show('ลบดราฟแล้ว', 'success');
                }}
              >
                ลบดราฟ
              </button>
            </div>
            {draftHint && <p className="text-xs text-[var(--muted-foreground)] mt-2">{draftHint}</p>}
          </div>

          <div className="form-grid-2">
            <div className="field">
              <label>SKU</label>
              <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </div>
            <div className="field">
              <label>ชื่อสินค้า</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="field sm:col-span-2">
              <label>หมวดหมู่</label>
              <div className="inventory-form__category-row">
                <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                  <option value="">— เลือกหมวดหมู่ —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <button type="button" className="btn btn-sm whitespace-nowrap" onClick={addCategory}>
                  + เพิ่มหมวดหมู่
                </button>
              </div>
            </div>
            <div className="field">
              <label>ประเภท</label>
              <select
                value={form.trackingType}
                onChange={(e) => setForm({ ...form, trackingType: e.target.value })}
              >
                <option value="QUANTITY">นับจำนวน</option>
                <option value="SERIALIZED">มี Serial</option>
              </select>
            </div>
            <div className="field">
              <label>ราคาขาย (บาท)</label>
              <input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
            </div>
            <div className="field">
              <label>ต้นทุน (บาท)</label>
              <input type="number" min="0" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
            </div>
            {form.trackingType === 'QUANTITY' ? (
              <div className="field">
                <label>จำนวนเริ่มต้น</label>
                <input type="number" min="0" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} />
              </div>
            ) : (
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label>หมายเลข Serial (คั่นด้วย comma)</label>
                <input value={form.serials} onChange={(e) => setForm({ ...form, serials: e.target.value })} />
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary">
              บันทึกสินค้า
            </button>
            <button type="button" className="btn" onClick={() => setSheetOpen(false)}>
              ยกเลิก
            </button>
          </div>
        </form>
      </Sheet>

      <div className="card overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>ชื่อ</th>
              <th>หมวดหมู่</th>
              <th>ประเภท</th>
              <th>ราคาขาย</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>{p.sku}</td>
                <td>{p.name}</td>
                <td>{p.categoryName ?? '—'}</td>
                <td>{p.trackingType === 'SERIALIZED' ? 'มี Serial' : 'นับจำนวน'}</td>
                <td>{p.priceBaht}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
