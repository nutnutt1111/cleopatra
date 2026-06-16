/**
 * Crypto Dashboard Charts (Chart.js)
 */

import {
  createSparklineChart,
  initChartJsDeferred,
  observeThemeChanges,
  getChartJsColors,
} from '../chart-mount.js';
import { cryptoMarketData } from '../../../data/crypto-market.js';

const charts = { sparklines: [], marketSparklines: [] };
let themeObserver = null;

function cleanup() {
  charts.sparklines.forEach((c) => c?.destroy());
  charts.marketSparklines.forEach((c) => c?.destroy());
  charts.sparklines = [];
  charts.marketSparklines = [];
  if (themeObserver) {
    themeObserver.disconnect();
    themeObserver = null;
  }
}

export function initCryptoCharts() {
  cleanup();

  cryptoMarketData.trendingTokens.forEach((token, index) => {
    const elementId = `crypto-spark-${index + 1}`;
    if (!document.getElementById(elementId)) return;
    initChartJsDeferred(elementId, (container) => {
      const color = token.change >= 0 ? '#10b981' : '#ef4444';
      const chart = createSparklineChart(container, token.chartData, { color });
      charts.sparklines.push(chart);
      return chart;
    }, { delay: 100, observeVisibility: true });
  });

  cryptoMarketData.marketTable.slice(0, 6).forEach((item, index) => {
    const elementId = `market-spark-${index + 1}`;
    if (!document.getElementById(elementId)) return;
    initChartJsDeferred(elementId, (container) => {
      const colors = getChartJsColors();
      const chart = createSparklineChart(container, item.chartData, { color: colors.primary });
      charts.marketSparklines.push(chart);
      return chart;
    }, { delay: 150, observeVisibility: true });
  });

  themeObserver = observeThemeChanges(() => {
    const colors = getChartJsColors();
    charts.marketSparklines.forEach((chart) => {
      if (chart) {
        chart.data.datasets[0].borderColor = colors.primary;
        chart.update('none');
      }
    });
  });
}
