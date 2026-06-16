// ponytail: page-scoped chart/widget init — no eager load on DonutiT routes
const CHART_WIDGETS = [
  { sel: '#metric-sparkline-revenue', load: () => import('../components/widgets/metrics-row/metrics-row.js').then((m) => m.initMetricsRow()) },
  { sel: '#revenue-chart', load: () => import('../components/widgets/revenue-chart/revenue-chart.js').then((m) => m.initRevenueChart()) },
  { sel: '#monthly-goal-chart', load: () => import('../components/widgets/monthly-goal/monthly-goal.js').then((m) => m.initMonthlyGoal()) },
  { sel: '#retention-chart', load: () => import('../components/widgets/user-retention-chart/user-retention-chart.js').then((m) => m.initUserRetentionChart()) },
  { sel: '#crypto-spark-1', load: () => import('../components/widgets/crypto/crypto-charts.js').then((m) => m.initCryptoCharts()) },
  { sel: '#traffic-chart-js', load: () => import('../components/widgets/traffic-chart/traffic-chart.js').then((m) => m.initTrafficChart()) },
  { sel: '#distribution-chart-js', load: () => import('../components/widgets/distribution-chart/distribution-chart.js').then((m) => m.initDistributionChart()) },
  { sel: '#country-stats-chart', load: () => import('../components/widgets/retail-store/country-stats.js').then((m) => m.initCountryStatsChart()) },
  { sel: '#crm-revenue-chart', load: () => import('../components/widgets/crm/crm-revenue.js').then((m) => m.initCrmRevenueChart()) },
  { sel: '#crm-retention-chart', load: () => import('../components/widgets/crm/crm-retention.js').then((m) => m.initCrmRetentionChart()) },
  { sel: '#crm-map-chart', load: () => import('../components/widgets/crm/crm-map.js').then((m) => m.initCrmMapChart()) },
  { sel: '#inventory-chart', load: () => import('../components/widgets/inventory/inventory-chart.js').then((m) => m.initInventoryChart()) },
  { sel: '#real-estate-chart', load: () => import('../components/widgets/real-estate/real-estate-chart.js').then((m) => m.initRealEstateChart()) },
  { sel: '#ecommerce-sales-chart, #ecommerce-chart-revenue', load: () => import('./ecommerce-charts.js').then((m) => m.initEcommerceCharts()) },
];

export function initDashboardWidgets() {
  for (const { sel, load } of CHART_WIDGETS) {
    if (document.querySelector(sel)) {
      load().catch((err) => console.error('[dashboard-init]', sel, err));
    }
  }
}
