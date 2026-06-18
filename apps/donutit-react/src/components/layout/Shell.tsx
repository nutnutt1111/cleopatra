import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { AuthUser } from '@shared/api';
import { getSessionUser, isLoggedIn, logout } from '@shared/api';
import { TopbarExportButton } from './TopbarExportButton';

type NavItem = { href: string; label: string; show: (user: AuthUser | null) => boolean };

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'แดชบอร์ด', show: () => true },
  { href: '/inventory', label: 'สินค้าคงคลัง', show: () => true },
  { href: '/pos', label: 'ขายหน้าร้าน', show: () => true },
  { href: '/pawn', label: 'จำนำ', show: () => true },
  { href: '/messenger', label: 'Messenger', show: () => true },
  { href: '/customers', label: 'ลูกค้า', show: () => true },
  { href: '/cashflow-ledger', label: 'กระแสเงินสด', show: () => true },
  { href: '/hr', label: 'บุคลากร (HR)', show: (u) => u?.role === 'OWNER' || u?.role === 'HR' },
  { href: '/manager-hr', label: 'บุคลากร', show: (u) => u?.role === 'MANAGER' },
  { href: '/settings', label: 'บัญชี', show: () => true },
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
        <p className="text-[10px] text-[var(--muted-foreground)] mb-1">donutit-cleopatra · :3005</p>
        <p className="text-[10px] text-[var(--muted-foreground)] mb-4 opacity-70">แอปหลัก — ไม่ใช่ legacy :3006</p>
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
          <span className="text-sm text-[var(--muted-foreground)]">
            {user?.name}
            {user?.role && <span className="ml-2 text-xs opacity-70">({user.role})</span>}
          </span>
          <div className="cleo-topbar__actions">
            <TopbarExportButton />
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
