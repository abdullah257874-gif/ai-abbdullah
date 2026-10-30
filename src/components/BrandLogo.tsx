import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  label?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showText = true,
  label = 'AI Smart Assistant',
}) => {
  const dim = size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-12 w-12' : 'h-9 w-9';
  const textSize =
    size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-lg';

  return (
    <span className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0">
      <svg
        viewBox="0 0 48 48"
        fill="none"
        aria-hidden="true"
        className={`${dim} shrink-0 rounded-xl shadow-xs`}
      >
        <defs>
          <linearGradient id="brandGrad" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1D4ED8" />
            <stop offset="55%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#6D28D9" />
          </linearGradient>
        </defs>
        <rect width="48" height="48" rx="12" fill="url(#brandGrad)" />
        <path
          d="M24 11.5L34.2 35.5H29.6L27.3 29.8H20.7L18.4 35.5H13.8L24 11.5ZM22.2 26H25.8L24 21.2L22.2 26Z"
          fill="#FFFFFF"
        />
        <circle cx="34.5" cy="14" r="2.4" fill="#BFDBFE" />
      </svg>
      {showText && (
        <span className={`${textSize} font-bold tracking-tight text-slate-900 dark:text-slate-100`}>
          {label}
        </span>
      )}
    </span>
  );
};
