import { useState } from 'react'
import { useRetryJobs, useDeleteRetryJob } from '../hooks/useApi'
import DataTable from './common/DataTable'
import Pagination from './common/Pagination'
import ConfirmDialog from './common/ConfirmDialog'
import JobDetailModal from './common/JobDetailModal'
import type { RetryJob } from '../api/types'

function timeAgo(epoch: number): string {
  if (!epoch) return '-'
  const seconds = Math.floor(Date.now() / 1000 - epoch)
  if (seconds < 0) {
    const abs = Math.abs(seconds)
    if (abs < 60) return `in ${abs}s`
    if (abs < 3600) return `in ${Math.floor(abs / 60)}m`
    return `in ${Math.floor(abs / 3600)}h`
  }
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  return `${Math.floor(seconds / 3600)}h ago`
}

export default function RetryJobs() {
  const [page, setPage] = useState(1)
  const { data, isLoading, error } = useRetryJobs(page)
  const deleteJob = useDeleteRetryJob()
  const [confirm, setConfirm] = useState<{ retryAt: number; jobId: string } | null>(null)
  const [selected, setSelected] = useState<RetryJob | null>(null)

  if (isLoading) return <div className="card p-12 text-center text-gray-400 dark:text-gray-500">Loading retry jobs...</div>
  if (error) return <div className="card p-12 text-center text-red-500">Error loading retry jobs</div>

  const jobs = data?.jobs || []
  const count = data?.count || 0

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400">
          {count}
        </span>
        <span className="text-sm text-gray-400 dark:text-gray-500">Click a row to view details</span>
      </div>

      <DataTable<RetryJob>
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
            header: 'Fails',
            accessor: (j) => (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400">
                {j.fails || 0}
              </span>
            ),
          },
          {
            header: 'Error',
            accessor: (j) => (
              <span className="text-xs text-red-500 dark:text-red-400 truncate max-w-[200px] block" title={j.err}>
                {j.err || '-'}
              </span>
            ),
          },
          {
            header: 'Retry At',
            accessor: (j) => <span className="text-xs text-gray-500 dark:text-gray-400">{timeAgo(j.retry_at)}</span>,
          },
          {
            header: '',
            accessor: (j) => (
              <button
                onClick={(e) => { e.stopPropagation(); setConfirm({ retryAt: j.retry_at, jobId: j.id }) }}
                className="btn-ghost text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
              >
                Delete
              </button>
            ),
          },
        ]}
        data={jobs}
        onRowClick={(j) => setSelected(j)}
        emptyMessage="No retry jobs"
      />

      <Pagination page={page} totalItems={count} onPageChange={setPage} />

      <JobDetailModal
        open={!!selected}
        job={selected}
        onClose={() => setSelected(null)}
        actions={selected && (
          <button
            onClick={() => { setConfirm({ retryAt: selected.retry_at, jobId: selected.id }); setSelected(null) }}
            className="btn-danger"
          >
            Delete Job
          </button>
        )}
      />

      <ConfirmDialog
        open={!!confirm}
        title="Delete Retry Job"
        message="Remove this job from the retry queue? It will not be retried."
        confirmLabel="Delete"
        onConfirm={() => { if (confirm) deleteJob.mutate({ retryAt: confirm.retryAt, jobId: confirm.jobId }); setConfirm(null) }}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}
