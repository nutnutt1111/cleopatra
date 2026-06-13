import { apiFetch, getAuthToken } from './donutit-api.js';

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
    sel.innerHTML += `<option value="${p.id}" data-type="${p.trackingType}" data-price="${p.priceCents}">${p.name} (${p.priceBaht} บาท)</option>`;
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
      serialSel.innerHTML += `<option value="${s.id}">${s.serialNumber}</option>`;
    });
  } else {
    serialWrap?.classList.add('hidden');
  }
}

const cart = [];

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
      <span>${item.name}${item.serial ? ` [${item.serial}]` : ''} x${item.qty}</span>
      <span>${(item.lineTotalCents / 100).toFixed(2)}</span>
      <button data-remove="${i}" class="text-destructive text-xs">ลบ</button>
    </div>`,
    )
    .join('');

  el.querySelectorAll('[data-remove]').forEach((btn) => {
    btn.addEventListener('click', () => {
      cart.splice(Number(btn.getAttribute('data-remove')), 1);
      renderCart();
    });
  });
  updateTotals();
}

function updateTotals() {
  const subtotal = cart.reduce((s, c) => s + c.lineTotalCents, 0);
  document.getElementById('pos-subtotal')?.replaceChildren(document.createTextNode((subtotal / 100).toFixed(2)));
  const discount = parseFloat(document.getElementById('pos-discount')?.value || '0') * 100;
  const total = Math.max(0, subtotal - discount);
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
          <p class="font-medium text-sm">${b.billNumber}</p>
          <p class="text-xs text-muted-foreground">${b.createdByName} · ${new Date(b.createdAt).toLocaleString('th-TH')}</p>
          <p class="text-sm mt-1">รวม <strong>${b.totalBaht}</strong> บาท
            ${b.payments.length > 1 ? `<span class="text-xs text-primary">(แยกจ่าย ${b.payments.length} ช่องทาง)</span>` : ''}
          </p>
          <p class="text-xs text-muted-foreground">${b.lines.map((l) => l.productName).join(', ')}</p>
          ${b.status === 'VOIDED' ? `<p class="text-xs text-destructive">ยกเลิก: ${b.voidReason}</p>` : ''}
        </div>
        ${
          b.status === 'COMPLETED'
            ? `<button data-void-bill="${b.id}" class="text-xs text-destructive hover:underline">void</button>`
            : '<span class="text-xs text-muted-foreground">voided</span>'
        }
      </div>
    </div>`,
    )
    .join('');

  el.querySelectorAll('[data-void-bill]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const reason = prompt('เหตุผลยกเลิกบิล:');
      if (!reason) return;
      const res = await apiFetch(`/api/pos/bills/${btn.getAttribute('data-void-bill')}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) alert((await res.json()).error);
      else {
        await loadBills();
        await loadProducts();
        renderProductSelect();
      }
    });
  });
}

export function initPos() {
  if (!document.querySelector('[data-donutit-module="pos"]')) return;
  if (!getAuthToken()) {
    document.getElementById('pos-status')?.replaceChildren(
      document.createTextNode('เข้าสู่ระบบที่ /settings ก่อน'),
    );
    return;
  }

  loadProducts()
    .then(() => {
      renderProductSelect();
      loadBills();
    })
    .catch((e) => {
      document.getElementById('pos-status')?.replaceChildren(document.createTextNode(e.message));
    });

  document.getElementById('pos-product')?.addEventListener('change', onProductChange);
  document.getElementById('pos-discount')?.addEventListener('input', updateTotals);

  document.getElementById('btn-add-line')?.addEventListener('click', () => {
    const sel = document.getElementById('pos-product');
    const opt = sel?.selectedOptions[0];
    if (!opt?.value) return alert('เลือกสินค้า');
    const product = productsCache.find((p) => p.id === opt.value);
    const qty = parseInt(document.getElementById('pos-qty')?.value || '1', 10);
    let serialItemId, serial;
    if (product.trackingType === 'SERIALIZED') {
      serialItemId = document.getElementById('pos-serial')?.value;
      if (!serialItemId) return alert('เลือก Serial');
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

  document.getElementById('btn-checkout')?.addEventListener('click', async () => {
    if (!cart.length) return alert('เพิ่มสินค้าก่อน');
    const subtotal = cart.reduce((s, c) => s + c.lineTotalCents, 0);
    const discount = Math.round(parseFloat(document.getElementById('pos-discount')?.value || '0') * 100);
    const total = subtotal - discount;
    const cash = Math.round(parseFloat(document.getElementById('pos-pay-cash')?.value || '0') * 100);
    const transfer = Math.round(parseFloat(document.getElementById('pos-pay-transfer')?.value || '0') * 100);

    const payments = [];
    if (cash > 0) payments.push({ channel: 'CASH', amount: cash / 100 });
    if (transfer > 0) payments.push({ channel: 'TRANSFER', amount: transfer / 100 });
    if (cash + transfer !== total) {
      return alert(`ยอดชำระ ${((cash + transfer) / 100).toFixed(2)} ไม่ตรงยอดรวม ${(total / 100).toFixed(2)}`);
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
          discount: discount / 100,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();
      alert(`บิล ${data.bill.billNumber} สำเร็จ — ${data.bill.totalBaht} บาท`);
      cart.length = 0;
      renderCart();
      document.getElementById('pos-pay-cash').value = '';
      document.getElementById('pos-pay-transfer').value = '';
      await loadBills();
      await loadProducts();
      renderProductSelect();
    } catch (e) {
      alert(e.message);
    }
  });
}
