interface JobData {
  name?: string
  id?: string
  t?: number
  args?: Record<string, unknown> | null
  fails?: number
  err?: string
  failed_at?: number
  retry_at?: number
  run_at?: number
  died_at?: number
  completed_at?: number
  status?: string
  unique?: boolean
  unique_key?: string
  max_retries?: number | null
  backoff_base?: number | null
  backoff_type?: number | null
}

interface Props {
  open: boolean
  job: JobData | null
  onClose: () => void
  actions?: React.ReactNode
}

function formatTime(epoch: number | undefined): string {
  if (!epoch) return '-'
  const d = new Date(epoch * 1000)
  return d.toLocaleString() + ` (${timeAgo(epoch)})`
}

function timeAgo(epoch: number): string {
  const seconds = Math.floor(Date.now() / 1000 - epoch)
  if (seconds < 0) {
    const abs = Math.abs(seconds)
    if (abs < 60) return `in ${abs}s`
    if (abs < 3600) return `in ${Math.floor(abs / 60)}m`
    if (abs < 86400) return `in ${Math.floor(abs / 3600)}h`
    return `in ${Math.floor(abs / 86400)}d`
  }
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

const backoffLabels: Record<number, string> = {
  0: 'Exponential',
  1: 'Linear',
  2: 'Fixed',
}

export default function JobDetailModal({ open, job, onClose, actions }: Props) {
  if (!open || !job) return null

  const fields: { label: string; value: React.ReactNode }[] = [
    { label: 'Job Name', value: <span className="font-semibold text-gray-900 dark:text-gray-100">{job.name || '-'}</span> },
    { label: 'Job ID', value: <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded font-mono">{job.id || '-'}</code> },
    { label: 'Enqueued At', value: formatTime(job.t) },
  ]

  if (job.completed_at) fields.push({ label: 'Completed At', value: formatTime(job.completed_at) })
  if (job.status) fields.push({ label: 'Status', value: (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
      job.status === 'success' ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400' :
      job.status === 'retry' ? 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400' :
      'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400'
    }`}>{job.status}</span>
  )})
  if (job.run_at) fields.push({ label: 'Scheduled For', value: formatTime(job.run_at) })
  if (job.retry_at) fields.push({ label: 'Retry At', value: formatTime(job.retry_at) })
  if (job.died_at) fields.push({ label: 'Died At', value: formatTime(job.died_at) })
  if (job.failed_at) fields.push({ label: 'Failed At', value: formatTime(job.failed_at) })
  if (job.fails) fields.push({ label: 'Failure Count', value: <span className="text-red-600 dark:text-red-400 font-medium">{job.fails}</span> })
  if (job.unique) fields.push({ label: 'Unique', value: 'Yes' })
  if (job.unique_key) fields.push({ label: 'Unique Key', value: <code className="text-xs">{job.unique_key}</code> })
  if (job.max_retries != null) fields.push({ label: 'Max Retries', value: String(job.max_retries) })
  if (job.backoff_type != null) fields.push({ label: 'Backoff Strategy', value: backoffLabels[job.backoff_type] || 'Unknown' })
  if (job.backoff_base != null) fields.push({ label: 'Backoff Base Delay', value: `${job.backoff_base}s` })

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end" onClick={onClose}>
      <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm" />
      <div
        className="relative h-full w-full max-w-lg bg-white dark:bg-gray-900 shadow-2xl dark:shadow-black/40 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider font-medium">Job Details</p>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-0.5">{job.name || 'Unknown Job'}</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Fields */}
        <div className="px-6 py-5">
          <div className="space-y-0">
            {fields.map((f, i) => (
              <div key={i} className="flex items-start py-3 border-b border-gray-50 dark:border-gray-800/50 last:border-0">
                <span className="w-36 flex-shrink-0 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider pt-0.5">
                  {f.label}
                </span>
                <span className="text-sm text-gray-700 dark:text-gray-300 min-w-0">{f.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Error */}
        {job.err && (
          <div className="px-6 pb-5">
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Error Message</p>
            <div className="bg-red-50 dark:bg-red-950 border border-red-100 dark:border-red-900 rounded-lg p-4">
              <pre className="text-sm text-red-700 dark:text-red-400 whitespace-pre-wrap break-words font-mono">{job.err}</pre>
            </div>
          </div>
        )}

        {/* Args */}
        <div className="px-6 pb-5">
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Arguments</p>
          {job.args && Object.keys(job.args).length > 0 ? (
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg p-4">
              <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words font-mono">
                {JSON.stringify(job.args, null, 2)}
              </pre>
            </div>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500 italic">No arguments</p>
          )}
        </div>

        {/* Actions */}
        {actions && (
          <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 px-6 py-4">
            <div className="flex gap-2.5">{actions}</div>
          </div>
        )}
      </div>
    </div>
  )
}
