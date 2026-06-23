import React from 'react';
import Icon from './Icon';

/**
 * Touch-friendly icon action (44px default). Uniform combat-rail and toolbar actions.
 */
const VARIANT_CLASS = {
  default: 'tv-icon-btn',
  muted: 'tv-icon-action',
  accent: 'tv-button-accent-muted',
  danger: 'tv-icon-btn tv-icon-btn--danger',
  enemy: 'tv-tone-enemy-icon-btn',
};

const SIZE_CLASS = {
  md: 'tv-icon-btn--md',
  sm: 'tv-icon-btn--sm',
};

export default function IconButton({
  icon,
  label,
  variant = 'default',
  size = 'md',
  active = false,
  className = '',
  type = 'button',
  ...props
}) {
  const classes = [
    VARIANT_CLASS[variant] || VARIANT_CLASS.default,
    SIZE_CLASS[size] || SIZE_CLASS.md,
    active ? 'tv-icon-btn--active' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={classes} aria-label={label} title={label} {...props}>
      <Icon as={icon} size={size === 'sm' ? 'sm' : 'md'} />
    </button>
  );
}
