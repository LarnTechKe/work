import { useState } from 'react'
import {
  usePeriodicSchedules,
  useAddPeriodicSchedule,
  useDeletePeriodicSchedule,
  useTogglePeriodicSchedule,
} from '../hooks/useApi'
import DataTable from './common/DataTable'
import StatusBadge from './common/StatusBadge'
import ConfirmDialog from './common/ConfirmDialog'
import type { PeriodicSchedule } from '../api/types'

function formatTime(epoch: number): string {
  if (!epoch) return '-'
  return new Date(epoch * 1000).toLocaleString()
}

const presets = [
  { label: 'Every minute', spec: '* * * * *' },
  { label: 'Every 5 min', spec: '*/5 * * * *' },
  { label: 'Every hour', spec: '0 * * * *' },
  { label: 'Daily midnight', spec: '0 0 * * *' },
  { label: 'Daily 2 AM', spec: '0 2 * * *' },
  { label: 'Weekly Monday', spec: '0 0 * * 1' },
]

export default function Schedules() {
  const { data, isLoading, error } = usePeriodicSchedules()
  const addSchedule = useAddPeriodicSchedule()
  const deleteSchedule = useDeletePeriodicSchedule()
  const toggleSchedule = useTogglePeriodicSchedule()

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', job_name: '', spec: '', args: '' })
  const [formError, setFormError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [selectedSchedule, setSelectedSchedule] = useState<PeriodicSchedule | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    let args: Record<string, unknown> | undefined
    if (form.args.trim()) {
      try {
        args = JSON.parse(form.args)
      } catch {
        setFormError('Invalid JSON in args field')
        return
      }
    }
    addSchedule.mutate(
      { name: form.name, job_name: form.job_name, spec: form.spec, args, enabled: true },
      {
        onSuccess: () => {
          setForm({ name: '', job_name: '', spec: '', args: '' })
          setShowForm(false)
          setFormError(null)
        },
        onError: (err) => setFormError(err instanceof Error ? err.message : 'Failed to add schedule'),
      },
    )
  }

  if (isLoading) return <div className="card p-12 text-center text-gray-400 dark:text-gray-500">Loading schedules...</div>
  if (error) return <div className="card p-12 text-center text-red-500">Error loading schedules</div>

  const schedules = data || []

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-400">
            {schedules.length}
          </span>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setFormError(null) }}
          className={showForm ? 'btn-secondary' : 'btn-primary'}
        >
          {showForm ? 'Cancel' : 'New Schedule'}
        </button>
      </div>

      {/* Add Schedule Form */}
      {showForm && (
        <div className="card p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Create New Schedule</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Schedule Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input"
                  placeholder="daily-cleanup"
                />
              </div>
              <div>
                <label className="label">Job Name</label>
                <input
                  type="text"
                  required
                  value={form.job_name}
                  onChange={(e) => setForm({ ...form, job_name: e.target.value })}
                  className="input"
                  placeholder="cleanup_old_records"
                />
              </div>
            </div>

            <div>
              <label className="label">Cron Expression</label>
              <input
                type="text"
                required
                value={form.spec}
                onChange={(e) => setForm({ ...form, spec: e.target.value })}
                className="input font-mono"
                placeholder="0 2 * * *"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {presets.map((p) => (
                  <button
                    key={p.spec}
                    type="button"
                    onClick={() => setForm({ ...form, spec: p.spec })}
                    className={`text-[11px] px-2.5 py-1 rounded-md border transition-colors ${
                      form.spec === p.spec
                        ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950 dark:text-indigo-400'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:bg-gray-800'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Arguments (JSON, optional)</label>
              <textarea
                value={form.args}
                onChange={(e) => setForm({ ...form, args: e.target.value })}
                className="input font-mono"
                rows={2}
                placeholder='{"days": 30, "batch_size": 100}'
              />
            </div>

            {formError && (
              <div className="rounded-lg bg-red-50 dark:bg-red-950 border border-red-100 dark:border-red-900 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                {formError}
              </div>
            )}

            <button type="submit" disabled={addSchedule.isPending} className="btn-primary">
              {addSchedule.isPending ? 'Creating...' : 'Create Schedule'}
            </button>
          </form>
        </div>
      )}

      {/* Schedules Table */}
      <DataTable<PeriodicSchedule>
        columns={[
          {
            header: 'Name',
            accessor: (s) => (
              <div>
                <span className="font-medium text-gray-900 dark:text-gray-100">{s.name}</span>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{s.job_name}</p>
              </div>
            ),
          },
          {
            header: 'Cron',
            accessor: (s) => (
              <code className="text-xs bg-gray-50 dark:bg-gray-800 px-2.5 py-1 rounded-md text-gray-600 dark:text-gray-400 font-mono">
                {s.spec}
              </code>
            ),
          },
          {
            header: 'Status',
            accessor: (s) => <StatusBadge status={s.enabled ? 'enabled' : 'disabled'} />,
          },
          {
            header: 'Args',
            accessor: (s) =>
              s.args && Object.keys(s.args).length > 0 ? (
                <code className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[160px] block">
                  {JSON.stringify(s.args)}
                </code>
              ) : (
                <span className="text-gray-300 dark:text-gray-600 text-xs">none</span>
              ),
          },
          {
            header: 'Created',
            accessor: (s) => <span className="text-xs text-gray-500 dark:text-gray-400">{formatTime(s.created_at)}</span>,
          },
          {
            header: '',
            accessor: (s) => (
              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => toggleSchedule.mutate({ name: s.name, enabled: !s.enabled })}
                  className={`btn-ghost ${s.enabled ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950' : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-950'}`}
                >
                  {s.enabled ? 'Disable' : 'Enable'}
                </button>
                <button
                  onClick={() => setConfirmDelete(s.name)}
                  className="btn-ghost text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                >
                  Delete
                </button>
              </div>
            ),
          },
        ]}
        data={schedules}
        onRowClick={(s) => setSelectedSchedule(s)}
        emptyMessage="No periodic schedules configured"
      />

      {/* Schedule Detail Slide-over */}
      {selectedSchedule && (
        <div className="fixed inset-0 z-50 flex items-start justify-end" onClick={() => setSelectedSchedule(null)}>
          <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm" />
          <div className="relative h-full w-full max-w-lg bg-white dark:bg-gray-900 shadow-2xl dark:shadow-black/40 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider font-medium">Schedule Details</p>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-0.5">{selectedSchedule.name}</h3>
              </div>
              <button onClick={() => setSelectedSchedule(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">✕</button>
            </div>
            <div className="px-6 py-5">
              {[
                ['Name', <span className="font-medium">{selectedSchedule.name}</span>],
                ['Job Name', selectedSchedule.job_name],
                ['Cron Spec', <code className="text-xs font-mono bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded">{selectedSchedule.spec}</code>],
                ['Status', <StatusBadge status={selectedSchedule.enabled ? 'enabled' : 'disabled'} />],
                ['Created', formatTime(selectedSchedule.created_at)],
                ['Updated', formatTime(selectedSchedule.updated_at)],
              ].map(([label, value], i) => (
                <div key={i} className="flex items-start py-3 border-b border-gray-50 dark:border-gray-800/50">
                  <span className="w-28 flex-shrink-0 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider pt-0.5">{label}</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{value}</span>
                </div>
              ))}
              <div className="pt-4">
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Arguments</p>
                {selectedSchedule.args && Object.keys(selectedSchedule.args).length > 0 ? (
                  <div className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg p-4">
                    <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words font-mono">
                      {JSON.stringify(selectedSchedule.args, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-gray-500 italic">No arguments</p>
                )}
              </div>
            </div>
            <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 px-6 py-4 flex gap-2.5">
              <button
                onClick={() => { toggleSchedule.mutate({ name: selectedSchedule.name, enabled: !selectedSchedule.enabled }); setSelectedSchedule(null) }}
                className={selectedSchedule.enabled ? 'btn-secondary' : 'btn-primary'}
              >
                {selectedSchedule.enabled ? 'Disable' : 'Enable'}
              </button>
              <button
                onClick={() => { setConfirmDelete(selectedSchedule.name); setSelectedSchedule(null) }}
                className="btn-danger"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Schedule"
        message={`Permanently delete the schedule "${confirmDelete}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => { if (confirmDelete) deleteSchedule.mutate(confirmDelete); setConfirmDelete(null) }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  )
}
