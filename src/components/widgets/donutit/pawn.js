import { apiFetch, isLoggedIn } from './donutit-api.js';
import { escapeHtml } from './escape-html.js';
import { bindOnce } from './bind-once.js';

const STATUS_LABELS = {
  ACTIVE: 'ใช้งาน',
  REDEEMED: 'ไถ่ถอนแล้ว',
  VOIDED: 'ยกเลิก',
};

async function loadTickets() {
  const res = await apiFetch('/api/pawn/tickets');
  if (!res.ok) throw new Error((await res.json()).error);
  return (await res.json()).tickets;
}

function renderTickets(tickets) {
  const el = document.getElementById('pawn-tickets');
  if (!el) return;

  if (!tickets.length) {
    el.innerHTML = '<p class="text-sm text-muted-foreground">ยังไม่มีตั๋วจำนำ</p>';
    return;
  }

  el.innerHTML = tickets
    .map(
      (t) => `<div class="border border-border rounded-lg p-3 mb-2 ${t.status !== 'ACTIVE' ? 'opacity-70' : ''}">
      <div class="flex justify-between items-start gap-2">
        <div class="min-w-0">
          <p class="font-medium text-sm">${escapeHtml(t.ticketNumber)}</p>
          <p class="text-xs text-muted-foreground">${escapeHtml(t.customerName)}${t.customerPhone ? ` · ${escapeHtml(t.customerPhone)}` : ''}</p>
          <p class="text-sm mt-1">${escapeHtml(t.itemDescription)}</p>
          <p class="text-sm">เงินต้น <strong>${escapeHtml(t.principalBaht)}</strong> บาท · ดอกเบี้ย ${escapeHtml(t.interestPerPeriodBaht)} บาท/งวด (${escapeHtml(t.interestRatePercent)}%)</p>
          <p class="text-xs text-muted-foreground">ครบดอกถัดไป: ${new Date(t.nextInterestDueAt).toLocaleDateString('th-TH')}</p>
          <span class="text-xs px-2 py-0.5 rounded-full bg-muted">${escapeHtml(STATUS_LABELS[t.status] || t.status)}</span>
          ${t.transferDetail ? `<p class="text-xs mt-1 text-primary">โอน: ${escapeHtml(t.transferDetail)}</p>` : ''}
          ${t.payments.length ? `<p class="text-xs mt-1 text-muted-foreground">ชำระแล้ว ${t.payments.length} ครั้ง</p>` : ''}
          ${t.status === 'VOIDED' ? `<p class="text-xs text-destructive">ยกเลิก: ${escapeHtml(t.voidReason)}</p>` : ''}
        </div>
        ${
          t.status === 'ACTIVE'
            ? `<div class="flex flex-col gap-1 shrink-0">
            <button data-interest="${escapeHtml(t.id)}" class="text-xs px-2 py-1 bg-secondary border border-border rounded hover:bg-muted">รับดอกเบี้ย</button>
            <button data-redeem="${escapeHtml(t.id)}" class="text-xs px-2 py-1 bg-primary text-primary-foreground rounded">ไถ่ถอน</button>
            <button data-void="${escapeHtml(t.id)}" class="text-xs text-destructive hover:underline">void</button>
          </div>`
            : ''
        }
      </div>
    </div>`,
    )
    .join('');

  el.querySelectorAll('[data-interest]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const channel = prompt('ช่องทาง CASH หรือ TRANSFER?', 'CASH');
      if (!channel) return;
      let transferDetail;
      if (channel.toUpperCase() === 'TRANSFER') {
        transferDetail = prompt('รายละเอียดโอน:');
      }
      const res = await apiFetch(`/api/pawn/tickets/${btn.getAttribute('data-interest')}/interest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: channel.toUpperCase(), transferDetail }),
      });
      if (!res.ok) alert((await res.json()).error);
      else {
        const data = await res.json();
        alert(`รับดอกเบี้ย ${data.amountBaht} บาทสำเร็จ`);
        renderTickets(await loadTickets());
      }
    });
  });

  el.querySelectorAll('[data-redeem]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('ยืนยันไถ่ถอนเต็มจำนวน?')) return;
      const channel = prompt('ช่องทาง CASH หรือ TRANSFER?', 'CASH');
      if (!channel) return;
      let transferDetail;
      if (channel.toUpperCase() === 'TRANSFER') {
        transferDetail = prompt('รายละเอียดโอน:');
      }
      const res = await apiFetch(`/api/pawn/tickets/${btn.getAttribute('data-redeem')}/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: channel.toUpperCase(), transferDetail }),
      });
      if (!res.ok) alert((await res.json()).error);
      else {
        const data = await res.json();
        alert(`ไถ่ถอนสำเร็จ ${data.amountBaht} บาท`);
        renderTickets(await loadTickets());
      }
    });
  });

  el.querySelectorAll('[data-void]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const reason = prompt('เหตุผลยกเลิกตั๋ว:');
      if (!reason) return;
      const res = await apiFetch(`/api/pawn/tickets/${btn.getAttribute('data-void')}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) alert((await res.json()).error);
      else renderTickets(await loadTickets());
    });
  });
}

export async function initPawn() {
  if (!document.querySelector('[data-donutit-module="pawn"]')) return;
  if (!(await isLoggedIn())) {
    document.getElementById('pawn-status')?.replaceChildren(
      document.createTextNode('เข้าสู่ระบบที่ /settings ก่อน'),
    );
    return;
  }

  loadTickets()
    .then(renderTickets)
    .catch((e) => {
      document.getElementById('pawn-status')?.replaceChildren(document.createTextNode(e.message));
    });

  bindOnce(document.getElementById('btn-create-ticket'), 'click', async () => {
    const customerName = document.getElementById('pawn-customer-name')?.value?.trim();
    const itemDescription = document.getElementById('pawn-item')?.value?.trim();
    const principal = parseFloat(document.getElementById('pawn-principal')?.value || '0');
    const interestRatePercent = parseFloat(document.getElementById('pawn-rate')?.value || '2');
    const channel = document.getElementById('pawn-channel')?.value || 'CASH';
    const transferDetail = document.getElementById('pawn-transfer-detail')?.value?.trim();

    if (!customerName || !itemDescription || principal <= 0) {
      return alert('กรอกชื่อลูกค้า รายละเอียด และเงินต้น');
    }

    try {
      const res = await apiFetch('/api/pawn/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerPhone: document.getElementById('pawn-customer-phone')?.value?.trim(),
          itemDescription,
          principal,
          interestRatePercent,
          channel,
          transferDetail: channel === 'TRANSFER' ? transferDetail : undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();
      alert(`เปิดตั๋ว ${data.ticket.ticketNumber} สำเร็จ — เงินต้น ${data.ticket.principalBaht} บาท`);
      document.getElementById('pawn-customer-name').value = '';
      document.getElementById('pawn-customer-phone').value = '';
      document.getElementById('pawn-item').value = '';
      document.getElementById('pawn-principal').value = '';
      renderTickets(await loadTickets());
    } catch (e) {
      alert(e.message);
    }
  });
}
