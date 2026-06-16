/** App routes with Vite BASE_URL (e.g. /cleopatra/ on GitHub Pages). */
export function getAppBase() {
  const base = import.meta.env.BASE_URL || '/';
  return base.endsWith('/') ? base : `${base}/`;
}

/** Strip deploy base prefix so /cleopatra/login → /login */
export function stripAppBase(pathname) {
  const base = getAppBase();
  const p = pathname.replace(/\/$/, '') || '/';
  if (base === '/') return p;
  const prefix = base.replace(/\/$/, '');
  if (p === prefix) return '/';
  if (p.startsWith(`${prefix}/`)) return p.slice(prefix.length) || '/';
  return p;
}

/** Build href/path with deploy base prefix */
export function appPath(route) {
  const base = getAppBase();
  const r = route.startsWith('/') ? route : `/${route}`;
  if (base === '/') return r;
  return `${base.replace(/\/$/, '')}${r}`;
}
