interface ModalFooterProps {
  cancelLabel: string
  confirmLabel: string
  onCancel: () => void
  onConfirm: () => void
  confirmDisabled?: boolean
}

/**
 * Shared modal footer with a secondary (cancel) and primary (confirm) action.
 * Uses the centralized `.tv-button-*` recipes so every modal stays consistent
 * and theme-safe across all 5 themes.
 */
export default function ModalFooter({
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
  confirmDisabled = false,
}: ModalFooterProps) {
  return (
    <div className="flex gap-3 mt-6">
      <button onClick={onCancel} className="tv-button-secondary flex-1 py-3">
        {cancelLabel}
      </button>
      <button
        onClick={onConfirm}
        disabled={confirmDisabled}
        className="tv-button-primary flex-1 py-3 font-medium"
      >
        {confirmLabel}
      </button>
    </div>
  )
}
