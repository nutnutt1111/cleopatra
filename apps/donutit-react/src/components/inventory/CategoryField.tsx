import { useEffect, useRef, useState } from 'react';
import { useProductCategories, type ProductCategory } from '../../hooks/useProductCategories';

type Props = {
  value: string;
  onChange: (categoryId: string) => void;
  onCreated?: (category: ProductCategory) => void;
  disabled?: boolean;
};

/** `/api/inventory/categories` — select + inline add panel (no window.prompt — blocked in some browsers). */
export function CategoryField({ value, onChange, onCreated, disabled }: Props) {
  const { categories, loading, error, createCategory } = useProductCategories();
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function openPanel() {
    setErr(null);
    setNewName('');
    setOpen(true);
  }

  async function submitNewCategory() {
    const name = newName.trim();
    if (!name) {
      setErr('กรุณากรอกชื่อหมวดหมู่');
      inputRef.current?.focus();
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const category = await createCategory(name);
      onChange(category.id);
      onCreated?.(category);
      setNewName('');
      setOpen(false);
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
          aria-expanded={open}
          onClick={openPanel}
        >
          + เพิ่มหมวดหมู่
        </button>
      </div>

      {open && (
        <div
          id="inv-category-add-panel"
          className="inv-category-add-panel"
          role="region"
          aria-label="เพิ่มหมวดหมู่ใหม่"
        >
          <p className="inv-category-add-panel__title">เพิ่มหมวดหมู่ใหม่</p>
          <div className="inv-category-add-panel__row">
            <input
              ref={inputRef}
              id="inv-category-new-name"
              className="inv-category-add-panel__input"
              placeholder="ชื่อหมวดหมู่ เช่น iPhone, Accessory"
              value={newName}
              disabled={busy}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void submitNewCategory();
                }
                if (e.key === 'Escape') setOpen(false);
              }}
            />
            <button
              type="button"
              id="inv-btn-save-category"
              className="btn btn-sm btn-primary"
              disabled={busy}
              onClick={() => void submitNewCategory()}
            >
              {busy ? 'กำลังบันทึก…' : 'บันทึก'}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              disabled={busy}
              onClick={() => setOpen(false)}
            >
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      {err && <p className="text-xs text-red-400 mt-1">{err}</p>}
    </div>
  );
}
