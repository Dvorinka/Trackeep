package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/trackeep/backend/services"
	"gorm.io/gorm"
)

type PerformanceHandler struct {
	db                 *gorm.DB
	performanceService *services.PerformanceService
}

func NewPerformanceHandler(db *gorm.DB) *PerformanceHandler {
	return &PerformanceHandler{
		db:                 db,
		performanceService: services.NewPerformanceService(db),
	}
}

// OptimizeDatabase performs database optimizations
func (h *PerformanceHandler) OptimizeDatabase(c *gin.Context) {
	if err := h.performanceService.OptimizeDatabase(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to optimize database", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Database optimization completed successfully"})
}

// GetDatabaseStats returns database performance statistics
func (h *PerformanceHandler) GetDatabaseStats(c *gin.Context) {
	stats, err := h.performanceService.GetDatabaseStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get database stats", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, stats)
}

// MonitorPerformance monitors system performance
func (h *PerformanceHandler) MonitorPerformance(c *gin.Context) {
	stats, err := h.performanceService.MonitorPerformance()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to monitor performance", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, stats)
}

// CleanupOldAuditLogs removes old audit logs
func (h *PerformanceHandler) CleanupOldAuditLogs(c *gin.Context) {
	retentionDaysStr := c.DefaultQuery("retention_days", "90")
	retentionDays, err := strconv.Atoi(retentionDaysStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid retention_days parameter"})
		return
	}

	if err := h.performanceService.CleanupOldAuditLogs(retentionDays); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to cleanup audit logs", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Audit logs cleanup completed successfully"})
}
