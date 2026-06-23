import React from 'react';

/**
 * Shared TomeVault button. One geometry, one font (sans), explicit variants.
 *
 * Variants:
 *  - primary   : the main action of a surface (accent gradient)
 *  - secondary : neutral / cancel-adjacent action
 *  - ghost     : low-emphasis cancel / dismiss
 *  - danger    : destructive action (delete, leave, end combat)
 *  - accent    : muted accent (toggles, pinned states)
 *
 * Sizes: 'md' (default) | 'sm'
 * Use `block` to stretch full width.
 */
const VARIANT_CLASS = {
  primary: 'tv-button-primary',
  secondary: 'tv-button-secondary',
  ghost: 'tv-button-ghost',
  danger: 'tv-button-danger',
  accent: 'tv-button-accent-muted',
};

export default function Button({
  variant = 'secondary',
  size = 'md',
  block = false,
  pop = true,
  type = 'button',
  className = '',
  children,
  ...props
}) {
  const classes = [
    'tv-btn',
    VARIANT_CLASS[variant] || VARIANT_CLASS.secondary,
    size === 'sm' ? 'tv-btn--sm' : '',
    block ? 'tv-btn--block' : '',
    pop ? 'tv-satisfy-pop' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  );
}
