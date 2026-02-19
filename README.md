# work

A fork of [gocraft/work](https://github.com/gocraft/work) — a background job processing library for Go, backed by Redis.

## What's New

This fork adds several production-grade features on top of the original gocraft/work:

- **Enhanced Retry & Backoff** — per-job retry configuration with exponential, linear, and fixed backoff strategies
- **Runtime Scheduled Tasks** — manage cron-based recurring jobs at runtime via API and Web UI (powered by `robfig/cron/v3`)
- **Modern Web UI** — rebuilt with React 19, TypeScript, Vite, and Tailwind CSS
- **Job History & Search** — track completed/failed jobs with paginated history and job ID lookup
- **Docker & CI/CD** — Dockerfile, Docker Compose, and GitHub Actions pipeline for automated builds
- **Redis URL Support** — connect using `redis://:password@host:port` URLs alongside plain `host:port`

## Features

- Fast and efficient, durable job processing backed by Redis
- Middleware on jobs for metrics, logging, etc.
- Configurable retries with backoff strategies (exponential, linear, fixed)
- Schedule jobs to run in the future
- Enqueue unique jobs (only one with a given name/arguments at a time)
- Periodically enqueue jobs on a cron schedule (manageable at runtime)
- Job history tracking with search by job ID
- Web UI to monitor workers, queues, retry/dead jobs, schedules, and history
- Pause/unpause jobs and control concurrency within and across processes

## Installation

```bash
go get github.com/LarnTechKe/work
```

Requires Go 1.24+ and Redis.

## Enqueue Jobs

```go
package main

import (
	"log"

	"github.com/gomodule/redigo/redis"
	"github.com/LarnTechKe/work"
)

var redisPool = &redis.Pool{
	MaxActive: 5,
	MaxIdle:   5,
	Wait:      true,
	Dial: func() (redis.Conn, error) {
		return redis.Dial("tcp", ":6379")
	},
}

var enqueuer = work.NewEnqueuer("my_app_namespace", redisPool)

func main() {
	_, err := enqueuer.Enqueue("send_email", work.Q{"address": "test@example.com", "subject": "hello world"})
	if err != nil {
		log.Fatal(err)
	}
}
```

## Enqueue with Retry Options

Override retry behaviour per job at enqueue time:

```go
_, err := enqueuer.EnqueueWithOptions("send_webhook", work.Q{"url": "https://example.com/hook"}, work.EnqueueOptions{
	Retry: &work.RetryOptions{
		MaxRetries: 5,
		Strategy:   work.BackoffExponential, // or BackoffLinear, BackoffFixed
		BaseDelay:  3,                       // seconds
	},
})
```

## Enqueue with Delay

```go
_, err := enqueuer.EnqueueWithOptions("send_report", work.Q{"format": "pdf"}, work.EnqueueOptions{
	Delay: 5 * time.Minute,
})
```

## Process Jobs

```go
package main

import (
	"fmt"
	"os"
	"os/signal"

	"github.com/gomodule/redigo/redis"
	"github.com/LarnTechKe/work"
)

var redisPool = &redis.Pool{
	MaxActive: 5,
	MaxIdle:   5,
	Wait:      true,
	Dial: func() (redis.Conn, error) {
		return redis.Dial("tcp", ":6379")
	},
}

type Context struct {
	customerID int64
}

func main() {
	pool := work.NewWorkerPool(Context{}, 10, "my_app_namespace", redisPool)

	pool.Middleware((*Context).Log)
	pool.Job("send_email", (*Context).SendEmail)
	pool.JobWithOptions("export", work.JobOptions{Priority: 10, MaxFails: 1}, (*Context).Export)

	// Periodic jobs (cron schedule)
	pool.PeriodicallyEnqueue("0 0 * * * *", "calculate_caches") // every hour

	pool.Start()

	signalChan := make(chan os.Signal, 1)
	signal.Notify(signalChan, os.Interrupt)
	<-signalChan

	pool.Stop()
}

func (c *Context) Log(job *work.Job, next work.NextMiddlewareFunc) error {
	fmt.Println("Starting job: ", job.Name)
	return next()
}

func (c *Context) SendEmail(job *work.Job) error {
	addr := job.ArgString("address")
	if err := job.ArgError(); err != nil {
		return err
	}
	fmt.Println("Sending email to", addr)
	return nil
}

func (c *Context) Export(job *work.Job) error {
	return nil
}
```

## Backoff Strategies

| Strategy | Behaviour |
| --- | --- |
| `BackoffExponential` | Quartic polynomial with jitter (default) |
| `BackoffLinear` | `baseDelay * failCount` |
| `BackoffFixed` | Constant delay between retries |

You can also provide a custom `BackoffCalculator`:

```go
pool.JobWithOptions("custom_job", work.JobOptions{
	MaxFails: 10,
	Backoff: func(job *work.Job) int64 {
		return int64(job.Fails) * 60 // 60s per failure
	},
}, (*Context).CustomJob)
```

## Scheduled Tasks (Runtime Cron)

In addition to code-defined periodic jobs (`PeriodicallyEnqueue`), you can manage schedules at runtime via the Client API:

```go
client := work.NewClient("my_app_namespace", redisPool)

// Add a schedule
client.AddPeriodicSchedule(&work.PeriodicSchedule{
	Name:    "nightly_cleanup",
	JobName: "cleanup",
	Spec:    "0 0 0 * * *", // midnight daily
	Enabled: true,
})

// List all schedules
schedules, _ := client.PeriodicSchedules()

// Disable / enable / delete
client.DisablePeriodicSchedule("nightly_cleanup")
client.EnablePeriodicSchedule("nightly_cleanup")
client.DeletePeriodicSchedule("nightly_cleanup")
```

Schedules are stored in Redis and can also be managed via the Web UI.

## Job History

Completed and failed jobs are recorded in a history log. Query via the Client:

```go
client := work.NewClient("my_app_namespace", redisPool)

// Paginated history (page 1, 20 items per page)
jobs, count, _ := client.HistoryJobs(1, "")

// Filter by job name
jobs, count, _ = client.HistoryJobs(1, "send_email")

// Lookup by job ID
job, _ := client.HistoryJobByID("abc123")

// Total history count
total, _ := client.HistoryCount()
```

History is also accessible from the Web UI dashboard.

## Unique Jobs

```go
enqueuer := work.NewEnqueuer("my_app_namespace", redisPool)
job, err := enqueuer.EnqueueUnique("clear_cache", work.Q{"object_id": "123"})
job, err = enqueuer.EnqueueUnique("clear_cache", work.Q{"object_id": "123"}) // job == nil (duplicate)
```

## Job Concurrency

Control how many jobs of a given type can run concurrently (across all worker pools sharing the same Redis):

```go
pool.JobWithOptions("export", work.JobOptions{MaxConcurrency: 1}, (*Context).Export) // single-threaded
```

## Run the Web UI

### From Source

```bash
go run ./cmd/workwebui -redis "redis://:password@host:6379" -ns "my_namespace" -listen ":5040"
```

**Flags:**

| Flag | Default | Description |
| --- | --- | --- |
| `-redis` | `:6379` | Redis address — `host:port` or `redis://:pass@host:port` |
| `-database` | `0` | Redis DB number (ignored for `redis://` URLs) |
| `-ns` | `work` | Redis namespace |
| `-listen` | `:5040` | HTTP listen address |

Navigate to `http://localhost:5040/`.

### With Docker

```bash
# Build
docker build -t work-webui .

# Run
docker run -p 5040:5040 work-webui \
  -redis "redis://:password@host:6379" \
  -ns "my_namespace"
```

### With Docker Compose

```bash
# Configure .env with your Redis URL and namespace, then:
docker compose up -d

# Open http://localhost:5040
```

See [docker-compose.yml](docker-compose.yml) and [.env](.env) for configuration.

## Redis Cluster

If using Redis Cluster, use [Hash Tags](https://redis.io/topics/cluster-spec#keys-hash-tags) to force keys onto a single node:

```go
pool := work.NewWorkerPool(Context{}, 10, "{my_app_namespace}", redisPool)
```

This is not needed for Redis Sentinel deployments.

## Design and Concepts

### Enqueueing

Jobs are serialized to JSON and added to a Redis list (LPUSH). Each job name gets its own queue automatically.

### Scheduling Algorithm

Each queue has a priority (1–100000). Workers pick queues probabilistically based on relative priority. Empty queues are skipped.

### Processing a Job

1. A Lua script atomically moves a job from its queue to an in-progress queue (checking pause state and concurrency limits)
2. The worker runs the job
3. On success, the job is removed from in-progress and recorded in history
4. On failure, it's either retried (with backoff) or moved to the dead queue

### Retry & Dead Jobs

Failed jobs go to a retry z-set (scored by when to retry). After exhausting retries, they move to the dead queue. Both can be managed via the Web UI or Client API.

### The Reaper

If a process crashes, its in-progress jobs are recovered by the reaper, which monitors heartbeats and requeues orphaned work.

### Job History

Completed and failed jobs are recorded in Redis with three data structures: a main z-set (sorted by timestamp), per-name z-sets (for filtering), and an ID hash (for direct lookup). History is automatically cleaned up after 15 days.

## CI/CD

The repository includes a GitHub Actions workflow (`.github/workflows/webui.yml`) that:

1. Builds and tests the Go code
2. Builds the Docker image (frontend + backend)
3. Pushes to Docker Hub with a timestamped tag and `latest`
4. Creates a GitHub release

Required secrets: `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`.

## License

MIT. See [LICENSE](LICENSE).
