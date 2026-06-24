import React from 'react';

/**
 * Original campfire illustration for leave-session and ambience moments.
 * Filled flame + stroked logs; sized for hero use (~56–72px).
 */
export default function CampfireIllustration({
  className = '',
  size = 56,
  ...props
}) {
  const id = React.useId().replace(/:/g, '');

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <defs>
        <linearGradient id={`${id}-flame-outer`} x1="32" y1="8" x2="32" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FDE68A" />
          <stop offset="0.38" stopColor="#FB923C" />
          <stop offset="0.78" stopColor="#EF4444" />
          <stop offset="1" stopColor="#B91C1C" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id={`${id}-flame-inner`} x1="32" y1="18" x2="32" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FEF3C7" />
          <stop offset="0.55" stopColor="#FBBF24" />
          <stop offset="1" stopColor="#F97316" stopOpacity="0.35" />
        </linearGradient>
        <linearGradient id={`${id}-log`} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#8B5E34" />
          <stop offset="1" stopColor="#5C3D21" />
        </linearGradient>
      </defs>

      <ellipse cx="32" cy="52" rx="18" ry="4.5" fill="#000" fillOpacity="0.22" />

      <g stroke="#3F2A18" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
        <rect x="10" y="46" width="22" height="5.5" rx="2.2" fill={`url(#${id}-log)`} transform="rotate(-18 21 49)" />
        <rect x="32" y="46" width="22" height="5.5" rx="2.2" fill={`url(#${id}-log)`} transform="rotate(18 43 49)" />
        <rect x="18" y="49" width="28" height="5" rx="2" fill={`url(#${id}-log)`} />
      </g>

      <path
        d="M32 43.5C24.5 39.5 20 31.5 22.5 23.5C24 18.5 27.5 14.5 32 11C36.5 14.5 40 18.5 41.5 23.5C44 31.5 39.5 39.5 32 43.5Z"
        fill={`url(#${id}-flame-outer)`}
      />
      <path
        d="M32 40.5C28.5 37.5 26.5 32 28 26.5C29 22.5 30.8 19.5 32 17.5C33.2 19.5 35 22.5 36 26.5C37.5 32 35.5 37.5 32 40.5Z"
        fill={`url(#${id}-flame-inner)`}
      />
      <path
        d="M32 36.5C30.4 34.8 29.6 32.2 30.4 29.6C30.9 28 31.6 26.8 32 26C32.4 26.8 33.1 28 33.6 29.6C34.4 32.2 33.6 34.8 32 36.5Z"
        fill="#FFFBEB"
        fillOpacity="0.92"
      />

      <path
        d="M27.5 18.5C28.8 16.2 30.4 14.4 32 13C33.2 14.8 34.2 16.6 35 18.5"
        stroke="#FEF3C7"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeOpacity="0.55"
      />
    </svg>
  );
}
