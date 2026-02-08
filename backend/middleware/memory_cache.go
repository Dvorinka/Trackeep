package middleware

import (
	"crypto/md5"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// MemoryCacheItem represents an item in memory cache
type MemoryCacheItem struct {
	Data      []byte
	ExpiresAt time.Time
}

// MemoryCache represents an in-memory cache
type MemoryCache struct {
	items map[string]MemoryCacheItem
	mutex sync.RWMutex
}

// NewMemoryCache creates a new memory cache
func NewMemoryCache() *MemoryCache {
	cache := &MemoryCache{
		items: make(map[string]MemoryCacheItem),
	}
	
	// Start cleanup goroutine
	go cache.cleanup()
	
	return cache
}

// Get retrieves an item from cache
func (c *MemoryCache) Get(key string) ([]byte, bool) {
	c.mutex.RLock()
	defer c.mutex.RUnlock()

	item, exists := c.items[key]
	if !exists || time.Now().After(item.ExpiresAt) {
		return nil, false
	}

	return item.Data, true
}

// Set stores an item in cache
func (c *MemoryCache) Set(key string, data []byte, duration time.Duration) {
	c.mutex.Lock()
	defer c.mutex.Unlock()

	c.items[key] = MemoryCacheItem{
		Data:      data,
		ExpiresAt: time.Now().Add(duration),
	}
}

// Delete removes an item from cache
func (c *MemoryCache) Delete(key string) {
	c.mutex.Lock()
	defer c.mutex.Unlock()

	delete(c.items, key)
}

// DeletePattern removes items matching a pattern
func (c *MemoryCache) DeletePattern(pattern string) {
	c.mutex.Lock()
	defer c.mutex.Unlock()

	for key := range c.items {
		if strings.Contains(key, pattern) {
			delete(c.items, key)
		}
	}
}

// cleanup removes expired items
func (c *MemoryCache) cleanup() {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		c.mutex.Lock()
		now := time.Now()
		for key, item := range c.items {
			if now.After(item.ExpiresAt) {
				delete(c.items, key)
			}
		}
		c.mutex.Unlock()
	}
}

// Global memory cache instance
var globalMemoryCache = NewMemoryCache()

// MemoryCacheConfig holds memory cache configuration
type MemoryCacheConfig struct {
	Duration  time.Duration
	KeyPrefix string
	Enabled   bool
}

// DefaultMemoryCacheConfig returns default memory cache configuration
func DefaultMemoryCacheConfig() MemoryCacheConfig {
	return MemoryCacheConfig{
		Duration:  5 * time.Minute,
		KeyPrefix: "trackeep:",
		Enabled:   true,
	}
}

// MemoryCacheMiddleware creates a memory cache middleware
func MemoryCacheMiddleware(config MemoryCacheConfig) gin.HandlerFunc {
	if !config.Enabled {
		return func(c *gin.Context) {
			c.Next()
		}
	}

	return func(c *gin.Context) {
		// Only cache GET requests
		if c.Request.Method != http.MethodGet {
			c.Next()
			return
		}

		// Generate cache key
		cacheKey := generateMemoryCacheKey(c, config.KeyPrefix)

		// Try to get from cache
		if data, hit := globalMemoryCache.Get(cacheKey); hit {
			// Cache hit
			c.Header("X-Cache", "HIT")
			c.Header("Content-Type", "application/json")
			c.Data(http.StatusOK, "application/json", data)
			c.Abort()
			return
		}

		// Cache miss, continue with request
		c.Header("X-Cache", "MISS")
		
		// Capture response
		writer := &memoryCachedResponseWriter{
			ResponseWriter: c.Writer,
			buffer:         make([]byte, 0),
		}
		c.Writer = writer

		c.Next()

		// Cache the response if successful
		if c.Writer.Status() == http.StatusOK && len(writer.buffer) > 0 {
			globalMemoryCache.Set(cacheKey, writer.buffer, config.Duration)
		}
	}
}

// generateMemoryCacheKey creates a unique cache key for the request
func generateMemoryCacheKey(c *gin.Context, prefix string) string {
	// Include path, query params, and user ID if available
	keyParts := []string{
		prefix,
		c.Request.URL.Path,
		c.Request.URL.RawQuery,
	}

	// Add user ID for personalized caching
	if userID := c.GetString("userID"); userID != "" {
		keyParts = append(keyParts, "user:"+userID)
	}

	// Create hash of the key to avoid long keys
	key := strings.Join(keyParts, ":")
	hash := md5.Sum([]byte(key))
	return fmt.Sprintf("%x", hash)
}

// memoryCachedResponseWriter captures response data for caching
type memoryCachedResponseWriter struct {
	gin.ResponseWriter
	buffer []byte
}

func (w *memoryCachedResponseWriter) Write(data []byte) (int, error) {
	w.buffer = append(w.buffer, data...)
	return w.ResponseWriter.Write(data)
}

// InvalidateMemoryCache invalidates cache entries matching a pattern
func InvalidateMemoryCache(pattern string) {
	globalMemoryCache.DeletePattern(pattern)
}

// MemoryCacheInvalidationMiddleware invalidates cache on write operations
func MemoryCacheInvalidationMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()

		// Invalidate cache on successful write operations
		if c.Writer.Status() >= 200 && c.Writer.Status() < 300 &&
			(c.Request.Method == http.MethodPost ||
				c.Request.Method == http.MethodPut ||
				c.Request.Method == http.MethodDelete) {

			// Invalidate user-specific cache
			if userID := c.GetString("userID"); userID != "" {
				pattern := fmt.Sprintf("user:%s", userID)
				InvalidateMemoryCache(pattern)
			}

			// Invalidate general cache for the affected resource
			resourcePattern := fmt.Sprintf("%s", c.Request.URL.Path)
			InvalidateMemoryCache(resourcePattern)
		}
	}
}
