import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface TextRevealProps {
  summary: string
  details: string
}

/**
 * Progressive-disclosure helper text. Shows a short summary by default and
 * reveals the full details on click. Reveal state is component-local (per
 * session), not persisted.
 */
export default function TextReveal({ summary, details }: TextRevealProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="text-sm text-[var(--tv-text-secondary)]">
      <p>{summary}</p>
      {expanded ? (
        <p className="mt-2">{details}</p>
      ) : (
        <button
          onClick={() => setExpanded(true)}
          className="mt-2 inline-flex items-center gap-1 text-[var(--tv-accent)] hover:underline"
        >
          Meer informatie
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
