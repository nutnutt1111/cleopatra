// ponytail: one registry, dynamic import per module — no inline page scripts
const MODULES = [
  { sel: '[data-donutit-module="dashboard"]', load: () => import('../components/widgets/donutit/dashboard.js').then((m) => m.initDashboard()) },
  { sel: '[data-donutit-module="pos"]', load: () => import('../components/widgets/donutit/pos.js').then((m) => m.initPos()) },
  { sel: '[data-donutit-module="inventory"]', load: () => import('../components/widgets/donutit/inventory.js').then((m) => m.initInventory()) },
  { sel: '[data-donutit-module="pawn"]', load: () => import('../components/widgets/donutit/pawn.js').then((m) => m.initPawn()) },
  { sel: '[data-donutit-module="messenger"]', load: () => import('../components/widgets/donutit/messenger.js').then((m) => m.initMessenger()) },
  { sel: '[data-donutit-module="cashflow-ledger"]', load: () => import('../components/widgets/donutit/cashflow-ledger.js').then((m) => m.initCashflowLedger()) },
  { sel: '[data-donutit-module="customers"]', load: () => import('../components/widgets/donutit/customers.js').then((m) => m.initCustomers()) },
  { sel: '[data-donutit-module="hr"]', load: () => import('../components/widgets/donutit/hr.js').then((m) => m.initHr()) },
  { sel: '[data-donutit-module="settings"]', load: () => import('../components/widgets/donutit/settings.js').then((m) => m.initSettings()) },
];

export function initDonutitModules() {
  for (const { sel, load } of MODULES) {
    if (document.querySelector(sel)) {
      load().catch((err) => console.error('[donutit-init]', err));
    }
  }
}
