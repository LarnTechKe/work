import { useState } from 'react'
import { useHistoryJobs, useHistoryJobByID } from '../hooks/useApi'
import DataTable from './common/DataTable'
import Pagination from './common/Pagination'
import JobDetailModal from './common/JobDetailModal'
import type { HistoryJob } from '../api/types'

function timeAgo(epoch: number): string {
  if (!epoch) return '-'
  const seconds = Math.floor(Date.now() / 1000 - epoch)
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  success: { bg: 'bg-green-50 dark:bg-green-950', text: 'text-green-700 dark:text-green-400', dot: 'bg-green-500' },
  retry: { bg: 'bg-amber-50 dark:bg-amber-950', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500' },
  dead: { bg: 'bg-red-50 dark:bg-red-950', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500' },
}

export default function JobHistory() {
  const [page, setPage] = useState(1)
  const [idTerm, setIdTerm] = useState('')
  const [activeId, setActiveId] = useState('')
  const [selected, setSelected] = useState<HistoryJob | null>(null)

  const { data, isLoading, error } = useHistoryJobs(page)
  const { data: idResult, isLoading: idLoading, error: idError } = useHistoryJobByID(activeId || null)

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setActiveId(idTerm.trim())
    setPage(1)
  }

  function handleClear() {
    setIdTerm('')
    setActiveId('')
    setPage(1)
  }

  const isIdSearch = !!activeId
  const jobs = isIdSearch ? (idResult ? [idResult] : []) : (data?.jobs || [])
  const count = isIdSearch ? (idResult ? 1 : 0) : (data?.count || 0)
  const loading = isIdSearch ? idLoading : isLoading
  const loadError = isIdSearch ? idError : error

  if (loading) return <div className="card p-12 text-center text-gray-400 dark:text-gray-500">Loading history...</div>
  if (loadError) return <div className="card p-12 text-center text-red-500">Error loading history</div>

  return (
    <div>
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="mb-5 flex items-center gap-3">
        <input
          type="text"
          value={idTerm}
          onChange={(e) => setIdTerm(e.target.value)}
          placeholder="Search by job ID..."
          className="input flex-1"
        />
        <button type="submit" className="btn-primary">Search</button>
        {activeId && (
          <button type="button" onClick={handleClear} className="btn-ghost">Clear</button>
        )}
      </form>

      {/* Count Badge */}
      <div className="flex items-center gap-3 mb-5">
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-400">
          {count}
        </span>
        {activeId && (
          <span className="text-sm text-gray-400 dark:text-gray-500">
            Searched by ID: <span className="font-medium text-gray-600 dark:text-gray-300">{activeId}</span>
          </span>
        )}
        {!activeId && (
          <span className="text-sm text-gray-400 dark:text-gray-500">Click a row to view details</span>
        )}
      </div>

      {/* Table */}
      <DataTable<HistoryJob>
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
            header: 'Status',
            accessor: (j) => {
              const c = statusConfig[j.status] || statusConfig.dead
              return (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                  {j.status}
                </span>
              )
            },
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
            header: 'Completed',
            accessor: (j) => <span className="text-xs text-gray-500 dark:text-gray-400">{timeAgo(j.completed_at)}</span>,
          },
        ]}
        data={jobs}
        onRowClick={(j) => setSelected(j)}
        emptyMessage={activeId ? 'No matching job found' : 'No job history yet'}
      />

      {!isIdSearch && <Pagination page={page} totalItems={count} onPageChange={setPage} />}

      <JobDetailModal
        open={!!selected}
        job={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}
