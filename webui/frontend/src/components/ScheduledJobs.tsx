import { useState } from 'react'
import { useScheduledJobs, useDeleteScheduledJob } from '../hooks/useApi'
import DataTable from './common/DataTable'
import Pagination from './common/Pagination'
import ConfirmDialog from './common/ConfirmDialog'
import JobDetailModal from './common/JobDetailModal'
import type { ScheduledJob } from '../api/types'

function timeAgo(epoch: number): string {
  if (!epoch) return '-'
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
  return `${Math.floor(seconds / 3600)}h ago`
}

export default function ScheduledJobs() {
  const [page, setPage] = useState(1)
  const { data, isLoading, error } = useScheduledJobs(page)
  const deleteJob = useDeleteScheduledJob()
  const [confirm, setConfirm] = useState<{ runAt: number; jobId: string } | null>(null)
  const [selected, setSelected] = useState<ScheduledJob | null>(null)

  if (isLoading) return <div className="card p-12 text-center text-gray-400 dark:text-gray-500">Loading scheduled jobs...</div>
  if (error) return <div className="card p-12 text-center text-red-500">Error loading scheduled jobs</div>

  const jobs = data?.jobs || []
  const count = data?.count || 0

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400">
          {count}
        </span>
        <span className="text-sm text-gray-400 dark:text-gray-500">Click a row to view details</span>
      </div>

      <DataTable<ScheduledJob>
        columns={[
          {
            header: 'Job',
            accessor: (j) => (
              <div>
                <span className="font-medium text-gray-900 dark:text-gray-100">{j.name}</span>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 font-mono mt-0.5">{j.id}</p>
              </div>
            ),
          },
          {
            header: 'Run At',
            accessor: (j) => (
              <div>
                <span className="text-sm text-gray-700 dark:text-gray-300">{new Date(j.run_at * 1000).toLocaleString()}</span>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{timeAgo(j.run_at)}</p>
              </div>
            ),
          },
          {
            header: 'Args',
            accessor: (j) =>
              j.args && Object.keys(j.args).length > 0 ? (
                <code className="text-[11px] bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded text-gray-600 dark:text-gray-400 truncate max-w-[180px] block">
                  {JSON.stringify(j.args)}
                </code>
              ) : (
                <span className="text-gray-300 dark:text-gray-600 text-xs">none</span>
              ),
          },
          {
            header: '',
            accessor: (j) => (
              <button
                onClick={(e) => { e.stopPropagation(); setConfirm({ runAt: j.run_at, jobId: j.id }) }}
                className="btn-ghost text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
              >
                Delete
              </button>
            ),
          },
        ]}
        data={jobs}
        onRowClick={(j) => setSelected(j)}
        emptyMessage="No scheduled jobs"
      />

      <Pagination page={page} totalItems={count} onPageChange={setPage} />

      <JobDetailModal
        open={!!selected}
        job={selected}
        onClose={() => setSelected(null)}
        actions={selected && (
          <button
            onClick={() => { setConfirm({ runAt: selected.run_at, jobId: selected.id }); setSelected(null) }}
            className="btn-danger"
          >
            Delete Job
          </button>
        )}
      />

      <ConfirmDialog
        open={!!confirm}
        title="Delete Scheduled Job"
        message="Remove this job from the schedule? It will not be executed."
        confirmLabel="Delete"
        onConfirm={() => { if (confirm) deleteJob.mutate({ runAt: confirm.runAt, jobId: confirm.jobId }); setConfirm(null) }}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}
