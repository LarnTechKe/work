package webui

import (
	"context"
	"encoding/json"
	"fmt"
	"io/fs"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/LarnTechKe/work"
	"github.com/LarnTechKe/work/webui/internal/assets"
	"github.com/gomodule/redigo/redis"
)

// Server implements an HTTP server which exposes a JSON API to view and manage gocraft/work items.
type Server struct {
	namespace string
	pool      *redis.Pool
	client    *work.Client
	enqueuer  *work.Enqueuer
	hostPort  string
	server    *http.Server
	wg        sync.WaitGroup
	mux       *http.ServeMux
}

// NewServer creates and returns a new server. The 'namespace' param is the redis namespace to use.
// The hostPort param is the address to bind on to expose the API.
func NewServer(namespace string, pool *redis.Pool, hostPort string) *Server {
	mux := http.NewServeMux()
	server := &Server{
		namespace: namespace,
		pool:      pool,
		client:    work.NewClient(namespace, pool),
		enqueuer:  work.NewEnqueuer(namespace, pool),
		hostPort:  hostPort,
		server:    &http.Server{Addr: hostPort, Handler: mux},
		mux:       mux,
	}

	// API routes
	mux.HandleFunc("GET /api/dashboard", server.dashboard)
	mux.HandleFunc("GET /api/queues", server.queues)
	mux.HandleFunc("GET /api/worker_pools", server.workerPools)
	mux.HandleFunc("GET /api/busy_workers", server.busyWorkers)
	mux.HandleFunc("GET /api/retry_jobs", server.retryJobs)
	mux.HandleFunc("GET /api/scheduled_jobs", server.scheduledJobs)
	mux.HandleFunc("GET /api/dead_jobs", server.deadJobs)
	mux.HandleFunc("POST /api/delete_dead_job/{died_at}/{job_id}", server.deleteDeadJob)
	mux.HandleFunc("POST /api/retry_dead_job/{died_at}/{job_id}", server.retryDeadJob)
	mux.HandleFunc("POST /api/delete_all_dead_jobs", server.deleteAllDeadJobs)
	mux.HandleFunc("POST /api/retry_all_dead_jobs", server.retryAllDeadJobs)
	mux.HandleFunc("POST /api/delete_scheduled_job/{run_at}/{job_id}", server.deleteScheduledJob)
	mux.HandleFunc("POST /api/delete_retry_job/{retry_at}/{job_id}", server.deleteRetryJob)

	// Schedule management
	mux.HandleFunc("GET /api/periodic_schedules", server.periodicSchedules)
	mux.HandleFunc("POST /api/periodic_schedules", server.addPeriodicSchedule)
	mux.HandleFunc("DELETE /api/periodic_schedules/{name}", server.deletePeriodicSchedule)
	mux.HandleFunc("POST /api/periodic_schedules/{name}/enable", server.enablePeriodicSchedule)
	mux.HandleFunc("POST /api/periodic_schedules/{name}/disable", server.disablePeriodicSchedule)

	// History
	mux.HandleFunc("GET /api/history_jobs", server.historyJobs)
	mux.HandleFunc("GET /api/history_jobs/{job_id}", server.historyJobByID)

	// Redis metrics
	mux.HandleFunc("GET /api/redis_info", server.redisInfo)

	// Enqueue from UI
	mux.HandleFunc("POST /api/enqueue", server.enqueueJob)

	// Serve SPA from embedded assets
	mux.HandleFunc("GET /", server.serveAssets)

	return server
}

// Start starts the server listening for requests on the hostPort specified in NewServer.
func (s *Server) Start() {
	s.wg.Add(1)
	go func() {
		defer s.wg.Done()
		s.server.ListenAndServe()
	}()
}

// Stop stops the server and blocks until it has finished.
func (s *Server) Stop() {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	s.server.Shutdown(ctx)
	s.wg.Wait()
}

// ServeHTTP implements the http.Handler interface for testing.
func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.mux.ServeHTTP(w, r)
}

func (s *Server) serveAssets(w http.ResponseWriter, r *http.Request) {
	// Try to serve from the dist/ directory first (Vite build output)
	distFS, err := fs.Sub(assets.BuildFS(), "build")
	if err == nil {
		path := r.URL.Path
		if path == "/" {
			path = "index.html"
		} else {
			path = path[1:] // strip leading /
		}
		if data, err := fs.ReadFile(distFS, path); err == nil {
			contentType := "application/octet-stream"
			switch {
			case len(path) > 5 && path[len(path)-5:] == ".html":
				contentType = "text/html; charset=utf-8"
			case len(path) > 3 && path[len(path)-3:] == ".js":
				contentType = "application/javascript; charset=utf-8"
			case len(path) > 4 && path[len(path)-4:] == ".css":
				contentType = "text/css; charset=utf-8"
			case len(path) > 5 && path[len(path)-5:] == ".json":
				contentType = "application/json; charset=utf-8"
			case len(path) > 4 && path[len(path)-4:] == ".svg":
				contentType = "image/svg+xml"
			case len(path) > 4 && path[len(path)-4:] == ".png":
				contentType = "image/png"
			}
			w.Header().Set("Content-Type", contentType)
			w.Write(data)
			return
		}
	}

	// Fallback: serve index.html for SPA routing
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Write(assets.MustAsset("index.html"))
}

// --- Dashboard ---

type dashboardResponse struct {
	Queues    dashboardQueues  `json:"queues"`
	Retry     dashboardCount   `json:"retry"`
	Scheduled dashboardCount   `json:"scheduled"`
	Dead      dashboardCount   `json:"dead"`
	History   dashboardCount   `json:"history"`
	Workers   dashboardWorkers `json:"workers"`
	Schedules dashboardCount   `json:"schedules"`
}

type dashboardQueues struct {
	Total int `json:"total"`
	Jobs  int64 `json:"jobs"`
}

type dashboardCount struct {
	Count int64 `json:"count"`
}

type dashboardWorkers struct {
	Active int `json:"active"`
	Total  int `json:"total"`
	Pools  int `json:"pools"`
}

func (s *Server) dashboard(w http.ResponseWriter, r *http.Request) {
	resp := dashboardResponse{}

	// Queues
	if queues, err := s.client.Queues(); err == nil {
		resp.Queues.Total = len(queues)
		for _, q := range queues {
			resp.Queues.Jobs += q.Count
		}
	}

	// Retry count
	if _, count, err := s.client.RetryJobs(1); err == nil {
		resp.Retry.Count = count
	}

	// Scheduled count
	if _, count, err := s.client.ScheduledJobs(1); err == nil {
		resp.Scheduled.Count = count
	}

	// Dead count
	if _, count, err := s.client.DeadJobs(1); err == nil {
		resp.Dead.Count = count
	}

	// Workers
	if pools, err := s.client.WorkerPoolHeartbeats(); err == nil {
		resp.Workers.Pools = len(pools)
		for _, p := range pools {
			resp.Workers.Total += len(p.WorkerIDs)
		}
	}
	if observations, err := s.client.WorkerObservations(); err == nil {
		for _, ob := range observations {
			if ob.IsBusy {
				resp.Workers.Active++
			}
		}
	}

	// History
	if count, err := s.client.HistoryCount(); err == nil {
		resp.History.Count = count
	}

	// Schedules
	if schedules, err := s.client.PeriodicSchedules(); err == nil {
		resp.Schedules.Count = int64(len(schedules))
	}

	render(w, resp, nil)
}

// --- Queues ---

func (s *Server) queues(w http.ResponseWriter, r *http.Request) {
	response, err := s.client.Queues()
	render(w, response, err)
}

// --- Worker Pools ---

func (s *Server) workerPools(w http.ResponseWriter, r *http.Request) {
	response, err := s.client.WorkerPoolHeartbeats()
	render(w, response, err)
}

// --- Busy Workers ---

func (s *Server) busyWorkers(w http.ResponseWriter, r *http.Request) {
	observations, err := s.client.WorkerObservations()
	if err != nil {
		renderError(w, err)
		return
	}

	var busyObservations []*work.WorkerObservation
	for _, ob := range observations {
		if ob.IsBusy {
			busyObservations = append(busyObservations, ob)
		}
	}

	render(w, busyObservations, nil)
}

// --- Retry Jobs ---

func (s *Server) retryJobs(w http.ResponseWriter, r *http.Request) {
	page, err := parsePage(r)
	if err != nil {
		renderError(w, err)
		return
	}

	jobs, count, err := s.client.RetryJobs(page)
	if err != nil {
		renderError(w, err)
		return
	}

	response := struct {
		Count int64            `json:"count"`
		Jobs  []*work.RetryJob `json:"jobs"`
	}{Count: count, Jobs: jobs}

	render(w, response, nil)
}

// --- Scheduled Jobs ---

func (s *Server) scheduledJobs(w http.ResponseWriter, r *http.Request) {
	page, err := parsePage(r)
	if err != nil {
		renderError(w, err)
		return
	}

	jobs, count, err := s.client.ScheduledJobs(page)
	if err != nil {
		renderError(w, err)
		return
	}

	response := struct {
		Count int64                `json:"count"`
		Jobs  []*work.ScheduledJob `json:"jobs"`
	}{Count: count, Jobs: jobs}

	render(w, response, nil)
}

// --- Dead Jobs ---

func (s *Server) deadJobs(w http.ResponseWriter, r *http.Request) {
	page, err := parsePage(r)
	if err != nil {
		renderError(w, err)
		return
	}

	jobs, count, err := s.client.DeadJobs(page)
	if err != nil {
		renderError(w, err)
		return
	}

	response := struct {
		Count int64           `json:"count"`
		Jobs  []*work.DeadJob `json:"jobs"`
	}{Count: count, Jobs: jobs}

	render(w, response, nil)
}

func (s *Server) deleteDeadJob(w http.ResponseWriter, r *http.Request) {
	diedAt, err := strconv.ParseInt(r.PathValue("died_at"), 10, 64)
	if err != nil {
		renderError(w, err)
		return
	}

	err = s.client.DeleteDeadJob(diedAt, r.PathValue("job_id"))
	render(w, map[string]string{"status": "ok"}, err)
}

func (s *Server) retryDeadJob(w http.ResponseWriter, r *http.Request) {
	diedAt, err := strconv.ParseInt(r.PathValue("died_at"), 10, 64)
	if err != nil {
		renderError(w, err)
		return
	}

	err = s.client.RetryDeadJob(diedAt, r.PathValue("job_id"))
	render(w, map[string]string{"status": "ok"}, err)
}

func (s *Server) deleteAllDeadJobs(w http.ResponseWriter, r *http.Request) {
	err := s.client.DeleteAllDeadJobs()
	render(w, map[string]string{"status": "ok"}, err)
}

func (s *Server) retryAllDeadJobs(w http.ResponseWriter, r *http.Request) {
	err := s.client.RetryAllDeadJobs()
	render(w, map[string]string{"status": "ok"}, err)
}

// --- Scheduled/Retry Job Deletion ---

func (s *Server) deleteScheduledJob(w http.ResponseWriter, r *http.Request) {
	runAt, err := strconv.ParseInt(r.PathValue("run_at"), 10, 64)
	if err != nil {
		renderError(w, err)
		return
	}

	err = s.client.DeleteScheduledJob(runAt, r.PathValue("job_id"))
	render(w, map[string]string{"status": "ok"}, err)
}

func (s *Server) deleteRetryJob(w http.ResponseWriter, r *http.Request) {
	retryAt, err := strconv.ParseInt(r.PathValue("retry_at"), 10, 64)
	if err != nil {
		renderError(w, err)
		return
	}

	err = s.client.DeleteRetryJob(retryAt, r.PathValue("job_id"))
	render(w, map[string]string{"status": "ok"}, err)
}

// --- Periodic Schedules ---

func (s *Server) periodicSchedules(w http.ResponseWriter, r *http.Request) {
	schedules, err := s.client.PeriodicSchedules()
	render(w, schedules, err)
}

func (s *Server) addPeriodicSchedule(w http.ResponseWriter, r *http.Request) {
	var schedule work.PeriodicSchedule
	if err := json.NewDecoder(r.Body).Decode(&schedule); err != nil {
		renderError(w, err)
		return
	}

	err := s.client.AddPeriodicSchedule(&schedule)
	render(w, map[string]string{"status": "ok"}, err)
}

func (s *Server) deletePeriodicSchedule(w http.ResponseWriter, r *http.Request) {
	name := r.PathValue("name")
	err := s.client.DeletePeriodicSchedule(name)
	render(w, map[string]string{"status": "ok"}, err)
}

func (s *Server) enablePeriodicSchedule(w http.ResponseWriter, r *http.Request) {
	name := r.PathValue("name")
	err := s.client.EnablePeriodicSchedule(name)
	render(w, map[string]string{"status": "ok"}, err)
}

func (s *Server) disablePeriodicSchedule(w http.ResponseWriter, r *http.Request) {
	name := r.PathValue("name")
	err := s.client.DisablePeriodicSchedule(name)
	render(w, map[string]string{"status": "ok"}, err)
}

// --- History Jobs ---

func (s *Server) historyJobs(w http.ResponseWriter, r *http.Request) {
	page, err := parsePage(r)
	if err != nil {
		renderError(w, err)
		return
	}

	jobName := r.URL.Query().Get("job_name")

	jobs, count, err := s.client.HistoryJobs(page, jobName)
	if err != nil {
		renderError(w, err)
		return
	}

	response := struct {
		Count int64               `json:"count"`
		Jobs  []*work.HistoryJob  `json:"jobs"`
	}{Count: count, Jobs: jobs}

	render(w, response, nil)
}

func (s *Server) historyJobByID(w http.ResponseWriter, r *http.Request) {
	jobID := r.PathValue("job_id")

	job, err := s.client.HistoryJobByID(jobID)
	if err != nil {
		renderError(w, err)
		return
	}
	if job == nil {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		w.WriteHeader(404)
		fmt.Fprint(w, `{"error": "job not found"}`)
		return
	}

	render(w, job, nil)
}

// --- Enqueue Job ---

type enqueueRequest struct {
	JobName string                 `json:"job_name"`
	Args    map[string]interface{} `json:"args"`
	Delay   int64                  `json:"delay"` // seconds
	Retry   *enqueueRetryRequest   `json:"retry,omitempty"`
}

type enqueueRetryRequest struct {
	MaxRetries int64  `json:"max_retries"`
	Strategy   string `json:"strategy"` // "exponential", "linear", "fixed"
	BaseDelay  int64  `json:"base_delay"`
}

func (s *Server) redisInfo(w http.ResponseWriter, r *http.Request) {
	stats, err := s.client.RedisInfo()
	render(w, stats, err)
}

func (s *Server) enqueueJob(w http.ResponseWriter, r *http.Request) {
	var req enqueueRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		renderError(w, err)
		return
	}

	if req.JobName == "" {
		renderError(w, fmt.Errorf("job_name is required"))
		return
	}

	opts := work.EnqueueOptions{}

	if req.Delay > 0 {
		opts.Delay = time.Duration(req.Delay) * time.Second
	}

	if req.Retry != nil {
		retryOpts := &work.RetryOptions{
			MaxRetries: req.Retry.MaxRetries,
			BaseDelay:  req.Retry.BaseDelay,
		}
		switch req.Retry.Strategy {
		case "linear":
			retryOpts.Strategy = work.BackoffLinear
		case "fixed":
			retryOpts.Strategy = work.BackoffFixed
		default:
			retryOpts.Strategy = work.BackoffExponential
		}
		opts.Retry = retryOpts
	}

	job, err := s.enqueuer.EnqueueWithOptions(req.JobName, req.Args, opts)
	if err != nil {
		renderError(w, err)
		return
	}

	render(w, job, nil)
}

// --- Helpers ---

func render(w http.ResponseWriter, jsonable interface{}, err error) {
	if err != nil {
		renderError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	jsonData, err := json.MarshalIndent(jsonable, "", "\t")
	if err != nil {
		renderError(w, err)
		return
	}
	w.Write(jsonData)
}

func renderError(w http.ResponseWriter, err error) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(500)
	fmt.Fprintf(w, `{"error": "%s"}`, err.Error())
}

func parsePage(r *http.Request) (uint, error) {
	pageStr := r.URL.Query().Get("page")
	if pageStr == "" {
		pageStr = "1"
	}

	page, err := strconv.ParseUint(pageStr, 10, 0)
	return uint(page), err
}
