/**
 * Revenue Chart Widget (Chart.js)
 */

import {
  Chart,
  ensureCanvas,
  getChartJsColors,
  getDefaultScales,
  initChartJsDeferred,
  observeThemeChanges,
  barStaggerAnimation,
} from '../chart-mount.js';
import { revenueChartData as revenueData } from '../../../data/analytics-dashboard.js';

let chartInstance = null;
let themeObserver = null;

function createRevenueChart(container) {
  const canvas = ensureCanvas(container);
  const colors = getChartJsColors();
  const scales = getDefaultScales(colors);

  return new Chart(canvas, {
    type: 'bar',
    data: {
      labels: revenueData.months,
      datasets: [{
        label: 'Revenue',
        data: revenueData.values,
        backgroundColor: colors.primary,
        borderRadius: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales,
      ...barStaggerAnimation,
    },
  });
}

function updateChartColors() {
  if (!chartInstance) return;
  const colors = getChartJsColors();
  const scales = getDefaultScales(colors);
  chartInstance.data.datasets[0].backgroundColor = colors.primary;
  chartInstance.options.scales = scales;
  chartInstance.update('none');
}

function setupTabs() {
  document.querySelectorAll('.revenue-tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.revenue-tab-btn').forEach((b) => {
        b.classList.remove('active', 'bg-card', 'text-foreground', 'shadow-sm');
        b.classList.add('text-muted-foreground');
      });
      btn.classList.add('active', 'bg-card', 'text-foreground', 'shadow-sm');
      btn.classList.remove('text-muted-foreground');
    });
  });
}

export function initRevenueChart() {
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
  if (themeObserver) {
    themeObserver.disconnect();
    themeObserver = null;
  }

  initChartJsDeferred('revenue-chart', (container) => {
    chartInstance = createRevenueChart(container);
    return chartInstance;
  }, { delay: 150, observeVisibility: true });

  setupTabs();
  themeObserver = observeThemeChanges(updateChartColors);
}
