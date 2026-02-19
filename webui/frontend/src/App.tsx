import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './components/Dashboard'
import Queues from './components/Queues'
import Processes from './components/Processes'
import RetryJobs from './components/RetryJobs'
import ScheduledJobs from './components/ScheduledJobs'
import DeadJobs from './components/DeadJobs'
import Schedules from './components/Schedules'
import EnqueueJob from './components/EnqueueJob'
import JobHistory from './components/JobHistory'
import RedisInfo from './components/RedisInfo'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/queues" element={<Queues />} />
          <Route path="/processes" element={<Processes />} />
          <Route path="/retry" element={<RetryJobs />} />
          <Route path="/scheduled" element={<ScheduledJobs />} />
          <Route path="/dead" element={<DeadJobs />} />
          <Route path="/schedules" element={<Schedules />} />
          <Route path="/history" element={<JobHistory />} />
          <Route path="/redis" element={<RedisInfo />} />
          <Route path="/enqueue" element={<EnqueueJob />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
