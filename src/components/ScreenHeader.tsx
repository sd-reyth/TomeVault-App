import type { LucideIcon } from 'lucide-react'

interface ScreenHeaderAction {
  label: string
  onClick: () => void
  icon?: LucideIcon
}

interface ScreenHeaderProps {
  title: string
  subtitle?: string
  primaryAction?: ScreenHeaderAction
}

/**
 * Shared screen header for primary views. Keeps title scaling, subtitle
 * alignment and the optional primary action button consistent across screens,
 * and stacks responsively on small viewports.
 */
export default function ScreenHeader({ title, subtitle, primaryAction }: ScreenHeaderProps) {
  const Icon = primaryAction?.icon

  return (
    <div className="flex flex-col gap-4 mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-3xl sm:text-4xl font-fantasy tracking-tight">{title}</h2>
        {subtitle && (
          <p className="text-[var(--tv-text-secondary)] mt-1">{subtitle}</p>
        )}
      </div>
      {primaryAction && (
        <button
          onClick={primaryAction.onClick}
          className="tv-button-primary flex items-center justify-center gap-2 px-6 py-3 font-medium self-start sm:self-auto"
        >
          {Icon && <Icon className="w-4 h-4" />}
          {primaryAction.label}
        </button>
      )}
    </div>
  )
}
