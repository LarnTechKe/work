import { useState } from 'react'
import {
  useDeadJobs,
  useDeleteDeadJob,
  useRetryDeadJob,
  useDeleteAllDeadJobs,
  useRetryAllDeadJobs,
} from '../hooks/useApi'
import DataTable from './common/DataTable'
import Pagination from './common/Pagination'
import ConfirmDialog from './common/ConfirmDialog'
import JobDetailModal from './common/JobDetailModal'
import type { DeadJob } from '../api/types'

function timeAgo(epoch: number): string {
  if (!epoch) return '-'
  const seconds = Math.floor(Date.now() / 1000 - epoch)
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

type ConfirmAction =
  | { type: 'delete'; diedAt: number; jobId: string }
  | { type: 'retry'; diedAt: number; jobId: string }
  | { type: 'deleteAll' }
  | { type: 'retryAll' }

const confirmConfig: Record<string, { title: string; message: string; label: string; variant: 'danger' | 'primary' }> = {
  delete: { title: 'Delete Dead Job', message: 'Permanently remove this dead job?', label: 'Delete', variant: 'danger' },
  retry: { title: 'Retry Dead Job', message: 'Re-enqueue this job for processing?', label: 'Retry', variant: 'primary' },
  deleteAll: { title: 'Delete All Dead Jobs', message: 'Permanently remove ALL dead jobs? This cannot be undone.', label: 'Delete All', variant: 'danger' },
  retryAll: { title: 'Retry All Dead Jobs', message: 'Re-enqueue ALL dead jobs for processing?', label: 'Retry All', variant: 'primary' },
}

export default function DeadJobs() {
  const [page, setPage] = useState(1)
  const { data, isLoading, error } = useDeadJobs(page)
  const deleteJob = useDeleteDeadJob()
  const retryJob = useRetryDeadJob()
  const deleteAll = useDeleteAllDeadJobs()
  const retryAll = useRetryAllDeadJobs()
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null)
  const [selected, setSelected] = useState<DeadJob | null>(null)

  if (isLoading) return <div className="card p-12 text-center text-gray-400 dark:text-gray-500">Loading dead jobs...</div>
  if (error) return <div className="card p-12 text-center text-red-500">Error loading dead jobs</div>

  const jobs = data?.jobs || []
  const count = data?.count || 0
  const info = confirm ? confirmConfig[confirm.type] : null

  function handleConfirm() {
    if (!confirm) return
    switch (confirm.type) {
      case 'delete': deleteJob.mutate({ diedAt: confirm.diedAt, jobId: confirm.jobId }); break
      case 'retry': retryJob.mutate({ diedAt: confirm.diedAt, jobId: confirm.jobId }); break
      case 'deleteAll': deleteAll.mutate(); break
      case 'retryAll': retryAll.mutate(); break
    }
    setConfirm(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400">
            {count}
          </span>
          <span className="text-sm text-gray-400 dark:text-gray-500">Click a row to view details</span>
        </div>
        {count > 0 && (
          <div className="flex gap-2">
            <button onClick={() => setConfirm({ type: 'retryAll' })} className="btn-primary">
              Retry All
            </button>
            <button onClick={() => setConfirm({ type: 'deleteAll' })} className="btn-danger">
              Delete All
            </button>
          </div>
        )}
      </div>

      <DataTable<DeadJob>
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
            header: 'Died',
            accessor: (j) => <span className="text-xs text-gray-500 dark:text-gray-400">{timeAgo(j.died_at)}</span>,
          },
          {
            header: '',
            accessor: (j) => (
              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setConfirm({ type: 'retry', diedAt: j.died_at, jobId: j.id })}
                  className="btn-ghost text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950"
                >
                  Retry
                </button>
                <button
                  onClick={() => setConfirm({ type: 'delete', diedAt: j.died_at, jobId: j.id })}
                  className="btn-ghost text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                >
                  Delete
                </button>
              </div>
            ),
          },
        ]}
        data={jobs}
        onRowClick={(j) => setSelected(j)}
        emptyMessage="No dead jobs — everything is running smoothly"
      />

      <Pagination page={page} totalItems={count} onPageChange={setPage} />

      <JobDetailModal
        open={!!selected}
        job={selected}
        onClose={() => setSelected(null)}
        actions={selected && (
          <>
            <button
              onClick={() => { setConfirm({ type: 'retry', diedAt: selected.died_at, jobId: selected.id }); setSelected(null) }}
              className="btn-primary"
            >
              Retry Job
            </button>
            <button
              onClick={() => { setConfirm({ type: 'delete', diedAt: selected.died_at, jobId: selected.id }); setSelected(null) }}
              className="btn-danger"
            >
              Delete Job
            </button>
          </>
        )}
      />

      <ConfirmDialog
        open={!!confirm}
        title={info?.title || ''}
        message={info?.message || ''}
        confirmLabel={info?.label}
        variant={info?.variant}
        onConfirm={handleConfirm}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}
