import { apiFetch, isLoggedIn } from './donutit-api.js';
import { escapeHtml } from './escape-html.js';
import { bindOnce } from './bind-once.js';
import { notify } from './notify.js';
import { monthStartStr, showLoginRequired, todayStr } from './donutit-ui.js';

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
    </div>`,
    )
    .join('');
}

function renderPayroll(runs) {
  const el = document.getElementById('hr-payroll-list');
  if (!el) return;

  if (!runs.length) {
    el.innerHTML = '<p class="text-sm text-muted-foreground">ยังไม่มีประวัติ</p>';
    return;
  }

  el.innerHTML = runs
    .map(
      (r) => `<div class="border border-border rounded-lg p-3 mb-2 text-sm">
      <p class="font-medium">${escapeHtml(r.periodLabel)}</p>
      <p class="text-xs text-muted-foreground">${escapeHtml(r.periodStart)} — ${escapeHtml(r.periodEnd)}</p>
      <p class="mt-1">รวม <strong>${escapeHtml(r.totalBaht)}</strong> บาท · ${r.lines.length} คน
        <span class="text-xs px-2 py-0.5 rounded-full ml-1 ${r.status === 'PAID' ? 'bg-green-500/10 text-green-700' : 'bg-amber-500/10 text-amber-700'}">${r.status === 'PAID' ? 'จ่ายแล้ว' : 'รอจ่าย'}</span>
      </p>
    </div>`,
    )
    .join('');
}

function applyPanels() {
  document.getElementById('hr-manage-panel')?.classList.toggle('hidden', !hrMeta.canManage);
  document.getElementById('hr-payroll-section')?.classList.toggle('hidden', !hrMeta.canViewPayroll);
}

export async function initHr() {
  if (!document.querySelector('[data-donutit-module="hr"]')) return;
  if (!(await isLoggedIn())) {
    showLoginRequired(document.getElementById('hr-status'));
    return;
  }

  document.getElementById('hr-period-start')?.setAttribute('value', monthStartStr());
  document.getElementById('hr-period-end')?.setAttribute('value', todayStr());

  loadEmployees()
    .then((employees) => {
      applyPanels();
      renderEmployees(employees);
      if (hrMeta.canViewPayroll) return loadPayroll().then(renderPayroll);
    })
    .catch((e) => {
      document.getElementById('hr-status')?.replaceChildren(document.createTextNode(e.message));
    });

  bindOnce(document.getElementById('btn-add-employee'), 'click', async () => {
    const name = document.getElementById('hr-emp-name')?.value?.trim();
    const salary = parseFloat(document.getElementById('hr-emp-salary')?.value || '0');
    if (!name) return notify('กรอกชื่อพนักงาน', 'warning');

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
      notify(e.message, 'error');
    }
  });

  bindOnce(document.getElementById('btn-run-payroll'), 'click', async () => {
    const periodLabel = document.getElementById('hr-period-label')?.value?.trim();
    const periodStart = document.getElementById('hr-period-start')?.value;
    const periodEnd = document.getElementById('hr-period-end')?.value;
    if (!periodLabel) return notify('กรอกชื่อรอบเงินเดือน', 'warning');
    if (!confirm(`จ่ายเงินเดือนรอบ "${periodLabel}"? จะบันทึกเป็นรายจ่ายใน ledger`)) return;

    try {
      const createRes = await apiFetch('/api/hr/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodLabel, periodStart, periodEnd }),
      });
      if (!createRes.ok) throw new Error((await createRes.json()).error);
      const { run } = await createRes.json();

      const payRes = await apiFetch(`/api/hr/payroll/${run.id}/pay`, { method: 'POST' });
      if (!payRes.ok) throw new Error((await payRes.json()).error);
      const paid = await payRes.json();

      notify(`จ่ายเงินเดือน ${paid.periodLabel} — ${paid.totalBaht} บาทสำเร็จ`, 'success');
      document.getElementById('hr-period-label').value = '';
      renderPayroll(await loadPayroll());
    } catch (e) {
      notify(e.message, 'error');
    }
  });
}
