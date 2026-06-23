import React, { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface TextRevealProps {
  /** Short version shown by default */
  summary: string
  
  /** Full text revealed on click */
  details: string
  
  /** Optional label for the reveal control (default: "Meer informatie") */
  revealLabel?: string
  
  /** Additional className for the wrapper */
  className?: string
}

/**
 * Shared text reveal component for minimizing explanatory copy.
 * Implements TOMEVAULT_HOUSESTYLE_PROTOCOL.md § Information Reveal Protocol.
 * 
 * Usage:
 * <TextReveal
 *   summary="Nog geen reveals gedeeld."
 *   details="Deel je eerste reveal om het journal te vullen en je spelers op de hoogte te houden van nieuwe ontdekkingen."
 * />
 */
export default function TextReveal({
  summary,
  details,
  revealLabel = 'Meer informatie',
  className = '',
}: TextRevealProps) {
  const [isRevealed, setIsRevealed] = useState(false)

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="text-sm text-[color:var(--tv-text-secondary)]">
        {summary}
      </div>

      {!isRevealed ? (
        <button
          onClick={() => setIsRevealed(true)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[color:var(--tv-accent)] hover:opacity-80 transition-opacity"
        >
          <ChevronDown className="w-3.5 h-3.5" />
          {revealLabel}
        </button>
      ) : (
        <div className="mt-2 p-3 rounded-lg bg-[color:var(--tv-bg-surface)]/40 border border-[color:var(--tv-border)]/40">
          <p className="text-xs md:text-sm leading-relaxed text-[color:var(--tv-text-secondary)]">
            {details}
          </p>
          <button
            onClick={() => setIsRevealed(false)}
            className="mt-2 text-xs font-medium text-[color:var(--tv-accent)] hover:opacity-80 transition-opacity"
          >
            Verbergen
          </button>
        </div>
      )}
    </div>
  )
}
