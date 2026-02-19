interface Props {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  variant?: 'danger' | 'primary'
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  variant = 'danger',
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm" />
      <div
        className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl dark:shadow-black/40 max-w-sm w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{message}</p>
        <div className="mt-6 flex justify-end gap-2.5">
          <button onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={variant === 'danger' ? 'btn-danger' : 'btn-primary'}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
