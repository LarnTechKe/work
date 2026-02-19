package work

import (
	"encoding/json"
	"time"

	"github.com/gomodule/redigo/redis"
)

// PeriodicSchedule represents a named recurring job schedule stored in Redis.
// Unlike code-defined schedules via PeriodicallyEnqueue, these can be created,
// modified, and deleted at runtime through the Client API.
type PeriodicSchedule struct {
	Name      string                 `json:"name"`
	JobName   string                 `json:"job_name"`
	Spec      string                 `json:"spec"`
	Args      map[string]interface{} `json:"args,omitempty"`
	Enabled   bool                   `json:"enabled"`
	CreatedAt int64                  `json:"created_at"`
	UpdatedAt int64                  `json:"updated_at"`
}

// PeriodicSchedules returns all periodic schedules stored in Redis.
func (c *Client) PeriodicSchedules() ([]*PeriodicSchedule, error) {
	conn := c.pool.Get()
	defer conn.Close()

	vals, err := redis.StringMap(conn.Do("HGETALL", redisKeyPeriodicSchedules(c.namespace)))
	if err != nil {
		return nil, err
	}

	schedules := make([]*PeriodicSchedule, 0, len(vals))
	for _, v := range vals {
		var s PeriodicSchedule
		if err := json.Unmarshal([]byte(v), &s); err != nil {
			logError("client.periodic_schedules.unmarshal", err)
			continue
		}
		schedules = append(schedules, &s)
	}

	return schedules, nil
}

// AddPeriodicSchedule adds or updates a named periodic schedule in Redis.
// The schedule will be picked up by the periodic enqueuer on its next cycle.
func (c *Client) AddPeriodicSchedule(schedule *PeriodicSchedule) error {
	now := time.Now().Unix()
	if schedule.CreatedAt == 0 {
		schedule.CreatedAt = now
	}
	schedule.UpdatedAt = now

	data, err := json.Marshal(schedule)
	if err != nil {
		return err
	}

	conn := c.pool.Get()
	defer conn.Close()

	_, err = conn.Do("HSET", redisKeyPeriodicSchedules(c.namespace), schedule.Name, data)
	return err
}

// DeletePeriodicSchedule removes a named periodic schedule from Redis.
func (c *Client) DeletePeriodicSchedule(name string) error {
	conn := c.pool.Get()
	defer conn.Close()

	_, err := conn.Do("HDEL", redisKeyPeriodicSchedules(c.namespace), name)
	return err
}

// EnablePeriodicSchedule enables a previously disabled schedule.
func (c *Client) EnablePeriodicSchedule(name string) error {
	return c.setScheduleEnabled(name, true)
}

// DisablePeriodicSchedule disables a schedule without removing it.
func (c *Client) DisablePeriodicSchedule(name string) error {
	return c.setScheduleEnabled(name, false)
}

func (c *Client) setScheduleEnabled(name string, enabled bool) error {
	conn := c.pool.Get()
	defer conn.Close()

	data, err := redis.Bytes(conn.Do("HGET", redisKeyPeriodicSchedules(c.namespace), name))
	if err != nil {
		return err
	}

	var s PeriodicSchedule
	if err := json.Unmarshal(data, &s); err != nil {
		return err
	}

	s.Enabled = enabled
	s.UpdatedAt = time.Now().Unix()

	newData, err := json.Marshal(&s)
	if err != nil {
		return err
	}

	_, err = conn.Do("HSET", redisKeyPeriodicSchedules(c.namespace), name, newData)
	return err
}
