import React from 'react';
import { ImagePlus } from 'lucide-react';
import TvImage from '../components/TvImage';
import Button from './Button';

export const CREATE_MODAL_BODY_CLASS =
  'flex min-h-0 flex-1 flex-col overflow-hidden gap-0 px-0 py-0 sm:px-0 sm:py-0';

export const CREATE_MODAL_SCROLL_CLASS =
  'flex-1 min-h-0 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5';

export function CreateFormField({ label, htmlFor, hint, aside, children }) {
  const LabelTag = htmlFor ? 'label' : 'span';

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <LabelTag htmlFor={htmlFor} className="tv-label block">
          {label}
          {hint ? (
            <span className="ml-1 font-normal normal-case tracking-normal tv-muted">{hint}</span>
          ) : null}
        </LabelTag>
        {aside ? <span className="shrink-0 text-[10px] tv-muted">{aside}</span> : null}
      </div>
      {children}
    </div>
  );
}

export function CreateFormPanel({ children }) {
  return (
    <div className="tv-panel-block divide-y divide-[color-mix(in_srgb,var(--tv-border),transparent_48%)]">
      {children}
    </div>
  );
}

export function CreateFormSection({ children, className = '' }) {
  return <div className={`p-3.5 ${className}`.trim()}>{children}</div>;
}

export function CreateFormChipGrid({ options, value, onChange, columns = 2 }) {
  const gridClass = columns === 4
    ? 'grid-cols-2 sm:grid-cols-4'
    : columns === 3
      ? 'grid-cols-3'
      : 'grid-cols-2';

  return (
    <div
      className={`grid gap-1 rounded-[var(--tv-radius)] border border-[color-mix(in_srgb,var(--tv-border),transparent_32%)] bg-[color-mix(in_srgb,var(--tv-bg-surface),transparent_18%)] p-1 ${gridClass}`}
    >
      {options.map(({ value: optionValue, label }) => {
        const selected = value === optionValue;
        return (
          <button
            key={optionValue}
            type="button"
            onClick={() => onChange(optionValue)}
            className={[
              'min-h-[2.125rem] rounded-[calc(var(--tv-radius)-2px)] px-2 py-1.5 text-center text-[0.75rem] font-medium leading-snug transition-all duration-150',
              selected
                ? 'bg-[color-mix(in_srgb,var(--tv-accent),transparent_72%)] text-[var(--tv-text-primary)] shadow-[0_4px_14px_color-mix(in_srgb,var(--tv-accent),transparent_78%)]'
                : 'tv-muted hover:bg-[color-mix(in_srgb,var(--tv-accent),transparent_92%)] hover:text-[var(--tv-text-primary)]',
            ].join(' ')}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function CreateFormIdentityRow({
  imageUrl,
  onImageClick,
  fallbackIcon: FallbackIcon,
  nameId,
  nameValue,
  onNameChange,
  namePlaceholder,
  meta,
  autoFocus = false,
  required = false,
}) {
  return (
    <CreateFormSection>
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onImageClick}
          className="group tv-image-frame relative h-[4.25rem] w-[4.25rem] shrink-0 overflow-hidden rounded-xl border border-dashed tv-border-emphasis transition-colors hover:border-[color-mix(in_srgb,var(--tv-accent),transparent_42%)]"
          title="Afbeelding kiezen"
        >
          {imageUrl ? (
            <>
              <TvImage src={imageUrl} alt="" className="opacity-90 transition-opacity group-hover:opacity-55" />
              <div className="absolute inset-0 flex items-center justify-center bg-[color-mix(in_srgb,var(--tv-bg-canvas),transparent_38%)] opacity-0 transition-opacity group-hover:opacity-100">
                <ImagePlus className="h-4 w-4 tv-text" />
              </div>
            </>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-0.5 tv-panel-inset tv-muted transition-colors group-hover:text-[var(--tv-accent)]">
              {FallbackIcon ? <FallbackIcon className="h-4 w-4" aria-hidden /> : <ImagePlus className="h-4 w-4" aria-hidden />}
            </div>
          )}
        </button>

        <div className="min-w-0 flex-1 space-y-1.5">
          <input
            id={nameId}
            autoFocus={autoFocus}
            required={required}
            type="text"
            value={nameValue}
            onChange={onNameChange}
            placeholder={namePlaceholder}
            className="tv-field !min-h-[2.75rem] text-[0.9375rem]"
          />
          {meta ? <p className="text-[11px] leading-snug tv-muted">{meta}</p> : null}
        </div>
      </div>
    </CreateFormSection>
  );
}

export function CreateFormImageActions({
  onUpload,
  showPicker,
  onTogglePicker,
  onClear,
  hasImage,
  pickerOpenLabel = 'Verberg',
  pickerClosedLabel = 'Icoon',
}) {
  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="secondary" size="sm" block onClick={onUpload}>
          Upload
        </Button>
        <Button
          type="button"
          variant={showPicker ? 'accent' : 'secondary'}
          size="sm"
          block
          onClick={onTogglePicker}
        >
          {showPicker ? pickerOpenLabel : pickerClosedLabel}
        </Button>
      </div>
      {hasImage && onClear ? (
        <Button type="button" variant="ghost" size="sm" block onClick={onClear}>
          Afbeelding wissen
        </Button>
      ) : null}
    </div>
  );
}

export function CreateFormPlaceholderGrid({
  images,
  selectedUrl,
  onPick,
  maxHeightClass = 'max-h-36',
  gridClass = 'grid-cols-6 sm:grid-cols-8',
}) {
  if (!images?.length) return null;

  return (
    <div
      className={`overflow-y-auto rounded-[var(--tv-radius)] border border-[color-mix(in_srgb,var(--tv-border),transparent_32%)] bg-[color-mix(in_srgb,var(--tv-bg-surface),transparent_18%)] p-1.5 ${maxHeightClass}`}
    >
      <div className={`grid gap-1 ${gridClass}`}>
        {images.map((url) => (
          <button
            key={url}
            type="button"
            onClick={() => onPick(url)}
            className={[
              'tv-image-frame aspect-square overflow-hidden rounded-[calc(var(--tv-radius)-2px)] border transition-all duration-150',
              selectedUrl === url
                ? 'border-[var(--tv-accent)] shadow-[0_0_6px_var(--tv-accent-shadow-sm)]'
                : 'border-transparent hover:border-[color-mix(in_srgb,var(--tv-accent),transparent_50%)]',
            ].join(' ')}
          >
            <TvImage src={url} alt="" loading="lazy" />
          </button>
        ))}
      </div>
    </div>
  );
}

export function CreateFormToggleRow({
  icon: Icon,
  title,
  description,
  active,
  onToggle,
  disabled = false,
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-[var(--tv-radius)] border border-[color-mix(in_srgb,var(--tv-border),transparent_32%)] bg-[color-mix(in_srgb,var(--tv-bg-surface),transparent_18%)] p-3 ${disabled ? 'opacity-80' : ''}`}
    >
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className={`shrink-0 rounded p-2 transition-colors ${active ? 'tv-toggle-active' : 'tv-chip-surface tv-muted hover:tv-text'} ${disabled ? 'pointer-events-none' : ''}`}
      >
        <Icon className="h-5 w-5" />
      </button>
      <div className="min-w-0 flex flex-col">
        <span className="text-sm font-medium tv-text">{title}</span>
        <span className="truncate text-[10px] tv-muted" title={description}>
          {description}
        </span>
      </div>
    </div>
  );
}

export function CreateFormStepper({
  value,
  onChange,
  onDecrement,
  onIncrement,
  id,
  label = 'Aantal',
  compact = false,
}) {
  return (
    <div className={`flex items-center justify-between gap-3 rounded-[var(--tv-radius)] border border-[color-mix(in_srgb,var(--tv-border),transparent_32%)] bg-[color-mix(in_srgb,var(--tv-bg-surface),transparent_18%)] ${compact ? 'px-2.5 py-1.5' : 'px-3 py-2'}`}>
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] tv-muted">{label}</span>
      <div className="tv-segmented shrink-0">
        <button
          type="button"
          onClick={onDecrement}
          className="tv-segmented__option !w-9 !px-0"
          title="Minder"
          aria-label="Minder"
        >
          −
        </button>
        <input
          id={id}
          required
          type="number"
          min="1"
          value={value}
          onChange={onChange}
          className="hide-arrows w-10 border-x border-[color-mix(in_srgb,var(--tv-border),transparent_32%)] bg-transparent text-center text-sm font-semibold tabular-nums tv-text outline-none"
        />
        <button
          type="button"
          onClick={onIncrement}
          className="tv-segmented__option !w-9 !px-0"
          title="Meer"
          aria-label="Meer"
        >
          +
        </button>
      </div>
    </div>
  );
}
