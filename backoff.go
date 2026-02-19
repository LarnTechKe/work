package work

import (
	"math/rand"
	"time"
)

// defaultBackoffCalculator returns a rapidly increasing backoff counter which grows in an unbounded fashion.
func defaultBackoffCalculator(job *Job) int64 {
	fails := job.Fails
	return (fails * fails * fails * fails) + 15 + (rand.Int63n(30) * (fails + 1))
}

// BackoffStrategy defines predefined backoff strategies for retrying failed jobs.
type BackoffStrategy int

const (
	// BackoffExponential uses the default quartic polynomial backoff with jitter.
	BackoffExponential BackoffStrategy = iota
	// BackoffLinear uses a linear backoff: baseDelay * failCount.
	BackoffLinear
	// BackoffFixed uses a constant delay between retries.
	BackoffFixed
)

// RetryOptions configures retry behavior for a job at enqueue time.
// When set, these override the job type defaults configured on the WorkerPool.
type RetryOptions struct {
	// MaxRetries is the maximum number of times to retry the job.
	// 0 means use the job type default.
	MaxRetries int64

	// Strategy selects a predefined backoff strategy.
	// Only used when Backoff is nil.
	Strategy BackoffStrategy

	// Backoff is a custom backoff function. If set, it takes precedence over Strategy.
	Backoff BackoffCalculator

	// BaseDelay is the base delay in seconds for linear and fixed strategies.
	// Defaults to 60 seconds if not set.
	BaseDelay int64
}

// EnqueueOptions combines all options for enqueuing a job.
type EnqueueOptions struct {
	// Delay specifies how long to wait before the job becomes eligible for processing.
	// Zero means the job is processed immediately.
	Delay time.Duration

	// Retry configures per-job retry behavior. If nil, the job type defaults are used.
	Retry *RetryOptions

	// Unique ensures only one job with this name and arguments is enqueued at a time.
	Unique bool

	// UniqueKey provides a custom key map for uniqueness checks.
	// If nil and Unique is true, the job arguments are used as the key.
	UniqueKey map[string]interface{}
}

// LinearBackoff returns a BackoffCalculator that waits baseSeconds * failCount.
func LinearBackoff(baseSeconds int64) BackoffCalculator {
	return func(job *Job) int64 {
		return baseSeconds * job.Fails
	}
}

// FixedBackoff returns a BackoffCalculator that always waits the specified number of seconds.
func FixedBackoff(seconds int64) BackoffCalculator {
	return func(job *Job) int64 {
		return seconds
	}
}

// ExponentialBackoff returns the default exponential backoff calculator.
func ExponentialBackoff() BackoffCalculator {
	return defaultBackoffCalculator
}

// backoffForStrategy returns a BackoffCalculator for the given strategy and base delay.
func backoffForStrategy(strategy BackoffStrategy, baseDelay int64) BackoffCalculator {
	if baseDelay <= 0 {
		baseDelay = 60
	}
	switch strategy {
	case BackoffLinear:
		return LinearBackoff(baseDelay)
	case BackoffFixed:
		return FixedBackoff(baseDelay)
	default:
		return defaultBackoffCalculator
	}
}

// calcJobBackoff determines the backoff for a job, checking per-job config first,
// then falling back to the job type default.
func calcJobBackoff(jt *jobType, job *Job) int64 {
	// Check per-job backoff configuration
	if job.BackoffType != nil {
		baseDelay := int64(60)
		if job.BackoffBase != nil {
			baseDelay = *job.BackoffBase
		}
		calc := backoffForStrategy(BackoffStrategy(*job.BackoffType), baseDelay)
		return calc(job)
	}

	// Fall back to job type configuration
	if jt != nil {
		return jt.calcBackoff(job)
	}

	return defaultBackoffCalculator(job)
}

// calcJobMaxRetries determines the max retries for a job, checking per-job config first.
func calcJobMaxRetries(jt *jobType, job *Job) int64 {
	if job.MaxRetries != nil {
		return *job.MaxRetries
	}
	if jt != nil {
		return int64(jt.MaxFails)
	}
	return 4
}

