import React from 'react';

export const Card: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className = '',
  children,
}) => (
  <div className={`bg-surface rounded-card shadow-card p-3.5 ${className}`}>{children}</div>
);
