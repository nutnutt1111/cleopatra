/** ponytail: shared UI helpers — one place for dates, status, login gate */
export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function daysAgoStr(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export function monthStartStr() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

export function setStatusEl(el, message, isError = false) {
  if (!el) return;
  el.textContent = message;
  el.className = `text-sm ${isError ? 'text-destructive' : 'text-muted-foreground'}`;
}

export function showLoginRequired(statusEl) {
  setStatusEl(statusEl, 'เข้าสู่ระบบที่ /login ก่อน', true);
}
