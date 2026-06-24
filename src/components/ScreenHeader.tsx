import React from 'react'

interface ScreenHeaderProps {
  /** Main title, usually large and serif */
  title: string
  
  /** Optional subtitle or description */
  subtitle?: string
  
  /** Optional primary metric or aggregate display */
  metric?: {
    label: string
    value: string | React.ReactNode
  }
  
  /** Primary action button */
  primaryAction?: {
    label: string
    icon?: React.ReactNode
    onClick: () => void
    disabled?: boolean
  }
  
  /** Optional secondary actions (usually utilities) */
  secondaryActions?: Array<{
    label: string
    icon?: React.ReactNode
    onClick: () => void
  }>
}

/**
 * Shared screen header component for all TomeVault views.
 * Implements TOMEVAULT_HOUSESTYLE_PROTOCOL.md § Header Protocol.
 * 
 * Usage:
 * <ScreenHeader
 *   title="Oude Geschriften"
 *   subtitle="Documenten, kaarten en magische voorwerpen ontdekt tijdens de reis."
 *   primaryAction={{ label: "Nieuw Handout", onClick: () => {} }}
 * />
 */
export default function ScreenHeader({
  title,
  subtitle,
  metric,
  primaryAction,
  secondaryActions,
}: ScreenHeaderProps) {
  return (
    <div className="mb-6 md:mb-8">
      {/* Title and Subtitle */}
      <div className="flex flex-col gap-2 md:gap-3">
        <h1 className="font-fantasy text-3xl md:text-4xl font-bold tracking-tight text-[color:var(--tv-text-primary)]">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm md:text-base text-[color:var(--tv-text-secondary)] max-w-2xl">
            {subtitle}
          </p>
        )}
      </div>

      {/* Metric (if present) */}
      {metric && (
        <div className="mt-4 md:mt-6">
          <div className="text-xs md:text-sm uppercase tracking-[0.14em] text-[color:var(--tv-text-muted)] mb-1">
            {metric.label}
          </div>
          <div className="text-xl md:text-2xl font-fantasy font-bold text-[color:var(--tv-accent)]">
            {metric.value}
          </div>
        </div>
      )}

      {/* Actions Row */}
      {(primaryAction || secondaryActions?.length) && (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {secondaryActions?.map((action, i) => (
              <button
                key={i}
                onClick={action.onClick}
                className="tv-btn tv-button-secondary tv-btn--sm gap-1.5 px-3 text-sm font-normal normal-case tracking-normal"
                title={action.label}
              >
                {action.icon}
                <span className="hidden sm:inline">{action.label}</span>
              </button>
            ))}
          </div>

          {primaryAction && (
            <button
              onClick={primaryAction.onClick}
              disabled={primaryAction.disabled}
              className="tv-btn tv-button-primary gap-2 px-4 text-sm font-semibold"
            >
              {primaryAction.icon}
              <span>{primaryAction.label}</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
