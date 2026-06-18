import { apiFetch, isLoggedIn } from './donutit-api.js';
import { escapeHtml } from './escape-html.js';
import { bindOnce } from './bind-once.js';
import { notify } from './notify.js';
import { showLoginRequired } from './donutit-ui.js';
import {
  listTradeInDrafts,
  saveTradeInDraft,
  formatDraftLabel,
} from './trade-in-draft.js';

let productsCache = [];

async function loadProducts() {
  const res = await apiFetch('/api/inventory/products');
  if (!res.ok) throw new Error((await res.json()).error);
  const data = await res.json();
  productsCache = data.products;
  return productsCache;
}

function renderProductSelect() {
  const sel = document.getElementById('pos-product');
  if (!sel) return;
  sel.innerHTML = '<option value="">-- เลือกสินค้า --</option>';
  productsCache.forEach((p) => {
    sel.innerHTML += `<option value="${escapeHtml(p.id)}" data-type="${escapeHtml(p.trackingType)}" data-price="${p.priceCents}">${escapeHtml(p.name)} (${escapeHtml(p.priceBaht)} บาท)</option>`;
  });
}

function onProductChange() {
  const sel = document.getElementById('pos-product');
  const serialWrap = document.getElementById('pos-serial-wrap');
  const serialSel = document.getElementById('pos-serial');
  const opt = sel?.selectedOptions[0];
  if (!opt?.value) {
    serialWrap?.classList.add('hidden');
    return;
  }
  const product = productsCache.find((p) => p.id === opt.value);
  if (product?.trackingType === 'SERIALIZED') {
    serialWrap?.classList.remove('hidden');
    serialSel.innerHTML = '<option value="">-- เลือก Serial --</option>';
    product.serials.forEach((s) => {
      serialSel.innerHTML += `<option value="${escapeHtml(s.id)}">${escapeHtml(s.serialNumber)}</option>`;
    });
  } else {
    serialWrap?.classList.add('hidden');
  }
}

const cart = [];

function calcTotals() {
  const subtotal = cart.reduce((s, c) => s + c.lineTotalCents, 0);
  const discount = Math.round(parseFloat(document.getElementById('pos-discount')?.value || '0') * 100);
  const total = Math.max(0, subtotal - discount);
  return { subtotal, discount, total };
}

function renderCart() {
  const el = document.getElementById('pos-cart');
  if (!el) return;
  if (!cart.length) {
    el.innerHTML = '<p class="text-sm text-muted-foreground">ยังไม่มีรายการ</p>';
    updateTotals();
    return;
  }
  el.innerHTML = cart
    .map(
      (item, i) => `<div class="flex justify-between py-2 border-b border-border text-sm">
      <span>${escapeHtml(item.name)}${item.serial ? ` [${escapeHtml(item.serial)}]` : ''} x${item.qty}</span>
      <span>${(item.lineTotalCents / 100).toFixed(2)}</span>
      <button data-remove="${i}" class="text-destructive text-xs">ลบ</button>
    </div>`,
    )
    .join('');
  updateTotals();
}

function updateTotals() {
  const { subtotal, total } = calcTotals();
  document.getElementById('pos-subtotal')?.replaceChildren(document.createTextNode((subtotal / 100).toFixed(2)));
  document.getElementById('pos-total')?.replaceChildren(document.createTextNode((total / 100).toFixed(2)));
}

async function loadBills() {
  const res = await apiFetch('/api/pos/bills');
  if (!res.ok) throw new Error((await res.json()).error);
  const data = await res.json();
  const el = document.getElementById('pos-bills');
  if (!el) return;

  if (!data.bills.length) {
    el.innerHTML = '<p class="text-sm text-muted-foreground">ยังไม่มีบิล</p>';
    return;
  }

  el.innerHTML = data.bills
    .map(
      (b) => `<div class="border border-border rounded-lg p-3 mb-2 ${b.status === 'VOIDED' ? 'opacity-60' : ''}">
      <div class="flex justify-between items-start">
        <div>
          <p class="font-medium text-sm">${escapeHtml(b.billNumber)}</p>
          <p class="text-xs text-muted-foreground">${escapeHtml(b.createdByName)} · ${new Date(b.createdAt).toLocaleString('th-TH')}</p>
          <p class="text-sm mt-1">รวม <strong>${escapeHtml(b.totalBaht)}</strong> บาท
            ${b.payments.length > 1 ? `<span class="text-xs text-primary">(แยกจ่าย ${b.payments.length} ช่องทาง)</span>` : ''}
          </p>
          <p class="text-xs text-muted-foreground">${b.lines.map((l) => escapeHtml(l.productName)).join(', ')}</p>
          ${b.status === 'VOIDED' ? `<p class="text-xs text-destructive">ยกเลิก: ${escapeHtml(b.voidReason)}</p>` : ''}
        </div>
        ${
          b.status === 'COMPLETED'
            ? `<button data-void-bill="${escapeHtml(b.id)}" class="text-xs text-destructive hover:underline">ยกเลิก</button>`
            : '<span class="text-xs text-muted-foreground">ยกเลิกแล้ว</span>'
        }
      </div>
    </div>`,
    )
    .join('');
}

async function handleBillAction(e) {
  const voidBtn = e.target.closest('[data-void-bill]');
  if (!voidBtn) return;

  const reason = prompt('เหตุผลยกเลิกบิล:');
  if (!reason) return;
  const res = await apiFetch(`/api/pos/bills/${voidBtn.getAttribute('data-void-bill')}/void`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) notify((await res.json()).error, 'error');
  else {
    await loadBills();
    await loadProducts();
    renderProductSelect();
  }
}

async function handleCartAction(e) {
  const removeBtn = e.target.closest('[data-remove]');
  if (!removeBtn) return;
  cart.splice(Number(removeBtn.getAttribute('data-remove')), 1);
  renderCart();
}

function renderTradeInDrafts() {
  const el = document.getElementById('pos-trade-drafts');
  if (!el) return;
  const drafts = listTradeInDrafts();
  if (!drafts.length) {
    el.innerHTML = '<p class="text-muted-foreground">ยังไม่มีดราฟ — บันทึกจากฟอร์มด้านบน</p>';
    return;
  }
  el.innerHTML = drafts
    .slice(0, 5)
    .map(
      (d) => `<div class="py-1 border-b border-border">${escapeHtml(formatDraftLabel(d))}</div>`,
    )
    .join('');
}

function clearTradeInForm() {
  for (const id of [
    'pos-trade-device',
    'pos-trade-serial',
    'pos-trade-sku',
    'pos-trade-cost',
    'pos-trade-price',
    'pos-trade-customer',
    'pos-trade-notes',
  ]) {
    const el = document.getElementById(id);
    if (el) el.value = '';
  }
}

export async function initPos() {
  if (!document.querySelector('[data-donutit-module="pos"]')) return;
  if (!(await isLoggedIn())) {
    showLoginRequired(document.getElementById('pos-status'));
    return;
  }

  bindOnce(document.getElementById('pos-bills'), 'click', handleBillAction);
  bindOnce(document.getElementById('pos-cart'), 'click', handleCartAction);

  loadProducts()
    .then(() => {
      renderProductSelect();
      loadBills();
    })
    .catch((e) => {
      document.getElementById('pos-status')?.replaceChildren(document.createTextNode(e.message));
    });

  document.getElementById('pos-product') && bindOnce(document.getElementById('pos-product'), 'change', onProductChange);
  document.getElementById('pos-discount') && bindOnce(document.getElementById('pos-discount'), 'input', updateTotals);

  renderTradeInDrafts();
  bindOnce(document.getElementById('btn-save-trade-draft'), 'click', () => {
    const deviceName = document.getElementById('pos-trade-device')?.value.trim();
    if (!deviceName) return notify('กรอกชื่อเครื่องก่อนบันทึกดราฟ', 'warning');
    saveTradeInDraft({
      deviceName,
      serialNumber: document.getElementById('pos-trade-serial')?.value || '',
      sku: document.getElementById('pos-trade-sku')?.value || '',
      costBaht: Number(document.getElementById('pos-trade-cost')?.value) || 0,
      priceBaht: Number(document.getElementById('pos-trade-price')?.value) || 0,
      customerName: document.getElementById('pos-trade-customer')?.value || '',
      notes: document.getElementById('pos-trade-notes')?.value || '',
    });
    notify('บันทึกดราฟ Trade-in แล้ว — ไปดึงที่หน้าสินค้าคงคลัง', 'success');
    clearTradeInForm();
    renderTradeInDrafts();
  });

  bindOnce(document.getElementById('btn-add-line'), 'click', () => {
    const sel = document.getElementById('pos-product');
    const opt = sel?.selectedOptions[0];
    if (!opt?.value) return notify('เลือกสินค้า', 'warning');
    const product = productsCache.find((p) => p.id === opt.value);
    const qty = parseInt(document.getElementById('pos-qty')?.value || '1', 10);
    let serialItemId, serial;
    if (product.trackingType === 'SERIALIZED') {
      serialItemId = document.getElementById('pos-serial')?.value;
      if (!serialItemId) return notify('เลือก Serial', 'warning');
      serial = product.serials.find((s) => s.id === serialItemId)?.serialNumber;
    }
    cart.push({
      productId: product.id,
      serialItemId,
      serial,
      name: product.name,
      qty: product.trackingType === 'SERIALIZED' ? 1 : qty,
      lineTotalCents: product.priceCents * (product.trackingType === 'SERIALIZED' ? 1 : qty),
    });
    renderCart();
  });

  bindOnce(document.getElementById('btn-checkout'), 'click', async () => {
    if (!cart.length) return notify('เพิ่มสินค้าก่อน', 'warning');
    const { total } = calcTotals();
    const cash = Math.round(parseFloat(document.getElementById('pos-pay-cash')?.value || '0') * 100);
    const transfer = Math.round(parseFloat(document.getElementById('pos-pay-transfer')?.value || '0') * 100);

    const payments = [];
    if (cash > 0) payments.push({ channel: 'CASH', amount: cash / 100 });
    if (transfer > 0) payments.push({ channel: 'TRANSFER', amount: transfer / 100 });
    if (cash + transfer !== total) {
      return notify(`ยอดชำระ ${((cash + transfer) / 100).toFixed(2)} ไม่ตรงยอดรวม ${(total / 100).toFixed(2)}`, 'warning');
    }

    try {
      const res = await apiFetch('/api/pos/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lines: cart.map((c) => ({
            productId: c.productId,
            serialItemId: c.serialItemId,
            qty: c.qty,
          })),
          payments,
          discount: calcTotals().discount / 100,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();
      notify(`บิล ${data.bill.billNumber} สำเร็จ — ${data.bill.totalBaht} บาท`, 'success');
      cart.length = 0;
      renderCart();
      document.getElementById('pos-pay-cash').value = '';
      document.getElementById('pos-pay-transfer').value = '';
      await loadBills();
      await loadProducts();
      renderProductSelect();
    } catch (e) {
      notify(e.message, 'error');
    }
  });
}
