import React from 'react';
import Icon from './Icon';

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
 *
 * Optional structured icon + loading state:
 *   <Button icon={Save}>Opslaan</Button>
 *   <Button icon={Trash2} iconPosition="right" variant="danger">Verwijder</Button>
 *   <Button loading>Bezig...</Button>
 */
const VARIANT_CLASS = {
  primary: 'tv-button-primary',
  secondary: 'tv-button-secondary',
  ghost: 'tv-button-ghost',
  danger: 'tv-button-danger',
  accent: 'tv-button-accent-muted',
};

function Spinner() {
  return (
    <span
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent opacity-80"
      aria-hidden="true"
    />
  );
}

export default function Button({
  variant = 'secondary',
  size = 'md',
  block = false,
  pop = true,
  type = 'button',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
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

  const iconSize = size === 'sm' ? 'sm' : 'md';
  const iconEl = icon ? <Icon as={icon} size={iconSize} /> : null;

  return (
    <button type={type} className={classes} disabled={disabled || loading} {...props}>
      {loading ? <Spinner /> : iconPosition === 'left' ? iconEl : null}
      {children}
      {!loading && iconPosition === 'right' ? iconEl : null}
    </button>
  );
}
