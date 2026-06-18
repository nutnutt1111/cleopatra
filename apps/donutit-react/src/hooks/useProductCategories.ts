import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@shared/api';

export type ProductCategory = { id: string; name: string };

export function useProductCategories() {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/api/inventory/categories');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'โหลดหมวดหมู่ไม่สำเร็จ');
      setCategories(data.categories);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดหมวดหมู่ไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function createCategory(name: string) {
    const res = await apiFetch('/api/inventory/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'เพิ่มหมวดหมู่ไม่สำเร็จ');
    await reload();
    return data.category as ProductCategory;
  }

  return { categories, loading, error, reload, createCategory };
}
