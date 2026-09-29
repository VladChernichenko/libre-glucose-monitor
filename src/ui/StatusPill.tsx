import React from 'react';
import type { GlucoseReading } from '../types/libre';

const STATUS_STYLES: Record<GlucoseReading['status'], string> = {
  normal: 'bg-[var(--gm-status-normal-bg)] text-[var(--gm-status-normal-fg)]',
  low: 'bg-red-100 text-sys-red',
  high: 'bg-orange-100 text-sys-orange',
  critical: 'bg-red-100 text-sys-red',
};

export const StatusPill: React.FC<{ status: GlucoseReading['status'] }> = ({ status }) => (
  <span className={`${STATUS_STYLES[status]} rounded-full px-3 py-1 text-gm-caption font-semibold`}>
    {status.charAt(0).toUpperCase() + status.slice(1)}
  </span>
);
