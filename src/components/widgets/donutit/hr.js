import { apiFetch, isLoggedIn } from './donutit-api.js';
import { escapeHtml } from './escape-html.js';

let hrMeta = { canManage: false, canViewPayroll: false };

async function loadEmployees() {
  const res = await apiFetch('/api/hr/employees');
  if (!res.ok) throw new Error((await res.json()).error);
  const data = await res.json();
  hrMeta = { canManage: data.canManage, canViewPayroll: data.canViewPayroll };
  return data.employees;
}

async function loadPayroll() {
  const res = await apiFetch('/api/hr/payroll');
  if (!res.ok) throw new Error((await res.json()).error);
  return (await res.json()).runs;
}

function renderEmployees(employees) {
  const el = document.getElementById('hr-employees');
  if (!el) return;

  if (!employees.length) {
    el.innerHTML = '<p class="text-sm text-muted-foreground">ยังไม่มีพนักงาน</p>';
    return;
  }

  el.innerHTML = employees
    .map(
      (e) => `<div class="border border-border rounded-lg p-3 mb-2">
      <p class="font-medium text-sm">${escapeHtml(e.name)} <span class="text-xs text-muted-foreground">(${escapeHtml(e.employeeCode)})</span></p>
      <p class="text-xs text-muted-foreground">${escapeHtml(e.position || '—')} · ${escapeHtml(e.phone || '—')}</p>
      <p class="text-sm mt-1">${e.salaryBaht != null ? `เงินเดือน <strong>${escapeHtml(e.salaryBaht)}</strong> บาท` : '<span class="text-muted-foreground text-xs">เงินเดือน — ซ่อนตามสิทธิ์</span>'}</p>
      <p class="text-xs text-muted-foreground">เริ่มงาน ${escapeHtml(e.hireDate)}</p>
    </div>`,
    )
    .join('');
}

function renderPayroll(runs) {
  const el = document.getElementById('hr-payroll-list');
  if (!el) return;

  if (!runs.length) {
    el.innerHTML = '<p class="text-sm text-muted-foreground">ยังไม่มีรอบเงินเดือน</p>';
    return;
  }

  el.innerHTML = runs
    .map(
      (r) => `<div class="border border-border rounded-lg p-3 mb-2">
      <div class="flex justify-between items-start">
        <div>
          <p class="font-medium text-sm">${escapeHtml(r.periodLabel)}</p>
          <p class="text-xs text-muted-foreground">${escapeHtml(r.periodStart)} — ${escapeHtml(r.periodEnd)}</p>
          <p class="text-sm mt-1">รวม <strong>${escapeHtml(r.totalBaht)}</strong> บาท · ${r.lines.length} คน</p>
          <span class="text-xs px-2 py-0.5 rounded-full ${r.status === 'PAID' ? 'bg-green-500/10 text-green-700' : 'bg-amber-500/10 text-amber-700'}">${r.status === 'PAID' ? 'จ่ายแล้ว' : 'รอจ่าย'}</span>
          <div class="text-xs text-muted-foreground mt-2">${r.lines.map((l) => `${escapeHtml(l.employeeName)}: ${escapeHtml(l.amountBaht)}`).join(' · ')}</div>
        </div>
        ${r.status === 'DRAFT' ? `<button data-pay-payroll="${escapeHtml(r.id)}" class="text-xs px-2 py-1 bg-primary text-primary-foreground rounded shrink-0">จ่ายเงินเดือน</button>` : ''}
      </div>
    </div>`,
    )
    .join('');

  el.querySelectorAll('[data-pay-payroll]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('ยืนยันจ่ายเงินเดือน? จะบันทึกเป็นรายจ่ายใน ledger')) return;
      const res = await apiFetch(`/api/hr/payroll/${btn.getAttribute('data-pay-payroll')}/pay`, { method: 'POST' });
      if (!res.ok) alert((await res.json()).error);
      else {
        const data = await res.json();
        alert(`จ่ายเงินเดือน ${data.periodLabel} — ${data.totalBaht} บาทสำเร็จ`);
        renderPayroll(await loadPayroll());
      }
    });
  });
}

function applyPanels() {
  document.getElementById('hr-manage-panel')?.classList.toggle('hidden', !hrMeta.canManage);
  document.getElementById('hr-payroll-panel')?.classList.toggle('hidden', !hrMeta.canViewPayroll);
  document.getElementById('hr-payroll-list-wrap')?.classList.toggle('hidden', !hrMeta.canViewPayroll);
}

export async function initHr() {
  if (!document.querySelector('[data-donutit-module="hr"]')) return;
  if (!(await isLoggedIn())) {
    document.getElementById('hr-status')?.replaceChildren(
      document.createTextNode('เข้าสู่ระบบที่ /settings ก่อน'),
    );
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  document.getElementById('hr-period-start')?.setAttribute('value', today);
  document.getElementById('hr-period-end')?.setAttribute('value', today);

  loadEmployees()
    .then((employees) => {
      applyPanels();
      renderEmployees(employees);
      if (hrMeta.canViewPayroll) {
        return loadPayroll().then(renderPayroll);
      }
    })
    .catch((e) => {
      document.getElementById('hr-status')?.replaceChildren(document.createTextNode(e.message));
    });

  document.getElementById('btn-add-employee')?.addEventListener('click', async () => {
    const name = document.getElementById('hr-emp-name')?.value?.trim();
    const salary = parseFloat(document.getElementById('hr-emp-salary')?.value || '0');
    if (!name) return alert('กรอกชื่อพนักงาน');

    try {
      const res = await apiFetch('/api/hr/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone: document.getElementById('hr-emp-phone')?.value?.trim(),
          position: document.getElementById('hr-emp-position')?.value?.trim(),
          salary,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      ['hr-emp-name', 'hr-emp-phone', 'hr-emp-position', 'hr-emp-salary'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      renderEmployees(await loadEmployees());
    } catch (e) {
      alert(e.message);
    }
  });

  document.getElementById('btn-create-payroll')?.addEventListener('click', async () => {
    const periodLabel = document.getElementById('hr-period-label')?.value?.trim();
    const periodStart = document.getElementById('hr-period-start')?.value;
    const periodEnd = document.getElementById('hr-period-end')?.value;
    if (!periodLabel) return alert('กรอกชื่อรอบเงินเดือน');

    try {
      const res = await apiFetch('/api/hr/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodLabel, periodStart, periodEnd }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();
      alert(`สร้างรอบ ${data.run.periodLabel} — ${data.run.totalBaht} บาท (${data.run.employeeCount} คน)`);
      document.getElementById('hr-period-label').value = '';
      renderPayroll(await loadPayroll());
    } catch (e) {
      alert(e.message);
    }
  });
}
