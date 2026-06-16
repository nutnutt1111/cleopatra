/**
 * Metrics Row Widget - Sparkline Charts (Chart.js)
 */

import {
  createSparklineChart,
  initChartJsDeferred,
  observeThemeChanges,
  getChartJsColors,
} from '../chart-mount.js';

const chartInstances = new Map();
let themeObserver = null;

function mountSparkline(elementId, data, colorOverride = null) {
  initChartJsDeferred(elementId, (container) => {
    const colors = getChartJsColors();
    const chart = createSparklineChart(container, data, {
      color: colorOverride || colors.primary,
    });
    chartInstances.set(elementId, { chart, data, colorOverride });
    return chart;
  }, { delay: 100, observeVisibility: true });
}

function updateAllChartColors() {
  const colors = getChartJsColors();
  chartInstances.forEach((instance, elementId) => {
    if (!instance.chart) return;
    const chartColor = instance.colorOverride || colors.primary;
    instance.chart.data.datasets[0].borderColor = chartColor;
    instance.chart.data.datasets[0].backgroundColor = `${chartColor}22`;
    instance.chart.update('none');
  });
}

function cleanup() {
  chartInstances.forEach((instance) => {
    if (instance.chart) instance.chart.destroy();
  });
  chartInstances.clear();
  if (themeObserver) {
    themeObserver.disconnect();
    themeObserver = null;
  }
}

export function initMetricsRow() {
  cleanup();
  mountSparkline('metric-sparkline-revenue', [28000, 32000, 29000, 41000, 38000, 52000, 48000, 61000, 58000, 72000]);
  mountSparkline('metric-sparkline-subs', [80, 95, 120, 145, 190, 280, 350, 420, 510, 610]);
  mountSparkline('metric-sparkline-bounce', [38, 35, 32, 28, 31, 25, 22, 19, 16, 12], '#ef4444');
  mountSparkline('metric-sparkline-active', [180, 240, 320, 280, 390, 350, 450, 520, 480, 573]);
  themeObserver = observeThemeChanges(updateAllChartColors);
}
