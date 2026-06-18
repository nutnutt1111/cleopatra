import { ReactNode } from 'react';

export function Sheet({ title, children, open = true }: { title: string; children: ReactNode; open?: boolean }) {
  if (!open) return null;
  return (
    <div className="cleo-sheet cleo-sheet--xl">
      <div className="cleo-sheet__body">
        <h2 className="text-lg font-medium mb-4">{title}</h2>
        {children}
      </div>
    </div>
  );
}
