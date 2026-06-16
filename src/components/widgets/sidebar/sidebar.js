// ============================================
// Sidebar Component - Data-Driven Navigation
// Theme-Aware Colors with Lucide Icons
// ============================================

import { getLucideIcon } from '../../../data/lucide-icons.js';
import menuData from '../../../data/sidebar.json';

// Resolve href with Vite base path (e.g. /cleopatra/ on GitHub Pages)
function resolveHref(path) {
    const base = import.meta.env.BASE_URL || '/';
    // Remove leading slash from path since base already ends with one
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return base + cleanPath;
}

function renderIcon(icon, className = 'w-5 h-5 flex-shrink-0') {
    if (!icon) return '';
    if (icon.startsWith('ri-')) {
        return `<i class="${icon} ${className}"></i>`;
    }
    return getLucideIcon(icon, className);
}

// Sidebar State
let isCollapsed = false;
let isMobileOpen = false;
let sidebarChromeBound = false;

// Bind sidebar chrome once (toggle, overlay, resize)
export function bindSidebarChrome() {
    if (sidebarChromeBound) return;
    sidebarChromeBound = true;

    const sidebarToggle = document.getElementById('sidebar-toggle');
    const mobileToggle = document.getElementById('mobile-menu-toggle');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', toggleSidebarCollapse);
    }

    if (mobileToggle) {
        mobileToggle.addEventListener('click', toggleMobileSidebar);
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeMobileSidebar);
    }

    window.addEventListener('resize', handleResize);
}

// Re-render menu for active state on SPA navigation
export function renderMenu() {
    const sidebarContainer = document.getElementById('sidebar');
    if (!sidebarContainer) return;
    renderMenuInto(sidebarContainer);
}

export function initSidebar() {
    bindSidebarChrome();
    renderMenu();
}

// Check if URL matches href
function isUrlMatch(href) {
    const currentPath = window.location.pathname;
    const resolved = resolveHref(href);
    return resolved === currentPath ||
        (currentPath.endsWith('/index.html') && resolved === currentPath.replace('/index.html', '/')) ||
        (resolved.endsWith('/') && currentPath === resolved + 'index.html');
}

// Render Menu from Data
function renderMenuInto(container) {
    let html = '<nav class="sidebar-nav py-5">';

    menuData.forEach(item => {
        if (item.type === 'category') {
            html += renderCategory(item);
        } else if (item.type === 'menu') {
            html += renderMenuItem(item);
        } else if (item.type === 'link') {
            html += renderLink(item);
        }
    });

    html += '</nav>';
    container.innerHTML = html;
    attachMenuListeners(container);

    // Open parent menu of active item (without triggering click animation)
    openActiveParentMenu(container);
}

// Render Category Header - THEME-AWARE
function renderCategory(item) {
    return `
        <div class="category-label px-6 py-2 text-[11px] font-semibold text-sidebar-foreground/50 uppercase tracking-wider mt-4">
            <span class="category-text">${item.label}</span>
        </div>
    `;
}

// Render Menu Item with Children - THEME-AWARE with Lucide Icons
function renderMenuItem(item) {
    const hasActiveChild = item.children?.some(child => isUrlMatch(child.href));

    let childrenHtml = '';
    if (item.children) {
        childrenHtml = item.children.map(child => {
            const isActive = isUrlMatch(child.href);
            const childIcon = child.icon ? renderIcon(child.icon, 'w-4 h-4 flex-shrink-0') : '';
            return `
                <a href="${resolveHref(child.href)}" 
                   data-id="${child.id}"
                   class="submenu-link flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-colors
                          ${isActive ? 'bg-sidebar-accent text-primary font-medium' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground focus:bg-sidebar-accent focus:text-sidebar-foreground active:bg-sidebar-accent'}">
                    ${childIcon}
                    <span>${child.label}</span>
                </a>
            `;
        }).join('');
    }

    // Popover links for hover - THEME-AWARE
    const popoverLinks = item.children?.map(child => {
        const childIcon = child.icon ? renderIcon(child.icon, 'w-4 h-4 flex-shrink-0') : '';
        return `
            <a href="${resolveHref(child.href)}" class="flex items-center gap-2.5 px-4 py-2 text-sm text-popover-foreground/70 hover:bg-muted hover:text-popover-foreground transition-colors">
                ${childIcon}
                <span>${child.label}</span>
            </a>
        `;
    }).join('') || '';

    const menuIcon = renderIcon(item.icon, 'w-5 h-5 flex-shrink-0 text-sidebar-foreground/50 group-hover:text-sidebar-foreground transition-colors');
    const arrowIcon = getLucideIcon('plus', `menu-arrow w-4 h-4 text-sidebar-foreground/50 transition-transform duration-300 ${hasActiveChild ? 'rotate-45' : ''}`);

    return `
        <div class="menu-item relative ${hasActiveChild ? 'is-open' : ''}" data-id="${item.id}">
            <button class="menu-toggle w-full h-11 flex items-center px-6 text-sidebar-foreground hover:bg-sidebar-accent focus:bg-sidebar-accent active:bg-sidebar-accent transition-colors duration-200 group">
                ${menuIcon}
                <span class="menu-text flex-1 text-left text-sm font-medium ml-3 truncate">${item.label}</span>
                ${arrowIcon}
            </button>
            <div class="submenu overflow-hidden transition-all duration-300 ease-out ${hasActiveChild ? '' : 'max-h-0'}">
                <div class="py-1 pl-10 pr-4 space-y-0.5">
                    ${childrenHtml}
                </div>
            </div>
            <!-- Hover Popover - THEME-AWARE -->
            <div class="menu-popover absolute left-full top-0 ml-1 bg-popover text-popover-foreground rounded-lg shadow-xl border border-border py-2 min-w-[200px] z-[100] opacity-0 invisible transition-all duration-200">
                <div class="px-4 py-2 text-sm font-semibold border-b border-border">${item.label}</div>
                ${popoverLinks}
            </div>
        </div>
    `;
}

// Render Simple Link - THEME-AWARE with Lucide Icons
function renderLink(item) {
    const isActive = isUrlMatch(item.href);
    const isDisabled = item.disabled;

    const linkIcon = renderIcon(item.icon, `w-5 h-5 flex-shrink-0 transition-colors ${isActive ? 'text-primary' : isDisabled ? 'text-sidebar-foreground/20' : 'text-sidebar-foreground/50 group-hover:text-sidebar-foreground'}`);

    return `
        <div class="menu-link relative" data-id="${item.id}">
            <a href="${isDisabled ? '#' : resolveHref(item.href || '#')}" 
               class="w-full h-11 flex items-center px-6 transition-colors duration-200 group
                      ${isActive ? 'bg-sidebar-accent text-primary' : isDisabled ? 'text-sidebar-foreground/30 cursor-not-allowed' : 'text-sidebar-foreground hover:bg-sidebar-accent focus:bg-sidebar-accent active:bg-sidebar-accent'}"
               ${isDisabled ? 'onclick="return false;"' : ''}>
                ${linkIcon}
                <span class="menu-text flex-1 text-left text-sm font-medium ml-3 truncate">${item.label}</span>
                ${item.status ? `<span class="status-badge text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded font-medium">${item.status}</span>` : ''}
            </a>
            <!-- Hover Tooltip - THEME-AWARE -->
            <div class="menu-tooltip absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-popover text-popover-foreground text-xs rounded-lg border border-border whitespace-nowrap z-[100] opacity-0 invisible transition-all duration-200">
                ${item.label}
            </div>
        </div>
    `;
}

// Open parent menu of active item without animation
function openActiveParentMenu(container) {
    container.querySelectorAll('.menu-item').forEach(menuItem => {
        if (menuItem.classList.contains('is-open')) {
            const submenu = menuItem.querySelector('.submenu');
            if (submenu) {
                // Set height immediately without transition
                submenu.style.maxHeight = submenu.scrollHeight + 'px';
            }
        }
    });

    // Scroll active link into view
    const activeLink = container.querySelector('.submenu-link.bg-primary\\/10, .menu-link a.bg-primary\\/10');
    if (activeLink) {
        setTimeout(() => {
            activeLink.scrollIntoView({ behavior: 'instant', block: 'center' });
        }, 50);
    }
}

// Attach Event Listeners
function attachMenuListeners(container) {
    // Menu toggles
    container.querySelectorAll('.menu-toggle').forEach(toggle => {
        toggle.addEventListener('click', handleMenuToggle);
    });

    // Links for mobile close
    container.querySelectorAll('.submenu-link, .menu-popover a, .menu-link a').forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth < 1024) closeMobileSidebar();
        });
    });
}

// Handle Menu Toggle (Accordion)
function handleMenuToggle(e) {
    const menuItem = e.currentTarget.closest('.menu-item');
    const submenu = menuItem.querySelector('.submenu');
    const arrow = menuItem.querySelector('.menu-arrow');
    const isOpen = menuItem.classList.contains('is-open');
    const container = document.getElementById('sidebar');

    // Close all other menus (accordion)
    container.querySelectorAll('.menu-item.is-open').forEach(openItem => {
        if (openItem !== menuItem) {
            openItem.classList.remove('is-open');
            const sub = openItem.querySelector('.submenu');
            const arr = openItem.querySelector('.menu-arrow');
            if (sub) sub.style.maxHeight = '0';
            if (arr) arr.classList.remove('rotate-45');
        }
    });

    // Toggle current
    if (isOpen) {
        menuItem.classList.remove('is-open');
        submenu.style.maxHeight = '0';
        arrow.classList.remove('rotate-45');
    } else {
        menuItem.classList.add('is-open');
        submenu.style.maxHeight = submenu.scrollHeight + 'px';
        arrow.classList.add('rotate-45');
    }
}

// Toggle Sidebar Collapse (Desktop)
function toggleSidebarCollapse() {
    const sidebar = document.getElementById('sidebar');
    const content = document.getElementById('content');

    isCollapsed = !isCollapsed;
    sidebar.classList.toggle('is-collapsed', isCollapsed);

    if (isCollapsed) {
        sidebar.classList.remove('w-[260px]');
        sidebar.classList.add('w-[72px]');
        content?.classList.remove('lg:ml-[260px]');
        content?.classList.add('lg:ml-[72px]');
    } else {
        sidebar.classList.remove('w-[72px]');
        sidebar.classList.add('w-[260px]');
        content?.classList.remove('lg:ml-[72px]');
        content?.classList.add('lg:ml-[260px]');
    }
}

// Toggle Mobile Sidebar
function toggleMobileSidebar() {
    isMobileOpen = !isMobileOpen;
    updateMobileSidebar();
}

// Close Mobile Sidebar
function closeMobileSidebar() {
    isMobileOpen = false;
    updateMobileSidebar();
}

// Update Mobile Sidebar State
function updateMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    if (isMobileOpen) {
        sidebar.classList.remove('-translate-x-full');
        overlay?.classList.remove('hidden', 'opacity-0');
        overlay?.classList.add('opacity-100');
        document.body.classList.add('overflow-hidden');
    } else {
        sidebar.classList.add('-translate-x-full');
        overlay?.classList.add('opacity-0');
        setTimeout(() => overlay?.classList.add('hidden'), 200);
        document.body.classList.remove('overflow-hidden');
    }
}

// Handle Resize
function handleResize() {
    if (window.innerWidth >= 1024) {
        closeMobileSidebar();
        document.body.classList.remove('overflow-hidden');
    }
}

