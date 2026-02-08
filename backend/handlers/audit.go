package handlers

import (
	"fmt"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/trackeep/backend/config"
	"github.com/trackeep/backend/models"
)

// GetAuditLogs retrieves audit logs with filtering and pagination
func GetAuditLogs(c *gin.Context) {
	user, exists := c.Get("user")
	if !exists {
		c.JSON(401, gin.H{"error": "User not authenticated"})
		return
	}

	currentUser := user.(models.User)
	db := config.GetDB()

	// Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	action := c.Query("action")
	resource := c.Query("resource")
	userID := c.Query("user_id")
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")
	riskLevel := c.Query("risk_level")
	success := c.Query("success")

	// Build query
	query := db.Model(&models.AuditLog{})

	// Non-admin users can only see their own logs
	if currentUser.Role != "admin" {
		query = query.Where("user_id = ?", currentUser.ID)
	} else if userID != "" {
		// Admin can filter by specific user
		if uid, err := strconv.ParseUint(userID, 10, 32); err == nil {
			query = query.Where("user_id = ?", uid)
		}
	}

	// Apply filters
	if action != "" {
		query = query.Where("action = ?", action)
	}
	if resource != "" {
		query = query.Where("resource = ?", resource)
	}
	if riskLevel != "" {
		query = query.Where("risk_level = ?", riskLevel)
	}
	if success != "" {
		query = query.Where("success = ?", success == "true")
	}
	if startDate != "" {
		if start, err := time.Parse("2006-01-02", startDate); err == nil {
			query = query.Where("created_at >= ?", start)
		}
	}
	if endDate != "" {
		if end, err := time.Parse("2006-01-02", endDate); err == nil {
			query = query.Where("created_at <= ?", end.Add(24*time.Hour))
		}
	}

	// Count total records
	var total int64
	query.Count(&total)

	// Get paginated results
	offset := (page - 1) * limit
	var logs []models.AuditLog
	query.Order("created_at DESC").Limit(limit).Offset(offset).Find(&logs)

	c.JSON(200, gin.H{
		"logs": logs,
		"pagination": gin.H{
			"page":  page,
			"limit": limit,
			"total": total,
			"pages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}

// GetAuditLogStats retrieves audit log statistics
func GetAuditLogStats(c *gin.Context) {
	user, exists := c.Get("user")
	if !exists {
		c.JSON(401, gin.H{"error": "User not authenticated"})
		return
	}

	currentUser := user.(models.User)
	db := config.GetDB()

	// Parse date range
	startDate := c.DefaultQuery("start_date", time.Now().AddDate(0, -1, 0).Format("2006-01-02"))
	endDate := c.DefaultQuery("end_date", time.Now().Format("2006-01-02"))

	start, _ := time.Parse("2006-01-02", startDate)
	end, _ := time.Parse("2006-01-02", endDate)
	end = end.Add(24 * time.Hour) // Include the entire end date

	// Base query
	baseQuery := db.Model(&models.AuditLog{}).Where("created_at >= ? AND created_at <= ?", start, end)

	// Non-admin users can only see their own stats
	if currentUser.Role != "admin" {
		baseQuery = baseQuery.Where("user_id = ?", currentUser.ID)
	}

	// Get overall stats
	var totalLogs, successLogs, failedLogs, suspiciousLogs int64
	baseQuery.Count(&totalLogs)
	baseQuery.Where("success = ?", true).Count(&successLogs)
	baseQuery.Where("success = ?", false).Count(&failedLogs)
	baseQuery.Where("suspicious = ?", true).Count(&suspiciousLogs)

	// Get action breakdown
	type ActionStat struct {
		Action string `json:"action"`
		Count  int64  `json:"count"`
	}
	var actionStats []ActionStat
	baseQuery.Select("action, COUNT(*) as count").Group("action").Order("count DESC").Scan(&actionStats)

	// Get resource breakdown
	type ResourceStat struct {
		Resource string `json:"resource"`
		Count    int64  `json:"count"`
	}
	var resourceStats []ResourceStat
	baseQuery.Select("resource, COUNT(*) as count").Group("resource").Order("count DESC").Scan(&resourceStats)

	// Get risk level breakdown
	type RiskStat struct {
		RiskLevel string `json:"risk_level"`
		Count     int64  `json:"count"`
	}
	var riskStats []RiskStat
	baseQuery.Select("risk_level, COUNT(*) as count").Group("risk_level").Order("count DESC").Scan(&riskStats)

	// Get daily activity for the last 30 days
	type DailyStat struct {
		Date  string `json:"date"`
		Count int64  `json:"count"`
	}
	var dailyStats []DailyStat
	dailyQuery := db.Model(&models.AuditLog{}).
		Select("DATE(created_at) as date, COUNT(*) as count").
		Where("created_at >= ? AND created_at <= ?", start, end).
		Group("DATE(created_at)").
		Order("date ASC")

	if currentUser.Role != "admin" {
		dailyQuery = dailyQuery.Where("user_id = ?", currentUser.ID)
	}

	dailyQuery.Scan(&dailyStats)

	// Get top users (admin only)
	var topUsers []struct {
		UserEmail string `json:"user_email"`
		Count     int64  `json:"count"`
	}
	if currentUser.Role == "admin" {
		baseQuery.Select("user_email, COUNT(*) as count").
			Group("user_email").
			Order("count DESC").
			Limit(10).
			Scan(&topUsers)
	}

	// Get recent security events
	var securityEvents []models.AuditLog
	securityQuery := db.Model(&models.AuditLog{}).
		Where("resource = ? AND created_at >= ? AND created_at <= ?",
			models.AuditResourceSecurity, start, end).
		Order("created_at DESC").
		Limit(20)

	if currentUser.Role != "admin" {
		securityQuery = securityQuery.Where("user_id = ?", currentUser.ID)
	}

	securityQuery.Find(&securityEvents)

	stats := gin.H{
		"period": gin.H{
			"start_date": startDate,
			"end_date":   endDate,
		},
		"overview": gin.H{
			"total_logs":      totalLogs,
			"success_logs":    successLogs,
			"failed_logs":     failedLogs,
			"suspicious_logs": suspiciousLogs,
			"success_rate":    float64(successLogs) / float64(totalLogs) * 100,
		},
		"actions":         actionStats,
		"resources":       resourceStats,
		"risk_levels":     riskStats,
		"daily_activity":  dailyStats,
		"security_events": securityEvents,
	}

	if currentUser.Role == "admin" {
		stats["top_users"] = topUsers
	}

	c.JSON(200, stats)
}

// GetAuditLog retrieves a specific audit log entry
func GetAuditLog(c *gin.Context) {
	user, exists := c.Get("user")
	if !exists {
		c.JSON(401, gin.H{"error": "User not authenticated"})
		return
	}

	currentUser := user.(models.User)
	logID := c.Param("id")

	db := config.GetDB()

	var log models.AuditLog
	query := db.Where("id = ?", logID)

	// Non-admin users can only see their own logs
	if currentUser.Role != "admin" {
		query = query.Where("user_id = ?", currentUser.ID)
	}

	if err := query.First(&log).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(404, gin.H{"error": "Audit log not found"})
			return
		}
		c.JSON(500, gin.H{"error": "Database error"})
		return
	}

	c.JSON(200, gin.H{"log": log})
}

// ExportAuditLogs exports audit logs in various formats
func ExportAuditLogs(c *gin.Context) {
	user, exists := c.Get("user")
	if !exists {
		c.JSON(401, gin.H{"error": "User not authenticated"})
		return
	}

	currentUser := user.(models.User)
	format := c.DefaultQuery("format", "json") // json, csv, xlsx

	// Only admin can export logs
	if currentUser.Role != "admin" {
		c.JSON(403, gin.H{"error": "Admin access required"})
		return
	}

	db := config.GetDB()

	// Parse query parameters (same as GetAuditLogs)
	startDate := c.DefaultQuery("start_date", time.Now().AddDate(0, -1, 0).Format("2006-01-02"))
	endDate := c.DefaultQuery("end_date", time.Now().Format("2006-01-02"))
	action := c.Query("action")
	resource := c.Query("resource")
	userID := c.Query("user_id")
	riskLevel := c.Query("risk_level")

	// Build query
	query := db.Model(&models.AuditLog{})

	if startDate != "" {
		if start, err := time.Parse("2006-01-02", startDate); err == nil {
			query = query.Where("created_at >= ?", start)
		}
	}
	if endDate != "" {
		if end, err := time.Parse("2006-01-02", endDate); err == nil {
			query = query.Where("created_at <= ?", end.Add(24*time.Hour))
		}
	}
	if action != "" {
		query = query.Where("action = ?", action)
	}
	if resource != "" {
		query = query.Where("resource = ?", resource)
	}
	if userID != "" {
		if uid, err := strconv.ParseUint(userID, 10, 32); err == nil {
			query = query.Where("user_id = ?", uid)
		}
	}
	if riskLevel != "" {
		query = query.Where("risk_level = ?", riskLevel)
	}

	var logs []models.AuditLog
	query.Order("created_at DESC").Find(&logs)

	switch format {
	case "csv":
		c.Header("Content-Type", "text/csv")
		c.Header("Content-Disposition", "attachment; filename=audit_logs.csv")
		// Generate CSV (simplified)
		c.String(200, generateCSV(logs))
	case "xlsx":
		// For Excel export, you'd need a library like excelize
		c.JSON(501, gin.H{"error": "Excel export not implemented yet"})
	default:
		c.Header("Content-Type", "application/json")
		c.Header("Content-Disposition", "attachment; filename=audit_logs.json")
		c.JSON(200, logs)
	}
}

// CleanupAuditLogs removes old audit logs based on retention policy
func CleanupAuditLogs(c *gin.Context) {
	user, exists := c.Get("user")
	if !exists {
		c.JSON(401, gin.H{"error": "User not authenticated"})
		return
	}

	currentUser := user.(models.User)

	// Only admin can cleanup logs
	if currentUser.Role != "admin" {
		c.JSON(403, gin.H{"error": "Admin access required"})
		return
	}

	// Parse retention period (default 90 days)
	retentionDays, _ := strconv.Atoi(c.DefaultQuery("retention_days", "90"))
	cutoffDate := time.Now().AddDate(0, 0, -retentionDays)

	db := config.GetDB()

	// Delete old logs
	result := db.Where("created_at < ?", cutoffDate).Delete(&models.AuditLog{})

	c.JSON(200, gin.H{
		"message":        "Audit logs cleanup completed",
		"deleted_count":  result.RowsAffected,
		"retention_days": retentionDays,
		"cutoff_date":    cutoffDate,
	})
}

// Helper function to generate CSV (simplified implementation)
func generateCSV(logs []models.AuditLog) string {
	var csv string
	csv = "ID,User Email,Action,Resource,Resource ID,Description,Success,Risk Level,Created At\n"

	for _, log := range logs {
		csv += fmt.Sprintf("%d,%s,%s,%s,%v,%s,%v,%s,%s\n",
			log.ID,
			log.UserEmail,
			log.Action,
			log.Resource,
			log.ResourceID,
			log.Description,
			log.Success,
			log.RiskLevel,
			log.CreatedAt.Format("2006-01-02 15:04:05"),
		)
	}

	return csv
}
