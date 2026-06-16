import { apiFetch, isLoggedIn } from './donutit-api.js';
import { escapeHtml } from './escape-html.js';
import { bindOnce } from './bind-once.js';

async function loadJobs() {
  const res = await apiFetch('/api/messenger/jobs');
  if (!res.ok) throw new Error((await res.json()).error);
  return (await res.json()).jobs;
}

function renderJobs(jobs) {
  const el = document.getElementById('messenger-jobs');
  if (!el) return;

  if (!jobs.length) {
    el.innerHTML = '<p class="text-sm text-muted-foreground">ยังไม่มีงานส่ง</p>';
    return;
  }

  el.innerHTML = jobs
    .map(
      (j) => `<div class="border border-border rounded-lg p-3 mb-2 ${j.status === 'CANCELLED' ? 'opacity-60' : ''}">
      <div class="flex justify-between items-start gap-2">
        <div class="min-w-0">
          <p class="font-medium text-sm">${escapeHtml(j.jobNumber)}</p>
          <p class="text-xs text-muted-foreground">${escapeHtml(j.customerName)}${j.customerPhone ? ` · ${escapeHtml(j.customerPhone)}` : ''}</p>
          <p class="text-sm mt-1">${escapeHtml(j.address)}</p>
          ${j.description ? `<p class="text-xs text-muted-foreground">${escapeHtml(j.description)}</p>` : ''}
          <p class="text-sm mt-1">ค่าส่ง <strong>${escapeHtml(j.deliveryFeeBaht)}</strong> บาท (${escapeHtml(j.feeChannel)})</p>
          <span class="text-xs px-2 py-0.5 rounded-full bg-muted">${escapeHtml(j.statusLabel)}</span>
          ${j.cancelReason ? `<p class="text-xs text-destructive mt-1">ยกเลิก: ${escapeHtml(j.cancelReason)}</p>` : ''}
        </div>
        ${
          j.status === 'PENDING' || j.status === 'IN_TRANSIT'
            ? `<div class="flex flex-col gap-1 shrink-0">
            ${j.status === 'PENDING' ? `<button data-transit="${escapeHtml(j.id)}" class="text-xs px-2 py-1 bg-secondary border border-border rounded">กำลังส่ง</button>` : ''}
            <button data-deliver="${escapeHtml(j.id)}" class="text-xs px-2 py-1 bg-primary text-primary-foreground rounded">ส่งสำเร็จ</button>
            <button data-cancel="${escapeHtml(j.id)}" class="text-xs text-destructive hover:underline">ยกเลิก</button>
          </div>`
            : ''
        }
      </div>
    </div>`,
    )
    .join('');

  el.querySelectorAll('[data-transit]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const res = await apiFetch(`/api/messenger/jobs/${btn.getAttribute('data-transit')}/transit`, { method: 'POST' });
      if (!res.ok) alert((await res.json()).error);
      else renderJobs(await loadJobs());
    });
  });

  el.querySelectorAll('[data-deliver]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('ยืนยันส่งสำเร็จ? ค่าจัดส่งจะบันทึกเป็นรายรับ')) return;
      const res = await apiFetch(`/api/messenger/jobs/${btn.getAttribute('data-deliver')}/deliver`, { method: 'POST' });
      if (!res.ok) alert((await res.json()).error);
      else {
        const data = await res.json();
        alert(`ส่งสำเร็จ ${data.jobNumber}${data.deliveryFeeBaht !== '0.00' ? ` — ค่าส่ง ${data.deliveryFeeBaht} บาท` : ''}`);
        renderJobs(await loadJobs());
      }
    });
  });

  el.querySelectorAll('[data-cancel]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const reason = prompt('เหตุผลยกเลิก:');
      if (!reason) return;
      const res = await apiFetch(`/api/messenger/jobs/${btn.getAttribute('data-cancel')}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) alert((await res.json()).error);
      else renderJobs(await loadJobs());
    });
  });
}

export async function initMessenger() {
  if (!document.querySelector('[data-donutit-module="messenger"]')) return;
  if (!(await isLoggedIn())) {
    document.getElementById('messenger-status')?.replaceChildren(
      document.createTextNode('เข้าสู่ระบบที่ /settings ก่อน'),
    );
    return;
  }

  loadJobs()
    .then(renderJobs)
    .catch((e) => {
      document.getElementById('messenger-status')?.replaceChildren(document.createTextNode(e.message));
    });

  bindOnce(document.getElementById('btn-create-job'), 'click', async () => {
    const customerName = document.getElementById('msg-customer-name')?.value?.trim();
    const address = document.getElementById('msg-address')?.value?.trim();
    if (!customerName || !address) return alert('กรอกชื่อลูกค้าและที่อยู่');

    try {
      const res = await apiFetch('/api/messenger/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerPhone: document.getElementById('msg-customer-phone')?.value?.trim(),
          address,
          description: document.getElementById('msg-description')?.value?.trim(),
          deliveryFee: parseFloat(document.getElementById('msg-fee')?.value || '0'),
          feeChannel: document.getElementById('msg-fee-channel')?.value,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();
      alert(`สร้างงาน ${data.job.jobNumber} สำเร็จ`);
      ['msg-customer-name', 'msg-customer-phone', 'msg-address', 'msg-description', 'msg-fee'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      renderJobs(await loadJobs());
    } catch (e) {
      alert(e.message);
    }
  });
}
