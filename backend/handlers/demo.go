package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/trackeep/backend/middleware"
)

// DemoStatus returns the current demo mode status
func DemoStatus(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"demoMode": middleware.IsDemoMode(),
	})
}
