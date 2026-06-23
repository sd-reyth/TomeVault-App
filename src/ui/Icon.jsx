import React from 'react';

/**
 * Shared TomeVault icon wrapper.
 *
 * One icon weight (strokeWidth 1.5) and one set of sizes for the whole app.
 * Pass any lucide-react icon component via the `as` prop:
 *
 *   import { Trash2 } from 'lucide-react';
 *   <Icon as={Trash2} size="sm" />
 *
 * This keeps icon weight + sizing centralized without a giant name registry.
 * Domain icons that lucide does not provide (polyhedral dice) live in DiceIcon.
 */

export const ICON_SIZES = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
};

export default function Icon({
  as: Component,
  size = 'md',
  strokeWidth = 1.5,
  className = '',
  label,
  ...props
}) {
  if (!Component) return null;

  const px = ICON_SIZES[size] || ICON_SIZES.md;
  const a11y = label
    ? { role: 'img', 'aria-label': label }
    : { 'aria-hidden': true, focusable: false };

  return (
    <Component
      width={px}
      height={px}
      strokeWidth={strokeWidth}
      className={className}
      {...a11y}
      {...props}
    />
  );
}
