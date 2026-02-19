import { useRedisInfo } from '../hooks/useApi'

function MetricCard({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <div className="card p-5">
      <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
      {detail && <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{detail}</p>}
    </div>
  )
}

export default function RedisInfo() {
  const { data, isLoading, error } = useRedisInfo()

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="card p-5 animate-pulse">
            <div className="h-3 w-16 bg-gray-100 dark:bg-gray-800 rounded mb-3" />
            <div className="h-8 w-20 bg-gray-100 dark:bg-gray-800 rounded" />
          </div>
        ))}
      </div>
    )
  }

  if (error) return <div className="card p-8 text-center text-red-500">Failed to load Redis info</div>
  if (!data) return null

  const hitRate = data.keyspace_hits + data.keyspace_misses > 0
    ? ((data.keyspace_hits / (data.keyspace_hits + data.keyspace_misses)) * 100).toFixed(1) + '%'
    : 'N/A'

  const uptimeDays = Math.floor(data.uptime_seconds / 86400)
  const uptimeHours = Math.floor((data.uptime_seconds % 86400) / 3600)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      <MetricCard label="Redis Version" value={data.version} />
      <MetricCard label="Uptime" value={`${uptimeDays}d ${uptimeHours}h`} detail={`${data.uptime_seconds.toLocaleString()} seconds`} />
      <MetricCard label="Connected Clients" value={data.connected_clients} />
      <MetricCard label="Memory Used" value={data.used_memory_human} detail={`Peak: ${data.used_memory_peak_human}`} />
      <MetricCard label="Total Commands" value={data.total_commands_processed.toLocaleString()} />
      <MetricCard label="Ops/sec" value={data.instantaneous_ops_per_sec.toLocaleString()} />
      <MetricCard label="Cache Hit Rate" value={hitRate} detail={`${data.keyspace_hits.toLocaleString()} hits / ${data.keyspace_misses.toLocaleString()} misses`} />
      <MetricCard label="Total Keys" value={data.db_keys.toLocaleString()} />
    </div>
  )
}
