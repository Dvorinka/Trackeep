package middleware

import (
	"bytes"
	"io"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/trackeep/backend/config"
	"go.uber.org/zap"
)

// LoggerConfig holds configuration for the logger
type LoggerConfig struct {
	LogFile    string
	LogLevel   string
	EnableJSON bool
}

// GetLogger returns the logger instance
func (lc LoggerConfig) GetLogger() *zap.Logger {
	return config.GetLogger()
}

// Logger returns a middleware that logs HTTP requests using Zap
func Logger(config LoggerConfig) gin.HandlerFunc {
	logger := config.GetLogger()

	return gin.LoggerWithFormatter(func(param gin.LogFormatterParams) string {
		// Create log entry
		entry := map[string]interface{}{
			"timestamp":  param.TimeStamp.Format(time.RFC3339),
			"method":     param.Method,
			"path":       param.Path,
			"status":     param.StatusCode,
			"latency":    param.Latency.String(),
			"client_ip":  param.ClientIP,
			"user_agent": param.Request.UserAgent(),
			"request_id": param.Request.Header.Get("X-Request-ID"),
		}

		// Add user ID if available
		var userID interface{}
		if uid, exists := param.Keys["user_id"]; exists {
			userID = uid
			entry["user_id"] = userID
		}

		// Add error if present
		if param.ErrorMessage != "" {
			entry["error"] = param.ErrorMessage
		}

		// Log with Zap
		if param.ErrorMessage != "" {
			logger.Error("HTTP request",
				zap.String("method", param.Method),
				zap.String("path", param.Path),
				zap.Int("status", param.StatusCode),
				zap.Duration("latency", param.Latency),
				zap.String("client_ip", param.ClientIP),
				zap.String("user_agent", param.Request.UserAgent()),
				zap.Any("user_id", userID),
				zap.String("error", param.ErrorMessage),
			)
		} else {
			logger.Info("HTTP request",
				zap.String("method", param.Method),
				zap.String("path", param.Path),
				zap.Int("status", param.StatusCode),
				zap.Duration("latency", param.Latency),
				zap.String("client_ip", param.ClientIP),
				zap.String("user_agent", param.Request.UserAgent()),
				zap.Any("user_id", userID),
			)
		}

		// Return empty string since Zap handles output
		return ""
	})
}

// RequestLogger logs detailed request information using Zap
func RequestLogger() gin.HandlerFunc {
	logger := config.GetLogger()

	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		raw := c.Request.URL.RawQuery

		// Process request
		c.Next()

		// Skip logging for health checks
		if path == "/health" {
			return
		}

		// Calculate latency
		latency := time.Since(start)

		// Get request ID
		requestID := c.GetHeader("X-Request-ID")
		if requestID == "" {
			requestID = generateRequestID()
		}

		// Get user ID if authenticated
		var userID interface{}
		if uid, exists := c.Get("user_id"); exists {
			userID = uid
		}

		// Log request body for POST/PUT requests (excluding sensitive data)
		var requestBody string
		if c.Request.Method == "POST" || c.Request.Method == "PUT" {
			requestBody = logRequestBody(c)
		}

		// Create log fields
		fields := []zap.Field{
			zap.String("request_id", requestID),
			zap.String("method", c.Request.Method),
			zap.String("path", path),
			zap.String("query", raw),
			zap.Int("status", c.Writer.Status()),
			zap.Duration("latency_ms", latency),
			zap.String("client_ip", c.ClientIP()),
			zap.String("user_agent", c.Request.UserAgent()),
			zap.String("referer", c.Request.Referer()),
			zap.String("content_type", c.GetHeader("Content-Type")),
			zap.Int64("content_length", c.Request.ContentLength),
		}

		if userID != nil {
			fields = append(fields, zap.Any("user_id", userID))
		}

		if requestBody != "" {
			fields = append(fields, zap.String("request_body", requestBody))
		}

		if c.Writer.Size() > 0 {
			fields = append(fields, zap.Int("response_size", c.Writer.Size()))
		}

		if len(c.Errors) > 0 {
			fields = append(fields, zap.String("errors", c.Errors.String()))
		}

		// Log based on status code
		statusCode := c.Writer.Status()
		if statusCode >= 500 {
			logger.Error("HTTP request", fields...)
		} else if statusCode >= 400 {
			logger.Warn("HTTP request", fields...)
		} else {
			logger.Info("HTTP request", fields...)
		}
	}
}

// logRequestBody safely logs request body
func logRequestBody(c *gin.Context) string {
	// Skip logging for file uploads and sensitive endpoints
	if c.Request.Header.Get("Content-Type") == "multipart/form-data" {
		return "[multipart data]"
	}

	if c.Request.URL.Path == "/api/v1/auth/login" ||
		c.Request.URL.Path == "/api/v1/auth/register" {
		return "[sensitive data]"
	}

	// Read body
	bodyBytes, err := io.ReadAll(c.Request.Body)
	if err != nil {
		return "[failed to read body]"
	}

	// Restore body for next handler
	c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))

	// Limit body size for logging
	if len(bodyBytes) > 1024 {
		return string(bodyBytes[:1024]) + "... [truncated]"
	}

	return string(bodyBytes)
}

// SecurityLogger logs security-related events
func SecurityLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Log authentication failures
		if c.Writer.Status() == 401 {
			logSecurityEvent("authentication_failure", map[string]interface{}{
				"client_ip":  c.ClientIP(),
				"path":       c.Request.URL.Path,
				"user_agent": c.Request.UserAgent(),
				"timestamp":  time.Now().Format(time.RFC3339),
			})
		}

		// Log authorization failures
		if c.Writer.Status() == 403 {
			logSecurityEvent("authorization_failure", map[string]interface{}{
				"client_ip":  c.ClientIP(),
				"path":       c.Request.URL.Path,
				"user_agent": c.Request.UserAgent(),
				"timestamp":  time.Now().Format(time.RFC3339),
			})
		}

		c.Next()
	}
}

// logSecurityEvent logs security-related events using Zap
func logSecurityEvent(eventType string, data map[string]interface{}) {
	logger := config.GetLogger()

	fields := []zap.Field{
		zap.String("event_type", "security"),
		zap.String("event", eventType),
		zap.String("timestamp", time.Now().Format(time.RFC3339)),
	}

	for k, v := range data {
		fields = append(fields, zap.Any(k, v))
	}

	logger.Warn("Security event", fields...)
}

// PerformanceLogger logs performance metrics
func PerformanceLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()

		c.Next()

		// Log slow requests (> 1 second)
		latency := time.Since(start)
		if latency > time.Second {
			logPerformanceEvent("slow_request", map[string]interface{}{
				"path":       c.Request.URL.Path,
				"method":     c.Request.Method,
				"latency_ms": latency.Milliseconds(),
				"status":     c.Writer.Status(),
				"client_ip":  c.ClientIP(),
				"timestamp":  time.Now().Format(time.RFC3339),
			})
		}
	}
}

// logPerformanceEvent logs performance-related events using Zap
func logPerformanceEvent(eventType string, data map[string]interface{}) {
	logger := config.GetLogger()

	fields := []zap.Field{
		zap.String("event_type", "performance"),
		zap.String("event", eventType),
		zap.String("timestamp", time.Now().Format(time.RFC3339)),
	}

	for k, v := range data {
		fields = append(fields, zap.Any(k, v))
	}

	logger.Info("Performance event", fields...)
}
