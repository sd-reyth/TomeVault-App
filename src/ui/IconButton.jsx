import React from 'react';
import Icon from './Icon';
import Text from './Text';

/**
 * Touch-friendly icon action. Use `block` + `caption` for rail toolbars (icon + short label).
 */
const VARIANT_CLASS = {
  default: 'tv-icon-btn',
  muted: 'tv-icon-action',
  accent: 'tv-button-accent-muted',
  danger: 'tv-icon-btn tv-icon-btn--danger-subtle',
  enemy: 'tv-tone-enemy-icon-btn',
};

const SIZE_CLASS = {
  md: 'tv-icon-btn--md',
  sm: 'tv-icon-btn--sm',
};

export default function IconButton({
  icon,
  label,
  caption,
  variant = 'default',
  size = 'md',
  block = false,
  active = false,
  className = '',
  type = 'button',
  ...props
}) {
  const classes = [
    VARIANT_CLASS[variant] || VARIANT_CLASS.default,
    block ? 'tv-icon-btn--block' : (SIZE_CLASS[size] || SIZE_CLASS.md),
    caption ? 'tv-icon-btn--labeled' : '',
    active ? 'tv-icon-btn--active' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const iconSize = block ? 'sm' : (size === 'sm' ? 'sm' : 'md');

  return (
    <button type={type} className={classes} aria-label={label} title={label || caption} {...props}>
      <Icon as={icon} size={iconSize} />
      {caption ? (
        <Text variant="label" as="span" className="tv-icon-btn__caption">{caption}</Text>
      ) : null}
    </button>
  );
}
