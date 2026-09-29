import React from 'react';

const TONES = {
  carb: 'bg-[var(--gm-carb-pill-bg)]',
  insulin: 'bg-[var(--gm-insulin-pill-bg)]',
  neutral: 'bg-surface-nested',
} as const;

export const Pill: React.FC<{
  tone?: keyof typeof TONES;
  children: React.ReactNode;
}> = ({ tone = 'neutral', children }) => (
  <span className={`${TONES[tone]} rounded-full px-2.5 py-0.5 text-gm-label text-label`}>
    {children}
  </span>
);
