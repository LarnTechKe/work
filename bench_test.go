package work

import (
	"reflect"
	"testing"
)

func BenchmarkRunJob(b *testing.B) {
	b.ReportAllocs()
	h := func(c *tstCtx, j *Job) error { return nil }
	jt := &jobType{
		Name:           "bench",
		IsGeneric:      false,
		DynamicHandler: reflect.ValueOf(h),
	}
	job := &Job{Name: "bench", Args: map[string]interface{}{"a": 1}}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		runJob(job, tstCtxType, nil, jt)
	}
}

func BenchmarkRunJobGeneric(b *testing.B) {
	b.ReportAllocs()
	jt := &jobType{
		Name:           "bench",
		IsGeneric:      true,
		GenericHandler: func(j *Job) error { return nil },
	}
	job := &Job{Name: "bench", Args: map[string]interface{}{"a": 1}}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		runJob(job, tstCtxType, nil, jt)
	}
}

func BenchmarkRunJobWithMiddleware(b *testing.B) {
	b.ReportAllocs()
	mw1 := func(j *Job, next NextMiddlewareFunc) error { return next() }
	mw2 := func(c *tstCtx, j *Job, next NextMiddlewareFunc) error { return next() }
	middleware := []*middlewareHandler{
		{IsGeneric: true, GenericMiddlewareHandler: mw1},
		{IsGeneric: false, DynamicMiddleware: reflect.ValueOf(mw2)},
	}
	h := func(c *tstCtx, j *Job) error { return nil }
	jt := &jobType{
		Name:           "bench",
		IsGeneric:      false,
		DynamicHandler: reflect.ValueOf(h),
	}
	job := &Job{Name: "bench", Args: map[string]interface{}{"a": 1}}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		runJob(job, tstCtxType, middleware, jt)
	}
}

func BenchmarkRunJobWithCtx(b *testing.B) {
	b.ReportAllocs()
	h := func(c *tstCtx, j *Job) error { return nil }
	jt := &jobType{
		Name:           "bench",
		IsGeneric:      false,
		DynamicHandler: reflect.ValueOf(h),
	}
	job := &Job{Name: "bench", Args: map[string]interface{}{"a": 1}}
	ctx := reflect.New(tstCtxType)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		ctx.Elem().Set(reflect.Zero(tstCtxType))
		runJobWithCtx(job, ctx, nil, jt)
	}
}

func BenchmarkEnqueue(b *testing.B) {
	b.ReportAllocs()
	pool := newTestPool(":6379")
	ns := "bench"
	cleanKeyspace(ns, pool)
	enqueuer := NewEnqueuer(ns, pool)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		enqueuer.Enqueue("bench_job", Q{"a": 1})
	}
}

func BenchmarkEnqueueWithOptions(b *testing.B) {
	b.ReportAllocs()
	pool := newTestPool(":6379")
	ns := "bench"
	cleanKeyspace(ns, pool)
	enqueuer := NewEnqueuer(ns, pool)
	opts := EnqueueOptions{
		Retry: &RetryOptions{MaxRetries: 3, Strategy: BackoffExponential},
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		enqueuer.EnqueueWithOptions("bench_job", Q{"a": 1}, opts)
	}
}
