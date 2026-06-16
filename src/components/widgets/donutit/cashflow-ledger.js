import { isLoggedIn, apiFetch } from './donutit-api.js';
import { escapeHtml } from './escape-html.js';
import { bindOnce } from './bind-once.js';

const TYPE_LABELS = {
  INCOME: 'รายรับ',
  EXPENSE: 'รายจ่าย',
  TRANSFER_IN: 'โอนเข้า',
  TRANSFER_OUT: 'โอนออก',
};

const CHANNEL_LABELS = {
  CASH: 'เงินสด',
  TRANSFER: 'โอน',
  CREDIT: 'เครดิต',
  OTHER: 'อื่นๆ',
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoStr(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function setStatus(el, message, isError = false) {
  if (!el) return;
  el.textContent = message;
  el.className = `text-sm mt-2 ${isError ? 'text-destructive' : 'text-muted-foreground'}`;
}

async function loadLedger(from, to) {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const res = await apiFetch(`/api/cashflow/ledger?${params}`);
  if (!res.ok) throw new Error((await res.json()).error || 'โหลดรายการไม่สำเร็จ');
  return res.json();
}

async function loadDailyCloses() {
  const res = await apiFetch('/api/cashflow/daily-close');
  if (!res.ok) throw new Error((await res.json()).error || 'โหลดปิดวันไม่สำเร็จ');
  return res.json();
}

function renderLedgerTable(entries) {
  const tbody = document.getElementById('ledger-tbody');
  if (!tbody) return;

  if (!entries.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="px-4 py-8 text-center text-muted-foreground">ยังไม่มีรายการ</td></tr>`;
    return;
  }

  tbody.innerHTML = entries
    .map((e) => {
      const voided = e.isVoided ? 'line-through opacity-50' : '';
      const reversal = e.isReversal ? ' (กลับรายการ)' : '';
      const badge = e.isVoided
        ? '<span class="text-xs text-destructive">ยกเลิก</span>'
        : e.isReversal
          ? '<span class="text-xs text-amber-600">กลับรายการ</span>'
          : '';
      return `<tr class="border-b border-border hover:bg-muted/30 ${voided}">
        <td class="px-4 py-3 text-sm">${escapeHtml(e.entryDate)}</td>
        <td class="px-4 py-3 text-sm">${escapeHtml(TYPE_LABELS[e.type] || e.type)}${reversal}</td>
        <td class="px-4 py-3 text-sm">${escapeHtml(CHANNEL_LABELS[e.channel] || e.channel)}</td>
        <td class="px-4 py-3 text-sm text-right font-medium">${escapeHtml(e.amountBaht)}</td>
        <td class="px-4 py-3 text-sm">${escapeHtml(e.description)} ${badge}</td>
        <td class="px-4 py-3 text-sm text-right">
          ${
            !e.isVoided && !e.isReversal
              ? `<button data-void-id="${escapeHtml(e.id)}" class="text-xs text-destructive hover:underline">ยกเลิก</button>`
              : '—'
          }
        </td>
      </tr>`;
    })
    .join('');

  tbody.querySelectorAll('[data-void-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-void-id');
      const reason = prompt('เหตุผลในการยกเลิก:');
      if (!reason) return;
      try {
        const res = await apiFetch(`/api/cashflow/ledger/${id}/void`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        await refreshAll();
      } catch (err) {
        alert(err.message || 'ยกเลิกไม่สำเร็จ');
      }
    });
  });
}

function renderCloses(closes) {
  const el = document.getElementById('daily-close-list');
  if (!el) return;

  if (!closes.length) {
    el.innerHTML = '<p class="text-sm text-muted-foreground">ยังไม่มีการปิดวัน</p>';
    return;
  }

  el.innerHTML = closes
    .map(
      (c) => `<div class="flex items-center justify-between py-2 border-b border-border last:border-0">
      <div>
        <p class="text-sm font-medium">${escapeHtml(c.closeDate)}</p>
        <p class="text-xs text-muted-foreground">สุทธิ ${formatNet(c)} · โดย ${escapeHtml(c.closedByName)}</p>
      </div>
      <span class="text-xs px-2 py-1 rounded-full ${c.isLocked ? 'bg-red-500/10 text-red-600' : 'bg-green-500/10 text-green-600'}">
        ${c.isLocked ? 'ล็อกแล้ว' : 'ปลดล็อก'}
      </span>
    </div>`,
    )
    .join('');
}

function formatNet(c) {
  const netCents =
    c.netCents ??
    (c.cashIncomeCents ?? 0) -
      (c.cashExpenseCents ?? 0) +
      (c.transferIncomeCents ?? 0) -
      (c.transferExpenseCents ?? 0);
  return (netCents / 100).toLocaleString('th-TH', { minimumFractionDigits: 2 });
}

async function refreshAll() {
  const from = document.getElementById('filter-from')?.value;
  const to = document.getElementById('filter-to')?.value;
  const status = document.getElementById('ledger-status');

  try {
    const [ledger, closes] = await Promise.all([loadLedger(from, to), loadDailyCloses()]);
    renderLedgerTable(ledger.entries);
    renderCloses(closes.closes);
    setStatus(status, `โหลด ${ledger.entries.length} รายการ`);
  } catch (err) {
    setStatus(status, err.message, true);
  }
}

export async function initCashflowLedger() {
  const root = document.querySelector('[data-donutit-module="cashflow-ledger"]');
  if (!root) return;

  const fromInput = document.getElementById('filter-from');
  const toInput = document.getElementById('filter-to');
  if (fromInput && !fromInput.value) fromInput.value = daysAgoStr(7);
  if (toInput && !toInput.value) toInput.value = todayStr();

  bindOnce(document.getElementById('btn-filter'), 'click', refreshAll);

  bindOnce(document.getElementById('btn-add-entry'), 'click', async () => {
    const status = document.getElementById('form-status');
    const body = {
      entryDate: document.getElementById('entry-date')?.value || todayStr(),
      type: document.getElementById('entry-type')?.value,
      channel: document.getElementById('entry-channel')?.value,
      amount: parseFloat(document.getElementById('entry-amount')?.value || '0'),
      description: document.getElementById('entry-desc')?.value,
    };

    try {
      const res = await apiFetch('/api/cashflow/ledger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setStatus(status, 'บันทึกสำเร็จ');
      document.getElementById('entry-amount').value = '';
      document.getElementById('entry-desc').value = '';
      await refreshAll();
    } catch (err) {
      setStatus(status, err.message, true);
    }
  });

  bindOnce(document.getElementById('btn-daily-close'), 'click', async () => {
    const date = document.getElementById('close-date')?.value;
    if (!date) return alert('เลือกวันที่ปิด');
    if (!confirm(`ยืนยันปิดวัน ${date}?`)) return;

    try {
      const res = await apiFetch('/api/cashflow/daily-close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ closeDate: date }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      alert('ปิดวันสำเร็จ');
      await refreshAll();
    } catch (err) {
      alert(err.message || 'ปิดวันไม่สำเร็จ');
    }
  });

  bindOnce(document.getElementById('btn-unlock'), 'click', async () => {
    const date = document.getElementById('close-date')?.value;
    if (!date) return alert('เลือกวันที่');
    if (!confirm(`Owner: ปลดล็อกวัน ${date}?`)) return;

    try {
      const res = await apiFetch('/api/cashflow/daily-close/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ closeDate: date }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      alert('ปลดล็อกสำเร็จ');
      await refreshAll();
    } catch (err) {
      alert(err.message || 'ปลดล็อกไม่สำเร็จ');
    }
  });

  if (!(await isLoggedIn())) {
    setStatus(document.getElementById('ledger-status'), 'เข้าสู่ระบบที่ /settings เพื่อดูข้อมูล (dev: owner@donutit.local)', true);
    return;
  }

  refreshAll();
}
