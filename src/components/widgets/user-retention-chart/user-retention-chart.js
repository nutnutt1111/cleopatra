/**
 * User Retention Chart Widget (Chart.js)
 */

import {
  Chart,
  ensureCanvas,
  getChartJsColors,
  getDefaultScales,
  initChartJsDeferred,
  observeThemeChanges,
  createGradient,
  lineDrawingAnimation,
} from '../chart-mount.js';
import { ceoDashboardData } from '../../../data/ceo-dashboard.js';

let chartInstance = null;
let themeObserver = null;

function createRetentionChart(container) {
  const canvas = ensureCanvas(container);
  const colors = getChartJsColors();
  const scales = getDefaultScales(colors);
  const data = ceoDashboardData.retentionData;
  const ctx = canvas.getContext('2d');
  let fill;
  try {
    fill = createGradient(ctx, `${colors.primary}33`, `${colors.primary}00`);
  } catch {
    fill = `${colors.primary}22`;
  }

  return new Chart(canvas, {
    type: 'line',
    data: {
      labels: data.hours,
      datasets: [
        {
          label: 'Signups',
          data: data.signups,
          borderColor: colors.primary,
          backgroundColor: fill,
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 0,
        },
        {
          label: 'Deactivations',
          data: data.deactivations,
          borderColor: colors.danger,
          backgroundColor: `${colors.danger}22`,
          fill: true,
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

function updateChartColors() {
  if (!chartInstance) return;
  const colors = getChartJsColors();
  chartInstance.options.scales = getDefaultScales(colors);
  chartInstance.data.datasets[0].borderColor = colors.primary;
  chartInstance.data.datasets[1].borderColor = colors.danger;
  chartInstance.update('none');
}

export function initUserRetentionChart() {
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
  if (themeObserver) {
    themeObserver.disconnect();
    themeObserver = null;
  }

  initChartJsDeferred('retention-chart', (container) => {
    chartInstance = createRetentionChart(container);
    return chartInstance;
  }, { delay: 150, observeVisibility: true });

  themeObserver = observeThemeChanges(updateChartColors);
}
