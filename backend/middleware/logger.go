package middleware

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"os"
	"time"

	"github.com/gin-gonic/gin"
)

// LoggerConfig holds configuration for the logger
type LoggerConfig struct {
	LogFile    string
	LogLevel   string
	EnableJSON bool
}

// Logger returns a middleware that logs HTTP requests
func Logger(config LoggerConfig) gin.HandlerFunc {
	// Create log file if specified
	var file *os.File
	if config.LogFile != "" {
		var err error
		file, err = os.OpenFile(config.LogFile, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
		if err != nil {
			log.Printf("Failed to open log file: %v", err)
		}
	}

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
		if userID, exists := param.Keys["user_id"]; exists {
			entry["user_id"] = userID
		}

		// Add error if present
		if param.ErrorMessage != "" {
			entry["error"] = param.ErrorMessage
		}

		// Format output
		var output string
		if config.EnableJSON {
			jsonData, _ := json.Marshal(entry)
			output = string(jsonData) + "\n"
		} else {
			output = fmt.Sprintf("[%s] %s %s %d %s %s %s",
				entry["timestamp"],
				entry["method"],
				entry["path"],
				entry["status"],
				entry["latency"],
				entry["client_ip"],
				entry["user_agent"],
			)
			if userID, exists := entry["user_id"]; exists {
				output += fmt.Sprintf(" user_id:%v", userID)
			}
			if param.ErrorMessage != "" {
				output += fmt.Sprintf(" error:%s", param.ErrorMessage)
			}
			output += "\n"
		}

		// Write to file and console
		if file != nil {
			file.WriteString(output)
		}
		return output
	})
}

// RequestLogger logs detailed request information
func RequestLogger() gin.HandlerFunc {
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

		// Get client IP
		clientIP := c.ClientIP()

		// Get status code
		statusCode := c.Writer.Status()

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

		// Create log entry
		logEntry := map[string]interface{}{
			"timestamp":      start.Format(time.RFC3339),
			"request_id":     requestID,
			"method":         c.Request.Method,
			"path":           path,
			"query":          raw,
			"status":         statusCode,
			"latency_ms":     latency.Milliseconds(),
			"client_ip":      clientIP,
			"user_agent":     c.Request.UserAgent(),
			"referer":        c.Request.Referer(),
			"content_type":   c.GetHeader("Content-Type"),
			"content_length": c.Request.ContentLength,
		}

		if userID != nil {
			logEntry["user_id"] = userID
		}

		// Log request body for POST/PUT requests (excluding sensitive data)
		if c.Request.Method == "POST" || c.Request.Method == "PUT" {
			body := logRequestBody(c)
			if body != "" {
				logEntry["request_body"] = body
			}
		}

		// Log response size
		if c.Writer.Size() > 0 {
			logEntry["response_size"] = c.Writer.Size()
		}

		// Log errors
		if len(c.Errors) > 0 {
			logEntry["errors"] = c.Errors.String()
		}

		// Write structured log
		logJSON(logEntry)
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

// logJSON writes structured JSON logs
func logJSON(data map[string]interface{}) {
	jsonData, err := json.Marshal(data)
	if err != nil {
		log.Printf("Failed to marshal log entry: %v", err)
		return
	}

	log.Println(string(jsonData))
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

// logSecurityEvent logs security-related events
func logSecurityEvent(eventType string, data map[string]interface{}) {
	event := map[string]interface{}{
		"event_type": "security",
		"event":      eventType,
		"timestamp":  time.Now().Format(time.RFC3339),
	}

	for k, v := range data {
		event[k] = v
	}

	logJSON(event)
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

// logPerformanceEvent logs performance-related events
func logPerformanceEvent(eventType string, data map[string]interface{}) {
	event := map[string]interface{}{
		"event_type": "performance",
		"event":      eventType,
		"timestamp":  time.Now().Format(time.RFC3339),
	}

	for k, v := range data {
		event[k] = v
	}

	logJSON(event)
}
