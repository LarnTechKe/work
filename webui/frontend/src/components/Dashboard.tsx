import { Link } from 'react-router-dom'
import { useDashboard } from '../hooks/useApi'

interface CardProps {
  title: string
  value: number | string
  subtitle?: string
  to: string
  accent: string
  iconBg: string
  icon: string
}

function Card({ title, value, subtitle, to, accent, iconBg, icon }: CardProps) {
  return (
    <Link to={to} className="block group">
      <div className="card-hover p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{title}</p>
            <p className={`mt-2 text-3xl font-bold tracking-tight ${accent}`}>{value}</p>
            {subtitle && <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">{subtitle}</p>}
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${iconBg} transition-transform group-hover:scale-110`}>
            {icon}
          </div>
        </div>
      </div>
    </Link>
  )
}

export default function Dashboard() {
  const { data, isLoading, error } = useDashboard()

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="card p-5 animate-pulse">
            <div className="h-3 w-16 bg-gray-100 dark:bg-gray-800 rounded mb-3" />
            <div className="h-8 w-20 bg-gray-100 dark:bg-gray-800 rounded mb-2" />
            <div className="h-3 w-32 bg-gray-50 dark:bg-gray-800 rounded" />
          </div>
        ))}
      </div>
    )
  }

  if (error) return <div className="card p-8 text-center text-red-500">Failed to load dashboard data</div>
  if (!data) return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      <Card
        title="Queues"
        value={data.queues.total}
        subtitle={`${data.queues.jobs.toLocaleString()} job${data.queues.jobs !== 1 ? 's' : ''} queued`}
        to="/queues"
        accent="text-blue-600 dark:text-blue-400"
        iconBg="bg-blue-50 dark:bg-blue-950 text-blue-500 dark:text-blue-400"
        icon="☰"
      />
      <Card
        title="Worker Pools"
        value={data.workers.pools}
        subtitle={`${data.workers.active} active / ${data.workers.total} total workers`}
        to="/processes"
        accent="text-green-600 dark:text-green-400"
        iconBg="bg-green-50 dark:bg-green-950 text-green-500 dark:text-green-400"
        icon="⚙"
      />
      <Card
        title="Retry Jobs"
        value={data.retry.count.toLocaleString()}
        subtitle="Waiting to be retried"
        to="/retry"
        accent="text-amber-600 dark:text-amber-400"
        iconBg="bg-amber-50 dark:bg-amber-950 text-amber-500 dark:text-amber-400"
        icon="↻"
      />
      <Card
        title="Scheduled"
        value={data.scheduled.count.toLocaleString()}
        subtitle="Pending future execution"
        to="/scheduled"
        accent="text-indigo-600 dark:text-indigo-400"
        iconBg="bg-indigo-50 dark:bg-indigo-950 text-indigo-500 dark:text-indigo-400"
        icon="◷"
      />
      <Card
        title="Dead Jobs"
        value={data.dead.count.toLocaleString()}
        subtitle="Failed permanently"
        to="/dead"
        accent="text-red-600 dark:text-red-400"
        iconBg="bg-red-50 dark:bg-red-950 text-red-500 dark:text-red-400"
        icon="✕"
      />
      <Card
        title="History"
        value={data.history.count.toLocaleString()}
        subtitle="Completed jobs (15-day retention)"
        to="/history"
        accent="text-teal-600 dark:text-teal-400"
        iconBg="bg-teal-50 dark:bg-teal-950 text-teal-500 dark:text-teal-400"
        icon="⏱"
      />
      <Card
        title="Schedules"
        value={data.schedules.count.toLocaleString()}
        subtitle="Recurring job schedules"
        to="/schedules"
        accent="text-purple-600 dark:text-purple-400"
        iconBg="bg-purple-50 dark:bg-purple-950 text-purple-500 dark:text-purple-400"
        icon="⟳"
      />
    </div>
  )
}
