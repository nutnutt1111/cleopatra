import { resolve } from 'path';
import { mkdirSync, copyFileSync, existsSync } from 'fs';

/** DonutiT clean URL routes → HTML pages */
export const DONUTIT_ROUTES = {
    '/': '/pages/donutit/dashboard.html',
    '/dashboard': '/pages/donutit/dashboard.html',
    '/login': '/pages/donutit/settings.html',
    '/pos': '/pages/donutit/pos.html',
    '/inventory': '/pages/donutit/inventory.html',
    '/pawn': '/pages/donutit/pawn.html',
    '/messenger': '/pages/donutit/messenger.html',
    '/cashflow-ledger': '/pages/donutit/cashflow-ledger.html',
    '/settings': '/pages/donutit/settings.html',
    '/customers': '/pages/donutit/customers.html',
    '/hr': '/pages/donutit/hr.html',
};

export const DONUTIT_ROUTE_SLUGS = Object.keys(DONUTIT_ROUTES)
  .filter((r) => r !== '/')
  .map((r) => r.slice(1));

function rewriteRequest(req) {
    const path = req.url?.split('?')[0];
    const target = DONUTIT_ROUTES[path];
    if (target) {
        req.url = target + (req.url?.includes('?') ? '?' + req.url.split('?')[1] : '');
    }
}

export function donutitRoutesPlugin(distDir) {
    return {
        name: 'donutit-routes',
        configureServer(server) {
            server.middlewares.use((req, _res, next) => {
                rewriteRequest(req);
                next();
            });
        },
        configurePreviewServer(server) {
            server.middlewares.use((req, _res, next) => {
                rewriteRequest(req);
                next();
            });
        },
        closeBundle() {
            if (!distDir) return;
            for (const slug of DONUTIT_ROUTE_SLUGS) {
                const src = resolve(distDir, 'pages', 'donutit', `${slug}.html`);
                const destDir = resolve(distDir, slug);
                if (existsSync(src)) {
                    mkdirSync(destDir, { recursive: true });
                    copyFileSync(src, resolve(destDir, 'index.html'));
                }
            }
        },
    };
}
