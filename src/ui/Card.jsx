import React from 'react';

/**
 * Shared TomeVault surface container.
 *
 * Composes the existing, theme-aware surface classes so feature components stop
 * hand-rolling border / background / shadow recipes. One surface vocabulary:
 *
 *   <Card>...</Card>                       // elevated panel (default)
 *   <Card variant="inset">...</Card>       // recessed sub-surface
 *   <Card variant="block">...</Card>       // grouped content block
 *
 * Padding presets keep spacing consistent; pass `padding="none"` to opt out.
 */

const VARIANT_CLASS = {
  panel: 'tv-panel-shell',
  inset: 'tv-panel-inset',
  block: 'tv-panel-block',
};

const PADDING_CLASS = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5 sm:p-6',
};

export default function Card({
  variant = 'panel',
  padding = 'md',
  interactive = false,
  as: Tag = 'div',
  className = '',
  children,
  ...props
}) {
  const classes = [
    VARIANT_CLASS[variant] || VARIANT_CLASS.panel,
    PADDING_CLASS[padding] ?? PADDING_CLASS.md,
    interactive ? 'tv-card-hover' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Tag className={classes} {...props}>
      {children}
    </Tag>
  );
}
