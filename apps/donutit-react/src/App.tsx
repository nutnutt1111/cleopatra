import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { isLoggedIn } from '@shared/api';
import { Shell } from './components/layout/Shell';
import { LoginPage } from './pages/LoginPage';
import { InventoryPage } from './pages/InventoryPage';
import { PosPage } from './pages/PosPage';
import { HrPage } from './pages/HrPage';
import { ManagerHrPage } from './pages/ManagerHrPage';
import { ToastProvider } from './components/ui/Toast';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const [ok, setOk] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    isLoggedIn().then(setOk);
  }, [location.pathname]);

  if (ok === null) return <div className="cleo-content p-8">กำลังโหลด…</div>;
  if (!ok) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <RequireAuth>
              <Shell>
                <Routes>
                  <Route path="/" element={<Navigate to="/inventory" replace />} />
                  <Route path="/inventory" element={<InventoryPage />} />
                  <Route path="/pos" element={<PosPage />} />
                  <Route path="/hr" element={<HrPage />} />
                  <Route path="/manager-hr" element={<ManagerHrPage />} />
                </Routes>
              </Shell>
            </RequireAuth>
          }
        />
      </Routes>
    </ToastProvider>
  );
}
