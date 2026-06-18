import { stripAppBase, appPath } from './donutit-paths.js';

/** Legacy Cleopatra template — not the primary DonutiT product. */
export function isLegacyAppRoute(pathname = location.pathname) {
  const p = stripAppBase(pathname);
  if (p === '/index.html') return true;
  if (p.startsWith('/pages/')) return true;
  return false;
}

export function initLegacyAppMarker() {
  if (!isLegacyAppRoute()) return;

  document.documentElement.dataset.app = 'legacy-cleopatra';

  if (!document.title.toLowerCase().includes('legacy')) {
    document.title = `Legacy — ${document.title}`;
  }

  const main = document.getElementById('content');
  if (main && !document.getElementById('legacy-app-banner')) {
    const banner = document.createElement('div');
    banner.id = 'legacy-app-banner';
    banner.setAttribute('role', 'status');
    banner.className =
      'bg-amber-500/15 border-b border-amber-500/40 text-amber-950 dark:text-amber-100 px-4 py-2.5 text-sm text-center';
    banner.innerHTML =
      `<strong>Legacy Cleopatra template</strong> — ไม่ใช่แอปหลัก · ใช้ DonutiT ที่ <a href="${appPath('/login')}" class="underline font-medium">localhost:3005</a>`;
    main.insertBefore(banner, main.firstChild);
  }

  document.querySelectorAll('header span.font-semibold').forEach((el) => {
    if (el.textContent?.trim() === 'DonutiT') {
      el.textContent = 'Legacy Cleopatra';
    }
  });
}
