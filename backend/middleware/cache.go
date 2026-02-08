package middleware

import (
	"crypto/md5"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v8"
	"golang.org/x/net/context"
)

// CacheConfig holds cache configuration
type CacheConfig struct {
	Duration    time.Duration
	KeyPrefix   string
	Enabled     bool
	RedisClient *redis.Client
}

// DefaultCacheConfig returns default cache configuration
func DefaultCacheConfig() CacheConfig {
	return CacheConfig{
		Duration:  5 * time.Minute,
		KeyPrefix: "trackeep:",
		Enabled:   true,
	}
}

// CacheMiddleware creates a cache middleware
func CacheMiddleware(config CacheConfig) gin.HandlerFunc {
	if !config.Enabled || config.RedisClient == nil {
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
		cacheKey := generateCacheKey(c, config.KeyPrefix)

		// Try to get from cache
		cached, err := config.RedisClient.Get(context.Background(), cacheKey).Result()
		if err == nil && cached != "" {
			// Cache hit
			c.Header("X-Cache", "HIT")
			c.Header("Content-Type", "application/json")
			c.String(http.StatusOK, cached)
			c.Abort()
			return
		}

		// Cache miss, continue with request
		c.Header("X-Cache", "MISS")
		
		// Capture response
		writer := &cachedResponseWriter{
			ResponseWriter: c.Writer,
			buffer:         make([]byte, 0),
		}
		c.Writer = writer

		c.Next()

		// Cache the response if successful
		if c.Writer.Status() == http.StatusOK && len(writer.buffer) > 0 {
			config.RedisClient.Set(
				context.Background(),
				cacheKey,
				string(writer.buffer),
				config.Duration,
			)
		}
	}
}

// generateCacheKey creates a unique cache key for the request
func generateCacheKey(c *gin.Context, prefix string) string {
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

// cachedResponseWriter captures response data for caching
type cachedResponseWriter struct {
	gin.ResponseWriter
	buffer []byte
}

func (w *cachedResponseWriter) Write(data []byte) (int, error) {
	w.buffer = append(w.buffer, data...)
	return w.ResponseWriter.Write(data)
}

// InvalidateCache invalidates cache entries matching a pattern
func InvalidateCache(redisClient *redis.Client, pattern string) error {
	if redisClient == nil {
		return nil
	}

	keys, err := redisClient.Keys(context.Background(), pattern).Result()
	if err != nil {
		return err
	}

	if len(keys) > 0 {
		return redisClient.Del(context.Background(), keys...).Err()
	}

	return nil
}

// CacheInvalidationMiddleware invalidates cache on write operations
func CacheInvalidationMiddleware(redisClient *redis.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()

		// Invalidate cache on successful write operations
		if c.Writer.Status() >= 200 && c.Writer.Status() < 300 &&
			(c.Request.Method == http.MethodPost ||
				c.Request.Method == http.MethodPut ||
				c.Request.Method == http.MethodDelete) {

			// Invalidate user-specific cache
			if userID := c.GetString("userID"); userID != "" {
				pattern := fmt.Sprintf("trackeep:*user:%s*", userID)
				InvalidateCache(redisClient, pattern)
			}

			// Invalidate general cache for the affected resource
			resourcePattern := fmt.Sprintf("trackeep:*%s*", c.Request.URL.Path)
			InvalidateCache(redisClient, resourcePattern)
		}
	}
}
