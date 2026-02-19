import { useState } from 'react'
import { useEnqueueJob } from '../hooks/useApi'

export default function EnqueueJob() {
  const enqueue = useEnqueueJob()
  const [form, setForm] = useState({
    job_name: '',
    args: '',
    delay: '',
    enableRetry: false,
    max_retries: '3',
    strategy: 'exponential' as 'exponential' | 'linear' | 'fixed',
    base_delay: '60',
  })
  const [result, setResult] = useState<{ id: string; name: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setResult(null)
    setError(null)

    let args: Record<string, unknown> = {}
    if (form.args.trim()) {
      try {
        args = JSON.parse(form.args)
      } catch {
        setError('Invalid JSON in args field')
        return
      }
    }

    const delay = form.delay ? parseInt(form.delay, 10) : 0
    const retry = form.enableRetry
      ? {
          max_retries: parseInt(form.max_retries, 10) || 3,
          strategy: form.strategy,
          base_delay: parseInt(form.base_delay, 10) || 60,
        }
      : undefined

    enqueue.mutate(
      { job_name: form.job_name, args, delay, retry },
      {
        onSuccess: (job) => {
          setResult({ id: job.id, name: form.job_name })
          setForm({ ...form, job_name: '', args: '', delay: '' })
        },
        onError: (err) => setError(err instanceof Error ? err.message : 'Failed to enqueue'),
      },
    )
  }

  return (
    <div className="max-w-2xl">
      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        {/* Job Name */}
        <div>
          <label className="label">Job Name <span className="text-red-400">*</span></label>
          <input
            type="text"
            required
            value={form.job_name}
            onChange={(e) => setForm({ ...form, job_name: e.target.value })}
            className="input"
            placeholder="send_email"
          />
        </div>

        {/* Args */}
        <div>
          <label className="label">Arguments (JSON)</label>
          <textarea
            value={form.args}
            onChange={(e) => setForm({ ...form, args: e.target.value })}
            className="input font-mono"
            rows={4}
            placeholder={'{\n  "to": "user@example.com",\n  "subject": "Hello"\n}'}
          />
        </div>

        {/* Delay */}
        <div>
          <label className="label">Delay</label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min="0"
              value={form.delay}
              onChange={(e) => setForm({ ...form, delay: e.target.value })}
              className="input w-40"
              placeholder="0"
            />
            <span className="text-sm text-gray-400 dark:text-gray-500">seconds (0 = immediate)</span>
          </div>
          <div className="flex gap-1.5 mt-2">
            {[
              { label: '30s', val: '30' },
              { label: '1m', val: '60' },
              { label: '5m', val: '300' },
              { label: '1h', val: '3600' },
              { label: '24h', val: '86400' },
            ].map((preset) => (
              <button
                key={preset.val}
                type="button"
                onClick={() => setForm({ ...form, delay: preset.val })}
                className={`text-[11px] px-2.5 py-1 rounded-md border transition-colors ${
                  form.delay === preset.val
                    ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950 dark:text-indigo-400'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-600'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Retry Config */}
        <div className="border-t border-gray-100 dark:border-gray-800 pt-5">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={form.enableRetry}
              onChange={(e) => setForm({ ...form, enableRetry: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Custom retry configuration</span>
          </label>

          {form.enableRetry && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="label text-xs">Max Retries</label>
                  <input
                    type="number"
                    min="1"
                    value={form.max_retries}
                    onChange={(e) => setForm({ ...form, max_retries: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label text-xs">Backoff Strategy</label>
                  <select
                    value={form.strategy}
                    onChange={(e) => setForm({ ...form, strategy: e.target.value as typeof form.strategy })}
                    className="input"
                  >
                    <option value="exponential">Exponential</option>
                    <option value="linear">Linear</option>
                    <option value="fixed">Fixed</option>
                  </select>
                </div>
                <div>
                  <label className="label text-xs">Base Delay (sec)</label>
                  <input
                    type="number"
                    min="1"
                    value={form.base_delay}
                    onChange={(e) => setForm({ ...form, base_delay: e.target.value })}
                    className="input"
                  />
                </div>
              </div>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">
                {form.strategy === 'exponential' && 'Delay increases exponentially with each retry (recommended for most cases)'}
                {form.strategy === 'linear' && `Delay increases by ${form.base_delay || 60}s with each retry`}
                {form.strategy === 'fixed' && `Fixed ${form.base_delay || 60}s delay between each retry`}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button type="submit" disabled={enqueue.isPending} className="btn-primary">
            {enqueue.isPending ? 'Enqueuing...' : 'Enqueue Job'}
          </button>
        </div>
      </form>

      {/* Result Messages */}
      {result && (
        <div className="mt-4 card p-4 border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-green-600 dark:text-green-400 text-sm">✓</span>
            </div>
            <div>
              <p className="text-sm font-medium text-green-800 dark:text-green-300">Job enqueued successfully</p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                <span className="font-medium">{result.name}</span> — ID: <code className="font-mono">{result.id}</code>
              </p>
            </div>
          </div>
        </div>
      )}
      {error && (
        <div className="mt-4 card p-4 border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-red-600 dark:text-red-400 text-sm">✕</span>
            </div>
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-300">Failed to enqueue</p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{error}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
