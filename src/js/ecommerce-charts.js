/**
 * E-commerce Dashboard Charts (Chart.js)
 */

import {
  Chart,
  createSparklineChart,
  ensureCanvas,
  getChartJsColors,
  getPrimaryColorShades,
  getDefaultScales,
  initChartJsDeferred,
  observeThemeChanges,
  createGradient,
  lineDrawingAnimation,
} from '../components/widgets/chart-mount.js';
import { ecommerceDashboardData } from '../data/ecommerce-dashboard.js';

const charts = { revenue: null, orders: null, customers: null, sales: null, category: null };
let themeObserver = null;

function mountMetricSparkline(id, data, type = 'line') {
  if (!document.getElementById(id)) return;
  initChartJsDeferred(id, (container) => {
    const colors = getChartJsColors();
    const chart = createSparklineChart(container, data, { color: colors.primary, type: type === 'bar' ? 'bar' : 'line' });
    return chart;
  }, { delay: 100, observeVisibility: true });
}

function createSalesChart(container) {
  const canvas = ensureCanvas(container);
  const colors = getChartJsColors();
  const scales = getDefaultScales(colors);
  const data = ecommerceDashboardData.salesChart;
  const ctx = canvas.getContext('2d');
  let fill;
  try {
    fill = createGradient(ctx, `${colors.primary}44`, `${colors.primary}00`);
  } catch {
    fill = `${colors.primary}22`;
  }

  return new Chart(canvas, {
    type: 'line',
    data: {
      labels: data.labels,
      datasets: [
        {
          label: 'This Period',
          data: data.datasets[0].data,
          borderColor: colors.primary,
          backgroundColor: fill,
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 0,
        },
        {
          label: 'Last Period',
          data: data.datasets[1].data,
          borderColor: colors.text,
          borderDash: [5, 5],
          fill: false,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales,
      ...lineDrawingAnimation,
    },
  });
}

function createCategoryChart(container) {
  const canvas = ensureCanvas(container);
  const shades = getPrimaryColorShades();
  const categories = ecommerceDashboardData.categories;

  return new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: categories.map((c) => c.name),
      datasets: [{
        data: categories.map((c) => c.value),
        backgroundColor: shades,
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: { legend: { display: false } },
    },
  });
}

window.toggleSalesSeries = function toggleSalesSeries(index) {
  if (!charts.sales) return;
  const meta = charts.sales.getDatasetMeta(index);
  meta.hidden = !meta.hidden;
  charts.sales.update();
};

export function initEcommerceCharts() {
  if (themeObserver) {
    themeObserver.disconnect();
    themeObserver = null;
  }

  mountMetricSparkline('ecommerce-chart-revenue', ecommerceDashboardData.metrics.revenue.chartData, 'area');
  mountMetricSparkline('ecommerce-chart-orders', ecommerceDashboardData.metrics.orders.chartData, 'bar');
  mountMetricSparkline('ecommerce-chart-customers', ecommerceDashboardData.metrics.customers.chartData, 'area');

  if (document.getElementById('ecommerce-sales-chart')) {
    initChartJsDeferred('ecommerce-sales-chart', (container) => {
      charts.sales = createSalesChart(container);
      return charts.sales;
    }, { delay: 150, observeVisibility: true });
  }

  if (document.getElementById('ecommerce-category-chart')) {
    initChartJsDeferred('ecommerce-category-chart', (container) => {
      charts.category = createCategoryChart(container);
      return charts.category;
    }, { delay: 200, observeVisibility: true });
  }

  themeObserver = observeThemeChanges(() => {
    const colors = getChartJsColors();
    if (charts.sales) {
      charts.sales.options.scales = getDefaultScales(colors);
      charts.sales.data.datasets[0].borderColor = colors.primary;
      charts.sales.update('none');
    }
    if (charts.category) {
      charts.category.data.datasets[0].backgroundColor = getPrimaryColorShades();
      charts.category.update('none');
    }
  });
}
