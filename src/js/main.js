// ============================================
// Main Application Entry Point
// ============================================

// Styles
import '../styles/tailwind.css';
import '../styles/global.scss';

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
import { initDonutitModules } from './donutit-init.js';
import { initDashboardWidgets } from './dashboard-init.js';
import { enforceDonutitAuth } from './donutit-auth.js';
import { initLegacyAppMarker } from './legacy-app.js';

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
    initDashboardWidgets();
}

// Re-initialize on SPA navigation (including code highlighting)
document.addEventListener('page:load', async () => {
    initLegacyAppMarker();
    await renderMenu();
    await enforceDonutitAuth();
    initComponents();
    initDonutitModules();
    initCodeBlockTransformer();
});

// Initial load
document.addEventListener('DOMContentLoaded', async () => {
    bindNavbarChrome();
    bindSidebarChrome();
    initLegacyAppMarker();
    await enforceDonutitAuth();
    await renderMenu();
    initComponents();
    initRouter();
    initDonutitModules();
    initCodeBlockTransformer();

    window.addEventListener('load', () => {
        document.body.classList.add('loaded');
    });

    if (document.readyState === 'complete') {
        document.body.classList.add('loaded');
    }
});
