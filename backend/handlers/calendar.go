package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/trackeep/backend/models"
)

type CalendarHandler struct {
	db *gorm.DB
}

func NewCalendarHandler(db *gorm.DB) *CalendarHandler {
	return &CalendarHandler{db: db}
}

// CalendarEventRequest represents the request body for creating/updating events
type CalendarEventRequest struct {
	Title           string    `json:"title" binding:"required"`
	Description     string    `json:"description"`
	StartTime       time.Time `json:"start_time" binding:"required"`
	EndTime         time.Time `json:"end_time" binding:"required"`
	Type            string    `json:"type"`
	Priority        string    `json:"priority"`
	Location        string    `json:"location"`
	Attendees       string    `json:"attendees"`
	Recurring       bool      `json:"recurring"`
	Rrule           string    `json:"rrule"`
	Source          string    `json:"source"`
	TaskID          *uint     `json:"task_id"`
	BookmarkID      *uint     `json:"bookmark_id"`
	NoteID          *uint     `json:"note_id"`
	IsAllDay        bool      `json:"is_all_day"`
	ReminderMinutes int       `json:"reminder_minutes"`
}

// GetEvents retrieves calendar events for a user
func (h *CalendarHandler) GetEvents(c *gin.Context) {
	userID := c.GetUint("userID")

	// Parse query parameters
	startStr := c.Query("start")
	endStr := c.Query("end")
	eventType := c.Query("type")

	var events []models.CalendarEvent
	query := h.db.Where("user_id = ?", userID)

	// Filter by date range if provided
	if startStr != "" && endStr != "" {
		start, err := time.Parse(time.RFC3339, startStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid start date format"})
			return
		}
		end, err := time.Parse(time.RFC3339, endStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid end date format"})
			return
		}
		query = query.Where("start_time >= ? AND end_time <= ?", start, end)
	}

	// Filter by type if provided
	if eventType != "" {
		query = query.Where("type = ?", eventType)
	}

	if err := query.Preload("Task").Preload("Bookmark").Preload("Note").Find(&events).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch events"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"events": events})
}

// GetEvent retrieves a single calendar event
func (h *CalendarHandler) GetEvent(c *gin.Context) {
	userID := c.GetUint("userID")
	eventID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event ID"})
		return
	}

	var event models.CalendarEvent
	if err := h.db.Where("id = ? AND user_id = ?", eventID, userID).
		Preload("Task").Preload("Bookmark").Preload("Note").
		First(&event).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch event"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"event": event})
}

// CreateEvent creates a new calendar event
func (h *CalendarHandler) CreateEvent(c *gin.Context) {
	userID := c.GetUint("userID")

	var req CalendarEventRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate time range
	if req.EndTime.Before(req.StartTime) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "End time must be after start time"})
		return
	}

	// Set default values
	if req.Type == "" {
		req.Type = "reminder"
	}
	if req.Priority == "" {
		req.Priority = "medium"
	}
	if req.Source == "" {
		req.Source = "trackeep"
	}

	event := models.CalendarEvent{
		UserID:          userID,
		Title:           req.Title,
		Description:     req.Description,
		StartTime:       req.StartTime,
		EndTime:         req.EndTime,
		Type:            req.Type,
		Priority:        req.Priority,
		Location:        req.Location,
		Attendees:       req.Attendees,
		Recurring:       req.Recurring,
		Rrule:           req.Rrule,
		Source:          req.Source,
		TaskID:          req.TaskID,
		BookmarkID:      req.BookmarkID,
		NoteID:          req.NoteID,
		IsAllDay:        req.IsAllDay,
		ReminderMinutes: req.ReminderMinutes,
	}

	if err := h.db.Create(&event).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create event"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"event": event})
}

// UpdateEvent updates an existing calendar event
func (h *CalendarHandler) UpdateEvent(c *gin.Context) {
	userID := c.GetUint("userID")
	eventID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event ID"})
		return
	}

	var event models.CalendarEvent
	if err := h.db.Where("id = ? AND user_id = ?", eventID, userID).First(&event).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch event"})
		}
		return
	}

	var req CalendarEventRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate time range
	if req.EndTime.Before(req.StartTime) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "End time must be after start time"})
		return
	}

	// Update event fields
	event.Title = req.Title
	event.Description = req.Description
	event.StartTime = req.StartTime
	event.EndTime = req.EndTime
	event.Type = req.Type
	event.Priority = req.Priority
	event.Location = req.Location
	event.Attendees = req.Attendees
	event.Recurring = req.Recurring
	event.Rrule = req.Rrule
	event.Source = req.Source
	event.TaskID = req.TaskID
	event.BookmarkID = req.BookmarkID
	event.NoteID = req.NoteID
	event.IsAllDay = req.IsAllDay
	event.ReminderMinutes = req.ReminderMinutes

	if err := h.db.Save(&event).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update event"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"event": event})
}

// DeleteEvent deletes a calendar event
func (h *CalendarHandler) DeleteEvent(c *gin.Context) {
	userID := c.GetUint("userID")
	eventID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event ID"})
		return
	}

	var event models.CalendarEvent
	if err := h.db.Where("id = ? AND user_id = ?", eventID, userID).First(&event).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch event"})
		}
		return
	}

	if err := h.db.Delete(&event).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete event"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Event deleted successfully"})
}

// GetUpcomingEvents retrieves events for the next 7 days
func (h *CalendarHandler) GetUpcomingEvents(c *gin.Context) {
	userID := c.GetUint("userID")

	now := time.Now()
	weekLater := now.AddDate(0, 0, 7)

	var events []models.CalendarEvent
	if err := h.db.Where("user_id = ? AND start_time >= ? AND start_time <= ?", userID, now, weekLater).
		Order("start_time ASC").
		Preload("Task").Preload("Bookmark").Preload("Note").
		Find(&events).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch upcoming events"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"events": events})
}

// GetTodayEvents retrieves events for today
func (h *CalendarHandler) GetTodayEvents(c *gin.Context) {
	userID := c.GetUint("userID")

	now := time.Now()
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	endOfDay := startOfDay.Add(24 * time.Hour)

	var events []models.CalendarEvent
	if err := h.db.Where("user_id = ? AND start_time >= ? AND start_time < ?", userID, startOfDay, endOfDay).
		Order("start_time ASC").
		Preload("Task").Preload("Bookmark").Preload("Note").
		Find(&events).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch today's events"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"events": events})
}

// GetDeadlines retrieves upcoming deadlines
func (h *CalendarHandler) GetDeadlines(c *gin.Context) {
	userID := c.GetUint("userID")

	now := time.Now()
	monthLater := now.AddDate(0, 1, 0)

	var events []models.CalendarEvent
	if err := h.db.Where("user_id = ? AND type = ? AND start_time >= ? AND start_time <= ?", userID, "deadline", now, monthLater).
		Order("start_time ASC").
		Preload("Task").
		Find(&events).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch deadlines"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"deadlines": events})
}

// ToggleEventCompletion toggles the completion status of an event
func (h *CalendarHandler) ToggleEventCompletion(c *gin.Context) {
	userID := c.GetUint("userID")
	eventID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid event ID"})
		return
	}

	var event models.CalendarEvent
	if err := h.db.Where("id = ? AND user_id = ?", eventID, userID).First(&event).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch event"})
		}
		return
	}

	event.IsCompleted = !event.IsCompleted
	if err := h.db.Save(&event).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update event"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"event": event})
}
