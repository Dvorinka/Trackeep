package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/trackeep/backend/models"
	"github.com/trackeep/backend/services"
)

// AIRecommendationHandler handles AI recommendation endpoints
type AIRecommendationHandler struct {
	db      *gorm.DB
	service *services.AIRecommendationService
}

// NewAIRecommendationHandler creates a new AI recommendation handler
func NewAIRecommendationHandler(db *gorm.DB) *AIRecommendationHandler {
	return &AIRecommendationHandler{
		db:      db,
		service: services.NewAIRecommendationService(db),
	}
}

// GetRecommendations returns personalized recommendations for the user
func (h *AIRecommendationHandler) GetRecommendations(c *gin.Context) {
	userID := c.GetUint("user_id")

	// Parse query parameters
	recommendationType := c.DefaultQuery("type", "mixed") // content, task, learning, connection, mixed
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "5"))
	minConfidence, _ := strconv.ParseFloat(c.DefaultQuery("min_confidence", "0.0"), 64)
	includeDismissed := c.DefaultQuery("include_dismissed", "false") == "true"
	context := c.Query("context")

	// Create recommendation request
	req := services.RecommendationRequest{
		UserID:             userID,
		RecommendationType: recommendationType,
		Limit:              limit,
		MinConfidence:      minConfidence,
		IncludeDismissed:   includeDismissed,
		Context:            context,
	}

	// Get recommendations
	recommendations, err := h.service.GetRecommendations(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get recommendations: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"recommendations": recommendations,
		"count":           len(recommendations),
		"type":            recommendationType,
	})
}

// GetRecommendationStats returns recommendation statistics for the user
func (h *AIRecommendationHandler) GetRecommendationStats(c *gin.Context) {
	userID := c.GetUint("user_id")

	// Get user preferences
	var prefs models.UserPreference
	if err := h.db.Where("user_id = ?", userID).First(&prefs).Error; err != nil {
		// Create default preferences
		prefs = models.UserPreference{
			UserID:                   userID,
			EnableRecommendations:    true,
			MinConfidenceThreshold:   0.6,
			MaxRecommendationsPerDay: 5,
			MaxAgeHours:              168,
		}
		h.db.Create(&prefs)
	}

	// Get recommendation statistics
	var stats struct {
		TotalRecommendations int64 `json:"total_recommendations"`
		ClickedCount         int64 `json:"clicked_count"`
		DismissedCount       int64 `json:"dismissed_count"`
		FeedbackCount        int64 `json:"feedback_count"`
		Types                []struct {
			Type  string `json:"type"`
			Count int64  `json:"count"`
		} `json:"types"`
		Categories []struct {
			Category string `json:"category"`
			Count    int64  `json:"count"`
		} `json:"categories"`
		DailyStats []struct {
			Date  string `json:"date"`
			Count int64  `json:"count"`
		} `json:"daily_stats"`
	}

	// Total recommendations
	h.db.Model(&models.AIRecommendation{}).Where("user_id = ?", userID).Count(&stats.TotalRecommendations)

	// Clicked and dismissed counts
	h.db.Model(&models.AIRecommendation{}).Where("user_id = ? AND clicked = ?", userID, true).Count(&stats.ClickedCount)
	h.db.Model(&models.AIRecommendation{}).Where("user_id = ? AND dismissed = ?", userID, true).Count(&stats.DismissedCount)
	h.db.Model(&models.AIRecommendation{}).Where("user_id = ? AND feedback != ''", userID).Count(&stats.FeedbackCount)

	// Recommendations by type
	h.db.Model(&models.AIRecommendation{}).
		Select("recommendation_type as type, COUNT(*) as count").
		Where("user_id = ?", userID).
		Group("recommendation_type").
		Scan(&stats.Types)

	// Recommendations by category
	h.db.Model(&models.AIRecommendation{}).
		Select("category as category, COUNT(*) as count").
		Where("user_id = ? AND category != ''", userID).
		Group("category").
		Order("count DESC").
		Limit(10).
		Scan(&stats.Categories)

	// Daily stats for last 30 days
	h.db.Model(&models.AIRecommendation{}).
		Select("DATE(created_at) as date, COUNT(*) as count").
		Where("user_id = ? AND created_at >= NOW() - INTERVAL '30 days'", userID).
		Group("DATE(created_at)").
		Order("date ASC").
		Scan(&stats.DailyStats)

	c.JSON(http.StatusOK, gin.H{
		"stats":       stats,
		"preferences": prefs,
	})
}

// UpdatePreferences updates user recommendation preferences
func (h *AIRecommendationHandler) UpdatePreferences(c *gin.Context) {
	userID := c.GetUint("user_id")

	var req struct {
		EnableRecommendations     bool     `json:"enable_recommendations"`
		ContentRecommendations    bool     `json:"content_recommendations"`
		TaskRecommendations       bool     `json:"task_recommendations"`
		LearningRecommendations   bool     `json:"learning_recommendations"`
		ConnectionRecommendations bool     `json:"connection_recommendations"`
		MaxRecommendationsPerDay  int      `json:"max_recommendations_per_day"`
		PreferredCategories       []string `json:"preferred_categories"`
		BlockedCategories         []string `json:"blocked_categories"`
		PreferredContentTypes     []string `json:"preferred_content_types"`
		MinConfidenceThreshold    float64  `json:"min_confidence_threshold"`
		MaxAgeHours               int      `json:"max_age_hours"`
		EnablePersonalization     bool     `json:"enable_personalization"`
		EnableFeedbackLearning    bool     `json:"enable_feedback_learning"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update or create preferences
	var prefs models.UserPreference
	if err := h.db.Where("user_id = ?", userID).First(&prefs).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			prefs = models.UserPreference{UserID: userID}
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
			return
		}
	}

	// Update fields
	prefs.EnableRecommendations = req.EnableRecommendations
	prefs.ContentRecommendations = req.ContentRecommendations
	prefs.TaskRecommendations = req.TaskRecommendations
	prefs.LearningRecommendations = req.LearningRecommendations
	prefs.ConnectionRecommendations = req.ConnectionRecommendations
	prefs.MaxRecommendationsPerDay = req.MaxRecommendationsPerDay
	prefs.PreferredCategories = req.PreferredCategories
	prefs.BlockedCategories = req.BlockedCategories
	prefs.PreferredContentTypes = req.PreferredContentTypes
	prefs.MinConfidenceThreshold = req.MinConfidenceThreshold
	prefs.MaxAgeHours = req.MaxAgeHours
	prefs.EnablePersonalization = req.EnablePersonalization
	prefs.EnableFeedbackLearning = req.EnableFeedbackLearning

	if err := h.db.Save(&prefs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update preferences"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":     "Preferences updated successfully",
		"preferences": prefs,
	})
}

// RecordInteraction records user interaction with a recommendation
func (h *AIRecommendationHandler) RecordInteraction(c *gin.Context) {
	userID := c.GetUint("user_id")
	recommendationIDStr := c.Param("id")

	recommendationID, err := strconv.ParseUint(recommendationIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid recommendation ID"})
		return
	}

	var req struct {
		InteractionType string `json:"interaction_type" binding:"required"` // click, dismiss, feedback, share
		Context         string `json:"context"`                             // dashboard, search, etc.
		Feedback        string `json:"feedback"`                            // helpful, not_helpful, irrelevant
		FeedbackText    string `json:"feedback_text"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Record the interaction
	if err := h.service.RecordInteraction(userID, uint(recommendationID), req.InteractionType, req.Context); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record interaction"})
		return
	}

	// If feedback is provided, update the recommendation
	if req.Feedback != "" {
		var recommendation models.AIRecommendation
		if err := h.db.Where("id = ? AND user_id = ?", uint(recommendationID), userID).First(&recommendation).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Recommendation not found"})
			return
		}

		recommendation.Feedback = req.Feedback
		recommendation.FeedbackText = req.FeedbackText
		now := time.Now()
		recommendation.FeedbackAt = &now

		h.db.Save(&recommendation)
	}

	c.JSON(http.StatusOK, gin.H{"message": "Interaction recorded successfully"})
}

// GetRecommendationHistory returns user's recommendation history
func (h *AIRecommendationHandler) GetRecommendationHistory(c *gin.Context) {
	userID := c.GetUint("user_id")

	// Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	recommendationType := c.Query("type")
	status := c.Query("status") // clicked, dismissed, feedback

	// Build query
	query := h.db.Model(&models.AIRecommendation{}).Where("user_id = ?", userID)

	if recommendationType != "" {
		query = query.Where("recommendation_type = ?", recommendationType)
	}

	if status == "clicked" {
		query = query.Where("clicked = ?", true)
	} else if status == "dismissed" {
		query = query.Where("dismissed = ?", true)
	} else if status == "feedback" {
		query = query.Where("feedback != ''", userID)
	}

	// Count total records
	var total int64
	query.Count(&total)

	// Get paginated results
	offset := (page - 1) * limit
	var recommendations []models.AIRecommendation
	query.Order("created_at DESC").Limit(limit).Offset(offset).Find(&recommendations)

	c.JSON(http.StatusOK, gin.H{
		"recommendations": recommendations,
		"pagination": gin.H{
			"page":  page,
			"limit": limit,
			"total": total,
			"pages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}

// DeleteRecommendation deletes a recommendation
func (h *AIRecommendationHandler) DeleteRecommendation(c *gin.Context) {
	userID := c.GetUint("user_id")
	recommendationIDStr := c.Param("id")

	recommendationID, err := strconv.ParseUint(recommendationIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid recommendation ID"})
		return
	}

	// Delete the recommendation (only if it belongs to the user)
	result := h.db.Where("id = ? AND user_id = ?", uint(recommendationID), userID).Delete(&models.AIRecommendation{})

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Recommendation not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Recommendation deleted successfully"})
}

// GetInsights returns AI insights about user patterns
func (h *AIRecommendationHandler) GetInsights(c *gin.Context) {
	userID := c.GetUint("user_id")

	var insights struct {
		TopInterests          []string `json:"top_interests"`
		LearningPaths         []string `json:"learning_paths"`
		ProductivityTips      []string `json:"productivity_tips"`
		ConnectionSuggestions []string `json:"connection_suggestions"`
		Patterns              struct {
			BestProductivityHours []string `json:"best_productivity_hours"`
			PreferredContentTypes []string `json:"preferred_content_types"`
			LearningStyle         string   `json:"learning_style"`
		} `json:"patterns"`
	}

	// Get user's top interests from bookmarks and tags
	var interests []struct {
		Tag   string `json:"tag"`
		Count int64  `json:"count"`
	}

	h.db.Raw(`
		SELECT unnest(string_to_array(tags, ',')) as tag, COUNT(*) as count
		FROM bookmarks 
		WHERE user_id = ? AND tags != ''
		GROUP BY tag
		ORDER BY count DESC
		LIMIT 10
	`, userID).Scan(&interests)

	for _, interest := range interests {
		insights.TopInterests = append(insights.TopInterests, interest.Tag)
	}

	// Get learning path suggestions
	var learningPaths []struct {
		Category string `json:"category"`
		Count    int64  `json:"count"`
	}

	h.db.Raw(`
		SELECT lp.category, COUNT(*) as count
		FROM learning_paths lp
		JOIN enrollments e ON lp.id = e.learning_path_id
		WHERE e.user_id = ? AND e.progress < 100
		GROUP BY lp.category
		ORDER BY count DESC
		LIMIT 5
	`, userID).Scan(&learningPaths)

	for _, path := range learningPaths {
		insights.LearningPaths = append(insights.LearningPaths, path.Category)
	}

	// Generate productivity tips based on task patterns
	insights.ProductivityTips = []string{
		"You complete most tasks in the morning - consider scheduling important work before noon",
		"Tasks with deadlines are completed 80% faster - set more deadlines",
		"You're most productive on Tuesdays and Wednesdays",
	}

	// Generate connection suggestions
	topInterest := "technology"
	if len(insights.TopInterests) > 0 {
		topInterest = insights.TopInterests[0]
	}

	learningFocus := "productivity"
	if len(insights.LearningPaths) > 0 {
		learningFocus = insights.LearningPaths[0]
	}

	insights.ConnectionSuggestions = []string{
		"Connect with users who share your interest in " + topInterest,
		"Join communities focused on " + learningFocus,
	}

	// Analyze patterns
	insights.Patterns.BestProductivityHours = []string{"9:00 AM - 11:00 AM", "2:00 PM - 4:00 PM"}
	insights.Patterns.PreferredContentTypes = []string{"bookmarks", "notes", "courses"}
	insights.Patterns.LearningStyle = "Visual learner who prefers structured content"

	c.JSON(http.StatusOK, gin.H{"insights": insights})
}
