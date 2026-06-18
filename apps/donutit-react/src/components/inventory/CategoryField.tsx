import { useState } from 'react';
import { useProductCategories, type ProductCategory } from '../../hooks/useProductCategories';

type Props = {
  value: string;
  onChange: (categoryId: string) => void;
  onCreated?: (category: ProductCategory) => void;
  disabled?: boolean;
};

/** `/api/inventory/categories` — select `#inv-category` + separate `#inv-btn-add-category` (not in dropdown). */
export function CategoryField({ value, onChange, onCreated, disabled }: Props) {
  const { categories, loading, error, createCategory } = useProductCategories();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submitNewCategory() {
    if (!newName.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const category = await createCategory(newName.trim());
      onChange(category.id);
      onCreated?.(category);
      setNewName('');
      setAdding(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'เพิ่มหมวดหมู่ไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="field inv-category-field">
      <label htmlFor="inv-category" className="text-xs text-[var(--muted-foreground)]">
        หมวดหมู่
      </label>
      {error && (
        <p className="text-xs text-red-400 mt-1" role="alert">
          โหลดหมวดหมู่ไม่สำเร็จ: {error}
        </p>
      )}
      <div className="inventory-form__category-row flex gap-2 mt-1">
        <select
          id="inv-category"
          className="inv-category flex-1 min-w-0"
          value={value}
          disabled={disabled || loading}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">{loading ? 'กำลังโหลดหมวดหมู่…' : '— เลือกหมวดหมู่ —'}</option>
          {categories.map((c: ProductCategory) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          id="inv-btn-add-category"
          className="btn btn-sm whitespace-nowrap shrink-0"
          disabled={disabled || busy || loading}
          onClick={() => setAdding((v) => !v)}
        >
          + เพิ่มหมวดหมู่
        </button>
      </div>
      {adding && (
        <div className="mt-2 flex gap-2 items-center">
          <input
            className="flex-1"
            placeholder="ชื่อหมวดหมู่ใหม่"
            value={newName}
            disabled={busy}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), submitNewCategory())}
          />
          <button type="button" className="btn btn-sm btn-primary" disabled={busy} onClick={submitNewCategory}>
            บันทึก
          </button>
          <button type="button" className="btn btn-sm btn-ghost" disabled={busy} onClick={() => setAdding(false)}>
            ยกเลิก
          </button>
        </div>
      )}
      {err && <p className="text-xs text-red-400 mt-1">{err}</p>}
    </div>
  );
}
