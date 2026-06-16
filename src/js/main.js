// ============================================
// Main Application Entry Point
// ============================================

// Styles
import '../styles/tailwind.css';
import '../styles/global.scss';

// Syntax highlighting is now handled by Shiki in code-block-transformer.js

// Widgets
import { bindNavbarChrome } from '../components/widgets/navbar';
import { bindSidebarChrome, renderMenu } from '../components/widgets/sidebar';

// UI Components
import { initCodeCopy, reinitCodeCopy } from '../components/ui/code-block';
import { initCodeBlockTransformer } from '../components/ui/code-block/code-block-transformer.js';
import { initAccordion } from '../components/ui/accordion';
import { initCheckbox } from '../components/ui/checkbox';
import { initCollapse } from '../components/ui/collapse';
import { initDropdown } from '../components/ui/dropdown/dropdown.js';
import { initModal } from '../components/ui/modal/modal.js';
import { initTabs } from '../components/ui/tabs/tabs.js';
import { initDrawer } from '../components/ui/drawer/drawer.js';
import { initExampleBlocks } from '../components/ui/example-block/example-block.js';
import '../components/ui/toast/toast.js';
import '../components/ui/alert';
import { initThemePreview } from '../components/widgets/theme-preview.js';

import { initMetricsRow } from '../components/widgets/metrics-row/metrics-row.js';
import { initRevenueChart } from '../components/widgets/revenue-chart/revenue-chart.js';
import { initMonthlyGoal } from '../components/widgets/monthly-goal/monthly-goal.js';
import { initUserRetentionChart } from '../components/widgets/user-retention-chart/user-retention-chart.js';
import { initCryptoCharts } from '../components/widgets/crypto';
import { initEcommerceCharts } from './ecommerce-charts.js';
import { initDonutitModules } from './donutit-init.js';

// Dashboard Widgets (Chart.js)
import { initTrafficChart } from '../components/widgets/traffic-chart/traffic-chart.js';
import { initDistributionChart } from '../components/widgets/distribution-chart/distribution-chart.js';
import { initCountryStatsChart } from '../components/widgets/retail-store/country-stats.js';
import { initCrmRevenueChart } from '../components/widgets/crm/crm-revenue.js';
import { initCrmRetentionChart } from '../components/widgets/crm/crm-retention.js';
import { initCrmMapChart } from '../components/widgets/crm/crm-map.js';
import { initInventoryChart } from '../components/widgets/inventory/inventory-chart.js';
import { initRealEstateChart } from '../components/widgets/real-estate/real-estate-chart.js';

// Router
import { initRouter } from '../components/layout/router';

// Expose for code transformer
window.reinitCodeCopy = reinitCodeCopy;


// Initialize page components (safe to re-run on SPA navigation)
function initComponents() {
    initCodeCopy();
    initAccordion();
    initCheckbox();
    initCollapse();
    initDropdown();
    initModal();
    initTabs();
    initDrawer();
    initExampleBlocks();
    initThemePreview();

    // Dashboard widgets (ApexCharts)
    initMetricsRow();
    initRevenueChart();
    initMonthlyGoal();
    initUserRetentionChart();
    initCryptoCharts();

    // Dashboard widgets (Chart.js) - stagger to prevent simultaneous loading
    initTrafficChart(300);       // 300ms stagger offset
    initDistributionChart(450);  // 450ms stagger offset
    initCountryStatsChart(600);  // 600ms stagger offset
    initCrmRevenueChart(750);    // 750ms stagger offset
    initCrmRetentionChart(900);  // 900ms stagger offset
    initCrmMapChart(1050);       // 1050ms stagger offset
    initInventoryChart(1200);    // 1200ms stagger offset
    initRealEstateChart(1350);   // 1350ms stagger offset

    // E-commerce dashboard charts (ApexCharts)
    initEcommerceCharts();
}

// Shell chrome binds once; menu re-renders for active state
function initShell() {
    bindNavbarChrome();
    bindSidebarChrome();
    renderMenu();
}

// Re-initialize on SPA navigation (including code highlighting)
document.addEventListener('page:load', () => {
    renderMenu();
    initComponents();
    initDonutitModules();
    initCodeBlockTransformer();
});

// Initial load
document.addEventListener('DOMContentLoaded', () => {
    initShell();
    initComponents();
    initRouter();
    initDonutitModules();
    initCodeBlockTransformer();

    // Show app after CSS/JS fully loaded
    window.addEventListener('load', () => {
        document.body.classList.add('loaded');
    });

    // Fallback if load already fired
    if (document.readyState === 'complete') {
        document.body.classList.add('loaded');
    }
});
