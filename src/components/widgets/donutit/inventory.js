import { apiFetch, isLoggedIn } from './donutit-api.js';
import { escapeHtml } from './escape-html.js';

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
    tbody.innerHTML = products
      .map((p) => {
        const stock =
          p.trackingType === 'QUANTITY'
            ? `${p.qtyOnHand} ชิ้น`
            : `${p.serials.length} serial พร้อมขาย`;
        const cost = p.costBaht ? `${escapeHtml(p.costBaht)} บาท` : '—';
        return `<tr class="border-b border-border">
        <td class="px-4 py-3 text-sm">${escapeHtml(p.sku)}</td>
        <td class="px-4 py-3 text-sm">${escapeHtml(p.name)}</td>
        <td class="px-4 py-3 text-sm">${p.trackingType === 'SERIALIZED' ? 'มี Serial' : 'นับจำนวน'}</td>
        <td class="px-4 py-3 text-sm">${escapeHtml(stock)}</td>
        <td class="px-4 py-3 text-sm text-right">${escapeHtml(p.priceBaht)}</td>
        <td class="px-4 py-3 text-sm text-right cost-cell">${cost}</td>
      </tr>`;
      })
      .join('');
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
            <span class="ml-1 ${s.status === 'AVAILABLE' ? 'text-green-600' : 'text-muted-foreground'}">${escapeHtml(s.statusLabel)}</span>
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
  if (root.hasAttribute('data-donutit-inited')) return;
  root.setAttribute('data-donutit-inited', '');
  if (!(await isLoggedIn())) {
    document.getElementById('inv-status')?.replaceChildren(
      document.createTextNode('เข้าสู่ระบบที่ /settings ก่อน'),
    );
    return;
  }
  refresh().catch((e) => {
    document.getElementById('inv-status')?.replaceChildren(document.createTextNode(e.message));
  });
}
