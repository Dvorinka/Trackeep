# Redis Implementation Quick Reference for Trackeep

## Overview

This guide provides practical implementation patterns for integrating Redis into the Trackeep application based on the comprehensive architecture analysis.

## 1. Quick Start Configuration

### 1.1 Add Redis to Docker Compose

```yaml
# docker-compose.yml
services:
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis_data:/data
    command: >
      redis-server
      --appendonly yes
      --appendfsync everysec
      --maxmemory 256mb
      --maxmemory-policy allkeys-lru
      --requirepass ${REDIS_PASSWORD:-changeme}
    networks:
      - trackeep-network
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD:-changeme}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3
    ports:
      - "127.0.0.1:6379:6379"  # Local access only

volumes:
  redis_data:
```

### 1.2 Environment Variables (.env)

```bash
# Redis Configuration
REDIS_ADDR=redis:6379
REDIS_PASSWORD=your_secure_password_here
REDIS_DB=0
REDIS_POOL_SIZE=20
REDIS_DIAL_TIMEOUT=5s
REDIS_READ_TIMEOUT=3s
REDIS_WRITE_TIMEOUT=3s

# Feature Flags
REDIS_SESSIONS_ENABLED=true
REDIS_CACHE_ENABLED=true
REDIS_RATELIMIT_ENABLED=true
```

## 2. Core Implementation

### 2.1 Redis Client Setup

```go
// backend/config/redis.go
package config

import (
	"context"
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/go-redis/redis/v8"
)

var RedisClient *redis.Client

// InitRedis initializes the Redis client
func InitRedis() error {
	poolSize, _ := strconv.Atoi(os.Getenv("REDIS_POOL_SIZE"))
	if poolSize == 0 {
		poolSize = 20
	}

	dialTimeout, _ := time.ParseDuration(os.Getenv("REDIS_DIAL_TIMEOUT"))
	if dialTimeout == 0 {
		dialTimeout = 5 * time.Second
	}

	readTimeout, _ := time.ParseDuration(os.Getenv("REDIS_READ_TIMEOUT"))
	if readTimeout == 0 {
		readTimeout = 3 * time.Second
	}

	writeTimeout, _ := time.ParseDuration(os.Getenv("REDIS_WRITE_TIMEOUT"))
	if writeTimeout == 0 {
		writeTimeout = 3 * time.Second
	}

	RedisClient = redis.NewClient(&redis.Options{
		Addr:         os.Getenv("REDIS_ADDR"),
		Password:     os.Getenv("REDIS_PASSWORD"),
		DB:           0,
		PoolSize:     poolSize,
		MinIdleConns: 5,
		DialTimeout:  dialTimeout,
		ReadTimeout:  readTimeout,
		WriteTimeout: writeTimeout,
		MaxConnAge:   time.Hour,
		PoolTimeout:  5 * time.Second,
		IdleTimeout:  10 * time.Minute,
	})

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := RedisClient.Ping(ctx).Err(); err != nil {
		return fmt.Errorf("failed to connect to Redis: %w", err)
	}

	fmt.Println("Redis connected successfully")
	return nil
}

// IsRedisEnabled checks if Redis is configured and available
func IsRedisEnabled() bool {
	return RedisClient != nil && os.Getenv("REDIS_ADDR") != ""
}
```

### 2.2 Session Store Migration

```go
// backend/middleware/session_redis.go
package middleware

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/trackeep/backend/config"
)

// RedisSessionStore implements distributed session storage
type RedisSessionStore struct {
	fallback *MemorySessionStore
}

// NewRedisSessionStore creates a new Redis-backed session store
func NewRedisSessionStore() SessionStore {
	return &RedisSessionStore{
		fallback: NewMemorySessionStore(),
	}
}

func (r *RedisSessionStore) CreateSession(sessionData *SessionData) error {
	sessionData.CreatedAt = time.Now()
	sessionData.LastActive = time.Now()

	if config.IsRedisEnabled() {
		ctx := context.Background()
		key := fmt.Sprintf("tk:session:%s", sessionData.SessionID)
		
		data, err := json.Marshal(sessionData)
		if err != nil {
			return err
		}

		// Store session with 24h TTL
		if err := config.RedisClient.Set(ctx, key, data, 24*time.Hour).Err(); err != nil {
			// Fallback to memory on Redis error
			return r.fallback.CreateSession(sessionData)
		}

		// Add to user's session set
		userKey := fmt.Sprintf("tk:user:sessions:%d", sessionData.UserID)
		config.RedisClient.SAdd(ctx, userKey, sessionData.SessionID)
		config.RedisClient.Expire(ctx, userKey, 24*time.Hour)
		
		return nil
	}

	return r.fallback.CreateSession(sessionData)
}

func (r *RedisSessionStore) GetSession(sessionID string) (*SessionData, error) {
	if config.IsRedisEnabled() {
		ctx := context.Background()
		key := fmt.Sprintf("tk:session:%s", sessionID)

		data, err := config.RedisClient.Get(ctx, key).Bytes()
		if err == nil {
			var session SessionData
			if err := json.Unmarshal(data, &session); err == nil {
				// Update last active
				session.LastActive = time.Now()
				r.UpdateSession(sessionID, &session)
				return &session, nil
			}
		}
	}

	return r.fallback.GetSession(sessionID)
}

func (r *RedisSessionStore) UpdateSession(sessionID string, sessionData *SessionData) error {
	if config.IsRedisEnabled() {
		ctx := context.Background()
		key := fmt.Sprintf("tk:session:%s", sessionID)

		data, err := json.Marshal(sessionData)
		if err != nil {
			return err
		}

		if err := config.RedisClient.Set(ctx, key, data, 24*time.Hour).Err(); err != nil {
			return r.fallback.UpdateSession(sessionID, sessionData)
		}
		
		return nil
	}

	return r.fallback.UpdateSession(sessionID, sessionData)
}

func (r *RedisSessionStore) DeleteSession(sessionID string) error {
	if config.IsRedisEnabled() {
		ctx := context.Background()
		key := fmt.Sprintf("tk:session:%s", sessionID)

		// Get session to find user ID
		data, err := config.RedisClient.Get(ctx, key).Bytes()
		if err == nil {
			var session SessionData
			if err := json.Unmarshal(data, &session); err == nil {
				// Remove from user's session set
				userKey := fmt.Sprintf("tk:user:sessions:%d", session.UserID)
				config.RedisClient.SRem(ctx, userKey, sessionID)
			}
		}

		config.RedisClient.Del(ctx, key)
	}

	return r.fallback.DeleteSession(sessionID)
}

func (r *RedisSessionStore) CleanupExpiredSessions() error {
	// Redis handles expiration automatically via TTL
	// Just clean up fallback
	return r.fallback.CleanupExpiredSessions()
}
```

### 2.3 Distributed Rate Limiter

```go
// backend/middleware/rate_limiter_redis.go
package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/trackeep/backend/config"
)

// RedisRateLimiter implements distributed rate limiting
type RedisRateLimiter struct {
	limit  int
	window time.Duration
	keyPrefix string
}

// NewRedisRateLimiter creates a new Redis-backed rate limiter
func NewRedisRateLimiter(limit int, window time.Duration, keyPrefix string) *RedisRateLimiter {
	return &RedisRateLimiter{
		limit:     limit,
		window:    window,
		keyPrefix: keyPrefix,
	}
}

// SlidingWindowRateLimit uses Redis sorted sets for accurate sliding window
func (rl *RedisRateLimiter) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		if !config.IsRedisEnabled() {
			c.Next()
			return
		}

		clientIP := c.ClientIP()
		key := fmt.Sprintf("%s:%s", rl.keyPrefix, clientIP)

		ctx := context.Background()
		now := time.Now().Unix()
		windowStart := now - int64(rl.window.Seconds())

		// Remove old entries
		config.RedisClient.ZRemRangeByScore(ctx, key, "0", strconv.FormatInt(windowStart, 10))

		// Count current requests
		count, err := config.RedisClient.ZCard(ctx, key).Result()
		if err != nil {
			c.Next()
			return
		}

		// Check limit
		if int(count) >= rl.limit {
			c.Header("X-RateLimit-Limit", fmt.Sprintf("%d", rl.limit))
			c.Header("X-RateLimit-Remaining", "0")
			c.Header("X-RateLimit-Reset", strconv.FormatInt(now+int64(rl.window.Seconds()), 10))
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":   "Rate limit exceeded",
				"message": fmt.Sprintf("Too many requests. Limit is %d per %v", rl.limit, rl.window),
			})
			c.Abort()
			return
		}

		// Add current request
		config.RedisClient.ZAdd(ctx, key, &redis.Z{
			Score:  float64(now),
			Member: now,
		})
		config.RedisClient.Expire(ctx, key, rl.window)

		// Set headers
		remaining := rl.limit - int(count) - 1
		c.Header("X-RateLimit-Limit", fmt.Sprintf("%d", rl.limit))
		c.Header("X-RateLimit-Remaining", fmt.Sprintf("%d", remaining))
		c.Header("X-RateLimit-Reset", strconv.FormatInt(now+int64(rl.window.Seconds()), 10))

		c.Next()
	}
}

// TokenBucketRateLimit uses token bucket algorithm for burst handling
type TokenBucketRateLimiter struct {
	capacity    int
	refillRate  float64 // tokens per second
	keyPrefix   string
}

func NewTokenBucketRateLimiter(capacity int, refillRate float64, keyPrefix string) *TokenBucketRateLimiter {
	return &TokenBucketRateLimiter{
		capacity:   capacity,
		refillRate: refillRate,
		keyPrefix:  keyPrefix,
	}
}

func (rl *TokenBucketRateLimiter) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		if !config.IsRedisEnabled() {
			c.Next()
			return
		}

		clientIP := c.ClientIP()
		key := fmt.Sprintf("%s:%s", rl.keyPrefix, clientIP)
		ctx := context.Background()

		// Lua script for atomic token bucket
		script := `
			local key = KEYS[1]
			local capacity = tonumber(ARGV[1])
			local refill_rate = tonumber(ARGV[2])
			local now = tonumber(ARGV[3])
			
			local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
			local tokens = tonumber(bucket[1]) or capacity
			local last_refill = tonumber(bucket[2]) or now
			
			local delta = math.min(capacity, tokens + (now - last_refill) * refill_rate)
			
			if delta >= 1 then
				redis.call('HMSET', key, 'tokens', delta - 1, 'last_refill', now)
				redis.call('EXPIRE', key, 3600)
				return {1, math.floor(delta - 1)}
			else
				redis.call('HMSET', key, 'tokens', delta, 'last_refill', now)
				redis.call('EXPIRE', key, 3600)
				return {0, math.floor(delta)}
			end
		`

		now := float64(time.Now().Unix())
		result, err := config.RedisClient.Eval(ctx, script, []string{key}, 
			rl.capacity, rl.refillRate, now).Result()
		
		if err != nil {
			c.Next()
			return
		}

		values := result.([]interface{})
		allowed := values[0].(int64) == 1
		remaining := values[1].(int64)

		c.Header("X-RateLimit-Limit", fmt.Sprintf("%d", rl.capacity))
		c.Header("X-RateLimit-Remaining", fmt.Sprintf("%d", remaining))

		if !allowed {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":   "Rate limit exceeded",
				"message": "Too many requests. Please slow down.",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}
```

### 2.4 Caching Middleware

```go
// backend/middleware/cache_redis.go
package middleware

import (
	"context"
	"crypto/md5"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/trackeep/backend/config"
)

// RedisCacheConfig holds Redis cache configuration
type RedisCacheConfig struct {
	Duration    time.Duration
	KeyPrefix   string
	Enabled     bool
}

// DefaultRedisCacheConfig returns default cache configuration
func DefaultRedisCacheConfig() RedisCacheConfig {
	return RedisCacheConfig{
		Duration:  5 * time.Minute,
		KeyPrefix: "tk:cache:",
		Enabled:   true,
	}
}

// RedisCacheMiddleware creates a Redis-based cache middleware
func RedisCacheMiddleware(config RedisCacheConfig) gin.HandlerFunc {
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

		// Skip if Redis not available
		if !config.IsRedisEnabled() {
			c.Next()
			return
		}

		// Generate cache key
		cacheKey := generateRedisCacheKey(c, config.KeyPrefix)

		// Try to get from cache
		ctx := context.Background()
		cached, err := config.RedisClient.Get(ctx, cacheKey).Result()
		if err == nil && cached != "" {
			c.Header("X-Cache", "HIT")
			c.Header("Content-Type", "application/json")
			c.String(http.StatusOK, cached)
			c.Abort()
			return
		}

		// Cache miss
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
			config.RedisClient.Set(ctx, cacheKey, string(writer.buffer), config.Duration)
		}
	}
}

func generateRedisCacheKey(c *gin.Context, prefix string) string {
	keyParts := []string{
		prefix,
		c.Request.URL.Path,
		c.Request.URL.RawQuery,
	}

	if userID := c.GetString("userID"); userID != "" {
		keyParts = append(keyParts, "u:"+userID)
	}

	key := strings.Join(keyParts, ":")
	hash := md5.Sum([]byte(key))
	return fmt.Sprintf("%s%x", prefix, hash)
}

// InvalidateUserCache removes all cache entries for a user
func InvalidateUserCache(userID string) error {
	if !config.IsRedisEnabled() {
		return nil
	}

	ctx := context.Background()
	pattern := fmt.Sprintf("tk:cache:*u:%s*", userID)
	
	keys, err := config.RedisClient.Keys(ctx, pattern).Result()
	if err != nil {
		return err
	}

	if len(keys) > 0 {
		return config.RedisClient.Del(ctx, keys...).Err()
	}

	return nil
}
```

## 3. Usage Patterns

### 3.1 Search Result Caching

```go
// backend/handlers/search_enhanced.go
func EnhancedSearch(c *gin.Context) {
	var filters SearchFilters
	if err := c.ShouldBindJSON(&filters); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.GetUint("user_id")
	
	// Try cache first
	cacheKey := fmt.Sprintf("tk:search:%d:%s", userID, hashFilters(filters))
	
	if config.IsRedisEnabled() {
		ctx := context.Background()
		cached, err := config.RedisClient.Get(ctx, cacheKey).Result()
		if err == nil {
			var response SearchResponse
			if json.Unmarshal([]byte(cached), &response) == nil {
				c.Header("X-Cache", "HIT")
				c.JSON(http.StatusOK, response)
				return
			}
		}
	}

	// Perform search
	results := performSearch(filters, userID)
	
	// Cache results
	if config.IsRedisEnabled() {
		ctx := context.Background()
		data, _ := json.Marshal(results)
		config.RedisClient.Set(ctx, cacheKey, data, 5*time.Minute)
	}

	c.JSON(http.StatusOK, results)
}
```

### 3.2 Analytics Aggregation Caching

```go
// backend/services/analytics_cache.go
package services

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/trackeep/backend/config"
	"github.com/trackeep/backend/models"
)

type AnalyticsCache struct {
	db *gorm.DB
}

func NewAnalyticsCache(db *gorm.DB) *AnalyticsCache {
	return &AnalyticsCache{db: db}
}

func (ac *AnalyticsCache) GetDashboardAnalytics(userID uint, startDate, endDate time.Time) (*DashboardAnalytics, error) {
	cacheKey := fmt.Sprintf("tk:analytics:dashboard:%d:%s:%s", 
		userID, startDate.Format("2006-01-02"), endDate.Format("2006-01-02"))

	// Try cache
	if config.IsRedisEnabled() {
		ctx := context.Background()
		cached, err := config.RedisClient.Get(ctx, cacheKey).Result()
		if err == nil {
			var analytics DashboardAnalytics
			if err := json.Unmarshal([]byte(cached), &analytics); err == nil {
				return &analytics, nil
			}
		}
	}

	// Compute analytics
	analytics := ac.computeDashboardAnalytics(userID, startDate, endDate)

	// Cache for 15 minutes
	if config.IsRedisEnabled() {
		ctx := context.Background()
		data, _ := json.Marshal(analytics)
		config.RedisClient.Set(ctx, cacheKey, data, 15*time.Minute)
	}

	return analytics, nil
}

func (ac *AnalyticsCache) InvalidateUserAnalytics(userID uint) {
	if !config.IsRedisEnabled() {
		return
	}

	ctx := context.Background()
	pattern := fmt.Sprintf("tk:analytics:*:%d:*", userID)
	
	keys, _ := config.RedisClient.Keys(ctx, pattern).Result()
	if len(keys) > 0 {
		config.RedisClient.Del(ctx, keys...)
	}
}
```

### 3.3 Leaderboard with Sorted Sets

```go
// backend/services/leaderboard.go
package services

import (
	"context"
	"fmt"
	"time"

	"github.com/go-redis/redis/v8"
	"github.com/trackeep/backend/config"
)

type Leaderboard struct {
	key string
}

func NewLeaderboard(challengeID uint) *Leaderboard {
	return &Leaderboard{
		key: fmt.Sprintf("tk:challenge:%d:leaderboard", challengeID),
	}
}

// AddScore adds or updates a user's score
func (lb *Leaderboard) AddScore(userID uint, score float64) error {
	if !config.IsRedisEnabled() {
		return nil
	}

	ctx := context.Background()
	member := fmt.Sprintf("%d", userID)
	
	return config.RedisClient.ZAdd(ctx, lb.key, &redis.Z{
		Score:  score,
		Member: member,
	}).Err()
}

// GetTopN returns top N participants
func (lb *Leaderboard) GetTopN(n int64) ([]LeaderboardEntry, error) {
	if !config.IsRedisEnabled() {
		return nil, nil
	}

	ctx := context.Background()
	
	results, err := config.RedisClient.ZRevRangeWithScores(ctx, lb.key, 0, n-1).Result()
	if err != nil {
		return nil, err
	}

	entries := make([]LeaderboardEntry, len(results))
	for i, result := range results {
		userID := parseUint(result.Member.(string))
		entries[i] = LeaderboardEntry{
			UserID: userID,
			Score:  result.Score,
			Rank:   i + 1,
		}
	}

	return entries, nil
}

// GetUserRank returns a specific user's rank and score
func (lb *Leaderboard) GetUserRank(userID uint) (int64, float64, error) {
	if !config.IsRedisEnabled() {
		return 0, 0, nil
	}

	ctx := context.Background()
	member := fmt.Sprintf("%d", userID)
	
	rank, err := config.RedisClient.ZRevRank(ctx, lb.key, member).Result()
	if err != nil {
		return 0, 0, err
	}

	score, err := config.RedisClient.ZScore(ctx, lb.key, member).Result()
	if err != nil {
		return 0, 0, err
	}

	return rank + 1, score, nil // Rank is 0-indexed
}

type LeaderboardEntry struct {
	UserID uint
	Score  float64
	Rank   int
}
```

## 4. Pub/Sub for Real-Time Features

```go
// backend/services/pubsub.go
package services

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/trackeep/backend/config"
)

type PubSub struct {
	ctx context.Context
}

func NewPubSub() *PubSub {
	return &PubSub{
		ctx: context.Background(),
	}
}

// PublishMessage publishes a message to a conversation channel
func (ps *PubSub) PublishMessage(conversationID uint, message interface{}) error {
	if !config.IsRedisEnabled() {
		return nil
	}

	channel := fmt.Sprintf("tk:messages:%d", conversationID)
	data, _ := json.Marshal(message)
	
	return config.RedisClient.Publish(ps.ctx, channel, data).Err()
}

// SubscribeToMessages subscribes to conversation messages
func (ps *PubSub) SubscribeToMessages(conversationID uint, handler func(message []byte)) {
	if !config.IsRedisEnabled() {
		return
	}

	channel := fmt.Sprintf("tk:messages:%d", conversationID)
	pubsub := config.RedisClient.Subscribe(ps.ctx, channel)
	defer pubsub.Close()

	ch := pubsub.Channel()
	for msg := range ch {
		handler([]byte(msg.Payload))
	}
}

// PublishNotification publishes a user notification
func (ps *PubSub) PublishNotification(userID uint, notification interface{}) error {
	if !config.IsRedisEnabled() {
		return nil
	}

	channel := fmt.Sprintf("tk:notifications:%d", userID)
	data, _ := json.Marshal(notification)
	
	return config.RedisClient.Publish(ps.ctx, channel, data).Err()
}
```

## 5. Testing and Monitoring

### 5.1 Health Check Endpoint

```go
// backend/handlers/health.go addition
func HealthCheck(c *gin.Context) {
	status := map[string]interface{}{
		"status":  "ok",
		"version": "1.0.0",
	}

	// Check Redis
	if config.IsRedisEnabled() {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		
		if err := config.RedisClient.Ping(ctx).Err(); err != nil {
			status["redis"] = "unhealthy"
			status["status"] = "degraded"
		} else {
			poolStats := config.RedisClient.PoolStats()
			status["redis"] = map[string]interface{}{
				"status":      "healthy",
				"hits":        poolStats.Hits,
				"misses":      poolStats.Misses,
				"total_conns": poolStats.TotalConns,
				"idle_conns":  poolStats.IdleConns,
			}
		}
	}

	c.JSON(http.StatusOK, status)
}
```

### 5.2 Cache Metrics Collection

```go
// backend/middleware/metrics.go addition
func RecordCacheMetrics() {
	if !config.IsRedisEnabled() {
		return
	}

	ctx := context.Background()
	info := config.RedisClient.Info(ctx, "stats").Val()
	
	// Parse key metrics
	hits := parseRedisInfoValue(info, "keyspace_hits")
	misses := parseRedisInfoValue(info, "keyspace_misses")
	
	hitRate := float64(hits) / float64(hits+misses) * 100
	
	// Log or export metrics
	log.Printf("Cache Hit Rate: %.2f%% (Hits: %d, Misses: %d)", hitRate, hits, misses)
}
```

## 6. Migration Checklist

### Phase 1: Infrastructure (Day 1)
- [ ] Add Redis to Docker Compose
- [ ] Add Redis configuration to `.env.example`
- [ ] Implement `config/redis.go` client setup
- [ ] Add Redis health check to main.go initialization
- [ ] Test connection and basic operations

### Phase 2: Session Storage (Days 2-3)
- [ ] Implement `RedisSessionStore`
- [ ] Add feature flag `REDIS_SESSIONS_ENABLED`
- [ ] Test session persistence across restarts
- [ ] Verify session cleanup works correctly
- [ ] Monitor memory usage

### Phase 3: Rate Limiting (Days 4-5)
- [ ] Implement `RedisRateLimiter` with sliding window
- [ ] Add token bucket variant for burst handling
- [ ] Configure different limits per endpoint
- [ ] Test rate limiting across multiple requests
- [ ] Verify headers are set correctly

### Phase 4: Caching (Week 2)
- [ ] Implement `RedisCacheMiddleware`
- [ ] Add search result caching
- [ ] Add analytics dashboard caching
- [ ] Implement cache invalidation on data changes
- [ ] Configure TTL strategy per content type

### Phase 5: Advanced Features (Week 3)
- [ ] Implement leaderboards with Sorted Sets
- [ ] Add Pub/Sub for real-time messaging
- [ ] Implement distributed locking if needed
- [ ] Add cache warming for hot data
- [ ] Performance benchmarking

### Phase 6: Production Readiness (Week 4)
- [ ] Add Redis Sentinel configuration
- [ ] Configure persistence (AOF + RDB)
- [ ] Set up monitoring and alerting
- [ ] Document operational procedures
- [ ] Load testing and optimization

## 7. Troubleshooting

### Common Issues

**Connection Refused**
```
Error: dial tcp: connect: connection refused
```
- Check Redis container is running: `docker-compose ps`
- Verify network configuration in docker-compose.yml
- Check firewall rules

**Authentication Failed**
```
Error: NOAUTH Authentication required
```
- Verify REDIS_PASSWORD matches docker-compose configuration
- Check for special characters in password

**Memory Limit Reached**
```
Error: OOM command not allowed when used memory > 'maxmemory'
```
- Increase maxmemory in Redis configuration
- Review eviction policy
- Check for memory leaks in cache keys

**High Connection Count**
```
Error: ERR max number of clients reached
```
- Increase maxclients in Redis configuration
- Review connection pool settings
- Check for connection leaks

### Debug Commands

```bash
# Check Redis connection
docker-compose exec redis redis-cli ping

# Monitor Redis commands in real-time
docker-compose exec redis redis-cli monitor

# Check memory usage
docker-compose exec redis redis-cli info memory

# List all keys (use sparingly)
docker-compose exec redis redis-cli keys "*"

# Get specific key info
docker-compose exec redis redis-cli ttl "tk:session:abc123"
docker-compose exec redis redis-cli type "tk:session:abc123"

# Clear all data (WARNING: Destructive)
docker-compose exec redis redis-cli flushall
```

---

**Note:** This guide is a companion to the full architecture analysis document. Refer to `REDIS_ARCHITECTURE_ANALYSIS.md` for detailed rationale and design decisions.
