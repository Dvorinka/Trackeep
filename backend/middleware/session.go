package middleware

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v8"
	"github.com/trackeep/backend/models"
)

// SessionData represents the structure of session data stored in Redis
type SessionData struct {
	UserID     uint      `json:"user_id"`
	Email      string    `json:"email"`
	Username   string    `json:"username"`
	Role       string    `json:"role"`
	SessionID  string    `json:"session_id"`
	IPAddress  string    `json:"ip_address"`
	UserAgent  string    `json:"user_agent"`
	CreatedAt  time.Time `json:"created_at"`
	LastActive time.Time `json:"last_active"`
}

// SessionStore interface for session storage
type SessionStore interface {
	CreateSession(sessionData *SessionData) error
	GetSession(sessionID string) (*SessionData, error)
	UpdateSession(sessionID string, sessionData *SessionData) error
	DeleteSession(sessionID string) error
	CleanupExpiredSessions() error
}

// RedisSessionStore implements SessionStore using Redis (or fallback to memory)
type RedisSessionStore struct {
	redisClient *redis.Client
	sessions    map[string]*SessionData // Fallback in-memory store
}

// NewSessionStore creates a new session store
func NewSessionStore(redisClient *redis.Client) SessionStore {
	return &RedisSessionStore{
		redisClient: redisClient,
		sessions:    make(map[string]*SessionData),
	}
}

// CreateSession creates a new session
func (r *RedisSessionStore) CreateSession(sessionData *SessionData) error {
	sessionData.CreatedAt = time.Now()
	sessionData.LastActive = time.Now()

	// Try Redis first
	if r.redisClient != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()

		sessionJSON, err := json.Marshal(sessionData)
		if err != nil {
			return fmt.Errorf("failed to marshal session data: %w", err)
		}

		// Store in Redis with 24 hour expiration
		err = r.redisClient.Set(ctx, "session:"+sessionData.SessionID, sessionJSON, 24*time.Hour).Err()
		if err == nil {
			return nil
		}
		// Fall back to memory if Redis fails
	}

	// Fallback to in-memory storage
	r.sessions[sessionData.SessionID] = sessionData
	return nil
}

// GetSession retrieves a session by ID
func (r *RedisSessionStore) GetSession(sessionID string) (*SessionData, error) {
	// Try Redis first
	if r.redisClient != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()

		sessionJSON, err := r.redisClient.Get(ctx, "session:"+sessionID).Result()
		if err == nil {
			var sessionData SessionData
			if err := json.Unmarshal([]byte(sessionJSON), &sessionData); err == nil {
				// Update last active time
				sessionData.LastActive = time.Now()
				// Update in Redis
				updatedJSON, _ := json.Marshal(sessionData)
				r.redisClient.Set(ctx, "session:"+sessionID, updatedJSON, 24*time.Hour)
				return &sessionData, nil
			}
		}
		// Fall back to memory if Redis fails
	}

	// Fallback to in-memory storage
	if session, exists := r.sessions[sessionID]; exists {
		// Update last active time
		session.LastActive = time.Now()
		return session, nil
	}

	return nil, fmt.Errorf("session not found")
}

// UpdateSession updates an existing session
func (r *RedisSessionStore) UpdateSession(sessionID string, sessionData *SessionData) error {
	sessionData.LastActive = time.Now()

	// Try Redis first
	if r.redisClient != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()

		sessionJSON, err := json.Marshal(sessionData)
		if err != nil {
			return fmt.Errorf("failed to marshal session data: %w", err)
		}

		err = r.redisClient.Set(ctx, "session:"+sessionID, sessionJSON, 24*time.Hour).Err()
		if err == nil {
			return nil
		}
		// Fall back to memory if Redis fails
	}

	// Fallback to in-memory storage
	if _, exists := r.sessions[sessionID]; exists {
		r.sessions[sessionID] = sessionData
		return nil
	}

	return fmt.Errorf("session not found")
}

// DeleteSession removes a session
func (r *RedisSessionStore) DeleteSession(sessionID string) error {
	// Try Redis first
	if r.redisClient != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()

		err := r.redisClient.Del(ctx, "session:"+sessionID).Err()
		if err == nil {
			// Also remove from memory fallback
			delete(r.sessions, sessionID)
			return nil
		}
		// Fall back to memory if Redis fails
	}

	// Fallback to in-memory storage
	delete(r.sessions, sessionID)
	return nil
}

// CleanupExpiredSessions removes sessions older than 24 hours
func (r *RedisSessionStore) CleanupExpiredSessions() error {
	now := time.Now()
	for sessionID, session := range r.sessions {
		if now.Sub(session.LastActive) > 24*time.Hour {
			delete(r.sessions, sessionID)
		}
	}
	return nil
}

// Global session store instance
var sessionStore SessionStore

// InitSessionStore initializes the session store
func InitSessionStore(redisClient *redis.Client) {
	sessionStore = NewSessionStore(redisClient)

	// Start cleanup goroutine
	go func() {
		ticker := time.NewTicker(1 * time.Hour)
		defer ticker.Stop()

		for range ticker.C {
			if sessionStore != nil {
				sessionStore.CleanupExpiredSessions()
			}
		}
	}()
}

// SessionMiddleware creates and manages user sessions
func SessionMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip session management for health checks and static assets
		path := c.Request.URL.Path
		if path == "/health" || path == "/metrics" || strings.HasPrefix(path, "/static") {
			c.Next()
			return
		}

		// Get session ID from header or create new one
		sessionID := c.GetHeader("X-Session-ID")
		if sessionID == "" {
			sessionID = generateSessionID()
			c.Header("X-Session-ID", sessionID)
		}

		// Try to get existing session
		session, err := sessionStore.GetSession(sessionID)
		if err != nil {
			// No existing session, check if user is authenticated via JWT
			if user, exists := c.Get("user"); exists {
				// Create session from authenticated user
				if userModel, ok := user.(models.User); ok {
					session = &SessionData{
						SessionID: sessionID,
						UserID:    userModel.ID,
						Email:     userModel.Email,
						Username:  userModel.Username,
						Role:      userModel.Role,
						IPAddress: c.ClientIP(),
						UserAgent: c.GetHeader("User-Agent"),
					}
					sessionStore.CreateSession(session)
				}
			}
		}

		// Set session data in context
		if session != nil {
			c.Set("session_id", session.SessionID)
			c.Set("session_user_id", session.UserID)
			c.Set("session_email", session.Email)
			c.Set("session_username", session.Username)
			c.Set("session_role", session.Role)
		}

		c.Next()
	}
}

// GetSessionFromContext retrieves session data from Gin context
func GetSessionFromContext(c *gin.Context) (*SessionData, error) {
	if sessionID, exists := c.Get("session_id"); exists {
		return sessionStore.GetSession(sessionID.(string))
	}
	return nil, fmt.Errorf("no session in context")
}

// GetUserIDFromSession safely gets user ID from session or context
func GetUserIDFromSession(c *gin.Context) uint {
	// First try session
	if session, err := GetSessionFromContext(c); err == nil {
		return session.UserID
	}

	// Fallback to context (for demo mode or JWT)
	if userID, exists := c.Get("user_id"); exists {
		if id, ok := userID.(uint); ok {
			return id
		}
	}
	if userID, exists := c.Get("userID"); exists {
		if id, ok := userID.(uint); ok {
			return id
		}
	}

	// Final fallback for demo mode
	if os.Getenv("VITE_DEMO_MODE") == "true" {
		return 1
	}

	return 0
}

// GetUserEmailFromSession safely gets user email from session or context
func GetUserEmailFromSession(c *gin.Context) string {
	// First try session
	if session, err := GetSessionFromContext(c); err == nil {
		return session.Email
	}

	// Fallback to context
	if email, exists := c.Get("user_email"); exists {
		if e, ok := email.(string); ok {
			return e
		}
	}

	// Fallback for demo mode
	if os.Getenv("VITE_DEMO_MODE") == "true" {
		return "demo@trackeep.com"
	}

	return "unknown"
}

// generateSessionID generates a unique session ID
func generateSessionID() string {
	return fmt.Sprintf("sess_%d_%s", time.Now().UnixNano(), "trackeep")
}

// GetSessionStore returns the global session store instance
func GetSessionStore() SessionStore {
	return sessionStore
}

// CleanupSessionsOnShutdown gracefully cleans up sessions
func CleanupSessionsOnShutdown() {
	if sessionStore != nil {
		sessionStore.CleanupExpiredSessions()
	}
}
