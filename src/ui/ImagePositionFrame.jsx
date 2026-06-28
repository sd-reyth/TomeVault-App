import React, { useRef } from 'react';
import { ImagePlus, RotateCcw } from 'lucide-react';
import TvImage from '../components/TvImage';
import useImagePositionDrag from './useImagePositionDrag';

export default function ImagePositionFrame({
  src,
  alt = '',
  value,
  onChange,
  canReposition = false,
  canUpload = false,
  onUpload,
  onReset,
  frameClassName = '',
  imageZoom,
  className = '',
  extraActions = null,
}) {
  const fileInputRef = useRef(null);

  const {
    position,
    objectPosition,
    resolvedZoom,
    isDragging,
    showHint,
    dragProps,
  } = useImagePositionDrag({
    value,
    onChange,
    canReposition,
    zoom: imageZoom,
    src,
  });

  const handleUploadClick = () => {
    if (!canUpload) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    onUpload?.(file);
    event.target.value = '';
  };

  const viewportClass = [
    'tv-image-frame',
    'tv-image-pos-frame__viewport',
    frameClassName,
    canReposition ? 'tv-image-pos-frame__viewport--draggable' : '',
    isDragging ? 'is-dragging' : '',
    showHint && canReposition ? 'is-hint-visible' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={`tv-image-pos-frame ${className}`.trim()}>
      <div {...dragProps} className={viewportClass}>
        <TvImage
          src={src}
          alt={alt}
          zoom={resolvedZoom}
          style={{ objectPosition }}
          draggable={false}
        />

        {canReposition ? (
          <span className="tv-image-pos-frame__hint" aria-hidden="true">
            Sleep om te positioneren
          </span>
        ) : null}

        {canUpload && !canReposition ? (
          <button
            type="button"
            className="tv-image-pos-frame__upload-overlay"
            onClick={handleUploadClick}
            aria-label="Afbeelding uploaden"
          >
            <ImagePlus className="h-5 w-5 tv-text" />
          </button>
        ) : null}
      </div>

      {(canUpload || canReposition || extraActions) ? (
        <div className="tv-image-pos-frame__actions">
          {canUpload ? (
            <button
              type="button"
              className="tv-image-pos-frame__action tv-toolbar-icon-btn tv-button-secondary"
              onClick={handleUploadClick}
              title="Afbeelding uploaden"
              aria-label="Afbeelding uploaden"
            >
              <ImagePlus className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
          {extraActions}
          {canReposition ? (
            <button
              type="button"
              className="tv-image-pos-frame__action tv-toolbar-icon-btn tv-button-secondary"
              onClick={() => onReset?.()}
              title="Positie centreren"
              aria-label="Positie centreren"
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
        </div>
      ) : null}

      {canUpload ? (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      ) : null}
    </div>
  );
}
