import React from 'react';
import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/dashboard', label: 'Dashboard', icon: '∿' },
  { to: '/notes', label: 'Notes', icon: '▤' },
  { to: '/experiments', label: 'Experiments', icon: '⚗' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
];

// NavLink puts aria-current="page" on the anchor itself, so nothing here
// needs to set it.
export const CapsuleTabBar: React.FC = () => (
  <nav
    className="fixed inset-x-[var(--gm-capsule-inset)] z-20 mx-auto flex max-w-[420px]
               rounded-capsule bg-surface p-1.5 shadow-capsule"
    style={{ bottom: 'calc(var(--gm-capsule-inset) + var(--gm-safe-bottom))' }}
  >
    {TABS.map((tab) => (
      <NavLink
        key={tab.to}
        to={tab.to}
        className={({ isActive }) =>
          `flex-1 rounded-[18px] py-1.5 text-center text-gm-label font-medium ${
            isActive ? 'bg-[var(--gm-tab-selected-bg)] text-sys-blue' : 'text-label'
          }`
        }
      >
        <span className="mb-0.5 block text-lg">{tab.icon}</span>
        {tab.label}
      </NavLink>
    ))}
  </nav>
);
