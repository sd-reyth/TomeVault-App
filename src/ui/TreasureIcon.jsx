import React from 'react';

/**
 * Fantasy treasure chest — lucide-compatible stroke icon for Schatkamer.
 * Artwork fills the same ~20×20 optical box as Lucide icons (2px inset).
 */
export default function TreasureIcon({
  className = '',
  strokeWidth = 1.5,
  ...props
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M3 12h18"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 12V8.25A2.75 2.75 0 0 1 5.75 5.5h12.5A2.75 2.75 0 0 1 21 8.25V12"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 12v8.25A2 2 0 0 0 5 22h14a2 2 0 0 0 2-1.75V12"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 16h18"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 15v4"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <circle
        cx="12"
        cy="13.75"
        r="1.35"
        stroke="currentColor"
        strokeWidth={strokeWidth}
      />
    </svg>
  );
}
