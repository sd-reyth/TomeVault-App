import React from 'react';

/**
 * Shared TomeVault typography primitive.
 *
 * One type hierarchy, resolved through the tv-type-* scale (see theme/tokens.css).
 * Use this instead of ad-hoc text-[Npx] / font-fantasy class combinations.
 *
 *   <Text variant="title">Slagorde</Text>
 *   <Text variant="label" as="label">Naam</Text>
 *   <Text variant="meta" tone="muted">3 deelnemers</Text>
 *
 * Only display / title / subtitle use the fantasy serif font; everything else
 * is the UI sans, per the housestyle protocol.
 */

const VARIANT_CLASS = {
  display: 'tv-type-display',
  title: 'tv-type-title',
  subtitle: 'tv-type-subtitle',
  body: 'tv-type-body',
  story: 'tv-type-story',
  label: 'tv-type-label',
  meta: 'tv-type-meta',
};

const DEFAULT_TAG = {
  display: 'h1',
  title: 'h2',
  subtitle: 'h3',
  body: 'p',
  story: 'p',
  label: 'span',
  meta: 'span',
};

const TONE_CLASS = {
  primary: '',
  secondary: 'tv-text-sub',
  muted: 'tv-muted',
  accent: 'tv-accent',
};

export default function Text({
  variant = 'body',
  as,
  tone = 'primary',
  className = '',
  children,
  ...props
}) {
  const Tag = as || DEFAULT_TAG[variant] || 'span';
  const classes = [
    VARIANT_CLASS[variant] || VARIANT_CLASS.body,
    TONE_CLASS[tone] || '',
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
