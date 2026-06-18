import { useLocation } from 'react-router-dom';
import { apiFetch, canExport, getSessionUser } from '@shared/api';
import { downloadCsv, rowsToCsv } from '@shared/export-utils';
import { useToast } from '../ui/Toast';

export function TopbarExportButton() {
  const user = getSessionUser();
  const location = useLocation();
  const toast = useToast();

  if (!canExport(user)) return null;

  async function handleExport() {
    try {
      if (location.pathname === '/inventory') {
        const res = await apiFetch('/api/inventory/products');
        if (!res.ok) throw new Error((await res.json()).error);
        const { products } = await res.json();
        const columns = [
          { key: 'sku', label: 'SKU' },
          { key: 'name', label: 'ชื่อ' },
          { key: 'categoryName', label: 'หมวดหมู่' },
          { key: 'trackingLabel', label: 'ประเภท' },
          { key: 'stockLabel', label: 'สต็อก' },
          { key: 'priceBaht', label: 'ราคาขาย' },
          { key: 'costBaht', label: 'ต้นทุน' },
        ];
        const rows = products.map((p: Record<string, unknown>) => ({
          sku: p.sku,
          name: p.name,
          categoryName: p.categoryName ?? '',
          trackingLabel: p.trackingType === 'SERIALIZED' ? 'มี Serial' : 'นับจำนวน',
          stockLabel:
            p.trackingType === 'QUANTITY'
              ? `${p.qtyOnHand} ชิ้น`
              : `${(p.serials as unknown[]).length} serial`,
          priceBaht: p.priceBaht,
          costBaht: p.costBaht ?? '',
        }));
        const stamp = new Date().toISOString().slice(0, 10);
        downloadCsv(`inventory-${stamp}.csv`, rowsToCsv(columns, rows));
        toast.show('ส่งออกรายการสินค้าแล้ว', 'success');
        return;
      }
      toast.show('ไม่พบข้อมูลให้ส่งออกในหน้านี้', 'warning');
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'ส่งออกไม่สำเร็จ', 'error');
    }
  }

  return (
    <button
      id="topbar-export-btn"
      type="button"
      className="btn btn-sm btn-ghost topbar-export-btn"
      title="ส่งออก"
      aria-label="ส่งออก"
      onClick={handleExport}
    >
      Export
    </button>
  );
}
