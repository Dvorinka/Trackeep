package handlers

import (
	"runtime"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/trackeep/backend/config"
)

var startTime = time.Now()

func HealthCheck(c *gin.Context) {
	db := config.GetDB()
	dbStatus := "connected"
	var dbPingTime time.Duration = 0

	if db == nil {
		dbStatus = "disconnected"
	} else {
		sqlDB, err := db.DB()
		if err != nil {
			dbStatus = "error"
		} else {
			start := time.Now()
			if err := sqlDB.Ping(); err != nil {
				dbStatus = "error"
			} else {
				dbPingTime = time.Since(start)
			}
		}
	}

	sessionStatus := "ok"

	var memStats runtime.MemStats
	runtime.ReadMemStats(&memStats)

	uptime := time.Since(startTime)

	health := gin.H{
		"status":  "ok",
		"message": "Trackeep API is running",
		"version": "1.0.0",
		"uptime":  uptime.String(),
		"database": gin.H{
			"status":    dbStatus,
			"ping_time": dbPingTime.String(),
		},
		"sessions": gin.H{
			"status": sessionStatus,
		},
		"system": gin.H{
			"goroutines": runtime.NumGoroutine(),
			"memory": gin.H{
				"alloc_mb":       memStats.Alloc / 1024 / 1024,
				"total_alloc_mb": memStats.TotalAlloc / 1024 / 1024,
				"sys_mb":         memStats.Sys / 1024 / 1024,
			},
		},
		"timestamp": gin.H{
			"human": time.Now().Format(time.RFC3339),
			"unix":  time.Now().Unix(),
		},
	}

	overallStatus := "healthy"
	if dbStatus != "connected" {
		overallStatus = "degraded"
		health["status"] = "degraded"
	}
	if sessionStatus != "ok" {
		overallStatus = "degraded"
		health["status"] = "degraded"
	}

	statusCode := 200
	if overallStatus == "degraded" {
		statusCode = 503
	}

	c.JSON(statusCode, health)
}

func ReadinessCheck(c *gin.Context) {
	db := config.GetDB()
	if db == nil {
		c.JSON(503, gin.H{"status": "not_ready", "reason": "database_not_connected"})
		return
	}

	sqlDB, err := db.DB()
	if err != nil || sqlDB.Ping() != nil {
		c.JSON(503, gin.H{"status": "not_ready", "reason": "database_ping_failed"})
		return
	}

	c.JSON(200, gin.H{"status": "ready"})
}

func LivenessCheck(c *gin.Context) {
	c.JSON(200, gin.H{"status": "alive", "timestamp": time.Now().Unix()})
}
