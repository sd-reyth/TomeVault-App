import React from 'react';

/**
 * Pill-shaped mode selector (Pocket Bard Off | Explore | Combat pattern).
 *
 *   <SegmentedControl
 *     value="active"
 *     options={[{ value: 'active', label: 'Actief' }, { value: 'paused', label: 'Pauze' }]}
 *     onChange={(v) => ...}
 *   />
 */
export default function SegmentedControl({
  value,
  options = [],
  onChange,
  disabled = false,
  block = false,
  className = '',
  'aria-label': ariaLabel = 'Modus',
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={`tv-segmented ${block ? 'tv-segmented--block' : ''} ${className}`.trim()}
    >
      {options.map((option) => {
        const isActive = value === option.value;
        const isDisabled = disabled || option.disabled;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            disabled={isDisabled}
            onClick={() => {
              if (!isDisabled && option.value !== value) {
                onChange?.(option.value);
              }
            }}
            className={`tv-segmented__option ${isActive ? 'tv-segmented__option--active' : ''}`}
            aria-label={option.count != null ? `${option.label} (${option.count})` : undefined}
          >
            {option.count != null ? (
              <span className="tv-segmented__option-content">
                <span className="tv-segmented__option-label">{option.label}</span>
                <span className="tv-segmented__option-meta">{option.count}</span>
              </span>
            ) : (
              option.label
            )}
          </button>
        );
      })}
    </div>
  );
}
