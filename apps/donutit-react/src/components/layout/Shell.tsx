import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { AuthUser } from '@shared/api';
import { getSessionUser, isLoggedIn, logout } from '@shared/api';
import { TopbarExportButton } from './TopbarExportButton';

type NavItem = { href: string; label: string; show: (user: AuthUser | null) => boolean };

const NAV: NavItem[] = [
  { href: '/inventory', label: 'สินค้าคงคลัง', show: () => true },
  { href: '/pos', label: 'ขายหน้าร้าน', show: () => true },
  { href: '/hr', label: 'บุคลากร (HR)', show: (u) => u?.role === 'OWNER' || u?.role === 'HR' },
  { href: '/manager-hr', label: 'บุคลากร', show: (u) => u?.role === 'MANAGER' },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [user, setUser] = useState<AuthUser | null>(getSessionUser());
  const navItems = NAV.filter((item) => item.show(user));

  useEffect(() => {
    isLoggedIn().then((ok) => {
      if (ok) setUser(getSessionUser());
    });
  }, [location.pathname]);

  return (
    <div className="cleo-shell" data-app="donutit-cleopatra">
      <aside className="cleo-sidebar">
        <div className="font-semibold mb-1">DonutiT</div>
        <p className="text-[10px] text-[var(--muted-foreground)] mb-4">donutit-cleopatra · :3005</p>
        <nav>
          {navItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={`nav-link ${location.pathname === item.href ? 'active' : ''}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="cleo-main">
        <header className="cleo-topbar">
          <span className="text-sm text-[var(--muted-foreground)]">{user?.name}</span>
          <div className="cleo-topbar__actions">
            <TopbarExportButton />
            <button type="button" className="cleo-icon-btn" title="ธีม" aria-label="ธีม">
              ◐
            </button>
            <button type="button" className="cleo-icon-btn" title="โหมดมืด" aria-label="โหมดมืด">
              ☾
            </button>
            <button type="button" className="cleo-icon-btn" title="แจ้งเตือน" aria-label="แจ้งเตือน">
              🔔
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => logout().then(() => (window.location.href = '/login'))}
            >
              ออกจากระบบ
            </button>
          </div>
        </header>
        <div className="cleo-content">
          <div className="cleo-page-transition">{children}</div>
        </div>
      </div>
    </div>
  );
}
