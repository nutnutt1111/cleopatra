import { useEffect, useState } from 'react';
import { apiFetch, getSessionUser, type AuthUser } from '@shared/api';

const ROLE_LABELS: Record<AuthUser['role'], string> = {
  OWNER: 'เจ้าของร้าน',
  MANAGER: 'ผู้จัดการ',
  STAFF: 'พนักงานขาย',
  HR: 'ฝ่ายบุคคล',
};

export function SettingsPage() {
  const [user, setUser] = useState<AuthUser | null>(getSessionUser());
  const [status, setStatus] = useState('กำลังโหลด…');

  useEffect(() => {
    apiFetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setUser(d.user);
          setStatus('เซสชันใช้งานได้ปกติ');
        } else setStatus('เซสชันหมดอายุ');
      })
      .catch(() => setStatus('เซสชันหมดอายุ'));
  }, []);

  return (
    <main data-donutit-module="settings">
      <h1 className="text-xl font-semibold mb-4">บัญชี / ตั้งค่า</h1>
      <div className="card max-w-md space-y-3">
        <p id="settings-status" className="text-sm text-[var(--muted-foreground)]">
          {status}
        </p>
        <div className="flex items-center gap-3">
          <div
            id="settings-avatar"
            className="w-12 h-12 rounded-full bg-[var(--primary)] text-white flex items-center justify-center font-semibold"
          >
            {user?.name?.slice(0, 1).toUpperCase() ?? '?'}
          </div>
          <div>
            <p id="settings-user-name" className="font-medium">
              {user?.name ?? '—'}
            </p>
            <p id="settings-user-email" className="text-sm text-[var(--muted-foreground)]">
              {user?.email ?? '—'}
            </p>
            <p id="settings-user-role" className="text-xs text-[var(--primary)]">
              {user ? ROLE_LABELS[user.role] : '—'}
            </p>
          </div>
        </div>
        <p className="text-xs text-[var(--muted-foreground)] border-t border-[var(--border)] pt-3">
          แอปหลัก: donutit-cleopatra · localhost:3005
        </p>
      </div>
    </main>
  );
}
