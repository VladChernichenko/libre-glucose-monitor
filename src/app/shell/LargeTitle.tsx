import React from 'react';

export const LargeTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h1 className="px-4 pb-2.5 pt-11 text-gm-title text-label">{children}</h1>
);
