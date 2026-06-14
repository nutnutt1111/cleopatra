import { AUTH_CONFIG, isSupabaseConfigured } from './config.js';
import {
  getLoginUrlWithNext,
  hideAuthError,
  redirectTo,
  showAuthError,
} from './auth-flow.js';
import { getCurrentSession } from './supabase.js';
import {
  canManageEmployees,
  getEmployeeProfile,
  getRoleLabel,
  getStatusLabel,
  listEmployees,
  updateEmployeeStatus,
} from './profile-service.js';

function statusBadgeClass(status) {
  if (status === 'active') return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300';
  if (status === 'inactive') return 'bg-muted text-muted-foreground';
  return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300';
}

function roleBadgeClass(role) {
  if (role === 'admin') return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300';
  if (role === 'manager') return 'bg-primary/10 text-primary';
  return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300';
}

function renderEmployeesTable(rows) {
  const tbody = document.getElementById('employees-table-body');
  const emptyState = document.getElementById('employees-empty');
  if (!tbody) return;

  if (!rows.length) {
    tbody.innerHTML = '';
    emptyState?.classList.remove('hidden');
    return;
  }

  emptyState?.classList.add('hidden');
  tbody.innerHTML = rows.map((row) => `
    <tr class="border-b border-border hover:bg-muted/20 transition-colors">
      <td class="px-4 py-3">
        <div class="font-medium text-foreground">${row.full_name || '—'}</div>
        <div class="text-xs text-muted-foreground">${row.user_id.slice(0, 8)}...</div>
      </td>
      <td class="px-4 py-3">
        <span class="inline-flex px-2.5 py-1 text-xs font-medium rounded-md ${roleBadgeClass(row.role)}">${getRoleLabel(row.role)}</span>
      </td>
      <td class="px-4 py-3">
        <span class="inline-flex px-2.5 py-1 text-xs font-medium rounded-md ${statusBadgeClass(row.status)}">${getStatusLabel(row.status)}</span>
      </td>
      <td class="px-4 py-3 text-sm text-muted-foreground">${new Date(row.created_at).toLocaleDateString('th-TH')}</td>
      <td class="px-4 py-3 text-right">
        <div class="flex items-center justify-end gap-2">
          ${row.status === 'active'
            ? `<button type="button" data-action="deactivate" data-user-id="${row.user_id}" class="px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-muted">ปิดใช้งาน</button>`
            : `<button type="button" data-action="activate" data-user-id="${row.user_id}" class="px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-muted">เปิดใช้งาน</button>`}
        </div>
      </td>
    </tr>
  `).join('');
}

export function initEmployeesList() {
  if (!document.getElementById('employees-list-page')) return;
  bootstrapEmployeesList();
}

async function bootstrapEmployeesList() {
  const errorBox = document.getElementById('employees-list-error');
  const searchInput = document.getElementById('employees-search');
  const statusFilter = document.getElementById('employees-status-filter');

  if (!isSupabaseConfigured()) {
    showAuthError(errorBox, 'ยังไม่ได้ตั้งค่า Supabase กรุณาตรวจสอบไฟล์ .env');
    return;
  }

  const session = await getCurrentSession();
  if (!session?.user) {
    redirectTo(getLoginUrlWithNext(AUTH_CONFIG.routes.settings.employees));
    return;
  }

  const profile = await getEmployeeProfile(session.user.id).catch(() => null);
  if (!canManageEmployees(session.user, profile)) {
    showAuthError(errorBox, 'คุณไม่มีสิทธิ์ดูรายชื่อพนักงาน ต้องเป็น Admin หรือ Manager');
    return;
  }

  async function loadEmployees() {
    hideAuthError(errorBox);
    try {
      const rows = await listEmployees({
        search: searchInput?.value || '',
        status: statusFilter?.value || '',
      });
      renderEmployeesTable(rows);
    } catch (error) {
      showAuthError(errorBox, error?.message || 'ไม่สามารถโหลดรายชื่อพนักงานได้');
    }
  }

  searchInput?.addEventListener('input', loadEmployees);
  statusFilter?.addEventListener('change', loadEmployees);

  document.getElementById('employees-table-body')?.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;

    const userId = button.dataset.userId;
    const action = button.dataset.action;
    const nextStatus = action === 'activate' ? 'active' : 'inactive';

    try {
      await updateEmployeeStatus(userId, nextStatus);
      await loadEmployees();
    } catch (error) {
      showAuthError(errorBox, error?.message || 'ไม่สามารถอัปเดตสถานะได้');
    }
  });

  await loadEmployees();
}
