package middleware

import (
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		allowedOrigins := os.Getenv("CORS_ALLOWED_ORIGINS")
		ginMode := os.Getenv("GIN_MODE")

		if allowedOrigins == "" {
			if ginMode == "release" {
				c.JSON(http.StatusForbidden, gin.H{
					"error":   "CORS not configured for production",
					"message": "Please set CORS_ALLOWED_ORIGINS environment variable",
				})
				c.Abort()
				return
			} else {
				allowedOrigins = "http://localhost:5173,http://localhost:3000,http://localhost:8080"
			}
		}

		origin := c.Request.Header.Get("Origin")

		// Always set CORS headers
		if allowedOrigins == "*" {
			c.Header("Access-Control-Allow-Origin", "*")
		} else {
			for _, allowedOrigin := range strings.Split(allowedOrigins, ",") {
				if strings.TrimSpace(allowedOrigin) == origin {
					c.Header("Access-Control-Allow-Origin", origin)
					break
				}
			}
		}

		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
		c.Header("Access-Control-Allow-Credentials", "true")
		c.Header("Access-Control-Max-Age", "86400")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
