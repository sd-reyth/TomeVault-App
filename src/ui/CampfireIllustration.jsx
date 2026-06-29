import React from 'react';

/**
 * Original campfire illustration — crossed logs, fieldstones, layered flames.
 * Drawn on a 96×96 canvas for hero use. The `.tv-campfire__flames` group is
 * targeted by CSS so the flames can flicker independently of the logs.
 */
export default function CampfireIllustration({
  className = '',
  size = 104,
  ...props
}) {
  const id = React.useId().replace(/:/g, '');

  return (
    <svg
      viewBox="0 0 96 96"
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
        <linearGradient id={`${id}-flame-outer`} x1="48" y1="10" x2="48" y2="68" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FDE68A" />
          <stop offset="0.34" stopColor="#FBBF24" />
          <stop offset="0.64" stopColor="#F97316" />
          <stop offset="0.9" stopColor="#EF4444" />
          <stop offset="1" stopColor="#B91C1C" stopOpacity="0.25" />
        </linearGradient>
        <linearGradient id={`${id}-flame-inner`} x1="48" y1="20" x2="48" y2="62" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFBEB" />
          <stop offset="0.5" stopColor="#FCD34D" />
          <stop offset="1" stopColor="#F97316" stopOpacity="0.4" />
        </linearGradient>
        <radialGradient id={`${id}-ember`} cx="0.5" cy="0.5" r="0.5">
          <stop stopColor="#FDBA74" />
          <stop offset="0.55" stopColor="#F97316" stopOpacity="0.7" />
          <stop offset="1" stopColor="#F97316" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-log`} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#9A6A3C" />
          <stop offset="1" stopColor="#5C3D21" />
        </linearGradient>
        <radialGradient id={`${id}-logface`} cx="0.5" cy="0.5" r="0.5">
          <stop stopColor="#C89B6A" />
          <stop offset="1" stopColor="#7A5230" />
        </radialGradient>
        <linearGradient id={`${id}-stone`} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#8C95A1" />
          <stop offset="1" stopColor="#525a66" />
        </linearGradient>
      </defs>

      {/* ground shadow */}
      <ellipse cx="48" cy="82" rx="34" ry="6.5" fill="#000" fillOpacity="0.22" />

      {/* fieldstones around the pit */}
      <g stroke="#3b4250" strokeWidth="0.9">
        <ellipse cx="24" cy="79" rx="9" ry="5.2" fill={`url(#${id}-stone)`} />
        <ellipse cx="72" cy="79" rx="9" ry="5.2" fill={`url(#${id}-stone)`} />
        <ellipse cx="40" cy="83" rx="8" ry="4.6" fill={`url(#${id}-stone)`} />
        <ellipse cx="58" cy="83" rx="8" ry="4.6" fill={`url(#${id}-stone)`} />
      </g>

      {/* crossed logs */}
      <g transform="rotate(-17 48 71)">
        <rect x="18" y="66.5" width="60" height="9" rx="4.5" fill={`url(#${id}-log)`} stroke="#3F2A18" strokeWidth="0.9" />
        <ellipse cx="22" cy="71" rx="2.4" ry="3.7" fill={`url(#${id}-logface)`} stroke="#3F2A18" strokeWidth="0.7" />
        <ellipse cx="74" cy="71" rx="2.4" ry="3.7" fill={`url(#${id}-logface)`} stroke="#3F2A18" strokeWidth="0.7" />
      </g>
      <g transform="rotate(16 48 72)">
        <rect x="18" y="67.5" width="60" height="9" rx="4.5" fill={`url(#${id}-log)`} stroke="#3F2A18" strokeWidth="0.9" />
        <ellipse cx="22" cy="72" rx="2.4" ry="3.7" fill={`url(#${id}-logface)`} stroke="#3F2A18" strokeWidth="0.7" />
        <ellipse cx="74" cy="72" rx="2.4" ry="3.7" fill={`url(#${id}-logface)`} stroke="#3F2A18" strokeWidth="0.7" />
      </g>

      {/* glowing ember bed */}
      <ellipse cx="48" cy="69" rx="16" ry="5" fill={`url(#${id}-ember)`} />

      <g className="tv-campfire__flames">
        {/* side licks */}
        <path d="M33 60 C 29 55, 30 48, 35 44 C 34 50, 36 55, 40 58 Z" fill={`url(#${id}-flame-outer)`} fillOpacity="0.85" />
        <path d="M63 60 C 67 55, 66 48, 61 44 C 62 50, 60 55, 56 58 Z" fill={`url(#${id}-flame-outer)`} fillOpacity="0.85" />

        {/* main flame */}
        <path
          d="M48 66 C 35 58, 31 45, 36 32 C 39 24, 44 18, 48 12 C 52 18, 57 24, 60 32 C 65 45, 61 58, 48 66 Z"
          fill={`url(#${id}-flame-outer)`}
        />
        <path
          d="M48 62 C 40 56, 38 46, 42 36 C 44 30, 46 26, 48 22 C 50 26, 52 30, 54 36 C 58 46, 56 56, 48 62 Z"
          fill={`url(#${id}-flame-inner)`}
        />
        <path
          d="M48 57 C 44 53, 43 47, 45 41 C 46 38, 47 35, 48 33 C 49 35, 50 38, 51 41 C 53 47, 52 53, 48 57 Z"
          fill="#FFFBEB"
          fillOpacity="0.95"
        />
      </g>
    </svg>
  );
}
