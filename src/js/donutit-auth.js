// ponytail: redirect unauthenticated users — full page load for /login (auth layout)
import { isLoggedIn } from '../components/widgets/donutit/donutit-api.js';
import { refreshNavbarSession } from '../components/widgets/navbar/navbar.js';
import { appPath, stripAppBase } from './donutit-paths.js';

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

function currentPath() {
  return stripAppBase(location.pathname);
}

function safeNext(raw) {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw === '/') return '/dashboard';
  if (AUTH_PAGES.has(stripAppBase(raw))) return '/dashboard';
  return raw;
}

export async function enforceDonutitAuth() {
  const p = currentPath();
  const needsAuth = PROTECTED.has(p);
  const onAuthPage = AUTH_PAGES.has(p);
  const loggedIn = await isLoggedIn();

  await refreshNavbarSession();

  // Logged-in users may stay on /login (switch account UI). Only honor ?next= redirect.
  if (loggedIn && onAuthPage) {
    const next = new URLSearchParams(location.search).get('next');
    if (next) {
      location.assign(appPath(safeNext(next)));
    }
    return;
  }

  if (!loggedIn && needsAuth) {
    const next = encodeURIComponent(p === '/' ? '/dashboard' : p);
    location.assign(`${appPath('/login')}?next=${next}`);
  }
}
