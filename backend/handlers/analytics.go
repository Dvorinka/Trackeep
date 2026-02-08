package handlers

import (
	"math"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/trackeep/backend/models"
	"gorm.io/gorm"
)

// AnalyticsHandler handles analytics operations
type AnalyticsHandler struct {
	db *gorm.DB
}

// NewAnalyticsHandler creates a new analytics handler
func NewAnalyticsHandler(db *gorm.DB) *AnalyticsHandler {
	return &AnalyticsHandler{db: db}
}

// GetDashboardAnalytics returns comprehensive dashboard analytics
func (h *AnalyticsHandler) GetDashboardAnalytics(c *gin.Context) {
	userID := c.GetUint("user_id")

	// Get date range from query params (default to last 30 days)
	days := 30
	if d := c.Query("days"); d != "" {
		if parsed, err := strconv.Atoi(d); err == nil && parsed > 0 {
			days = parsed
		}
	}

	startDate := time.Now().AddDate(0, 0, -days).Truncate(24 * time.Hour)
	endDate := time.Now().Truncate(24 * time.Hour).Add(24 * time.Hour)

	// Get analytics data
	var analytics []models.Analytics
	if err := h.db.Where("user_id = ? AND date BETWEEN ? AND ?", userID, startDate, endDate).
		Order("date DESC").
		Find(&analytics).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch analytics"})
		return
	}

	// Get productivity metrics
	var productivityMetrics []models.ProductivityMetrics
	if err := h.db.Where("user_id = ? AND start_date BETWEEN ? AND ?", userID, startDate, endDate).
		Order("start_date DESC").
		Find(&productivityMetrics).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch productivity metrics"})
		return
	}

	// Get learning analytics
	var learningAnalytics []models.LearningAnalytics
	if err := h.db.Where("user_id = ?", userID).
		Preload("Course").
		Order("last_accessed DESC").
		Find(&learningAnalytics).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch learning analytics"})
		return
	}

	// Get GitHub analytics
	var githubAnalytics []models.GitHubAnalytics
	if err := h.db.Where("user_id = ? AND date BETWEEN ? AND ?", userID, startDate, endDate).
		Order("date DESC").
		Find(&githubAnalytics).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch GitHub analytics"})
		return
	}

	// Get active goals
	var goals []models.Goal
	if err := h.db.Where("user_id = ? AND status = ?", userID, "active").
		Preload("Milestones").
		Order("priority DESC, deadline ASC").
		Find(&goals).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch goals"})
		return
	}

	// Calculate summary statistics
	totalHoursTracked := 0.0
	totalTasksCompleted := 0
	totalBookmarksAdded := 0
	totalNotesCreated := 0
	totalCoursesCompleted := 0
	totalGitHubCommits := 0

	for _, a := range analytics {
		totalHoursTracked += a.HoursTracked
		totalTasksCompleted += a.TasksCompleted
		totalBookmarksAdded += a.BookmarksAdded
		totalNotesCreated += a.NotesCreated
		totalCoursesCompleted += a.CoursesCompleted
		totalGitHubCommits += a.GitHubCommits
	}

	// Get habit analytics
	var habitAnalytics []models.HabitAnalytics
	if err := h.db.Where("user_id = ?", userID).
		Order("last_completed DESC").
		Find(&habitAnalytics).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch habit analytics"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"period": gin.H{
			"start_date": startDate,
			"end_date":   endDate,
			"days":       days,
		},
		"summary": gin.H{
			"hours_tracked":     totalHoursTracked,
			"tasks_completed":   totalTasksCompleted,
			"bookmarks_added":   totalBookmarksAdded,
			"notes_created":     totalNotesCreated,
			"courses_completed": totalCoursesCompleted,
			"github_commits":    totalGitHubCommits,
		},
		"analytics":            analytics,
		"productivity_metrics": productivityMetrics,
		"learning_analytics":   learningAnalytics,
		"github_analytics":     githubAnalytics,
		"goals":                goals,
		"habit_analytics":      habitAnalytics,
	})
}

// GetProductivityMetrics returns detailed productivity metrics
func (h *AnalyticsHandler) GetProductivityMetrics(c *gin.Context) {
	userID := c.GetUint("user_id")

	// Get period from query params
	period := c.DefaultQuery("period", "weekly")

	var startDate, endDate time.Time
	now := time.Now().Truncate(24 * time.Hour)

	switch period {
	case "daily":
		startDate = now.AddDate(0, 0, -7)
		endDate = now.Add(24 * time.Hour)
	case "weekly":
		startDate = now.AddDate(0, 0, -28)
		endDate = now.Add(24 * time.Hour)
	case "monthly":
		startDate = now.AddDate(0, -6, 0)
		endDate = now.Add(24 * time.Hour)
	case "yearly":
		startDate = now.AddDate(-3, 0, 0)
		endDate = now.Add(24 * time.Hour)
	default:
		startDate = now.AddDate(0, 0, -28)
		endDate = now.Add(24 * time.Hour)
	}

	var metrics []models.ProductivityMetrics
	if err := h.db.Where("user_id = ? AND period = ? AND start_date BETWEEN ? AND ?", userID, period, startDate, endDate).
		Order("start_date DESC").
		Find(&metrics).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch productivity metrics"})
		return
	}

	// If no metrics exist, generate them
	if len(metrics) == 0 {
		h.generateProductivityMetrics(userID, period, startDate, endDate)
		// Try again
		if err := h.db.Where("user_id = ? AND period = ? AND start_date BETWEEN ? AND ?", userID, period, startDate, endDate).
			Order("start_date DESC").
			Find(&metrics).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch productivity metrics"})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"period":  period,
		"metrics": metrics,
	})
}

// GetLearningAnalytics returns learning progress analytics
func (h *AnalyticsHandler) GetLearningAnalytics(c *gin.Context) {
	userID := c.GetUint("user_id")

	courseIDParam := c.Query("course_id")
	var courseID *uint
	if courseIDParam != "" {
		id, err := strconv.ParseUint(courseIDParam, 10, 32)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid course ID"})
			return
		}
		courseIDUint := uint(id)
		courseID = &courseIDUint
	}

	query := h.db.Where("user_id = ?", userID).Preload("Course")
	if courseID != nil {
		query = query.Where("course_id = ?", *courseID)
	}

	var learningAnalytics []models.LearningAnalytics
	if err := query.Order("last_accessed DESC").Find(&learningAnalytics).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch learning analytics"})
		return
	}

	// Calculate overall learning statistics
	totalTimeSpent := 0.0
	totalProgress := 0.0
	coursesInProgress := 0
	coursesCompleted := 0

	for _, la := range learningAnalytics {
		totalTimeSpent += la.TimeSpent
		totalProgress += la.Progress
		if la.Progress < 100 {
			coursesInProgress++
		} else {
			coursesCompleted++
		}
	}

	averageProgress := 0.0
	if len(learningAnalytics) > 0 {
		averageProgress = totalProgress / float64(len(learningAnalytics))
	}

	c.JSON(http.StatusOK, gin.H{
		"learning_analytics": learningAnalytics,
		"summary": gin.H{
			"total_time_spent":    totalTimeSpent,
			"average_progress":    averageProgress,
			"courses_in_progress": coursesInProgress,
			"courses_completed":   coursesCompleted,
			"total_courses":       len(learningAnalytics),
		},
	})
}

// GetContentAnalytics returns content consumption patterns
func (h *AnalyticsHandler) GetContentAnalytics(c *gin.Context) {
	userID := c.GetUint("user_id")

	contentType := c.Query("content_type")
	category := c.Query("category")
	days := 30
	if d := c.Query("days"); d != "" {
		if parsed, err := strconv.Atoi(d); err == nil && parsed > 0 {
			days = parsed
		}
	}

	startDate := time.Now().AddDate(0, 0, -days)

	query := h.db.Where("user_id = ? AND last_accessed >= ?", userID, startDate).
		Preload("Tags")

	if contentType != "" {
		query = query.Where("content_type = ?", contentType)
	}
	if category != "" {
		query = query.Where("category = ?", category)
	}

	var contentAnalytics []models.ContentAnalytics
	if err := query.Order("last_accessed DESC").Find(&contentAnalytics).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch content analytics"})
		return
	}

	// Group by content type
	contentTypeStats := make(map[string]int)
	categoryStats := make(map[string]int)
	totalAccessCount := 0
	totalTimeSpent := 0.0

	for _, ca := range contentAnalytics {
		contentTypeStats[ca.ContentType]++
		if ca.Category != "" {
			categoryStats[ca.Category]++
		}
		totalAccessCount += ca.AccessCount
		totalTimeSpent += ca.TimeSpent
	}

	c.JSON(http.StatusOK, gin.H{
		"content_analytics": contentAnalytics,
		"statistics": gin.H{
			"total_access_count": totalAccessCount,
			"total_time_spent":   totalTimeSpent,
			"content_types":      contentTypeStats,
			"categories":         categoryStats,
		},
	})
}

// GetGitHubAnalytics returns GitHub contribution analytics
func (h *AnalyticsHandler) GetGitHubAnalytics(c *gin.Context) {
	userID := c.GetUint("user_id")

	days := 30
	if d := c.Query("days"); d != "" {
		if parsed, err := strconv.Atoi(d); err == nil && parsed > 0 {
			days = parsed
		}
	}

	startDate := time.Now().AddDate(0, 0, -days).Truncate(24 * time.Hour)

	var githubAnalytics []models.GitHubAnalytics
	if err := h.db.Where("user_id = ? AND date >= ?", userID, startDate).
		Order("date DESC").
		Find(&githubAnalytics).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch GitHub analytics"})
		return
	}

	// Calculate summary statistics
	totalCommits := 0
	totalPullRequests := 0
	totalIssuesOpened := 0
	totalIssuesClosed := 0
	totalReviews := 0
	totalContributions := 0
	languages := make(map[string]int)
	repositories := make(map[string]bool)

	for _, ga := range githubAnalytics {
		totalCommits += ga.Commits
		totalPullRequests += ga.PullRequests
		totalIssuesOpened += ga.IssuesOpened
		totalIssuesClosed += ga.IssuesClosed
		totalReviews += ga.Reviews
		totalContributions += ga.Contributions

		for lang, count := range ga.Languages {
			languages[lang] += count
		}

		for _, repo := range ga.Repositories {
			repositories[repo] = true
		}
	}

	// Convert repositories map to slice
	repoList := make([]string, 0, len(repositories))
	for repo := range repositories {
		repoList = append(repoList, repo)
	}

	c.JSON(http.StatusOK, gin.H{
		"github_analytics": githubAnalytics,
		"summary": gin.H{
			"total_commits":       totalCommits,
			"total_pull_requests": totalPullRequests,
			"total_issues_opened": totalIssuesOpened,
			"total_issues_closed": totalIssuesClosed,
			"total_reviews":       totalReviews,
			"total_contributions": totalContributions,
			"languages":           languages,
			"repositories":        repoList,
		},
	})
}

// GetGoals returns user goals with progress
func (h *AnalyticsHandler) GetGoals(c *gin.Context) {
	userID := c.GetUint("user_id")

	status := c.Query("status")
	category := c.Query("category")

	query := h.db.Where("user_id = ?", userID).Preload("Milestones")

	if status != "" {
		query = query.Where("status = ?", status)
	}
	if category != "" {
		query = query.Where("category = ?", category)
	}

	var goals []models.Goal
	if err := query.Order("priority DESC, deadline ASC").Find(&goals).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch goals"})
		return
	}

	// Calculate goal statistics
	totalGoals := len(goals)
	completedGoals := 0
	activeGoals := 0
	overdueGoals := 0
	now := time.Now()

	for _, goal := range goals {
		if goal.IsCompleted {
			completedGoals++
		} else if goal.Status == "active" {
			activeGoals++
			if goal.Deadline.Before(now) {
				overdueGoals++
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"goals": goals,
		"statistics": gin.H{
			"total_goals":     totalGoals,
			"completed_goals": completedGoals,
			"active_goals":    activeGoals,
			"overdue_goals":   overdueGoals,
		},
	})
}

// CreateGoal creates a new goal
func (h *AnalyticsHandler) CreateGoal(c *gin.Context) {
	userID := c.GetUint("user_id")

	var req struct {
		Title        string    `json:"title" binding:"required"`
		Description  string    `json:"description"`
		Category     string    `json:"category"`
		TargetValue  float64   `json:"target_value"`
		CurrentValue float64   `json:"current_value"`
		Unit         string    `json:"unit"`
		Deadline     time.Time `json:"deadline"`
		Priority     string    `json:"priority"`
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
		CurrentValue: req.CurrentValue,
		Unit:         req.Unit,
		Deadline:     req.Deadline,
		Priority:     req.Priority,
		Status:       "active",
		Progress:     (req.CurrentValue / req.TargetValue) * 100,
		IsCompleted:  req.CurrentValue >= req.TargetValue,
	}

	if goal.IsCompleted {
		now := time.Now()
		goal.CompletedAt = &now
		goal.Status = "completed"
	}

	if err := h.db.Create(&goal).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create goal"})
		return
	}

	c.JSON(http.StatusCreated, goal)
}

// UpdateGoal updates an existing goal
func (h *AnalyticsHandler) UpdateGoal(c *gin.Context) {
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
		Title        *string    `json:"title,omitempty"`
		Description  *string    `json:"description,omitempty"`
		Category     *string    `json:"category,omitempty"`
		TargetValue  *float64   `json:"target_value,omitempty"`
		CurrentValue *float64   `json:"current_value,omitempty"`
		Unit         *string    `json:"unit,omitempty"`
		Deadline     *time.Time `json:"deadline,omitempty"`
		Status       *string    `json:"status,omitempty"`
		Priority     *string    `json:"priority,omitempty"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update fields if provided
	if req.Title != nil {
		goal.Title = *req.Title
	}
	if req.Description != nil {
		goal.Description = *req.Description
	}
	if req.Category != nil {
		goal.Category = *req.Category
	}
	if req.TargetValue != nil {
		goal.TargetValue = *req.TargetValue
	}
	if req.CurrentValue != nil {
		goal.CurrentValue = *req.CurrentValue
	}
	if req.Unit != nil {
		goal.Unit = *req.Unit
	}
	if req.Deadline != nil {
		goal.Deadline = *req.Deadline
	}
	if req.Status != nil {
		goal.Status = *req.Status
	}
	if req.Priority != nil {
		goal.Priority = *req.Priority
	}

	// Recalculate progress and completion status
	goal.Progress = (goal.CurrentValue / goal.TargetValue) * 100
	goal.IsCompleted = goal.CurrentValue >= goal.TargetValue

	if goal.IsCompleted && goal.CompletedAt == nil {
		now := time.Now()
		goal.CompletedAt = &now
		goal.Status = "completed"
	} else if !goal.IsCompleted && goal.CompletedAt != nil {
		goal.CompletedAt = nil
	}

	if err := h.db.Save(&goal).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update goal"})
		return
	}

	c.JSON(http.StatusOK, goal)
}

// DeleteGoal deletes a goal
func (h *AnalyticsHandler) DeleteGoal(c *gin.Context) {
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

// GenerateAnalyticsReport generates a comprehensive analytics report
func (h *AnalyticsHandler) GenerateAnalyticsReport(c *gin.Context) {
	userID := c.GetUint("user_id")

	var req struct {
		ReportType string    `json:"report_type" binding:"required"`
		StartDate  time.Time `json:"start_date" binding:"required"`
		EndDate    time.Time `json:"end_date" binding:"required"`
		Title      string    `json:"title"`
		IsPublic   bool      `json:"is_public"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Generate report data
	reportData := gin.H{}

	// Get analytics for the period
	var analytics []models.Analytics
	h.db.Where("user_id = ? AND date BETWEEN ? AND ?", userID, req.StartDate, req.EndDate).
		Find(&analytics)

	// Get productivity metrics
	var productivityMetrics []models.ProductivityMetrics
	h.db.Where("user_id = ? AND start_date BETWEEN ? AND ?", userID, req.StartDate, req.EndDate).
		Find(&productivityMetrics)

	// Get learning analytics
	var learningAnalytics []models.LearningAnalytics
	h.db.Where("user_id = ?", userID).Preload("Course").Find(&learningAnalytics)

	// Get GitHub analytics
	var githubAnalytics []models.GitHubAnalytics
	h.db.Where("user_id = ? AND date BETWEEN ? AND ?", userID, req.StartDate, req.EndDate).
		Find(&githubAnalytics)

	// Get goals
	var goals []models.Goal
	h.db.Where("user_id = ?", userID).Preload("Milestones").Find(&goals)

	reportData["analytics"] = analytics
	reportData["productivity_metrics"] = productivityMetrics
	reportData["learning_analytics"] = learningAnalytics
	reportData["github_analytics"] = githubAnalytics
	reportData["goals"] = goals

	// Generate insights and recommendations
	insights := h.generateInsights(analytics, productivityMetrics, learningAnalytics, githubAnalytics, goals)
	recommendations := h.generateRecommendations(analytics, productivityMetrics, learningAnalytics, githubAnalytics, goals)

	report := models.AnalyticsReport{
		UserID:          userID,
		ReportType:      req.ReportType,
		StartDate:       req.StartDate,
		EndDate:         req.EndDate,
		Title:           req.Title,
		Data:            reportData,
		Insights:        insights,
		Recommendations: recommendations,
		IsPublic:        req.IsPublic,
	}

	if err := h.db.Create(&report).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate report"})
		return
	}

	c.JSON(http.StatusCreated, report)
}

// Helper functions

// GenerateDailyAnalytics generates daily analytics data for users
func (h *AnalyticsHandler) GenerateDailyAnalytics(c *gin.Context) {
	userID := c.GetUint("user_id")

	// Get date from query params (default to today)
	dateStr := c.DefaultQuery("date", time.Now().Format("2006-01-02"))
	date, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format"})
		return
	}

	startDate := date.Truncate(24 * time.Hour)
	endDate := startDate.Add(24 * time.Hour)

	// Get time entries for the day
	var timeEntries []models.TimeEntry
	h.db.Where("user_id = ? AND start_time BETWEEN ? AND ?", userID, startDate, endDate).
		Preload("Task").
		Preload("Bookmark").
		Preload("Note").
		Find(&timeEntries)

	// Get tasks created/completed for the day
	var tasks []models.Task
	h.db.Where("user_id = ? AND (created_at BETWEEN ? AND ? OR updated_at BETWEEN ? AND ?)",
		userID, startDate, endDate, startDate, endDate).
		Find(&tasks)

	// Get bookmarks created for the day
	var bookmarksCreated int64
	h.db.Model(&models.Bookmark{}).
		Where("user_id = ? AND created_at BETWEEN ? AND ?", userID, startDate, endDate).
		Count(&bookmarksCreated)

	// Get notes created for the day
	var notesCreated int64
	h.db.Model(&models.Note{}).
		Where("user_id = ? AND created_at BETWEEN ? AND ?", userID, startDate, endDate).
		Count(&notesCreated)

	// Get courses completed for the day
	var coursesCompleted int64
	h.db.Model(&models.Enrollment{}).
		Where("user_id = ? AND completed_at BETWEEN ? AND ?", userID, startDate, endDate).
		Count(&coursesCompleted)

	// Get GitHub contributions for the day
	var githubCommits int
	h.db.Model(&models.GitHubAnalytics{}).
		Where("user_id = ? AND date = ?", userID, startDate).
		Select("COALESCE(commits, 0)").
		Scan(&githubCommits)

	// Calculate metrics
	hoursTracked := 0.0
	tasksCompleted := 0
	studyStreak := 0
	productivityScore := 0.0

	for _, entry := range timeEntries {
		duration := entry.GetDuration()
		hoursTracked += float64(duration) / 3600.0
	}

	for _, task := range tasks {
		if task.Status == "completed" && task.UpdatedAt.After(startDate) && task.UpdatedAt.Before(endDate) {
			tasksCompleted++
		}
	}

	// Calculate study streak (consecutive days with learning activity)
	studyStreak = h.calculateStudyStreak(userID, date)

	// Calculate productivity score
	productivityScore = h.calculateProductivityScore(hoursTracked, tasksCompleted, int(bookmarksCreated), int(notesCreated))

	// Create or update daily analytics
	var existingAnalytics models.Analytics
	err = h.db.Where("user_id = ? AND date = ?", userID, startDate).First(&existingAnalytics).Error

	if err == nil {
		// Update existing
		existingAnalytics.HoursTracked = hoursTracked
		existingAnalytics.TasksCompleted = tasksCompleted
		existingAnalytics.BookmarksAdded = int(bookmarksCreated)
		existingAnalytics.NotesCreated = int(notesCreated)
		existingAnalytics.CoursesCompleted = int(coursesCompleted)
		existingAnalytics.GitHubCommits = githubCommits
		existingAnalytics.StudyStreak = studyStreak
		existingAnalytics.ProductivityScore = productivityScore
		h.db.Save(&existingAnalytics)
	} else {
		// Create new
		analytics := models.Analytics{
			UserID:            userID,
			Date:              startDate,
			HoursTracked:      hoursTracked,
			TasksCompleted:    tasksCompleted,
			BookmarksAdded:    int(bookmarksCreated),
			NotesCreated:      int(notesCreated),
			CoursesCompleted:  int(coursesCompleted),
			GitHubCommits:     githubCommits,
			StudyStreak:       studyStreak,
			ProductivityScore: productivityScore,
		}
		h.db.Create(&analytics)
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Daily analytics generated successfully",
		"date":    startDate.Format("2006-01-02"),
		"metrics": gin.H{
			"hours_tracked":      hoursTracked,
			"tasks_completed":    tasksCompleted,
			"bookmarks_added":    bookmarksCreated,
			"notes_created":      notesCreated,
			"courses_completed":  coursesCompleted,
			"github_commits":     githubCommits,
			"study_streak":       studyStreak,
			"productivity_score": productivityScore,
		},
	})
}

func (h *AnalyticsHandler) calculateStudyStreak(userID uint, date time.Time) int {
	// Calculate consecutive days with learning activity
	streak := 0
	currentDate := date.AddDate(0, 0, -1) // Start from yesterday

	for i := 0; i < 365; i++ { // Check up to a year back
		checkDate := currentDate.AddDate(0, 0, -i)

		var count int64
		h.db.Model(&models.LearningAnalytics{}).
			Where("user_id = ? AND DATE(last_accessed) = ?", userID, checkDate.Format("2006-01-02")).
			Count(&count)

		if count > 0 {
			streak++
		} else {
			break
		}
	}

	return streak
}

func (h *AnalyticsHandler) calculateProductivityScore(hoursTracked float64, tasksCompleted, bookmarksAdded, notesCreated int) float64 {
	// Simple productivity score calculation
	// Base score from hours tracked (max 40 points)
	hoursScore := 0.0
	if hoursTracked > 0 {
		hoursScore = math.Min(hoursTracked*2, 40) // 2 points per hour, max 40
	}

	// Tasks completed score (max 30 points)
	tasksScore := math.Min(float64(tasksCompleted)*3, 30) // 3 points per task, max 30

	// Content creation score (max 20 points)
	contentScore := math.Min(float64(bookmarksAdded+notesCreated)*2, 20) // 2 points per item, max 20

	// Bonus for well-rounded day (max 10 points)
	bonus := 0.0
	if hoursTracked > 4 && tasksCompleted > 0 && (bookmarksAdded > 0 || notesCreated > 0) {
		bonus = 10
	}

	totalScore := hoursScore + tasksScore + contentScore + bonus
	return math.Min(totalScore, 100) // Cap at 100
}

// generateProductivityMetrics generates productivity metrics for a given period
func (h *AnalyticsHandler) generateProductivityMetrics(userID uint, period string, startDate, endDate time.Time) {
	// Get time entries for the period
	var timeEntries []models.TimeEntry
	h.db.Where("user_id = ? AND start_time BETWEEN ? AND ?", userID, startDate, endDate).
		Preload("Task").
		Preload("Bookmark").
		Preload("Note").
		Find(&timeEntries)

	// Get tasks for the period
	var tasks []models.Task
	h.db.Where("user_id = ? AND created_at BETWEEN ? AND ?", userID, startDate, endDate).
		Find(&tasks)

	// Calculate metrics
	totalHours := 0.0
	billableHours := 0.0
	nonBillableHours := 0.0
	tasksCompleted := 0
	hourlyProductivity := make(map[int]float64) // hour of day -> total hours

	for _, entry := range timeEntries {
		duration := entry.GetDuration()
		hours := float64(duration) / 3600.0
		totalHours += hours

		if entry.Billable {
			billableHours += hours
		} else {
			nonBillableHours += hours
		}

		// Track productivity by hour
		hour := entry.StartTime.Hour()
		hourlyProductivity[hour] += hours
	}

	// Count completed tasks
	for _, task := range tasks {
		if task.Status == "completed" {
			tasksCompleted++
		}
	}

	// Calculate average task time
	averageTaskTime := 0.0
	if tasksCompleted > 0 {
		totalTaskTime := 0.0
		taskCount := 0
		for _, entry := range timeEntries {
			if entry.TaskID != nil {
				duration := entry.GetDuration()
				totalTaskTime += float64(duration) / 3600.0
				taskCount++
			}
		}
		if taskCount > 0 {
			averageTaskTime = totalTaskTime / float64(taskCount)
		}
	}

	// Find peak productivity hour
	peakProductivityHour := 9 // default to 9 AM
	maxHours := 0.0
	for hour, hours := range hourlyProductivity {
		if hours > maxHours {
			maxHours = hours
			peakProductivityHour = hour
		}
	}

	// Calculate focus score (based on uninterrupted time blocks)
	focusScore := calculateFocusScore(timeEntries)

	// Calculate efficiency score (tasks completed per hour)
	efficiencyScore := 0.0
	if totalHours > 0 {
		efficiencyScore = float64(tasksCompleted) / totalHours * 100
	}

	// Create or update productivity metrics
	var existingMetrics models.ProductivityMetrics
	err := h.db.Where("user_id = ? AND period = ? AND start_date = ?", userID, period, startDate).
		First(&existingMetrics).Error

	if err == nil {
		// Update existing
		existingMetrics.TotalHours = totalHours
		existingMetrics.BillableHours = billableHours
		existingMetrics.NonBillableHours = nonBillableHours
		existingMetrics.TasksCompleted = tasksCompleted
		existingMetrics.AverageTaskTime = averageTaskTime
		existingMetrics.PeakProductivityHour = peakProductivityHour
		existingMetrics.FocusScore = focusScore
		existingMetrics.EfficiencyScore = efficiencyScore
		h.db.Save(&existingMetrics)
	} else {
		// Create new
		metrics := models.ProductivityMetrics{
			UserID:               userID,
			Period:               period,
			StartDate:            startDate,
			EndDate:              endDate,
			TotalHours:           totalHours,
			BillableHours:        billableHours,
			NonBillableHours:     nonBillableHours,
			TasksCompleted:       tasksCompleted,
			AverageTaskTime:      averageTaskTime,
			PeakProductivityHour: peakProductivityHour,
			FocusScore:           focusScore,
			EfficiencyScore:      efficiencyScore,
		}
		h.db.Create(&metrics)
	}
}

func calculateFocusScore(timeEntries []models.TimeEntry) float64 {
	if len(timeEntries) == 0 {
		return 0.0
	}

	// Group entries by day and calculate focus score
	// Focus score is based on the ratio of uninterrupted time blocks
	totalUninterruptedTime := 0.0
	totalTime := 0.0

	// Sort time entries by start time
	sortedEntries := make([]models.TimeEntry, len(timeEntries))
	copy(sortedEntries, timeEntries)

	// Simple implementation: check for gaps between entries
	for i := 0; i < len(sortedEntries); i++ {
		duration := float64(sortedEntries[i].GetDuration()) / 3600.0
		totalTime += duration

		// Check if this entry follows closely after the previous one
		if i > 0 {
			var previousEndTime time.Time
			if sortedEntries[i-1].EndTime != nil {
				previousEndTime = *sortedEntries[i-1].EndTime
			} else {
				previousEndTime = sortedEntries[i-1].StartTime.Add(time.Duration(sortedEntries[i-1].GetDuration()) * time.Second)
			}
			gap := sortedEntries[i].StartTime.Sub(previousEndTime)
			if gap < 15*time.Minute { // Less than 15 minutes gap
				totalUninterruptedTime += duration
			}
		} else {
			totalUninterruptedTime += duration
		}
	}

	if totalTime == 0 {
		return 0.0
	}

	return (totalUninterruptedTime / totalTime) * 100
}

func (h *AnalyticsHandler) generateInsights(analytics []models.Analytics, productivityMetrics []models.ProductivityMetrics, learningAnalytics []models.LearningAnalytics, githubAnalytics []models.GitHubAnalytics, goals []models.Goal) []string {
	insights := []string{}

	// Generate insights based on data
	if len(analytics) > 0 {
		totalHours := 0.0
		for _, a := range analytics {
			totalHours += a.HoursTracked
		}
		if totalHours > 100 {
			insights = append(insights, "Great job! You've tracked over 100 hours of productive work.")
		}
	}

	if len(goals) > 0 {
		completed := 0
		for _, goal := range goals {
			if goal.IsCompleted {
				completed++
			}
		}
		if completed > 0 {
			insights = append(insights, "You've completed "+strconv.Itoa(completed)+" goals. Keep up the momentum!")
		}
	}

	return insights
}

func (h *AnalyticsHandler) generateRecommendations(analytics []models.Analytics, productivityMetrics []models.ProductivityMetrics, learningAnalytics []models.LearningAnalytics, githubAnalytics []models.GitHubAnalytics, goals []models.Goal) []string {
	recommendations := []string{}

	// Generate recommendations based on data
	if len(analytics) > 0 {
		totalHours := 0.0
		for _, a := range analytics {
			totalHours += a.HoursTracked
		}
		if totalHours < 20 {
			recommendations = append(recommendations, "Consider tracking more time to get better insights into your productivity patterns.")
		}
	}

	if len(goals) > 0 {
		overdue := 0
		now := time.Now()
		for _, goal := range goals {
			if goal.Status == "active" && goal.Deadline.Before(now) {
				overdue++
			}
		}
		if overdue > 0 {
			recommendations = append(recommendations, "You have "+strconv.Itoa(overdue)+" overdue goals. Consider updating deadlines or priorities.")
		}
	}

	return recommendations
}
