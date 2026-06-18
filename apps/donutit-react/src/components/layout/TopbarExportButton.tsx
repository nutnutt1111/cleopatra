import { useLocation } from 'react-router-dom';
import { canExport, getSessionUser } from '@shared/api';
import { exportForPath } from '@shared/page-exports';
import { useToast } from '../ui/Toast';

const EXPORTABLE = new Set([
  '/inventory',
  '/pos',
  '/pawn',
  '/messenger',
  '/customers',
  '/hr',
  '/manager-hr',
  '/cashflow-ledger',
]);

export function TopbarExportButton() {
  const user = getSessionUser();
  const location = useLocation();
  const toast = useToast();

  if (!canExport(user)) return null;

  const enabled = EXPORTABLE.has(location.pathname);

  async function handleExport() {
    try {
      await exportForPath(location.pathname);
      toast.show('ส่งออก CSV แล้ว', 'success');
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'ส่งออกไม่สำเร็จ', 'error');
    }
  }

  return (
    <button
      id="topbar-export-btn"
      type="button"
      className={`topbar-export-btn ${enabled ? 'topbar-export-btn--active' : 'topbar-export-btn--muted'}`}
      title={enabled ? 'ส่งออก CSV หน้านี้' : 'หน้านี้ยังไม่รองรับ export'}
      aria-label="ส่งออก"
      disabled={!enabled}
      onClick={handleExport}
    >
      <span className="topbar-export-btn__icon" aria-hidden>
        ⬇
      </span>
      <span>Export</span>
    </button>
  );
}
