import { Link, useLocation } from 'react-router-dom';
import { getSessionUser, logout } from '@shared/api';
import { TopbarExportButton } from './TopbarExportButton';

const NAV = [
  { href: '/inventory', label: 'สินค้าคงคลัง' },
  { href: '/pos', label: 'ขายหน้าร้าน' },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const user = getSessionUser();

  return (
    <div className="cleo-shell">
      <aside className="cleo-sidebar">
        <div className="font-semibold mb-4">DonutiT</div>
        <nav>
          {NAV.map((item) => (
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
