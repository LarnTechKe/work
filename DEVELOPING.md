## Development Guide

### Prerequisites

- Go 1.24+
- Node.js 22+ and npm
- Redis (local or remote)
- Docker (optional, for container builds)

### Project Structure

```
work/
├── cmd/workwebui/          # Web UI binary entry point
├── webui/
│   ├── frontend/           # React 19 + Vite + Tailwind frontend
│   │   ├── src/
│   │   ├── package.json
│   │   └── vite.config.ts
│   ├── internal/assets/
│   │   ├── build/          # Vite build output (embedded into Go binary)
│   │   └── embed.go        # go:embed directive
│   └── webui.go            # HTTP routes and API handlers
├── backoff.go              # Backoff strategies (exponential, linear, fixed)
├── client.go               # Client API (queues, history, schedules)
├── enqueue.go              # Enqueuer and enqueue options
├── job.go                  # Job and HistoryJob structs
├── schedule.go             # PeriodicSchedule struct
├── worker.go               # Worker with history recording
├── worker_pool.go          # WorkerPool
├── Dockerfile              # Multi-stage Docker build
├── docker-compose.yml      # Docker Compose for WebUI
└── .github/workflows/      # CI/CD pipeline
```

### Running the Web UI (Development)

Start the Go API server and the Vite dev server separately for hot reloading:

```bash
# Terminal 1: Start the Go API server
go run ./cmd/workwebui -redis "localhost:6379" -ns "enviar" -listen ":5040"

# Terminal 2: Start the Vite dev server (proxies /api to :5040)
cd webui/frontend
npm install
npm run dev
```

The Vite dev server runs on `http://localhost:5173` with hot module replacement. API requests are proxied to the Go server on `:5040`.

### Building the Frontend for Production

The frontend is embedded into the Go binary via `go:embed`. To rebuild it:

```bash
cd webui/frontend
npm ci
npm run build
```

This outputs to `webui/internal/assets/build/`, which is picked up by the `//go:embed build/*` directive in `embed.go`.

After rebuilding the frontend, the Go binary will serve the new assets:

```bash
go run ./cmd/workwebui -redis "localhost:6379" -ns "enviar"
```

### Building the Go Project

```bash
go build ./...
go vet ./...
go test ./...
```

### Docker

Build the image (includes frontend build):

```bash
docker build -t work-webui .
```

Run with Docker Compose:

```bash
# Edit .env with your Redis URL and namespace
docker compose up -d
```

The Dockerfile uses a 3-stage build:
1. **Node.js** — installs deps and runs `npm run build`
2. **Go** — compiles the binary with embedded frontend assets
3. **Alpine** — minimal runtime image

### Configuration

#### Web UI Flags

| Flag | Default | Description |
| --- | --- | --- |
| `-redis` | `:6379` | `host:port` or `redis://:pass@host:port` |
| `-database` | `0` | Redis DB (ignored for `redis://` URLs) |
| `-ns` | `work` | Redis namespace |
| `-listen` | `:5040` | HTTP listen address |

#### Docker Compose Environment (`.env`)

| Variable | Default | Description |
| --- | --- | --- |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `NAMESPACE` | `enviar` | Redis namespace to monitor |
| `WEBUI_PORT` | `5040` | Host port for the web UI |

### Frontend Tech Stack

| Tool | Version | Purpose |
| --- | --- | --- |
| React | 19.0.0 | UI framework |
| TypeScript | 5.7.0 | Type safety |
| Vite | 6.0.0 | Build tool and dev server |
| Tailwind CSS | 3.4.0 | Utility-first styling |
| React Router | 7.1.0 | Client-side routing |
| TanStack Query | 5.62.0 | Data fetching and caching |

### CI/CD

The GitHub Actions pipeline (`.github/workflows/webui.yml`) triggers on push to `master`:

1. Builds and tests Go code
2. Builds the Docker image
3. Pushes to Docker Hub (timestamped tag + `latest`)
4. Creates a GitHub release

Required repository secrets:
- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`

### Key APIs

#### Enqueue Options

```go
enqueuer.EnqueueWithOptions("job_name", work.Q{"key": "val"}, work.EnqueueOptions{
    Delay: 5 * time.Minute,
    Retry: &work.RetryOptions{
        MaxRetries: 5,
        Strategy:   work.BackoffExponential,
        BaseDelay:  3,
    },
})
```

#### Client — History

```go
client := work.NewClient("namespace", redisPool)
jobs, count, _ := client.HistoryJobs(1, "")       // page 1, all jobs
job, _ := client.HistoryJobByID("abc123")           // by ID
total, _ := client.HistoryCount()                   // total count
```

#### Client — Schedules

```go
client.AddPeriodicSchedule(&work.PeriodicSchedule{
    Name: "nightly", JobName: "cleanup", Spec: "0 0 0 * * *", Enabled: true,
})
schedules, _ := client.PeriodicSchedules()
client.DisablePeriodicSchedule("nightly")
client.DeletePeriodicSchedule("nightly")
```

#### Web UI API Endpoints

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/queues` | List all queues |
| GET | `/api/worker_pools` | List worker pools |
| GET | `/api/busy_workers` | List busy workers |
| GET | `/api/retry_jobs` | List retry jobs |
| GET | `/api/dead_jobs` | List dead jobs |
| GET | `/api/history_jobs` | Paginated job history |
| GET | `/api/history_jobs/:id` | History entry by job ID |
| GET | `/api/schedules` | List periodic schedules |
| POST | `/api/schedules` | Add/update schedule |
| DELETE | `/api/schedules/:name` | Delete schedule |
| PUT | `/api/schedules/:name/enable` | Enable schedule |
| PUT | `/api/schedules/:name/disable` | Disable schedule |
| GET | `/api/dashboard` | Dashboard summary stats |
