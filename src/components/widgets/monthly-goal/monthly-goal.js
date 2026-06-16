/**
 * Monthly Goal Widget - Doughnut progress (Chart.js)
 */

import {
  Chart,
  ensureCanvas,
  getChartJsColors,
  initChartJsDeferred,
  observeThemeChanges,
  doughnutSweepAnimation,
} from '../chart-mount.js';

let goalChart = null;
let themeObserver = null;

function createGoalChart(container) {
  const canvas = ensureCanvas(container);
  const colors = getChartJsColors();
  const value = 75;

  return new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['completed', 'remaining'],
      datasets: [{
        data: [value, 100 - value],
        backgroundColor: [colors.primary, colors.grid],
        borderWidth: 0,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '70%',
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      ...doughnutSweepAnimation,
    },
  });
}

function updateChartColors() {
  if (!goalChart) return;
  const colors = getChartJsColors();
  goalChart.data.datasets[0].backgroundColor = [colors.primary, colors.grid];
  goalChart.update('none');
}

export function initMonthlyGoal() {
  if (goalChart) {
    goalChart.destroy();
    goalChart = null;
  }
  if (themeObserver) {
    themeObserver.disconnect();
    themeObserver = null;
  }

  initChartJsDeferred('monthly-goal-chart', (container) => {
    goalChart = createGoalChart(container);
    return goalChart;
  }, { delay: 150, observeVisibility: true });

  themeObserver = observeThemeChanges(updateChartColors);
}
