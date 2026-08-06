import React from 'react';
import { Outlet } from 'react-router-dom';
import { CapsuleTabBar } from './CapsuleTabBar';
import { SheetOutlet } from './SheetOutlet';

export const AppShell: React.FC = () => (
  <div className="relative mx-auto min-h-full max-w-[420px] bg-bg-grouped">
    <main className="min-h-full" style={{ paddingBottom: 'var(--gm-scroll-bottom-pad)' }}>
      <Outlet />
    </main>
    <CapsuleTabBar />
    <SheetOutlet />
  </div>
);
