package middleware

import (
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// RateLimiter implements a simple in-memory rate limiter
type RateLimiter struct {
	clients map[string]*ClientInfo
	mutex   sync.RWMutex
	limit   int
	window  time.Duration
}

type ClientInfo struct {
	requests  int
	resetTime time.Time
}

// NewRateLimiter creates a new rate limiter
func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
	limiter := &RateLimiter{
		clients: make(map[string]*ClientInfo),
		limit:   limit,
		window:  window,
	}

	// Start cleanup goroutine
	go limiter.cleanup()

	return limiter
}

// Middleware returns the Gin middleware function
func (rl *RateLimiter) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		clientIP := c.ClientIP()

		rl.mutex.Lock()
		client, exists := rl.clients[clientIP]

		if !exists {
			client = &ClientInfo{
				requests:  0,
				resetTime: time.Now().Add(rl.window),
			}
			rl.clients[clientIP] = client
		}

		// Reset window if expired
		if time.Now().After(client.resetTime) {
			client.requests = 0
			client.resetTime = time.Now().Add(rl.window)
		}

		client.requests++

		// Check if limit exceeded
		if client.requests > rl.limit {
			rl.mutex.Unlock()
			c.Header("X-RateLimit-Limit", fmt.Sprintf("%d", rl.limit))
			c.Header("X-RateLimit-Remaining", "0")
			c.Header("X-RateLimit-Reset", fmt.Sprintf("%d", client.resetTime.Unix()))
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":       "Rate limit exceeded",
				"message":     fmt.Sprintf("Too many requests. Limit is %d per %v", rl.limit, rl.window),
				"retry_after": time.Until(client.resetTime).Seconds(),
			})
			c.Abort()
			return
		}

		remaining := rl.limit - client.requests
		rl.mutex.Unlock()

		// Set rate limit headers
		c.Header("X-RateLimit-Limit", fmt.Sprintf("%d", rl.limit))
		c.Header("X-RateLimit-Remaining", fmt.Sprintf("%d", remaining))
		c.Header("X-RateLimit-Reset", fmt.Sprintf("%d", client.resetTime.Unix()))

		c.Next()
	}
}

// cleanup removes expired client entries
func (rl *RateLimiter) cleanup() {
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		rl.mutex.Lock()
		now := time.Now()
		for ip, client := range rl.clients {
			if now.After(client.resetTime.Add(rl.window)) {
				delete(rl.clients, ip)
			}
		}
		rl.mutex.Unlock()
	}
}

// RateLimitConfig holds configuration for different endpoint types
type RateLimitConfig struct {
	AuthRequests    int           // requests per window for auth endpoints
	GeneralRequests int           // requests per window for general endpoints
	Window          time.Duration // time window for rate limiting
}

// DefaultRateLimitConfig returns sensible defaults
func DefaultRateLimitConfig() RateLimitConfig {
	return RateLimitConfig{
		AuthRequests:    5,   // 5 login attempts per minute
		GeneralRequests: 100, // 100 requests per minute
		Window:          time.Minute,
	}
}

// RateLimit creates rate limiters for different endpoint types
func RateLimit(config RateLimitConfig) map[string]*RateLimiter {
	return map[string]*RateLimiter{
		"auth":    NewRateLimiter(config.AuthRequests, config.Window),
		"general": NewRateLimiter(config.GeneralRequests, config.Window),
	}
}

// AuthRateLimit applies stricter rate limiting to authentication endpoints
func AuthRateLimit(limiter *RateLimiter) gin.HandlerFunc {
	return limiter.Middleware()
}

// GeneralRateLimit applies standard rate limiting to general endpoints
func GeneralRateLimit(limiter *RateLimiter) gin.HandlerFunc {
	return limiter.Middleware()
}
