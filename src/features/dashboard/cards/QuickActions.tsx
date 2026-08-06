import React from 'react';
import { Link } from 'react-router-dom';

const ACTIONS = [
  { to: '/dashboard/note/new', label: 'Add note', icon: '＋' },
  { to: '/dashboard/scan', label: 'Scan food', icon: '⛶' },
  { to: '/dashboard/ai', label: 'AI insights', icon: '✦' },
  { to: '/dashboard/activity', label: 'Log activity', icon: '⏱' },
];

export const QuickActions: React.FC = () => (
  <div className="grid grid-cols-4 gap-2">
    {ACTIONS.map((a) => (
      <Link
        key={a.to}
        to={a.to}
        aria-label={a.label}
        className="rounded-nested bg-surface p-2.5 text-center shadow-card"
      >
        <span className="mb-1 block text-lg">{a.icon}</span>
        <span className="text-gm-label text-label">{a.label}</span>
      </Link>
    ))}
  </div>
);
