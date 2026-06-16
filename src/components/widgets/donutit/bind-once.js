/** Bind a DOM event handler once per element (SPA-safe re-init). */
export function bindOnce(el, event, fn) {
  if (!el) return;
  const key = `data-bound-${event}`;
  if (el.hasAttribute(key)) return;
  el.setAttribute(key, '');
  el.addEventListener(event, fn);
}
