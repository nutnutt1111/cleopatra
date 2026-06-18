import { useState } from 'react';
import { useProductCategories, type ProductCategory } from '../../hooks/useProductCategories';

type Props = {
  value: string;
  onChange: (categoryId: string) => void;
  onCreated?: (category: ProductCategory) => void;
  disabled?: boolean;
};

/** `/api/inventory/categories` — select `#inv-category` + `#inv-btn-add-category` (prompt, same as vanilla). */
export function CategoryField({ value, onChange, onCreated, disabled }: Props) {
  const { categories, loading, error, createCategory } = useProductCategories();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function addCategory() {
    const name = window.prompt('ชื่อหมวดหมู่ใหม่');
    if (!name?.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const category = await createCategory(name.trim());
      onChange(category.id);
      onCreated?.(category);
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
          disabled={disabled || busy}
          onClick={addCategory}
        >
          + เพิ่มหมวดหมู่
        </button>
      </div>
      {err && <p className="text-xs text-red-400 mt-1">{err}</p>}
    </div>
  );
}
