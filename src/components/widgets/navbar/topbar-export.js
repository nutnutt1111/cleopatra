import { getSessionUser } from '../donutit/donutit-api.js';
import { bindOnce } from '../donutit/bind-once.js';
import { notify } from '../donutit/notify.js';
import { downloadCsv, tableElementToCsv } from '../donutit/export-csv.js';

const pageHandlers = new Map();

export function registerPageExport(moduleName, handler) {
  pageHandlers.set(moduleName, handler);
}

function canExport(user) {
  return user && (user.role === 'OWNER' || user.canExportReports);
}

export function refreshTopbarExportVisibility() {
  const btn = document.getElementById('topbar-export-btn');
  if (!btn) return;
  btn.classList.toggle('hidden', !canExport(getSessionUser()));
}

async function runExport() {
  const user = getSessionUser();
  if (!canExport(user)) {
    notify('ไม่มีสิทธิ์ส่งออกรายงาน', 'error');
    return;
  }

  const moduleEl = document.querySelector('[data-donutit-module]');
  const moduleName = moduleEl?.getAttribute('data-donutit-module');
  const handler = moduleName ? pageHandlers.get(moduleName) : null;

  try {
    if (handler) {
      await handler();
      return;
    }

    const table = document.querySelector('#content table');
    if (!table) {
      notify('ไม่พบข้อมูลให้ส่งออกในหน้านี้', 'warning');
      return;
    }
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`export-${moduleName || 'page'}-${stamp}.csv`, tableElementToCsv(table));
    notify('ส่งออก CSV แล้ว', 'success');
  } catch (err) {
    notify(err?.message || 'ส่งออกไม่สำเร็จ', 'error');
  }
}

export function initTopbarExport() {
  const btn = document.getElementById('topbar-export-btn');
  if (!btn) return;
  bindOnce(btn, 'click', runExport);
  refreshTopbarExportVisibility();
}
