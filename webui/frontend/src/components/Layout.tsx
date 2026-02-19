import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useDarkMode } from '../hooks/useDarkMode'

const navItems = [
  { to: '/', label: 'Dashboard', icon: '◫' },
  { to: '/queues', label: 'Queues', icon: '☰' },
  { to: '/processes', label: 'Processes', icon: '⚙' },
  { to: '/retry', label: 'Retry Jobs', icon: '↻' },
  { to: '/scheduled', label: 'Scheduled', icon: '◷' },
  { to: '/dead', label: 'Dead Jobs', icon: '✕' },
  { to: '/history', label: 'History', icon: '⏱' },
  { to: '/schedules', label: 'Schedules', icon: '⟳' },
  { to: '/redis', label: 'Redis Info', icon: '⊞' },
  { to: '/enqueue', label: 'Enqueue', icon: '＋' },
]

const pageDescriptions: Record<string, string> = {
  '/': 'System overview and metrics',
  '/queues': 'Active job queues and their depths',
  '/processes': 'Worker pools and busy workers',
  '/retry': 'Jobs waiting to be retried',
  '/scheduled': 'Jobs scheduled for future execution',
  '/dead': 'Failed jobs that exceeded retries',
  '/history': 'Completed job history with search (15-day retention)',
  '/schedules': 'Recurring job schedules',
  '/redis': 'Redis server metrics and statistics',
  '/enqueue': 'Manually enqueue a new job',
}

export default function Layout() {
  const location = useLocation()
  const currentNav = navItems.find((n) => n.to === location.pathname)
  const description = pageDescriptions[location.pathname] || ''
  const [dark, toggleDark] = useDarkMode()

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      <aside className="w-60 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col flex-shrink-0">
        <div className="px-5 py-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <span className="text-white text-sm font-bold">E</span>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Enviar</h1>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">Job Queue Manager</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
                }`
              }
            >
              <span className="text-base w-5 text-center opacity-70">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 space-y-3">
          <button
            onClick={toggleDark}
            className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-[12px] font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <span className="text-base">{dark ? '☀' : '☾'}</span>
            {dark ? 'Light mode' : 'Dark mode'}
          </button>
          <div className="flex items-center gap-2 px-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[11px] text-gray-400 dark:text-gray-500">Auto-refresh every 5s</span>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-8 py-5">
          <h2 className="page-title">{currentNav?.label || 'Dashboard'}</h2>
          {description && <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">{description}</p>}
        </div>
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
