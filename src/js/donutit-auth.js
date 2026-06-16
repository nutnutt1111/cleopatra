// ponytail: redirect unauthenticated users — full page load for /login (auth layout)
import { isLoggedIn } from '../components/widgets/donutit/donutit-api.js';
import { refreshNavbarSession } from '../components/widgets/navbar/navbar.js';

const AUTH_PAGES = new Set(['/login']);

const PROTECTED = new Set([
  '/',
  '/dashboard',
  '/pos',
  '/inventory',
  '/pawn',
  '/messenger',
  '/cashflow-ledger',
  '/customers',
  '/hr',
  '/settings',
]);

function path() {
  const p = location.pathname.replace(/\/$/, '') || '/';
  return p;
}

function safeNext(raw) {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw === '/') return '/dashboard';
  if (AUTH_PAGES.has(raw)) return '/dashboard';
  return raw;
}

export async function enforceDonutitAuth() {
  const p = path();
  const needsAuth = PROTECTED.has(p);
  const onAuthPage = AUTH_PAGES.has(p);
  const loggedIn = await isLoggedIn();

  if (loggedIn) {
    await refreshNavbarSession();
    if (onAuthPage) {
      const next = safeNext(new URLSearchParams(location.search).get('next'));
      location.assign(next);
    }
    return;
  }

  await refreshNavbarSession();
  if (needsAuth) {
    const next = encodeURIComponent(p === '/' ? '/dashboard' : p);
    location.assign(`/login?next=${next}`);
  }
}
