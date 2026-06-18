import { createContext, useCallback, useContext, useState } from 'react';

type Toast = { id: number; message: string; tone: 'success' | 'error' | 'warning' };

const ToastCtx = createContext<{
  show: (message: string, tone?: Toast['tone']) => void;
} | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const show = useCallback((message: string, tone: Toast['tone'] = 'success') => {
    const id = Date.now();
    setItems((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      {items.map((t) => (
        <div key={t.id} className="toast" role="status">
          {t.message}
        </div>
      ))}
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast outside provider');
  return ctx;
}
