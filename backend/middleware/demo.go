package middleware

import (
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/trackeep/backend/models"
)

// DemoModeMiddleware prevents write operations when in demo mode
func DemoModeMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Check if demo mode is enabled
		if os.Getenv("VITE_DEMO_MODE") == "true" {
			// Allow GET requests (read operations)
			if c.Request.Method == "GET" || c.Request.Method == "OPTIONS" {
				c.Next()
				return
			}

			// Allow specific write operations in demo mode
			path := c.Request.URL.Path
			if (strings.Contains(path, "/learning-paths") && c.Request.Method == "POST") ||
				(strings.Contains(path, "/bookmarks/content") && c.Request.Method == "POST") ||
				(strings.Contains(path, "/bookmarks/metadata") && c.Request.Method == "POST") {
				// Set demo user for these operations
				c.Set("user", models.User{
					ID:       1,
					Username: "demo",
					Email:    "demo@trackeep.com",
				})
				c.Set("user_id", uint(1))
				c.Set("userID", uint(1)) // Add this for compatibility with handlers
				c.Next()
				return
			}

			// Block other write operations (POST, PUT, DELETE, PATCH)
			c.JSON(http.StatusForbidden, gin.H{
				"error":   "Write operations are disabled in demo mode",
				"message": "This is a demo instance. Database modifications are not allowed.",
			})
			c.Abort()
			return
		}

		// If not in demo mode, allow all operations
		c.Next()
	}
}

// IsDemoMode returns true if demo mode is enabled
func IsDemoMode() bool {
	return os.Getenv("VITE_DEMO_MODE") == "true"
}
