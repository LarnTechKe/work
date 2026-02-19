package main

import (
	"flag"
	"fmt"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"time"

	"github.com/LarnTechKe/work/webui"
	"github.com/gomodule/redigo/redis"
)

var (
	redisAddr      = flag.String("redis", ":6379", "redis address (host:port or redis://:pass@host:port)")
	redisDatabase  = flag.String("database", "0", "redis database (ignored for redis:// URLs)")
	redisNamespace = flag.String("ns", "work", "redis namespace")
	webHostPort    = flag.String("listen", ":5040", "hostport to listen for HTTP JSON API")
)

func main() {
	flag.Parse()

	fmt.Println("Starting workwebui:")
	fmt.Println("redis = ", *redisAddr)
	fmt.Println("database = ", *redisDatabase)
	fmt.Println("namespace = ", *redisNamespace)
	fmt.Println("listen = ", *webHostPort)

	database, err := strconv.Atoi(*redisDatabase)
	if err != nil {
		fmt.Printf("Error: %v is not a valid database value", *redisDatabase)
		return
	}

	pool := newPool(*redisAddr, database)

	server := webui.NewServer(*redisNamespace, pool, *webHostPort)
	server.Start()

	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt)

	<-c

	server.Stop()

	fmt.Println("\nQuitting...")
}

func newPool(addr string, database int) *redis.Pool {
	isURL := strings.HasPrefix(addr, "redis://") || strings.HasPrefix(addr, "rediss://")

	return &redis.Pool{
		MaxActive:   3,
		MaxIdle:     3,
		IdleTimeout: 240 * time.Second,
		Dial: func() (redis.Conn, error) {
			if isURL {
				return redis.DialURL(addr)
			}
			conn, err := redis.Dial("tcp", addr)
			if err != nil {
				return nil, err
			}
			if database != 0 {
				if _, err := conn.Do("SELECT", database); err != nil {
					conn.Close()
					return nil, err
				}
			}
			return conn, nil
		},
		Wait: true,
	}
}
