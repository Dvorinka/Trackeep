package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/trackeep/backend/models"
	"gorm.io/gorm"
)

// TimeEntryHandler handles time tracking operations
type TimeEntryHandler struct {
	db *gorm.DB
}

// NewTimeEntryHandler creates a new time entry handler
func NewTimeEntryHandler(db *gorm.DB) *TimeEntryHandler {
	return &TimeEntryHandler{db: db}
}

// CreateTimeEntryRequest represents the request to create a time entry
type CreateTimeEntryRequest struct {
	TaskID      *uint    `json:"task_id,omitempty"`
	BookmarkID  *uint    `json:"bookmark_id,omitempty"`
	NoteID      *uint    `json:"note_id,omitempty"`
	Description string   `json:"description"`
	Tags        []string `json:"tags,omitempty"`
	Billable    bool     `json:"billable"`
	HourlyRate  *float64 `json:"hourly_rate,omitempty"`
	Source      string   `json:"source" gorm:"default:manual"`
}

// UpdateTimeEntryRequest represents the request to update a time entry
type UpdateTimeEntryRequest struct {
	Description *string    `json:"description,omitempty"`
	Tags        []string   `json:"tags,omitempty"`
	Billable    *bool      `json:"billable,omitempty"`
	HourlyRate  *float64   `json:"hourly_rate,omitempty"`
	EndTime     *time.Time `json:"end_time,omitempty"`
}

// GetTimeEntries retrieves all time entries for the authenticated user
func (h *TimeEntryHandler) GetTimeEntries(c *gin.Context) {
	userID := c.GetUint("user_id")

	var timeEntries []models.TimeEntry
	query := h.db.Where("user_id = ?", userID).
		Preload("Task").
		Preload("Bookmark").
		Preload("Note").
		Preload("Tags").
		Order("created_at DESC")

	// Filter by date range if provided
	if startDate := c.Query("start_date"); startDate != "" {
		if parsed, err := time.Parse("2006-01-02", startDate); err == nil {
			query = query.Where("start_time >= ?", parsed)
		}
	}

	if endDate := c.Query("end_date"); endDate != "" {
		if parsed, err := time.Parse("2006-01-02", endDate); err == nil {
			query = query.Where("start_time <= ?", parsed.Add(24*time.Hour))
		}
	}

	// Filter by running status
	if isRunning := c.Query("is_running"); isRunning != "" {
		running := isRunning == "true"
		query = query.Where("is_running = ?", running)
	}

	if err := query.Find(&timeEntries).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve time entries"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"time_entries": timeEntries})
}

// GetTimeEntry retrieves a specific time entry
func (h *TimeEntryHandler) GetTimeEntry(c *gin.Context) {
	userID := c.GetUint("user_id")
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid time entry ID"})
		return
	}

	var timeEntry models.TimeEntry
	if err := h.db.Where("id = ? AND user_id = ?", id, userID).
		Preload("Task").
		Preload("Bookmark").
		Preload("Note").
		Preload("Tags").
		First(&timeEntry).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Time entry not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve time entry"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"time_entry": timeEntry})
}

// CreateTimeEntry creates a new time entry
func (h *TimeEntryHandler) CreateTimeEntry(c *gin.Context) {
	userID := c.GetUint("user_id")

	var req CreateTimeEntryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	timeEntry := models.TimeEntry{
		UserID:      userID,
		TaskID:      req.TaskID,
		BookmarkID:  req.BookmarkID,
		NoteID:      req.NoteID,
		Description: req.Description,
		Billable:    req.Billable,
		HourlyRate:  req.HourlyRate,
		Source:      req.Source,
		StartTime:   time.Now(),
		IsRunning:   true,
	}

	// Handle tags
	if len(req.Tags) > 0 {
		var tags []models.Tag
		for _, tagName := range req.Tags {
			var tag models.Tag
			if err := h.db.Where("name = ?", tagName).FirstOrCreate(&tag, models.Tag{Name: tagName}).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create tags"})
				return
			}
			tags = append(tags, tag)
		}
		timeEntry.Tags = tags
	}

	if err := h.db.Create(&timeEntry).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create time entry"})
		return
	}

	// Load relationships for response
	h.db.Preload("Task").Preload("Bookmark").Preload("Note").Preload("Tags").First(&timeEntry)

	c.JSON(http.StatusCreated, gin.H{"time_entry": timeEntry})
}

// UpdateTimeEntry updates an existing time entry
func (h *TimeEntryHandler) UpdateTimeEntry(c *gin.Context) {
	userID := c.GetUint("user_id")
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid time entry ID"})
		return
	}

	var timeEntry models.TimeEntry
	if err := h.db.Where("id = ? AND user_id = ?", id, userID).First(&timeEntry).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Time entry not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve time entry"})
		return
	}

	var req UpdateTimeEntryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update fields
	if req.Description != nil {
		timeEntry.Description = *req.Description
	}
	if req.Billable != nil {
		timeEntry.Billable = *req.Billable
	}
	if req.HourlyRate != nil {
		timeEntry.HourlyRate = req.HourlyRate
	}
	if req.EndTime != nil {
		timeEntry.EndTime = req.EndTime
		timeEntry.IsRunning = false
	}

	// Handle tags
	if req.Tags != nil {
		// Clear existing tags
		h.db.Model(&timeEntry).Association("Tags").Clear()

		// Add new tags
		var tags []models.Tag
		for _, tagName := range req.Tags {
			var tag models.Tag
			if err := h.db.Where("name = ?", tagName).FirstOrCreate(&tag, models.Tag{Name: tagName}).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create tags"})
				return
			}
			tags = append(tags, tag)
		}
		timeEntry.Tags = tags
	}

	if err := h.db.Save(&timeEntry).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update time entry"})
		return
	}

	// Load relationships for response
	h.db.Preload("Task").Preload("Bookmark").Preload("Note").Preload("Tags").First(&timeEntry)

	c.JSON(http.StatusOK, gin.H{"time_entry": timeEntry})
}

// StopTimeEntry stops a running time entry
func (h *TimeEntryHandler) StopTimeEntry(c *gin.Context) {
	userID := c.GetUint("user_id")
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid time entry ID"})
		return
	}

	var timeEntry models.TimeEntry
	if err := h.db.Where("id = ? AND user_id = ?", id, userID).First(&timeEntry).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Time entry not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve time entry"})
		return
	}

	if !timeEntry.IsRunning {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Time entry is already stopped"})
		return
	}

	timeEntry.Stop()
	if err := h.db.Save(&timeEntry).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to stop time entry"})
		return
	}

	// Load relationships for response
	h.db.Preload("Task").Preload("Bookmark").Preload("Note").Preload("Tags").First(&timeEntry)

	c.JSON(http.StatusOK, gin.H{"time_entry": timeEntry})
}

// DeleteTimeEntry deletes a time entry
func (h *TimeEntryHandler) DeleteTimeEntry(c *gin.Context) {
	userID := c.GetUint("user_id")
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid time entry ID"})
		return
	}

	var timeEntry models.TimeEntry
	if err := h.db.Where("id = ? AND user_id = ?", id, userID).First(&timeEntry).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Time entry not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve time entry"})
		return
	}

	if err := h.db.Delete(&timeEntry).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete time entry"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Time entry deleted successfully"})
}

// GetTimeStats retrieves time tracking statistics
func (h *TimeEntryHandler) GetTimeStats(c *gin.Context) {
	userID := c.GetUint("user_id")

	var stats struct {
		TotalTimeSeconds int64   `json:"total_time_seconds"`
		TotalEntries     int64   `json:"total_entries"`
		RunningEntries   int64   `json:"running_entries"`
		BillableTime     int64   `json:"billable_time_seconds"`
		TotalBillable    float64 `json:"total_billable_amount"`
	}

	// Total time and entries
	h.db.Model(&models.TimeEntry{}).
		Where("user_id = ?", userID).
		Select("COALESCE(SUM(duration), 0) as total_time_seconds, COUNT(*) as total_entries").
		Scan(&stats)

	// Running entries
	h.db.Model(&models.TimeEntry{}).
		Where("user_id = ? AND is_running = ?", userID, true).
		Count(&stats.RunningEntries)

	// Billable time and amount
	var billableStats struct {
		BillableTime  int64   `json:"billable_time"`
		TotalBillable float64 `json:"total_billable"`
	}

	h.db.Model(&models.TimeEntry{}).
		Where("user_id = ? AND billable = ?", userID, true).
		Select("COALESCE(SUM(duration), 0) as billable_time, COALESCE(SUM(duration * hourly_rate / 3600), 0) as total_billable").
		Scan(&billableStats)

	stats.BillableTime = billableStats.BillableTime
	stats.TotalBillable = billableStats.TotalBillable

	c.JSON(http.StatusOK, gin.H{"stats": stats})
}
