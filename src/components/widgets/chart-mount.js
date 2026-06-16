/**
 * ponytail: minimal Chart.js mount helpers for div-based chart containers
 */
import {
  Chart,
  getChartJsColors,
  getDefaultScales,
  initChartJsDeferred,
  observeThemeChanges,
  createGradient,
  barStaggerAnimation,
  lineDrawingAnimation,
  doughnutSweepAnimation,
  getPrimaryColorShades,
} from './chartjs-utils.js';

export function ensureCanvas(container) {
  let canvas = container.querySelector('canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    container.appendChild(canvas);
  }
  return canvas;
}

export function createSparklineChart(container, data, { color, type = 'line' } = {}) {
  const canvas = ensureCanvas(container);
  const colors = getChartJsColors();
  const chartColor = color || colors.primary;
  return new Chart(canvas, {
    type,
    data: {
      labels: data.map((_, i) => i),
      datasets: [{
        data,
        borderColor: chartColor,
        backgroundColor: type === 'bar' ? `${chartColor}66` : `${chartColor}22`,
        borderWidth: type === 'bar' ? 0 : 2,
        fill: type === 'line',
        tension: 0.4,
        pointRadius: 0,
        borderRadius: type === 'bar' ? 2 : 0,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: { x: { display: false }, y: { display: false } },
      animation: { duration: 800 },
    },
  });
}

export {
  Chart,
  getChartJsColors,
  getDefaultScales,
  initChartJsDeferred,
  observeThemeChanges,
  createGradient,
  barStaggerAnimation,
  lineDrawingAnimation,
  doughnutSweepAnimation,
  getPrimaryColorShades,
  ensureCanvas as mountCanvas,
};
