package handlers

import (
	"fmt"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

func GetAPIConfig(c *gin.Context) {
	scheme := "http"
	if c.Request.TLS != nil {
		scheme = "https"
	}

	host := c.Request.Host
	if host == "" {
		host = os.Getenv("HOST")
		if host == "" {
			host = "localhost:8080"
		}
	}

	apiURL := fmt.Sprintf("%s://%s/api/v1", scheme, host)

	c.JSON(http.StatusOK, gin.H{
		"api_url":   apiURL,
		"demo_mode": os.Getenv("VITE_DEMO_MODE") == "true",
		"version":   "1.0.0",
	})
}
