import React, { useEffect } from 'react';

// Drag-to-dismiss is deliberately omitted: Escape, Done and browser Back all
// close a sheet, which covers every path a tester actually uses.
export const Sheet: React.FC<{
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ title, onClose, children }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[92dvh] w-full max-w-[420px] overflow-y-auto rounded-t-[20px] bg-surface"
        style={{ paddingBottom: 'var(--gm-safe-bottom)' }}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-separator bg-surface px-4 py-3">
          <h2 className="text-gm-card-title text-label">{title}</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="text-sys-blue">
            Done
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
};
