import type {
  Dashboard,
  Queue,
  WorkerPoolHeartbeat,
  WorkerObservation,
  RetryJob,
  ScheduledJob,
  DeadJob,
  HistoryJob,
  PeriodicSchedule,
  PaginatedResponse,
  EnqueueRequest,
  RedisInfo,
  Job,
} from './types'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Request failed: ${res.status}`)
  }
  return res.json()
}

export const api = {
  getDashboard: () => request<Dashboard>('/api/dashboard'),

  getQueues: () => request<Queue[]>('/api/queues'),

  getWorkerPools: () => request<WorkerPoolHeartbeat[]>('/api/worker_pools'),

  getBusyWorkers: () => request<WorkerObservation[]>('/api/busy_workers'),

  getRetryJobs: (page: number) =>
    request<PaginatedResponse<RetryJob>>(`/api/retry_jobs?page=${page}`),

  getScheduledJobs: (page: number) =>
    request<PaginatedResponse<ScheduledJob>>(`/api/scheduled_jobs?page=${page}`),

  getDeadJobs: (page: number) =>
    request<PaginatedResponse<DeadJob>>(`/api/dead_jobs?page=${page}`),

  deleteDeadJob: (diedAt: number, jobId: string) =>
    request(`/api/delete_dead_job/${diedAt}/${jobId}`, { method: 'POST' }),

  retryDeadJob: (diedAt: number, jobId: string) =>
    request(`/api/retry_dead_job/${diedAt}/${jobId}`, { method: 'POST' }),

  deleteAllDeadJobs: () =>
    request('/api/delete_all_dead_jobs', { method: 'POST' }),

  retryAllDeadJobs: () =>
    request('/api/retry_all_dead_jobs', { method: 'POST' }),

  deleteScheduledJob: (runAt: number, jobId: string) =>
    request(`/api/delete_scheduled_job/${runAt}/${jobId}`, { method: 'POST' }),

  deleteRetryJob: (retryAt: number, jobId: string) =>
    request(`/api/delete_retry_job/${retryAt}/${jobId}`, { method: 'POST' }),

  getPeriodicSchedules: () =>
    request<PeriodicSchedule[]>('/api/periodic_schedules'),

  addPeriodicSchedule: (schedule: Partial<PeriodicSchedule>) =>
    request('/api/periodic_schedules', {
      method: 'POST',
      body: JSON.stringify(schedule),
    }),

  deletePeriodicSchedule: (name: string) =>
    request(`/api/periodic_schedules/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    }),

  enablePeriodicSchedule: (name: string) =>
    request(`/api/periodic_schedules/${encodeURIComponent(name)}/enable`, {
      method: 'POST',
    }),

  disablePeriodicSchedule: (name: string) =>
    request(`/api/periodic_schedules/${encodeURIComponent(name)}/disable`, {
      method: 'POST',
    }),

  getHistoryJobs: (page: number, jobName?: string) => {
    const params = new URLSearchParams({ page: String(page) })
    if (jobName) params.set('job_name', jobName)
    return request<PaginatedResponse<HistoryJob>>(`/api/history_jobs?${params}`)
  },

  getHistoryJobByID: (jobId: string) =>
    request<HistoryJob>(`/api/history_jobs/${encodeURIComponent(jobId)}`),

  getRedisInfo: () => request<RedisInfo>('/api/redis_info'),

  enqueueJob: (req: EnqueueRequest) =>
    request<Job>('/api/enqueue', {
      method: 'POST',
      body: JSON.stringify(req),
    }),
}
