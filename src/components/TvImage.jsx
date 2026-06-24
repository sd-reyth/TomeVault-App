import React, { useState } from 'react';
import { getImageCoverZoom } from '../lib/placeholders';

/**
 * Theme-safe image with automatic inset zoom to hide placeholder white borders.
 * Parent containers should use overflow-hidden (tv-image-frame).
 */
export default function TvImage({
  src,
  alt = '',
  className = '',
  contain = false,
  zoom,
  style,
  ...props
}) {
  const [hasError, setHasError] = useState(false);

  if (!src) return null;
  if (hasError) {
    return <div aria-hidden="true" className={`tv-image-fallback ${className}`.trim()} />;
  }

  if (contain) {
    return (
      <img
        src={src}
        alt={alt}
        className={`tv-image-contain ${className}`.trim()}
        style={style}
        onError={() => setHasError(true)}
        {...props}
      />
    );
  }

  const resolvedZoom = zoom ?? getImageCoverZoom(src);

  return (
    <img
      src={src}
      alt={alt}
      className={`tv-image-cover ${className}`.trim()}
      style={{ '--tv-image-zoom': resolvedZoom, ...style }}
      onError={() => setHasError(true)}
      {...props}
    />
  );
}
