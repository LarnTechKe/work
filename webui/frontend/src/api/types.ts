export interface Job {
  name: string
  id: string
  t: number
  args: Record<string, unknown> | null
  unique?: boolean
  unique_key?: string
  fails?: number
  err?: string
  failed_at?: number
  max_retries?: number | null
  backoff_base?: number | null
  backoff_type?: number | null
}

export interface Queue {
  job_name: string
  count: number
  latency: number
}

export interface WorkerPoolHeartbeat {
  worker_pool_id: string
  started_at: number
  heartbeat_at: number
  job_names: string[]
  concurrency: number
  host: string
  pid: number
  worker_ids: string[]
}

export interface WorkerObservation {
  worker_id: string
  is_busy: boolean
  job_name: string
  job_id: string
  started_at: number
  args_json: string
  checkin: string
  checkin_at: number
}

export interface RetryJob {
  retry_at: number
  name: string
  id: string
  t: number
  args: Record<string, unknown> | null
  fails?: number
  err?: string
  failed_at?: number
}

export interface ScheduledJob {
  run_at: number
  name: string
  id: string
  t: number
  args: Record<string, unknown> | null
}

export interface DeadJob {
  died_at: number
  name: string
  id: string
  t: number
  args: Record<string, unknown> | null
  fails?: number
  err?: string
  failed_at?: number
}

export interface PeriodicSchedule {
  name: string
  job_name: string
  spec: string
  args?: Record<string, unknown> | null
  enabled: boolean
  created_at: number
  updated_at: number
}

export interface HistoryJob {
  completed_at: number
  status: 'success' | 'retry' | 'dead'
  name: string
  id: string
  t: number
  args: Record<string, unknown> | null
  fails?: number
  err?: string
  failed_at?: number
}

export interface Dashboard {
  queues: { total: number; jobs: number }
  retry: { count: number }
  scheduled: { count: number }
  dead: { count: number }
  history: { count: number }
  workers: { active: number; total: number; pools: number }
  schedules: { count: number }
}

export interface PaginatedResponse<T> {
  count: number
  jobs: T[]
}

export interface RedisInfo {
  version: string
  uptime_seconds: number
  connected_clients: number
  used_memory: number
  used_memory_human: string
  used_memory_peak_human: string
  total_commands_processed: number
  instantaneous_ops_per_sec: number
  keyspace_hits: number
  keyspace_misses: number
  db_keys: number
}

export interface EnqueueRequest {
  job_name: string
  args: Record<string, unknown>
  delay: number
  retry?: {
    max_retries: number
    strategy: 'exponential' | 'linear' | 'fixed'
    base_delay: number
  }
}
