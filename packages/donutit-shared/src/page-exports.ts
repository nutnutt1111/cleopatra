import { apiFetch } from './api';
import { downloadCsv, rowsToCsv } from './export-utils';

function stamp() {
  return new Date().toISOString().slice(0, 10);
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await apiFetch(path);
  const data = await res.json();
  if (!res.ok) throw new Error((data as { error?: string }).error || 'โหลดข้อมูลไม่สำเร็จ');
  return data as T;
}

export async function exportInventoryCsv() {
  const { products } = await fetchJson<{ products: Record<string, unknown>[] }>('/api/inventory/products');
  const columns = [
    { key: 'sku', label: 'SKU' },
    { key: 'name', label: 'ชื่อ' },
    { key: 'categoryName', label: 'หมวดหมู่' },
    { key: 'trackingLabel', label: 'ประเภท' },
    { key: 'stockLabel', label: 'สต็อก' },
    { key: 'priceBaht', label: 'ราคาขาย' },
    { key: 'costBaht', label: 'ต้นทุน' },
  ];
  const rows = products.map((p) => ({
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
  downloadCsv(`inventory-${stamp()}.csv`, rowsToCsv(columns, rows));
}

export async function exportPosBillsCsv() {
  const { bills } = await fetchJson<{ bills: Record<string, unknown>[] }>('/api/pos/bills');
  const columns = [
    { key: 'billNumber', label: 'เลขบิล' },
    { key: 'status', label: 'สถานะ' },
    { key: 'totalBaht', label: 'ยอดรวม' },
    { key: 'createdByName', label: 'ผู้ขาย' },
    { key: 'createdAt', label: 'วันที่' },
    { key: 'linesSummary', label: 'รายการ' },
  ];
  const rows = bills.map((b) => ({
    billNumber: b.billNumber,
    status: b.status,
    totalBaht: b.totalBaht,
    createdByName: b.createdByName,
    createdAt: new Date(String(b.createdAt)).toLocaleString('th-TH'),
    linesSummary: (b.lines as { productName: string }[]).map((l) => l.productName).join(', '),
  }));
  downloadCsv(`pos-bills-${stamp()}.csv`, rowsToCsv(columns, rows));
}

export async function exportPawnCsv() {
  const { tickets } = await fetchJson<{ tickets: Record<string, unknown>[] }>('/api/pawn/tickets');
  const columns = [
    { key: 'ticketNumber', label: 'เลขตั๋ว' },
    { key: 'customerName', label: 'ลูกค้า' },
    { key: 'itemDescription', label: 'สิ่งของ' },
    { key: 'principalBaht', label: 'เงินต้น' },
    { key: 'status', label: 'สถานะ' },
  ];
  downloadCsv(`pawn-${stamp()}.csv`, rowsToCsv(columns, tickets));
}

export async function exportMessengerCsv() {
  const { jobs } = await fetchJson<{ jobs: Record<string, unknown>[] }>('/api/messenger/jobs');
  const columns = [
    { key: 'jobNumber', label: 'เลขงาน' },
    { key: 'customerName', label: 'ลูกค้า' },
    { key: 'address', label: 'ที่อยู่' },
    { key: 'deliveryFeeBaht', label: 'ค่าส่ง' },
    { key: 'statusLabel', label: 'สถานะ' },
  ];
  downloadCsv(`messenger-${stamp()}.csv`, rowsToCsv(columns, jobs));
}

export async function exportCustomersCsv() {
  const { customers } = await fetchJson<{ customers: Record<string, unknown>[] }>('/api/customers');
  const columns = [
    { key: 'name', label: 'ชื่อ' },
    { key: 'phone', label: 'เบอร์' },
    { key: 'creditLimitBaht', label: 'วงเงิน' },
    { key: 'balanceBaht', label: 'ค้างชำระ' },
  ];
  downloadCsv(`customers-${stamp()}.csv`, rowsToCsv(columns, customers));
}

export async function exportHrEmployeesCsv() {
  const { employees } = await fetchJson<{ employees: Record<string, unknown>[] }>('/api/hr/employees');
  const columns = [
    { key: 'employeeCode', label: 'รหัส' },
    { key: 'name', label: 'ชื่อ' },
    { key: 'position', label: 'ตำแหน่ง' },
    { key: 'phone', label: 'เบอร์' },
    { key: 'salaryBaht', label: 'เงินเดือน' },
  ];
  const rows = employees.map((e) => ({
    ...e,
    salaryBaht: e.salaryBaht ?? '—',
  }));
  downloadCsv(`hr-employees-${stamp()}.csv`, rowsToCsv(columns, rows));
}

const EXPORT_BY_PATH: Record<string, () => Promise<void>> = {
  '/inventory': exportInventoryCsv,
  '/pos': exportPosBillsCsv,
  '/pawn': exportPawnCsv,
  '/messenger': exportMessengerCsv,
  '/customers': exportCustomersCsv,
  '/hr': exportHrEmployeesCsv,
  '/manager-hr': exportHrEmployeesCsv,
};

export function exportForPath(pathname: string) {
  const fn = EXPORT_BY_PATH[pathname];
  if (!fn) throw new Error('ไม่พบข้อมูลให้ส่งออกในหน้านี้');
  return fn();
}
