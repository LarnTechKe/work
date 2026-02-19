interface Props {
  status: 'active' | 'idle' | 'enabled' | 'disabled' | 'error' | 'pending'
  label?: string
}

const config: Record<string, { dot: string; bg: string; text: string }> = {
  active: { dot: 'bg-green-500', bg: 'bg-green-50 dark:bg-green-950', text: 'text-green-700 dark:text-green-400' },
  idle: { dot: 'bg-gray-400', bg: 'bg-gray-50 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400' },
  enabled: { dot: 'bg-green-500', bg: 'bg-green-50 dark:bg-green-950', text: 'text-green-700 dark:text-green-400' },
  disabled: { dot: 'bg-amber-400', bg: 'bg-amber-50 dark:bg-amber-950', text: 'text-amber-700 dark:text-amber-400' },
  error: { dot: 'bg-red-500', bg: 'bg-red-50 dark:bg-red-950', text: 'text-red-700 dark:text-red-400' },
  pending: { dot: 'bg-blue-500', bg: 'bg-blue-50 dark:bg-blue-950', text: 'text-blue-700 dark:text-blue-400' },
}

export default function StatusBadge({ status, label }: Props) {
  const c = config[status] || config.idle
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {label || status}
    </span>
  )
}
