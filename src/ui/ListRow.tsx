import React from 'react';

export const ListRow: React.FC<{
  leading?: React.ReactNode;
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  onClick?: () => void;
}> = ({ leading, title, subtitle, trailing, onClick }) => {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className="flex w-full items-center gap-3 py-2.5 text-left"
      {...(onClick ? { type: 'button' as const } : {})}
    >
      {leading}
      <span className="min-w-0 flex-1">
        <span className="block text-gm-body text-label">{title}</span>
        {subtitle && (
          <span className="block text-gm-label text-label-secondary">{subtitle}</span>
        )}
      </span>
      {trailing}
    </Tag>
  );
};
