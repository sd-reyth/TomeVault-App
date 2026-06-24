import React from 'react'

interface ModalFooterProps {
  /** Cancel button text (default: "Annuleren") */
  cancelLabel?: string
  
  /** Confirm button text */
  confirmLabel: string
  
  /** Cancel button callback */
  onCancel: () => void
  
  /** Confirm button callback */
  onConfirm: () => void
  
  /** Is confirm button disabled? */
  confirmDisabled?: boolean
  
  /** Is this a destructive confirm? (delete, leave, etc.) */
  isDestructive?: boolean
  
  /** Loading state on confirm button */
  isLoading?: boolean
}

/**
 * Shared modal footer for all confirm/cancel patterns.
 * Implements TOMEVAULT_HOUSESTYLE_PROTOCOL.md § Cancel And Confirm Protocol.
 * 
 * Ensures consistent button styling, order, and behavior across all modals and confirmations.
 * 
 * Usage:
 * <ModalFooter
 *   cancelLabel="Annuleren"
 *   confirmLabel="Verwijderen"
 *   onCancel={() => setOpen(false)}
 *   onConfirm={() => deleteItem()}
 *   isDestructive={true}
 * />
 */
export default function ModalFooter({
  cancelLabel = 'Annuleren',
  confirmLabel,
  onCancel,
  onConfirm,
  confirmDisabled = false,
  isDestructive = false,
  isLoading = false,
}: ModalFooterProps) {
  return (
    <div className="mt-6 flex flex-col gap-2 border-t border-[color:var(--tv-border)] pt-4 sm:flex-row sm:gap-3 sm:justify-end">
      {/* Cancel Button (Secondary) */}
      <button
        onClick={onCancel}
        className="tv-btn tv-button-secondary order-2 sm:order-1 px-4 text-sm font-medium"
      >
        {cancelLabel}
      </button>

      {/* Confirm Button (Primary or Destructive) */}
      <button
        onClick={onConfirm}
        disabled={confirmDisabled || isLoading}
        className={`tv-btn order-1 sm:order-2 px-4 text-sm font-medium transition-all duration-200 ease-out ${
          isDestructive
            ? 'tv-button-destructive'
            : 'tv-button-primary'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isLoading ? (
          <>
            <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1.5" />
            {confirmLabel}
          </>
        ) : (
          confirmLabel
        )}
      </button>
    </div>
  )
}
