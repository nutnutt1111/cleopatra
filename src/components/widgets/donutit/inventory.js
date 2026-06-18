import { apiFetch, isLoggedIn, getSessionUser } from './donutit-api.js';
import { escapeHtml } from './escape-html.js';
import { bindOnce } from './bind-once.js';
import { notify } from './notify.js';
import { showLoginRequired } from './donutit-ui.js';
import {
  listTradeInDrafts,
  getTradeInDraft,
  removeTradeInDraft,
  formatDraftLabel,
} from './trade-in-draft.js';
import { registerPageExport } from '../navbar/topbar-export.js';
import { downloadCsv, rowsToCsv } from './export-csv.js';

function toggleTypeFields() {
  const type = document.getElementById('inv-type')?.value;
  document.getElementById('inv-qty-wrap')?.classList.toggle('hidden', type === 'SERIALIZED');
  document.getElementById('inv-serial-wrap')?.classList.toggle('hidden', type !== 'SERIALIZED');
}

async function loadCategories(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return [];
  const res = await apiFetch('/api/inventory/categories');
  if (!res.ok) throw new Error((await res.json()).error);
  const { categories } = await res.json();
  const prev = select.value;
  select.innerHTML =
    '<option value="">— เลือกหมวดหมู่ —</option>' +
    categories.map((c) => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join('');
  if (prev && [...select.options].some((o) => o.value === prev)) {
    select.value = prev;
  }
  return categories;
}

function refreshDraftSelect() {
  const select = document.getElementById('inv-trade-draft');
  if (!select) return;
  const prev = select.value;
  const drafts = listTradeInDrafts();
  select.innerHTML =
    '<option value="">— เลือกดราฟจาก POS —</option>' +
    drafts.map((d) => `<option value="${escapeHtml(d.id)}">${escapeHtml(formatDraftLabel(d))}</option>`).join('');
  if (prev && drafts.some((d) => d.id === prev)) {
    select.value = prev;
  }
}

function applyTradeInDraft(draft) {
  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.value = value ?? '';
  };
  set('inv-name', draft.deviceName);
  set('inv-sku', draft.sku || suggestSku(draft));
  set('inv-cost', draft.costBaht || '');
  set('inv-price', draft.priceBaht || '');
  if (draft.serialNumber) {
    const typeEl = document.getElementById('inv-type');
    if (typeEl) typeEl.value = 'SERIALIZED';
    toggleTypeFields();
    set('inv-serials-input', draft.serialNumber);
  }
  const hint = document.getElementById('inv-draft-hint');
  if (hint) {
    const parts = [draft.customerName, draft.notes].filter(Boolean);
    hint.textContent = parts.length ? `จากดราฟ: ${parts.join(' · ')}` : 'ดึงข้อมูลจากดราฟแล้ว';
    hint.classList.remove('hidden');
  }
}

function suggestSku(draft) {
  const base = (draft.deviceName || 'TRADEIN')
    .replace(/[^a-zA-Z0-9ก-๙]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 20)
    .toUpperCase();
  const tail = draft.serialNumber ? `-${draft.serialNumber.slice(-4)}` : '';
  return `${base || 'TRADEIN'}${tail}`;
}

function registerInventoryExport() {
  registerPageExport('inventory', async () => {
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
    const rows = products.map((p) => ({
      sku: p.sku,
      name: p.name,
      categoryName: p.categoryName ?? '',
      trackingLabel: p.trackingType === 'SERIALIZED' ? 'มี Serial' : 'นับจำนวน',
      stockLabel:
        p.trackingType === 'QUANTITY'
          ? `${p.qtyOnHand} ชิ้น`
          : `${p.serials.length} serial`,
      priceBaht: p.priceBaht,
      costBaht: p.costBaht ?? '',
    }));
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`inventory-${stamp}.csv`, rowsToCsv(columns, rows));
    notify('ส่งออกรายการสินค้าแล้ว', 'success');
  });
}

async function refresh() {
  const [prodRes, moveRes] = await Promise.all([
    apiFetch('/api/inventory/products'),
    apiFetch('/api/inventory/movements'),
  ]);
  if (!prodRes.ok) throw new Error((await prodRes.json()).error);
  const { products } = await prodRes.json();
  const moves = moveRes.ok ? (await moveRes.json()).movements : [];

  const tbody = document.getElementById('inv-tbody');
  if (tbody) {
    tbody.innerHTML = products.length
      ? products
          .map((p) => {
            const stock =
              p.trackingType === 'QUANTITY'
                ? `${p.qtyOnHand} ชิ้น`
                : `${p.serials.length} serial พร้อมขาย`;
            const cost = p.costBaht ? `${escapeHtml(p.costBaht)} บาท` : '—';
            return `<tr class="border-b border-border">
        <td class="px-4 py-3 text-sm">${escapeHtml(p.sku)}</td>
        <td class="px-4 py-3 text-sm">${escapeHtml(p.name)}</td>
        <td class="px-4 py-3 text-sm">${escapeHtml(p.categoryName ?? '—')}</td>
        <td class="px-4 py-3 text-sm">${p.trackingType === 'SERIALIZED' ? 'มี Serial' : 'นับจำนวน'}</td>
        <td class="px-4 py-3 text-sm">${escapeHtml(stock)}</td>
        <td class="px-4 py-3 text-sm text-right">${escapeHtml(p.priceBaht)}</td>
        <td class="px-4 py-3 text-sm text-right cost-cell">${cost}</td>
      </tr>`;
          })
          .join('')
      : '<tr><td colspan="7" class="px-4 py-8 text-center text-muted-foreground">ยังไม่มีสินค้า — เพิ่มรายการด้านบน</td></tr>';
  }

  const serialEl = document.getElementById('inv-serials');
  if (serialEl) {
    const allSerials = products.flatMap((p) =>
      p.serials.map((s) => ({ ...s, productName: p.name })),
    );
    serialEl.innerHTML = allSerials.length
      ? allSerials
          .map(
            (s) => `<span class="inline-flex items-center px-2 py-1 rounded-md text-xs border border-border mr-2 mb-2">
            ${escapeHtml(s.serialNumber)} · ${escapeHtml(s.productName)}
            <span class="ml-1 badge ${s.status === 'AVAILABLE' ? 'badge-soft-success' : 'badge-soft-secondary'}">${escapeHtml(s.statusLabel)}</span>
          </span>`,
          )
          .join('')
      : '<p class="text-sm text-muted-foreground">ไม่มี serial</p>';
  }

  const moveEl = document.getElementById('inv-moves');
  if (moveEl) {
    moveEl.innerHTML = moves.length
      ? moves
          .map(
            (m) => `<div class="text-xs py-1 border-b border-border">
            ${new Date(m.createdAt).toLocaleString('th-TH')} · ${escapeHtml(m.productName)}
            ${m.serialNumber ? `[${escapeHtml(m.serialNumber)}]` : ''}
            · ${m.qtyDelta > 0 ? '+' : ''}${m.qtyDelta} · ${escapeHtml(m.reason)}
          </div>`,
          )
          .join('')
      : '<p class="text-sm text-muted-foreground">ยังไม่มี movement</p>';
  }
}

export async function initInventory() {
  const root = document.querySelector('[data-donutit-module="inventory"]');
  if (!root) return;

  if (!(await isLoggedIn())) {
    showLoginRequired(document.getElementById('inv-status'));
    return;
  }

  const user = getSessionUser();
  const canAdd = user && (user.role === 'OWNER' || user.role === 'MANAGER');
  const panel = document.getElementById('inv-add-panel');
  if (canAdd && panel) panel.classList.remove('hidden');

  registerInventoryExport();
  bindOnce(document.getElementById('inv-type'), 'change', toggleTypeFields);
  toggleTypeFields();

  if (canAdd) {
    loadCategories('inv-category').catch((e) => notify(e.message, 'error'));
    refreshDraftSelect();

    bindOnce(document.getElementById('inv-btn-import-draft'), 'click', () => {
      const id = document.getElementById('inv-trade-draft')?.value;
      if (!id) return notify('เลือกดราฟก่อน', 'warning');
      const draft = getTradeInDraft(id);
      if (!draft) {
        notify('ไม่พบดราฟ — อาจถูกลบแล้ว', 'error');
        refreshDraftSelect();
        return;
      }
      applyTradeInDraft(draft);
      notify(`ดึงข้อมูล "${draft.deviceName}" จากดราฟแล้ว`, 'success');
    });

    bindOnce(document.getElementById('inv-btn-delete-draft'), 'click', () => {
      const id = document.getElementById('inv-trade-draft')?.value;
      if (!id) return notify('เลือกดราฟที่จะลบ', 'warning');
      if (!window.confirm('ลบดราฟ Trade-in นี้?')) return;
      removeTradeInDraft(id);
      refreshDraftSelect();
      document.getElementById('inv-draft-hint')?.classList.add('hidden');
      notify('ลบดราฟแล้ว', 'success');
    });

    bindOnce(document.getElementById('inv-btn-add-category'), 'click', async () => {
      const name = window.prompt('ชื่อหมวดหมู่ใหม่');
      if (!name?.trim()) return;
      const res = await apiFetch('/api/inventory/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify(data.error || 'เพิ่มหมวดหมู่ไม่สำเร็จ', 'error');
        return;
      }
      await loadCategories('inv-category');
      const select = document.getElementById('inv-category');
      if (select) select.value = data.category.id;
      notify(`เพิ่มหมวดหมู่ "${data.category.name}" แล้ว`, 'success');
    });
  }

  bindOnce(document.getElementById('inv-btn-add'), 'click', async () => {
    const trackingType = document.getElementById('inv-type').value;
    const categoryId = document.getElementById('inv-category')?.value || null;
    const body = {
      sku: document.getElementById('inv-sku').value.trim(),
      name: document.getElementById('inv-name').value.trim(),
      trackingType,
      price: Number(document.getElementById('inv-price').value),
      cost: Number(document.getElementById('inv-cost').value) || 0,
      categoryId: categoryId || undefined,
    };
    if (trackingType === 'SERIALIZED') {
      body.serialNumbers = document
        .getElementById('inv-serials-input')
        .value.split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    } else {
      body.qtyOnHand = Number(document.getElementById('inv-qty').value) || 0;
    }
    const res = await apiFetch('/api/inventory/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      notify(data.error || 'เพิ่มสินค้าไม่สำเร็จ', 'error');
      return;
    }
    notify(`เพิ่มสินค้า ${data.product.name} แล้ว`, 'success');
    const draftId = document.getElementById('inv-trade-draft')?.value;
    if (draftId) {
      removeTradeInDraft(draftId);
      refreshDraftSelect();
      document.getElementById('inv-draft-hint')?.classList.add('hidden');
    }
    document.getElementById('inv-sku').value = '';
    document.getElementById('inv-name').value = '';
    await refresh();
  });

  refresh().catch((e) => notify(e.message, 'error'));
}
