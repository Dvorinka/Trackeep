package middleware

import (
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// Metrics holds application metrics
type Metrics struct {
	mu sync.RWMutex

	// HTTP metrics
	RequestsTotal     map[string]int64
	RequestsDuration  map[string][]time.Duration
	RequestsErrors    map[string]int64
	ActiveConnections int64

	// Application metrics
	UsersTotal     int64
	BookmarksTotal int64
	TasksTotal     int64
	FilesTotal     int64
	NotesTotal     int64

	// System metrics
	DatabaseConnections int64
	LastRestart         time.Time
}

var (
	// Global metrics instance
	appMetrics = &Metrics{
		RequestsTotal:    make(map[string]int64),
		RequestsDuration: make(map[string][]time.Duration),
		RequestsErrors:   make(map[string]int64),
		LastRestart:      time.Now(),
	}
)

// GetMetrics returns the current metrics
func GetMetrics() *Metrics {
	appMetrics.mu.RLock()
	defer appMetrics.mu.RUnlock()

	// Return a copy to avoid concurrent access issues
	return &Metrics{
		RequestsTotal:       copyMap(appMetrics.RequestsTotal),
		RequestsDuration:    copyDurationMap(appMetrics.RequestsDuration),
		RequestsErrors:      copyMap(appMetrics.RequestsErrors),
		ActiveConnections:   appMetrics.ActiveConnections,
		UsersTotal:          appMetrics.UsersTotal,
		BookmarksTotal:      appMetrics.BookmarksTotal,
		TasksTotal:          appMetrics.TasksTotal,
		FilesTotal:          appMetrics.FilesTotal,
		NotesTotal:          appMetrics.NotesTotal,
		DatabaseConnections: appMetrics.DatabaseConnections,
		LastRestart:         appMetrics.LastRestart,
	}
}

// MetricsMiddleware collects HTTP metrics
func MetricsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		method := c.Request.Method

		// Increment active connections
		appMetrics.mu.Lock()
		appMetrics.ActiveConnections++
		appMetrics.mu.Unlock()

		// Process request
		c.Next()

		// Decrement active connections
		appMetrics.mu.Lock()
		appMetrics.ActiveConnections--
		appMetrics.mu.Unlock()

		// Calculate duration
		duration := time.Since(start)

		// Update metrics
		appMetrics.mu.Lock()
		defer appMetrics.mu.Unlock()

		key := method + " " + path

		// Increment total requests
		appMetrics.RequestsTotal[key]++

		// Record duration
		if appMetrics.RequestsDuration[key] == nil {
			appMetrics.RequestsDuration[key] = make([]time.Duration, 0, 1000)
		}
		appMetrics.RequestsDuration[key] = append(appMetrics.RequestsDuration[key], duration)

		// Keep only last 1000 duration records per endpoint
		if len(appMetrics.RequestsDuration[key]) > 1000 {
			appMetrics.RequestsDuration[key] = appMetrics.RequestsDuration[key][1:]
		}

		// Count errors
		if c.Writer.Status() >= 400 {
			appMetrics.RequestsErrors[key]++
		}
	}
}

// IncrementUsersTotal increments the total users count
func IncrementUsersTotal() {
	appMetrics.mu.Lock()
	defer appMetrics.mu.Unlock()
	appMetrics.UsersTotal++
}

// IncrementBookmarksTotal increments the total bookmarks count
func IncrementBookmarksTotal() {
	appMetrics.mu.Lock()
	defer appMetrics.mu.Unlock()
	appMetrics.BookmarksTotal++
}

// DecrementBookmarksTotal decrements the total bookmarks count
func DecrementBookmarksTotal() {
	appMetrics.mu.Lock()
	defer appMetrics.mu.Unlock()
	if appMetrics.BookmarksTotal > 0 {
		appMetrics.BookmarksTotal--
	}
}

// IncrementTasksTotal increments the total tasks count
func IncrementTasksTotal() {
	appMetrics.mu.Lock()
	defer appMetrics.mu.Unlock()
	appMetrics.TasksTotal++
}

// DecrementTasksTotal decrements the total tasks count
func DecrementTasksTotal() {
	appMetrics.mu.Lock()
	defer appMetrics.mu.Unlock()
	if appMetrics.TasksTotal > 0 {
		appMetrics.TasksTotal--
	}
}

// IncrementFilesTotal increments the total files count
func IncrementFilesTotal() {
	appMetrics.mu.Lock()
	defer appMetrics.mu.Unlock()
	appMetrics.FilesTotal++
}

// DecrementFilesTotal decrements the total files count
func DecrementFilesTotal() {
	appMetrics.mu.Lock()
	defer appMetrics.mu.Unlock()
	if appMetrics.FilesTotal > 0 {
		appMetrics.FilesTotal--
	}
}

// IncrementNotesTotal increments the total notes count
func IncrementNotesTotal() {
	appMetrics.mu.Lock()
	defer appMetrics.mu.Unlock()
	appMetrics.NotesTotal++
}

// DecrementNotesTotal decrements the total notes count
func DecrementNotesTotal() {
	appMetrics.mu.Lock()
	defer appMetrics.mu.Unlock()
	if appMetrics.NotesTotal > 0 {
		appMetrics.NotesTotal--
	}
}

// SetDatabaseConnections sets the database connections count
func SetDatabaseConnections(count int64) {
	appMetrics.mu.Lock()
	defer appMetrics.mu.Unlock()
	appMetrics.DatabaseConnections = count
}

// ResetMetrics resets all metrics (useful for testing)
func ResetMetrics() {
	appMetrics.mu.Lock()
	defer appMetrics.mu.Unlock()

	appMetrics.RequestsTotal = make(map[string]int64)
	appMetrics.RequestsDuration = make(map[string][]time.Duration)
	appMetrics.RequestsErrors = make(map[string]int64)
	appMetrics.ActiveConnections = 0
	appMetrics.UsersTotal = 0
	appMetrics.BookmarksTotal = 0
	appMetrics.TasksTotal = 0
	appMetrics.FilesTotal = 0
	appMetrics.NotesTotal = 0
	appMetrics.DatabaseConnections = 0
	appMetrics.LastRestart = time.Now()
}

// Helper functions to copy maps safely
func copyMap(original map[string]int64) map[string]int64 {
	copy := make(map[string]int64)
	for k, v := range original {
		copy[k] = v
	}
	return copy
}

func copyDurationMap(original map[string][]time.Duration) map[string][]time.Duration {
	result := make(map[string][]time.Duration)
	for k, v := range original {
		sliceCopy := make([]time.Duration, len(v))
		copy(sliceCopy, v)
		result[k] = sliceCopy
	}
	return result
}
