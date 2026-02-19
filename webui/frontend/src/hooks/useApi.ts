import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'

export function useDashboard() {
  return useQuery({ queryKey: ['dashboard'], queryFn: api.getDashboard })
}

export function useQueues() {
  return useQuery({ queryKey: ['queues'], queryFn: api.getQueues })
}

export function useWorkerPools() {
  return useQuery({ queryKey: ['workerPools'], queryFn: api.getWorkerPools })
}

export function useBusyWorkers() {
  return useQuery({ queryKey: ['busyWorkers'], queryFn: api.getBusyWorkers })
}

export function useRetryJobs(page: number) {
  return useQuery({ queryKey: ['retryJobs', page], queryFn: () => api.getRetryJobs(page) })
}

export function useScheduledJobs(page: number) {
  return useQuery({ queryKey: ['scheduledJobs', page], queryFn: () => api.getScheduledJobs(page) })
}

export function useDeadJobs(page: number) {
  return useQuery({ queryKey: ['deadJobs', page], queryFn: () => api.getDeadJobs(page) })
}

export function usePeriodicSchedules() {
  return useQuery({ queryKey: ['periodicSchedules'], queryFn: api.getPeriodicSchedules })
}

export function useDeleteDeadJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ diedAt, jobId }: { diedAt: number; jobId: string }) =>
      api.deleteDeadJob(diedAt, jobId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['deadJobs'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }) },
  })
}

export function useRetryDeadJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ diedAt, jobId }: { diedAt: number; jobId: string }) =>
      api.retryDeadJob(diedAt, jobId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['deadJobs'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }) },
  })
}

export function useDeleteAllDeadJobs() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.deleteAllDeadJobs,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['deadJobs'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }) },
  })
}

export function useRetryAllDeadJobs() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.retryAllDeadJobs,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['deadJobs'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }) },
  })
}

export function useDeleteScheduledJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ runAt, jobId }: { runAt: number; jobId: string }) =>
      api.deleteScheduledJob(runAt, jobId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['scheduledJobs'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }) },
  })
}

export function useDeleteRetryJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ retryAt, jobId }: { retryAt: number; jobId: string }) =>
      api.deleteRetryJob(retryAt, jobId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['retryJobs'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }) },
  })
}

export function useAddPeriodicSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.addPeriodicSchedule,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['periodicSchedules'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }) },
  })
}

export function useDeletePeriodicSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.deletePeriodicSchedule,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['periodicSchedules'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }) },
  })
}

export function useTogglePeriodicSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ name, enabled }: { name: string; enabled: boolean }) =>
      enabled ? api.enablePeriodicSchedule(name) : api.disablePeriodicSchedule(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['periodicSchedules'] }),
  })
}

export function useHistoryJobs(page: number, jobName?: string) {
  return useQuery({
    queryKey: ['historyJobs', page, jobName],
    queryFn: () => api.getHistoryJobs(page, jobName),
  })
}

export function useHistoryJobByID(jobId: string | null) {
  return useQuery({
    queryKey: ['historyJob', jobId],
    queryFn: () => api.getHistoryJobByID(jobId!),
    enabled: !!jobId,
  })
}

export function useRedisInfo() {
  return useQuery({ queryKey: ['redisInfo'], queryFn: api.getRedisInfo })
}

export function useEnqueueJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.enqueueJob,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['queues'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }) },
  })
}
