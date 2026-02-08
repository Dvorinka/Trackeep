package middleware

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/trackeep/backend/config"
	"github.com/trackeep/backend/models"
)

// AuditMiddleware creates audit logs for HTTP requests
func AuditMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		startTime := time.Now()

		// Read request body for logging (only for POST/PUT/PATCH)
		var requestBody []byte
		if c.Request.Method != "GET" && c.Request.Body != nil {
			requestBody, _ = io.ReadAll(c.Request.Body)
			c.Request.Body = io.NopCloser(bytes.NewBuffer(requestBody))
		}

		// Process the request
		c.Next()

		// Skip audit logging for certain endpoints
		if shouldSkipAudit(c.Request.URL.Path) {
			return
		}

		// Create audit log entry with proper user data from session
		userIDValue := GetUserIDFromSession(c)
		userEmail := GetUserEmailFromSession(c)

		// Ensure we have valid user data before creating audit log
		if userIDValue == 0 && userEmail == "unknown" {
			// Skip audit logging for unauthenticated requests
			return
		}

		auditLog := &models.AuditLog{
			UserID:      userIDValue,
			UserEmail:   userEmail,
			UserIP:      c.ClientIP(),
			UserAgent:   c.Request.UserAgent(),
			Action:      getActionFromMethodAndPath(c.Request.Method, c.Request.URL.Path),
			Resource:    getResourceFromPath(c.Request.URL.Path),
			ResourceID:  getResourceIDFromPath(c.Request.URL.Path),
			Description: generateDescription(c, startTime),
			Details:     generateDetails(c, requestBody, startTime),
			Success:     c.Writer.Status() < 400,
			SessionID:   getSessionID(c),
			Country:     getCountryFromIP(c.ClientIP()),
			Device:      getDeviceFromUserAgent(c.Request.UserAgent()),
			Platform:    getPlatformFromUserAgent(c.Request.UserAgent()),
			Browser:     getBrowserFromUserAgent(c.Request.UserAgent()),
			RiskLevel:   assessRisk(c, startTime),
		}

		// Set failure reason if request failed
		if !auditLog.Success {
			auditLog.FailureReason = getFailureReason(c.Writer.Status())
		}

		// Save audit log asynchronously
		go saveAuditLog(auditLog)
	}
}

// LogSecurityEvent logs security-related events
func LogSecurityEvent(userID uint, userEmail, action, description, failureReason string, details map[string]interface{}) {
	auditLog := &models.AuditLog{
		UserID:        userID,
		UserEmail:     userEmail,
		Action:        models.AuditAction(action),
		Resource:      models.AuditResourceSecurity,
		Description:   description,
		Details:       details,
		Success:       failureReason == "",
		FailureReason: failureReason,
		RiskLevel:     assessSecurityRisk(action, failureReason),
		Suspicious:    isSuspiciousActivity(action, failureReason),
		CreatedAt:     time.Now(),
	}

	go saveAuditLog(auditLog)
}

// LogUserAction logs user-specific actions
func LogUserAction(user models.User, action models.AuditAction, resource models.AuditResource, resourceID *uint, description string, oldValues, newValues map[string]interface{}) {
	auditLog := &models.AuditLog{
		UserID:      user.ID,
		UserEmail:   user.Email,
		Action:      action,
		Resource:    resource,
		ResourceID:  resourceID,
		Description: description,
		OldValues:   oldValues,
		NewValues:   newValues,
		Success:     true,
		RiskLevel:   assessActionRisk(action, resource),
		CreatedAt:   time.Now(),
	}

	go saveAuditLog(auditLog)
}

// Helper functions

func shouldSkipAudit(path string) bool {
	skipPaths := []string{
		"/health",
		"/metrics",
		"/api/demo/status",
		"/favicon.ico",
		"/assets/",
	}

	for _, skipPath := range skipPaths {
		if strings.HasPrefix(path, skipPath) {
			return true
		}
	}
	return false
}

func getUintFromInterface(value interface{}) uint {
	if v, ok := value.(uint); ok {
		return v
	}
	return 0
}

func getUserEmail(user interface{}) string {
	if u, ok := user.(models.User); ok {
		return u.Email
	}
	return "unknown"
}

func getActionFromMethodAndPath(method, path string) models.AuditAction {
	switch method {
	case "GET":
		return models.AuditActionRead
	case "POST":
		if strings.Contains(path, "/login") {
			return models.AuditActionLogin
		} else if strings.Contains(path, "/logout") {
			return models.AuditActionLogout
		} else if strings.Contains(path, "/upload") {
			return models.AuditActionUpload
		} else if strings.Contains(path, "/export") {
			return models.AuditActionExport
		} else if strings.Contains(path, "/import") {
			return models.AuditActionImport
		}
		return models.AuditActionCreate
	case "PUT", "PATCH":
		return models.AuditActionUpdate
	case "DELETE":
		return models.AuditActionDelete
	default:
		return models.AuditActionAccess
	}
}

func getResourceFromPath(path string) models.AuditResource {
	if strings.Contains(path, "/users") {
		return models.AuditResourceUser
	} else if strings.Contains(path, "/notes") {
		return models.AuditResourceNote
	} else if strings.Contains(path, "/files") {
		return models.AuditResourceFile
	} else if strings.Contains(path, "/bookmarks") {
		return models.AuditResourceBookmark
	} else if strings.Contains(path, "/tasks") {
		return models.AuditResourceTask
	} else if strings.Contains(path, "/time-entries") {
		return models.AuditResourceTimeEntry
	} else if strings.Contains(path, "/integrations") {
		return models.AuditResourceIntegration
	} else if strings.Contains(path, "/teams") {
		return models.AuditResourceTeam
	} else if strings.Contains(path, "/goals") || strings.Contains(path, "/habits") {
		return models.AuditResourceGoal
	} else if strings.Contains(path, "/calendar") {
		return models.AuditResourceCalendar
	} else if strings.Contains(path, "/search") {
		return models.AuditResourceSearch
	} else if strings.Contains(path, "/ai") {
		return models.AuditResourceAI
	} else if strings.Contains(path, "/analytics") {
		return models.AuditResourceAnalytics
	} else if strings.Contains(path, "/auth") {
		return models.AuditResourceSecurity
	}
	return models.AuditResourceSystem
}

func getResourceIDFromPath(path string) *uint {
	parts := strings.Split(path, "/")
	for i, part := range parts {
		if part == "" {
			continue
		}
		// Check if this part looks like a numeric ID
		if i > 0 && len(part) >= 1 && part[0] >= '0' && part[0] <= '9' {
			var id uint
			if _, err := fmt.Sscanf(part, "%d", &id); err == nil {
				return &id
			}
		}
	}
	return nil
}

func generateDescription(c *gin.Context, startTime time.Time) string {
	duration := time.Since(startTime)
	method := c.Request.Method
	path := c.Request.URL.Path
	status := c.Writer.Status()

	return fmt.Sprintf("%s %s - %d (%v)", method, path, status, duration.Round(time.Millisecond))
}

func generateDetails(c *gin.Context, requestBody []byte, startTime time.Time) map[string]interface{} {
	details := make(map[string]interface{})

	details["method"] = c.Request.Method
	details["path"] = c.Request.URL.Path
	details["query"] = c.Request.URL.RawQuery
	details["status_code"] = c.Writer.Status()
	details["duration_ms"] = time.Since(startTime).Milliseconds()
	details["response_size"] = c.Writer.Size()

	if len(requestBody) > 0 && len(requestBody) < 1024 { // Only log small request bodies
		var jsonBody map[string]interface{}
		if err := json.Unmarshal(requestBody, &jsonBody); err == nil {
			// Remove sensitive fields
			sanitizeJSON(jsonBody)
			details["request_body"] = jsonBody
		}
	}

	return details
}

func sanitizeJSON(data map[string]interface{}) {
	sensitiveFields := []string{"password", "token", "secret", "key", "authorization"}

	for key, value := range data {
		keyLower := strings.ToLower(key)
		for _, sensitive := range sensitiveFields {
			if strings.Contains(keyLower, sensitive) {
				data[key] = "[REDACTED]"
				break
			}
		}

		// Recursively sanitize nested objects
		if nested, ok := value.(map[string]interface{}); ok {
			sanitizeJSON(nested)
		}
	}
}

func getSessionID(c *gin.Context) string {
	// Try to get session ID from various sources
	if sessionID := c.GetHeader("X-Session-ID"); sessionID != "" {
		return sessionID
	}

	// You could also get from JWT claims or cookie
	return ""
}

func getCountryFromIP(ip string) string {
	// This is a placeholder - in production, you'd use a GeoIP service
	return "unknown"
}

func getDeviceFromUserAgent(userAgent string) string {
	if strings.Contains(userAgent, "Mobile") {
		return "mobile"
	} else if strings.Contains(userAgent, "Tablet") {
		return "tablet"
	}
	return "desktop"
}

func getPlatformFromUserAgent(userAgent string) string {
	if strings.Contains(userAgent, "Windows") {
		return "windows"
	} else if strings.Contains(userAgent, "Mac") {
		return "macos"
	} else if strings.Contains(userAgent, "Linux") {
		return "linux"
	} else if strings.Contains(userAgent, "Android") {
		return "android"
	} else if strings.Contains(userAgent, "iOS") {
		return "ios"
	}
	return "unknown"
}

func getBrowserFromUserAgent(userAgent string) string {
	if strings.Contains(userAgent, "Chrome") {
		return "chrome"
	} else if strings.Contains(userAgent, "Firefox") {
		return "firefox"
	} else if strings.Contains(userAgent, "Safari") {
		return "safari"
	} else if strings.Contains(userAgent, "Edge") {
		return "edge"
	}
	return "unknown"
}

func assessRisk(c *gin.Context, startTime time.Time) string {
	path := c.Request.URL.Path
	method := c.Request.Method
	status := c.Writer.Status()
	duration := time.Since(startTime)

	// High risk indicators
	if strings.Contains(path, "/admin") {
		return "high"
	}
	if strings.Contains(path, "/auth") && status >= 400 {
		return "medium"
	}
	if method == "DELETE" {
		return "medium"
	}
	if duration > 5*time.Second {
		return "medium"
	}

	return "low"
}

func assessSecurityRisk(action, failureReason string) string {
	if failureReason != "" {
		return "high"
	}

	switch action {
	case "login_failed":
		return "medium"
	case "disable", "delete":
		return "high"
	default:
		return "low"
	}
}

func assessActionRisk(action models.AuditAction, resource models.AuditResource) string {
	if action == models.AuditActionDelete {
		return "medium"
	}
	if resource == models.AuditResourceSecurity {
		return "medium"
	}
	return "low"
}

func isSuspiciousActivity(action, failureReason string) bool {
	// Define suspicious activity patterns
	if action == "login_failed" && failureReason == "too_many_attempts" {
		return true
	}
	if strings.Contains(failureReason, "suspicious") {
		return true
	}
	return false
}

func getFailureReason(statusCode int) string {
	switch statusCode {
	case 400:
		return "bad_request"
	case 401:
		return "unauthorized"
	case 403:
		return "forbidden"
	case 404:
		return "not_found"
	case 429:
		return "rate_limited"
	case 500:
		return "server_error"
	default:
		return "unknown"
	}
}

func saveAuditLog(auditLog *models.AuditLog) {
	// Skip audit logging in demo mode
	if os.Getenv("VITE_DEMO_MODE") == "true" {
		return
	}

	db := config.GetDB()
	if db != nil {
		db.Create(auditLog)
	}
}
