import React from 'react';

export interface ToolbarAction {
  key: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

export const CapsuleToolbar: React.FC<{ actions: ToolbarAction[] }> = ({ actions }) => (
  <div
    className="absolute right-[var(--gm-capsule-inset)] z-20 flex items-center gap-5
               rounded-capsule bg-surface px-4 py-2.5 shadow-capsule"
    style={{ top: 'calc(var(--gm-safe-top) + 8px)' }}
  >
    {actions.map((a) => (
      <button
        key={a.key}
        type="button"
        aria-label={a.label}
        onClick={a.onClick}
        disabled={a.disabled}
        className="text-xl text-label disabled:opacity-40"
      >
        {a.icon}
      </button>
    ))}
  </div>
);
