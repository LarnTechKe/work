import { useQueues } from '../hooks/useApi'
import DataTable from './common/DataTable'
import type { Queue } from '../api/types'

function formatLatency(seconds: number): string {
  if (seconds <= 0) return '-'
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
}

function latencyColor(seconds: number): string {
  if (seconds <= 0) return 'text-gray-300 dark:text-gray-600'
  if (seconds < 10) return 'text-green-600 dark:text-green-400'
  if (seconds < 60) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

export default function Queues() {
  const { data, isLoading, error } = useQueues()

  if (isLoading) return <div className="card p-12 text-center text-gray-400 dark:text-gray-500">Loading queues...</div>
  if (error) return <div className="card p-12 text-center text-red-500">Error loading queues</div>

  return (
    <DataTable<Queue>
      columns={[
        {
          header: 'Job Name',
          accessor: (q) => (
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="font-medium text-gray-900 dark:text-gray-100">{q.job_name}</span>
            </div>
          ),
        },
        {
          header: 'Queued',
          accessor: (q) => (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
              {q.count.toLocaleString()}
            </span>
          ),
        },
        {
          header: 'Latency',
          accessor: (q) => (
            <span className={`font-mono text-xs font-medium ${latencyColor(q.latency)}`}>
              {formatLatency(q.latency)}
            </span>
          ),
        },
      ]}
      data={data || []}
      emptyMessage="No queues found"
    />
  )
}
