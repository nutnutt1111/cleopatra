import { apiFetch, isLoggedIn } from './donutit-api.js';
import { escapeHtml } from './escape-html.js';
import { bindOnce } from './bind-once.js';
import { notify } from './notify.js';
import { showLoginRequired } from './donutit-ui.js';

let customersCache = [];

async function loadCustomers() {
  const res = await apiFetch('/api/customers');
  if (!res.ok) throw new Error((await res.json()).error);
  const data = await res.json();
  customersCache = data.customers;
  return customersCache;
}

async function refreshUi() {
  await loadCustomers();
  renderSelects();
  onPayCustomerChange();
  renderList();
}

function renderSelects() {
  const opts = '<option value="">-- เลือกลูกค้า --</option>' +
    customersCache.map((c) => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)} (ค้าง ${escapeHtml(c.balanceBaht)})</option>`).join('');

  ['cust-sale-customer', 'cust-pay-customer'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = opts;
  });
}

function onPayCustomerChange() {
  const customerId = document.getElementById('cust-pay-customer')?.value;
  const saleSel = document.getElementById('cust-pay-sale');
  if (!saleSel) return;

  saleSel.innerHTML = '<option value="">— ชำระทั่วไป —</option>';
  const customer = customersCache.find((c) => c.id === customerId);
  if (!customer) return;

  customer.openSales.forEach((s) => {
    saleSel.innerHTML += `<option value="${escapeHtml(s.id)}">${escapeHtml(s.saleNumber)} — ค้าง ${escapeHtml(s.remainingBaht)} บาท</option>`;
  });
}

function renderList() {
  const el = document.getElementById('customers-list');
  if (!el) return;

  if (!customersCache.length) {
    el.innerHTML = '<p class="text-sm text-muted-foreground">ยังไม่มีลูกค้า</p>';
    return;
  }

  el.innerHTML = customersCache
    .map(
      (c) => `<div class="border border-border rounded-lg p-3 mb-2">
      <p class="font-medium text-sm">${escapeHtml(c.name)}</p>
      <p class="text-xs text-muted-foreground">${escapeHtml(c.phone || '—')} · วงเงิน ${escapeHtml(c.creditLimitBaht)} บาท</p>
      <p class="text-sm mt-1">ลูกหนี้คงค้าง <strong class="${c.balanceCents > 0 ? 'text-amber-700' : ''}">${escapeHtml(c.balanceBaht)}</strong> บาท</p>
      ${
        c.openSales.length
          ? `<div class="mt-2 space-y-1">
          ${c.openSales
            .map(
              (s) => `<p class="text-xs border-l-2 border-primary pl-2">
              ${escapeHtml(s.saleNumber)}: ${escapeHtml(s.description)} — ค้าง ${escapeHtml(s.remainingBaht)} บาท
              ${
                s.installment
                  ? `<br/>ผ่อน ${s.installment.paidInstallments}/${s.installment.installmentCount} งวด · งวดละ ${escapeHtml(s.installment.installmentAmountBaht)} · ครบ ${new Date(s.installment.nextDueDate).toLocaleDateString('th-TH')}`
                  : ''
              }
            </p>`,
            )
            .join('')}
        </div>`
          : ''
      }
      ${
        c.recentPayments.length
          ? `<p class="text-xs text-muted-foreground mt-2">ชำระล่าสุด: ${c.recentPayments.map((p) => `${escapeHtml(p.amountBaht)} (${escapeHtml(p.channel)})`).join(', ')}</p>`
          : ''
      }
    </div>`,
    )
    .join('');
}

export async function initCustomers() {
  if (!document.querySelector('[data-donutit-module="customers"]')) return;
  if (!(await isLoggedIn())) {
    showLoginRequired(document.getElementById('customers-status'));
    return;
  }

  refreshUi().catch((e) => {
    document.getElementById('customers-status')?.replaceChildren(document.createTextNode(e.message));
  });

  bindOnce(document.getElementById('cust-pay-customer'), 'change', onPayCustomerChange);

  bindOnce(document.getElementById('btn-add-customer'), 'click', async () => {
    const name = document.getElementById('cust-name')?.value?.trim();
    if (!name) return notify('กรอกชื่อลูกค้า', 'warning');

    try {
      const res = await apiFetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone: document.getElementById('cust-phone')?.value?.trim(),
          creditLimit: parseFloat(document.getElementById('cust-limit')?.value || '0'),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      document.getElementById('cust-name').value = '';
      document.getElementById('cust-phone').value = '';
      document.getElementById('cust-limit').value = '';
      await refreshUi();
    } catch (e) {
      notify(e.message, 'error');
    }
  });

  bindOnce(document.getElementById('btn-credit-sale'), 'click', async () => {
    const customerId = document.getElementById('cust-sale-customer')?.value;
    const description = document.getElementById('cust-sale-desc')?.value?.trim();
    const total = parseFloat(document.getElementById('cust-sale-total')?.value || '0');
    const installmentCount = parseInt(document.getElementById('cust-sale-installments')?.value || '0', 10);

    if (!customerId || !description || total <= 0) return notify('เลือกลูกค้า กรอกรายละเอียดและยอด', 'warning');

    try {
      const res = await apiFetch('/api/customers/credit-sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, description, total, installmentCount }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();
      notify(`ขายเครดิต ${data.sale.saleNumber} — ${data.sale.totalBaht} บาท`, 'success');
      document.getElementById('cust-sale-desc').value = '';
      document.getElementById('cust-sale-total').value = '';
      await refreshUi();
    } catch (e) {
      notify(e.message, 'error');
    }
  });

  bindOnce(document.getElementById('btn-customer-pay'), 'click', async () => {
    const customerId = document.getElementById('cust-pay-customer')?.value;
    const amount = parseFloat(document.getElementById('cust-pay-amount')?.value || '0');
    const channel = document.getElementById('cust-pay-channel')?.value || 'CASH';
    const creditSaleId = document.getElementById('cust-pay-sale')?.value || undefined;
    const transferDetail = document.getElementById('cust-pay-transfer')?.value?.trim();

    if (!customerId || amount <= 0) return notify('เลือกลูกค้าและจำนวนเงิน', 'warning');

    try {
      const res = await apiFetch('/api/customers/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          amount,
          channel,
          creditSaleId,
          transferDetail: channel === 'TRANSFER' ? transferDetail : undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();
      notify(`รับชำระ ${data.payment.amountBaht} บาทสำเร็จ`, 'success');
      document.getElementById('cust-pay-amount').value = '';
      await refreshUi();
    } catch (e) {
      notify(e.message, 'error');
    }
  });
}
