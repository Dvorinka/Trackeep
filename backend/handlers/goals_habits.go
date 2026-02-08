package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/trackeep/backend/models"
	"gorm.io/gorm"
)

// GoalsHabitsHandler handles goals and habits operations
type GoalsHabitsHandler struct {
	db *gorm.DB
}

// NewGoalsHabitsHandler creates a new goals and habits handler
func NewGoalsHabitsHandler(db *gorm.DB) *GoalsHabitsHandler {
	return &GoalsHabitsHandler{db: db}
}

// Goal Handlers

// CreateGoal creates a new goal
func (h *GoalsHabitsHandler) CreateGoal(c *gin.Context) {
	userID := c.GetUint("user_id")

	var req struct {
		Title       string    `json:"title" binding:"required"`
		Description string    `json:"description"`
		Category    string    `json:"category"`
		TargetValue float64   `json:"target_value"`
		Unit        string    `json:"unit"`
		Deadline    time.Time `json:"deadline"`
		Priority    string    `json:"priority"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	goal := models.Goal{
		UserID:       userID,
		Title:        req.Title,
		Description:  req.Description,
		Category:     req.Category,
		TargetValue:  req.TargetValue,
		CurrentValue: 0,
		Unit:         req.Unit,
		Deadline:     req.Deadline,
		Status:       "active",
		Priority:     req.Priority,
		Progress:     0,
		IsCompleted:  false,
	}

	if err := h.db.Create(&goal).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create goal"})
		return
	}

	c.JSON(http.StatusCreated, goal)
}

// GetGoals retrieves user's goals
func (h *GoalsHabitsHandler) GetGoals(c *gin.Context) {
	userID := c.GetUint("user_id")

	category := c.Query("category")
	status := c.Query("status")
	priority := c.Query("priority")
	limit := 20
	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 100 {
			limit = parsed
		}
	}

	query := h.db.Where("user_id = ?", userID)
	if category != "" {
		query = query.Where("category = ?", category)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if priority != "" {
		query = query.Where("priority = ?", priority)
	}

	var goals []models.Goal
	if err := query.Preload("Milestones").Order("created_at DESC").Limit(limit).Find(&goals).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch goals"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"goals": goals,
		"limit": limit,
	})
}

// GetGoal retrieves a specific goal
func (h *GoalsHabitsHandler) GetGoal(c *gin.Context) {
	userID := c.GetUint("user_id")
	goalID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid goal ID"})
		return
	}

	var goal models.Goal
	if err := h.db.Where("id = ? AND user_id = ?", goalID, userID).
		Preload("Milestones").
		First(&goal).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Goal not found"})
		return
	}

	c.JSON(http.StatusOK, goal)
}

// UpdateGoal updates a goal
func (h *GoalsHabitsHandler) UpdateGoal(c *gin.Context) {
	userID := c.GetUint("user_id")
	goalID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid goal ID"})
		return
	}

	var goal models.Goal
	if err := h.db.Where("id = ? AND user_id = ?", goalID, userID).First(&goal).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Goal not found"})
		return
	}

	var req struct {
		Title        string    `json:"title"`
		Description  string    `json:"description"`
		Category     string    `json:"category"`
		TargetValue  float64   `json:"target_value"`
		CurrentValue float64   `json:"current_value"`
		Unit         string    `json:"unit"`
		Deadline     time.Time `json:"deadline"`
		Status       string    `json:"status"`
		Priority     string    `json:"priority"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update fields
	if req.Title != "" {
		goal.Title = req.Title
	}
	if req.Description != "" {
		goal.Description = req.Description
	}
	if req.Category != "" {
		goal.Category = req.Category
	}
	if req.TargetValue > 0 {
		goal.TargetValue = req.TargetValue
	}
	if req.CurrentValue >= 0 {
		goal.CurrentValue = req.CurrentValue
	}
	if req.Unit != "" {
		goal.Unit = req.Unit
	}
	if !req.Deadline.IsZero() {
		goal.Deadline = req.Deadline
	}
	if req.Status != "" {
		goal.Status = req.Status
	}
	if req.Priority != "" {
		goal.Priority = req.Priority
	}

	if err := h.db.Save(&goal).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update goal"})
		return
	}

	c.JSON(http.StatusOK, goal)
}

// DeleteGoal deletes a goal
func (h *GoalsHabitsHandler) DeleteGoal(c *gin.Context) {
	userID := c.GetUint("user_id")
	goalID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid goal ID"})
		return
	}

	var goal models.Goal
	if err := h.db.Where("id = ? AND user_id = ?", goalID, userID).First(&goal).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Goal not found"})
		return
	}

	if err := h.db.Delete(&goal).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete goal"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Goal deleted successfully"})
}

// Habit Handlers

// CreateHabit creates a new habit
func (h *GoalsHabitsHandler) CreateHabit(c *gin.Context) {
	userID := c.GetUint("user_id")

	var req struct {
		Name            string   `json:"name" binding:"required"`
		Description     string   `json:"description"`
		Category        string   `json:"category"`
		TargetFrequency int      `json:"target_frequency"`
		FrequencyUnit   string   `json:"frequency_unit"`
		TargetValue     float64  `json:"target_value"`
		Unit            string   `json:"unit"`
		TimeOfDay       string   `json:"time_of_day"`
		DaysOfWeek      []string `json:"days_of_week"`
		IsActive        bool     `json:"is_active"`
		IsPublic        bool     `json:"is_public"`
		GoalID          *uint    `json:"goal_id"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	habit := models.Habit{
		UserID:          userID,
		Name:            req.Name,
		Description:     req.Description,
		Category:        req.Category,
		TargetFrequency: req.TargetFrequency,
		FrequencyUnit:   req.FrequencyUnit,
		TargetValue:     req.TargetValue,
		Unit:            req.Unit,
		TimeOfDay:       req.TimeOfDay,
		DaysOfWeek:      req.DaysOfWeek,
		IsActive:        req.IsActive,
		IsPublic:        req.IsPublic,
		GoalID:          req.GoalID,
		Streak:          0,
		LongestStreak:   0,
		CompletionRate:  0,
	}

	if err := h.db.Create(&habit).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create habit"})
		return
	}

	c.JSON(http.StatusCreated, habit)
}

// GetHabits retrieves user's habits
func (h *GoalsHabitsHandler) GetHabits(c *gin.Context) {
	userID := c.GetUint("user_id")

	category := c.Query("category")
	isActive := c.Query("is_active")
	limit := 20
	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 100 {
			limit = parsed
		}
	}

	query := h.db.Where("user_id = ?", userID)
	if category != "" {
		query = query.Where("category = ?", category)
	}
	if isActive != "" {
		active := isActive == "true"
		query = query.Where("is_active = ?", active)
	}

	var habits []models.Habit
	if err := query.Preload("Goal").Order("created_at DESC").Limit(limit).Find(&habits).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch habits"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"habits": habits,
		"limit":  limit,
	})
}

// GetHabit retrieves a specific habit
func (h *GoalsHabitsHandler) GetHabit(c *gin.Context) {
	userID := c.GetUint("user_id")
	habitID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid habit ID"})
		return
	}

	var habit models.Habit
	if err := h.db.Where("id = ? AND user_id = ?", habitID, userID).
		Preload("Goal").
		Preload("HabitEntries", "entry_date >= ?", time.Now().AddDate(0, 0, -30)).
		First(&habit).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Habit not found"})
		return
	}

	c.JSON(http.StatusOK, habit)
}

// UpdateHabit updates a habit
func (h *GoalsHabitsHandler) UpdateHabit(c *gin.Context) {
	userID := c.GetUint("user_id")
	habitID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid habit ID"})
		return
	}

	var habit models.Habit
	if err := h.db.Where("id = ? AND user_id = ?", habitID, userID).First(&habit).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Habit not found"})
		return
	}

	var req struct {
		Name            string   `json:"name"`
		Description     string   `json:"description"`
		Category        string   `json:"category"`
		TargetFrequency int      `json:"target_frequency"`
		FrequencyUnit   string   `json:"frequency_unit"`
		TargetValue     float64  `json:"target_value"`
		Unit            string   `json:"unit"`
		TimeOfDay       string   `json:"time_of_day"`
		DaysOfWeek      []string `json:"days_of_week"`
		IsActive        bool     `json:"is_active"`
		IsPublic        bool     `json:"is_public"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update fields
	if req.Name != "" {
		habit.Name = req.Name
	}
	if req.Description != "" {
		habit.Description = req.Description
	}
	if req.Category != "" {
		habit.Category = req.Category
	}
	if req.TargetFrequency > 0 {
		habit.TargetFrequency = req.TargetFrequency
	}
	if req.FrequencyUnit != "" {
		habit.FrequencyUnit = req.FrequencyUnit
	}
	if req.TargetValue > 0 {
		habit.TargetValue = req.TargetValue
	}
	if req.Unit != "" {
		habit.Unit = req.Unit
	}
	if req.TimeOfDay != "" {
		habit.TimeOfDay = req.TimeOfDay
	}
	if req.DaysOfWeek != nil {
		habit.DaysOfWeek = req.DaysOfWeek
	}
	habit.IsActive = req.IsActive
	habit.IsPublic = req.IsPublic

	if err := h.db.Save(&habit).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update habit"})
		return
	}

	c.JSON(http.StatusOK, habit)
}

// DeleteHabit deletes a habit
func (h *GoalsHabitsHandler) DeleteHabit(c *gin.Context) {
	userID := c.GetUint("user_id")
	habitID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid habit ID"})
		return
	}

	var habit models.Habit
	if err := h.db.Where("id = ? AND user_id = ?", habitID, userID).First(&habit).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Habit not found"})
		return
	}

	if err := h.db.Delete(&habit).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete habit"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Habit deleted successfully"})
}

// HabitEntry Handlers

// CreateHabitEntry creates a new habit entry
func (h *GoalsHabitsHandler) CreateHabitEntry(c *gin.Context) {
	userID := c.GetUint("user_id")

	var req struct {
		HabitID     uint      `json:"habit_id" binding:"required"`
		EntryDate   time.Time `json:"entry_date" binding:"required"`
		Value       float64   `json:"value"`
		TargetValue float64   `json:"target_value"`
		Unit        string    `json:"unit"`
		Notes       string    `json:"notes"`
		Quality     int       `json:"quality"`
		TimeSpent   int       `json:"time_spent"`
		Location    string    `json:"location"`
		Mood        string    `json:"mood"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify habit ownership
	var habit models.Habit
	if err := h.db.Where("id = ? AND user_id = ?", req.HabitID, userID).First(&habit).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Habit not found"})
		return
	}

	entry := models.HabitEntry{
		HabitID:     req.HabitID,
		EntryDate:   req.EntryDate,
		Value:       req.Value,
		TargetValue: req.TargetValue,
		Unit:        req.Unit,
		Notes:       req.Notes,
		Quality:     req.Quality,
		TimeSpent:   req.TimeSpent,
		Location:    req.Location,
		Mood:        req.Mood,
	}

	if err := h.db.Create(&entry).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create habit entry"})
		return
	}

	c.JSON(http.StatusCreated, entry)
}

// GetHabitEntries retrieves habit entries
func (h *GoalsHabitsHandler) GetHabitEntries(c *gin.Context) {
	userID := c.GetUint("user_id")
	habitID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid habit ID"})
		return
	}

	// Verify habit ownership
	var habit models.Habit
	if err := h.db.Where("id = ? AND user_id = ?", habitID, userID).First(&habit).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Habit not found"})
		return
	}

	startDate := c.Query("start_date")
	endDate := c.Query("end_date")
	limit := 50
	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 100 {
			limit = parsed
		}
	}

	query := h.db.Where("habit_id = ?", habitID)
	if startDate != "" {
		if parsed, err := time.Parse("2006-01-02", startDate); err == nil {
			query = query.Where("entry_date >= ?", parsed)
		}
	}
	if endDate != "" {
		if parsed, err := time.Parse("2006-01-02", endDate); err == nil {
			query = query.Where("entry_date <= ?", parsed)
		}
	}

	var entries []models.HabitEntry
	if err := query.Order("entry_date DESC").Limit(limit).Find(&entries).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch habit entries"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"entries": entries,
		"limit":   limit,
	})
}

// GetDashboardStats retrieves dashboard statistics for goals and habits
func (h *GoalsHabitsHandler) GetDashboardStats(c *gin.Context) {
	userID := c.GetUint("user_id")

	// Goal stats
	var totalGoals, activeGoals, completedGoals int64
	h.db.Model(&models.Goal{}).Where("user_id = ?", userID).Count(&totalGoals)
	h.db.Model(&models.Goal{}).Where("user_id = ? AND status = ?", userID, "active").Count(&activeGoals)
	h.db.Model(&models.Goal{}).Where("user_id = ? AND status = ?", userID, "completed").Count(&completedGoals)

	// Habit stats
	var totalHabits, activeHabits int64
	h.db.Model(&models.Habit{}).Where("user_id = ?", userID).Count(&totalHabits)
	h.db.Model(&models.Habit{}).Where("user_id = ? AND is_active = ?", userID, true).Count(&activeHabits)

	// Today's habit entries
	today := time.Now().Truncate(24 * time.Hour)
	tomorrow := today.Add(24 * time.Hour)
	var todayEntries int64
	h.db.Model(&models.HabitEntry{}).
		Joins("JOIN habits ON habit_entries.habit_id = habits.id").
		Where("habits.user_id = ? AND habit_entries.entry_date >= ? AND habit_entries.entry_date < ?", userID, today, tomorrow).
		Count(&todayEntries)

	// Current week streak
	weekAgo := time.Now().AddDate(0, 0, -7)
	var weekEntries int64
	h.db.Model(&models.HabitEntry{}).
		Joins("JOIN habits ON habit_entries.habit_id = habits.id").
		Where("habits.user_id = ? AND habit_entries.entry_date >= ? AND habit_entries.is_completed = ?", userID, weekAgo, true).
		Count(&weekEntries)

	stats := gin.H{
		"goals": gin.H{
			"total":     totalGoals,
			"active":    activeGoals,
			"completed": completedGoals,
		},
		"habits": gin.H{
			"total":         totalHabits,
			"active":        activeHabits,
			"today_entries": todayEntries,
			"week_streak":   weekEntries,
		},
	}

	c.JSON(http.StatusOK, stats)
}
