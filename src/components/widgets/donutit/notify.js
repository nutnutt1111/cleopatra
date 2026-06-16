/** ponytail: thin wrapper — toast when available, alert fallback */
export function notify(message, variant = 'info') {
  const toast = window.toast;
  if (!toast) {
    alert(message);
    return;
  }
  const opts = typeof message === 'string' ? { title: message } : message;
  if (variant === 'error') toast.error(opts);
  else if (variant === 'success') toast.success(opts);
  else if (variant === 'warning') toast.warning(opts);
  else toast.info(opts);
}
