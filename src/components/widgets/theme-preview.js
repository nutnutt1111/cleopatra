/**
 * Theme Preview Component
 * Handles theme preview grid interactions on the appearance settings page
 */

const DEFAULT_THEME = 'neutral';
const DEFAULT_MODE = 'light';

function syncModeButtons() {
    const lightModeBtn = document.getElementById('light-mode-btn');
    const darkModeBtn = document.getElementById('dark-mode-btn');
    const isDark = document.documentElement.classList.contains('dark');

    if (lightModeBtn) {
        lightModeBtn.classList.toggle('bg-primary', !isDark);
        lightModeBtn.classList.toggle('text-primary-foreground', !isDark);
        lightModeBtn.classList.toggle('bg-background', isDark);
        lightModeBtn.classList.toggle('border-border', isDark);
    }

    if (darkModeBtn) {
        darkModeBtn.classList.toggle('bg-primary', isDark);
        darkModeBtn.classList.toggle('text-primary-foreground', isDark);
        darkModeBtn.classList.toggle('bg-background', !isDark);
        darkModeBtn.classList.toggle('border-border', !isDark);
    }
}

function syncNavbarThemeButtons(theme) {
    const navButtons = document.querySelectorAll('.theme-color-btn');
    navButtons.forEach((navBtn) => {
        if (navBtn.dataset.theme === theme) {
            navBtn.classList.remove('ring-transparent');
            navBtn.classList.add('ring-gray-900');
        } else {
            navBtn.classList.remove('ring-gray-900');
            navBtn.classList.add('ring-transparent');
        }
    });
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('cleopatra-theme', theme);
}

function applyMode(mode) {
    const isDark = mode === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('cleopatra-mode', mode);
    syncModeButtons();
}

function resetTheme() {
    applyTheme(DEFAULT_THEME);
    applyMode(DEFAULT_MODE);

    const previewButtons = document.querySelectorAll('.theme-preview-btn');
    previewButtons.forEach((btn) => {
        if (btn.dataset.theme === DEFAULT_THEME) {
            btn.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
            btn.classList.remove('border-border');
        } else {
            btn.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
            btn.classList.add('border-border');
        }
    });

    syncNavbarThemeButtons(DEFAULT_THEME);
}

export function initThemePreview() {
    const pageRoot = document.getElementById('appearance-settings-page')
        || document.getElementById('theme-preview-grid');
    if (!pageRoot) return;
    if (pageRoot.dataset.themePreviewInit === 'true') return;
    pageRoot.dataset.themePreviewInit = 'true';

    const previewButtons = document.querySelectorAll('.theme-preview-btn');

    function updateActiveIndicator() {
        const currentTheme = localStorage.getItem('cleopatra-theme') || DEFAULT_THEME;
        previewButtons.forEach((btn) => {
            if (btn.dataset.theme === currentTheme) {
                btn.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
                btn.classList.remove('border-border');
            } else {
                btn.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
                btn.classList.add('border-border');
            }
        });
    }

    previewButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            const theme = btn.dataset.theme;
            applyTheme(theme);
            updateActiveIndicator();
            syncNavbarThemeButtons(theme);
        });
    });

    updateActiveIndicator();
    syncModeButtons();

    document.getElementById('light-mode-btn')?.addEventListener('click', () => {
        applyMode('light');
    });

    document.getElementById('dark-mode-btn')?.addEventListener('click', () => {
        applyMode('dark');
    });

    document.getElementById('reset-theme-btn')?.addEventListener('click', () => {
        resetTheme();
    });
}
