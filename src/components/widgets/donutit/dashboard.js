import { apiFetch, isLoggedIn } from './donutit-api.js';
import { escapeHtml } from './escape-html.js';

const LOW_STOCK_THRESHOLD = 5;

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoStr(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function isToday(iso) {
  return iso.slice(0, 10) === todayStr();
}

function formatBaht(cents) {
  return (cents / 100).toLocaleString('th-TH', { minimumFractionDigits: 2 });
}

function setKpi(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setStatus(msg, isError = false) {
  const el = document.getElementById('dash-status');
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle('text-destructive', isError);
}

function billStatusBadge(status) {
  if (status === 'COMPLETED') return '<span class="badge badge-soft-success">สำเร็จ</span>';
  if (status === 'VOIDED') return '<span class="badge badge-soft-destructive">ยกเลิก</span>';
  return `<span class="badge badge-soft-warning">${escapeHtml(status)}</span>`;
}

function ledgerTypeBadge(type) {
  if (type === 'INCOME') return '<span class="badge badge-soft-success">รายรับ</span>';
  if (type === 'EXPENSE') return '<span class="badge badge-soft-destructive">รายจ่าย</span>';
  return `<span class="badge badge-soft-secondary">${escapeHtml(type)}</span>`;
}

function renderRecentBills(bills) {
  const el = document.getElementById('dash-recent-bills');
  if (!el) return;
  const recent = bills.slice(0, 8);
  if (!recent.length) {
    el.innerHTML = '<p class="text-sm text-muted-foreground p-4">ยังไม่มีบิล</p>';
    return;
  }
  el.innerHTML = `<div class="overflow-x-auto"><table class="w-full text-sm">
    <thead><tr class="border-b border-border text-xs text-muted-foreground">
      <th class="text-left px-4 py-2">บิล</th>
      <th class="text-left px-4 py-2">สถานะ</th>
      <th class="text-right px-4 py-2">ยอด</th>
    </tr></thead>
    <tbody>${recent
      .map(
        (b) => `<tr class="border-b border-border hover:bg-muted/40">
        <td class="px-4 py-2">
          <p class="font-medium">${escapeHtml(b.billNumber)}</p>
          <p class="text-xs text-muted-foreground">${new Date(b.createdAt).toLocaleString('th-TH')}</p>
        </td>
        <td class="px-4 py-2">${billStatusBadge(b.status)}</td>
        <td class="px-4 py-2 text-right font-mono">${escapeHtml(b.totalBaht)}</td>
      </tr>`,
      )
      .join('')}</tbody></table></div>`;
}

function renderRecentLedger(entries) {
  const el = document.getElementById('dash-recent-ledger');
  if (!el) return;
  const active = entries.filter((e) => !e.isVoided).slice(0, 8);
  if (!active.length) {
    el.innerHTML = '<p class="text-sm text-muted-foreground p-4">ยังไม่มีรายการ</p>';
    return;
  }
  el.innerHTML = `<div class="overflow-x-auto"><table class="w-full text-sm">
    <thead><tr class="border-b border-border text-xs text-muted-foreground">
      <th class="text-left px-4 py-2">รายการ</th>
      <th class="text-left px-4 py-2">ประเภท</th>
      <th class="text-right px-4 py-2">จำนวน</th>
    </tr></thead>
    <tbody>${active
      .map(
        (e) => `<tr class="border-b border-border hover:bg-muted/40">
        <td class="px-4 py-2">
          <p class="font-medium truncate max-w-[200px]">${escapeHtml(e.description)}</p>
          <p class="text-xs text-muted-foreground">${escapeHtml(e.entryDate)}</p>
        </td>
        <td class="px-4 py-2">${ledgerTypeBadge(e.type)}</td>
        <td class="px-4 py-2 text-right font-mono">${escapeHtml(e.amountBaht)}</td>
      </tr>`,
      )
      .join('')}</tbody></table></div>`;
}

async function loadDashboardData() {
  const from = daysAgoStr(7);
  const to = todayStr();
  const [billsRes, ticketsRes, customersRes, productsRes, ledgerRes] = await Promise.all([
    apiFetch('/api/pos/bills?limit=50'),
    apiFetch('/api/pawn/tickets?limit=100'),
    apiFetch('/api/customers?limit=100'),
    apiFetch('/api/inventory/products'),
    apiFetch(`/api/cashflow/ledger?from=${from}&to=${to}&limit=20`),
  ]);

  const errors = [];
  if (!billsRes.ok) errors.push('บิล');
  if (!ticketsRes.ok) errors.push('จำนำ');
  if (!customersRes.ok) errors.push('ลูกค้า');
  if (!productsRes.ok) errors.push('สินค้า');
  if (!ledgerRes.ok) errors.push('กระทบยอด');
  if (errors.length) throw new Error(`โหลดไม่สำเร็จ: ${errors.join(', ')}`);

  const bills = (await billsRes.json()).bills ?? [];
  const tickets = (await ticketsRes.json()).tickets ?? [];
  const customers = (await customersRes.json()).customers ?? [];
  const products = (await productsRes.json()).products ?? [];
  const ledger = (await ledgerRes.json()).entries ?? [];

  const todayBills = bills.filter((b) => b.status === 'COMPLETED' && isToday(b.createdAt));
  const salesTodayCents = todayBills.reduce((s, b) => s + (b.totalCents ?? 0), 0);
  const activePawn = tickets.filter((t) => t.status === 'ACTIVE').length;
  const arCents = customers.reduce((s, c) => s + (c.balanceCents ?? 0), 0);
  const lowStock = products.filter(
    (p) => p.trackingType === 'QUANTITY' && p.qtyOnHand != null && p.qtyOnHand <= LOW_STOCK_THRESHOLD,
  ).length;

  setKpi('kpi-sales-today', formatBaht(salesTodayCents));
  setKpi('kpi-bills-today', String(todayBills.length));
  setKpi('kpi-pawn-active', String(activePawn));
  setKpi('kpi-ar-balance', formatBaht(arCents));
  setKpi('kpi-low-stock', String(lowStock));

  renderRecentBills(bills);
  renderRecentLedger(ledger);
  setStatus(`อัปเดต ${new Date().toLocaleString('th-TH')}`);
}

export async function initDashboard() {
  if (!document.querySelector('[data-donutit-module="dashboard"]')) return;

  if (!(await isLoggedIn())) {
    setStatus('เข้าสู่ระบบที่ /settings ก่อนเพื่อดูภาพรวม', true);
    return;
  }

  setStatus('กำลังโหลด...');
  try {
    await loadDashboardData();
  } catch (e) {
    setStatus(e.message, true);
  }
}
