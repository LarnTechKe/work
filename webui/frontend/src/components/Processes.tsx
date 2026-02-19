import { useState } from 'react'
import { useWorkerPools, useBusyWorkers } from '../hooks/useApi'
import DataTable from './common/DataTable'
import StatusBadge from './common/StatusBadge'
import type { WorkerPoolHeartbeat, WorkerObservation } from '../api/types'

function formatTime(epoch: number): string {
  if (!epoch) return '-'
  return new Date(epoch * 1000).toLocaleString()
}

function timeAgo(epoch: number): string {
  if (!epoch) return ''
  const seconds = Math.floor(Date.now() / 1000 - epoch)
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  return `${Math.floor(seconds / 3600)}h ago`
}

export default function Processes() {
  const pools = useWorkerPools()
  const busy = useBusyWorkers()
  const [selectedPool, setSelectedPool] = useState<WorkerPoolHeartbeat | null>(null)
  const [selectedWorker, setSelectedWorker] = useState<WorkerObservation | null>(null)

  return (
    <div className="space-y-10">
      {/* Worker Pools */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Worker Pools</h3>
          <span className="text-xs text-gray-400 dark:text-gray-500">{pools.data?.length || 0} pool{(pools.data?.length || 0) !== 1 ? 's' : ''}</span>
        </div>
        {pools.isLoading ? (
          <div className="card p-12 text-center text-gray-400 dark:text-gray-500">Loading worker pools...</div>
        ) : pools.error ? (
          <div className="card p-12 text-center text-red-500">Error loading worker pools</div>
        ) : (
          <DataTable<WorkerPoolHeartbeat>
            columns={[
              {
                header: 'Pool ID',
                accessor: (p) => <code className="text-xs font-mono text-gray-600 dark:text-gray-400">{p.worker_pool_id}</code>,
              },
              { header: 'Host', accessor: (p) => <span className="font-medium text-gray-900 dark:text-gray-100">{p.host}</span> },
              { header: 'PID', accessor: (p) => <span className="font-mono text-xs">{p.pid}</span> },
              {
                header: 'Workers',
                accessor: (p) => (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400">
                    {p.worker_ids?.length || 0} / {p.concurrency}
                  </span>
                ),
              },
              {
                header: 'Job Types',
                accessor: (p) => (
                  <div className="flex flex-wrap gap-1">
                    {p.job_names?.map((name) => (
                      <span key={name} className="inline-block bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-[11px] px-2 py-0.5 rounded-md font-medium">
                        {name}
                      </span>
                    ))}
                  </div>
                ),
              },
              {
                header: 'Heartbeat',
                accessor: (p) => (
                  <span className="text-xs text-gray-500 dark:text-gray-400" title={formatTime(p.heartbeat_at)}>
                    {timeAgo(p.heartbeat_at)}
                  </span>
                ),
              },
            ]}
            data={pools.data || []}
            onRowClick={(p) => setSelectedPool(p)}
            emptyMessage="No worker pools found"
          />
        )}
      </div>

      {/* Busy Workers */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Busy Workers</h3>
          <span className="text-xs text-gray-400 dark:text-gray-500">{busy.data?.length || 0} active</span>
        </div>
        {busy.isLoading ? (
          <div className="card p-12 text-center text-gray-400 dark:text-gray-500">Loading busy workers...</div>
        ) : busy.error ? (
          <div className="card p-12 text-center text-red-500">Error loading busy workers</div>
        ) : (
          <DataTable<WorkerObservation>
            columns={[
              {
                header: 'Worker',
                accessor: (w) => <code className="text-xs font-mono text-gray-600 dark:text-gray-400">{w.worker_id}</code>,
              },
              {
                header: 'Status',
                accessor: (w) => <StatusBadge status={w.is_busy ? 'active' : 'idle'} label={w.is_busy ? 'busy' : 'idle'} />,
              },
              { header: 'Job', accessor: (w) => <span className="font-medium text-gray-900 dark:text-gray-100">{w.job_name || '-'}</span> },
              {
                header: 'Job ID',
                accessor: (w) => <code className="text-xs font-mono text-gray-500 dark:text-gray-400">{w.job_id || '-'}</code>,
              },
              {
                header: 'Running For',
                accessor: (w) => (
                  <span className="text-xs text-gray-500 dark:text-gray-400">{w.started_at ? timeAgo(w.started_at) : '-'}</span>
                ),
              },
              {
                header: 'Checkin',
                accessor: (w) =>
                  w.checkin ? (
                    <span className="text-xs" title={formatTime(w.checkin_at)}>
                      {w.checkin}
                    </span>
                  ) : (
                    <span className="text-gray-300 dark:text-gray-600">-</span>
                  ),
              },
            ]}
            data={busy.data || []}
            onRowClick={(w) => setSelectedWorker(w)}
            emptyMessage="No busy workers right now"
          />
        )}
      </div>

      {/* Pool Detail Slide-over */}
      {selectedPool && (
        <div className="fixed inset-0 z-50 flex items-start justify-end" onClick={() => setSelectedPool(null)}>
          <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm" />
          <div className="relative h-full w-full max-w-lg bg-white dark:bg-gray-900 shadow-2xl dark:shadow-black/40 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider font-medium">Worker Pool</p>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-0.5">{selectedPool.host}:{selectedPool.pid}</h3>
              </div>
              <button onClick={() => setSelectedPool(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">✕</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {[
                ['Pool ID', <code className="text-xs font-mono">{selectedPool.worker_pool_id}</code>],
                ['Host', selectedPool.host],
                ['PID', selectedPool.pid],
                ['Concurrency', selectedPool.concurrency],
                ['Workers', `${selectedPool.worker_ids?.length || 0} active`],
                ['Started', formatTime(selectedPool.started_at)],
                ['Last Heartbeat', formatTime(selectedPool.heartbeat_at)],
              ].map(([label, value], i) => (
                <div key={i} className="flex items-start py-2 border-b border-gray-50 dark:border-gray-800/50">
                  <span className="w-36 flex-shrink-0 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{label}</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{value}</span>
                </div>
              ))}
              <div className="pt-2">
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Job Types</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedPool.job_names?.map((name) => (
                    <span key={name} className="inline-block bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-xs px-3 py-1 rounded-lg font-medium">{name}</span>
                  ))}
                </div>
              </div>
              <div className="pt-2">
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Worker IDs</p>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 space-y-1">
                  {selectedPool.worker_ids?.map((id) => (
                    <div key={id} className="font-mono text-xs text-gray-600 dark:text-gray-400">{id}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Worker Detail Slide-over */}
      {selectedWorker && (
        <div className="fixed inset-0 z-50 flex items-start justify-end" onClick={() => setSelectedWorker(null)}>
          <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm" />
          <div className="relative h-full w-full max-w-lg bg-white dark:bg-gray-900 shadow-2xl dark:shadow-black/40 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider font-medium">Worker Details</p>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-0.5">{selectedWorker.job_name || 'Idle Worker'}</h3>
              </div>
              <button onClick={() => setSelectedWorker(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">✕</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {[
                ['Worker ID', <code className="text-xs font-mono">{selectedWorker.worker_id}</code>],
                ['Status', <StatusBadge status={selectedWorker.is_busy ? 'active' : 'idle'} />],
                ['Job Name', selectedWorker.job_name || '-'],
                ['Job ID', selectedWorker.job_id ? <code className="text-xs font-mono">{selectedWorker.job_id}</code> : '-'],
                ['Started At', formatTime(selectedWorker.started_at)],
                ['Checkin', selectedWorker.checkin || '-'],
                ['Checkin At', selectedWorker.checkin_at ? formatTime(selectedWorker.checkin_at) : '-'],
              ].map(([label, value], i) => (
                <div key={i} className="flex items-start py-2 border-b border-gray-50 dark:border-gray-800/50">
                  <span className="w-36 flex-shrink-0 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{label}</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{value}</span>
                </div>
              ))}
              {selectedWorker.args_json && (
                <div className="pt-2">
                  <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Arguments</p>
                  <div className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg p-4">
                    <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words font-mono">
                      {(() => {
                        try { return JSON.stringify(JSON.parse(selectedWorker.args_json), null, 2) } catch { return selectedWorker.args_json }
                      })()}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
