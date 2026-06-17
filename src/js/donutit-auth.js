// ponytail: redirect unauthenticated users — full page load for /login (auth layout)
import { isLoggedIn } from '../components/widgets/donutit/donutit-api.js';
import { refreshNavbarSession } from '../components/widgets/navbar/navbar.js';
import { loginRedirectUrl, stripAppBase } from './donutit-paths.js';

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

export async function enforceDonutitAuth() {
  const p = currentPath();
  const needsAuth = PROTECTED.has(p);
  const onAuthPage = AUTH_PAGES.has(p);
  const loggedIn = await isLoggedIn();

  await refreshNavbarSession();

  // ponytail: one entry — logged-in users skip /login
  if (loggedIn && onAuthPage) {
    location.assign(appPath('/dashboard'));
    return;
  }

  if (!loggedIn && needsAuth) {
    location.assign(loginRedirectUrl(p));
  }
}
