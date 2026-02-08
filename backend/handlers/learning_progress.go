package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/trackeep/backend/models"
	"gorm.io/gorm"
)

// LearningProgressHandler handles learning progress operations
type LearningProgressHandler struct {
	db *gorm.DB
}

// NewLearningProgressHandler creates a new learning progress handler
func NewLearningProgressHandler(db *gorm.DB) *LearningProgressHandler {
	return &LearningProgressHandler{db: db}
}

// UpdateLearningProgress updates learning analytics when user interacts with course
func (h *LearningProgressHandler) UpdateLearningProgress(c *gin.Context) {
	userID := c.GetUint("user_id")

	var req struct {
		CourseID  uint     `json:"course_id" binding:"required"`
		TimeSpent float64  `json:"time_spent"` // in hours
		Progress  float64  `json:"progress"`   // percentage 0-100
		ModuleID  *uint    `json:"module_id,omitempty"`
		QuizScore *float64 `json:"quiz_score,omitempty"`
		Skills    []string `json:"skills,omitempty"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get course information
	var course models.Course
	if err := h.db.First(&course, req.CourseID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Course not found"})
		return
	}

	// Get or create learning analytics
	var learningAnalytics models.LearningAnalytics
	err := h.db.Where("user_id = ? AND course_id = ?", userID, req.CourseID).
		Preload("Course").
		First(&learningAnalytics).Error

	if err != nil {
		// Create new learning analytics
		averageScore := 0.0
		if req.QuizScore != nil {
			averageScore = *req.QuizScore
		}
		learningAnalytics = models.LearningAnalytics{
			UserID:           userID,
			CourseID:         req.CourseID,
			StartDate:        time.Now(),
			LastAccessed:     time.Now(),
			TimeSpent:        req.TimeSpent,
			Progress:         req.Progress,
			ModulesCompleted: 0,
			TotalModules:     course.ModuleCount,
			AverageScore:     averageScore,
			StreakDays:       1,
			SkillsAcquired:   req.Skills,
		}

		if err := h.db.Create(&learningAnalytics).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create learning analytics"})
			return
		}
	} else {
		// Update existing analytics
		learningAnalytics.LastAccessed = time.Now()
		learningAnalytics.TimeSpent += req.TimeSpent
		learningAnalytics.Progress = req.Progress

		// Update modules completed if progress increased
		if req.ModuleID != nil {
			learningAnalytics.ModulesCompleted++
		}

		// Update quiz scores
		if req.QuizScore != nil {
			if learningAnalytics.QuizScores == nil {
				learningAnalytics.QuizScores = []float64{*req.QuizScore}
			} else {
				learningAnalytics.QuizScores = append(learningAnalytics.QuizScores, *req.QuizScore)
			}

			// Calculate average score
			sum := 0.0
			for _, score := range learningAnalytics.QuizScores {
				sum += score
			}
			learningAnalytics.AverageScore = sum / float64(len(learningAnalytics.QuizScores))
		}

		// Update skills
		if len(req.Skills) > 0 {
			skillsMap := make(map[string]bool)
			for _, skill := range learningAnalytics.SkillsAcquired {
				skillsMap[skill] = true
			}
			for _, skill := range req.Skills {
				if !skillsMap[skill] {
					learningAnalytics.SkillsAcquired = append(learningAnalytics.SkillsAcquired, skill)
					skillsMap[skill] = true
				}
			}
		}

		// Update streak
		learningAnalytics.StreakDays = h.calculateLearningStreak(userID, req.CourseID)

		if err := h.db.Save(&learningAnalytics).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update learning analytics"})
			return
		}
	}

	// Check if course is completed
	if learningAnalytics.Progress >= 100 && !learningAnalytics.CourseCompleted {
		learningAnalytics.CourseCompleted = true
		learningAnalytics.CompletedAt = &time.Time{}
		*learningAnalytics.CompletedAt = time.Now()
		h.db.Save(&learningAnalytics)

		// Update enrollment if exists
		var enrollment models.Enrollment
		if err := h.db.Where("user_id = ? AND course_id = ?", userID, req.CourseID).
			First(&enrollment).Error; err == nil {
			enrollment.CompletedAt = learningAnalytics.CompletedAt
			enrollment.Status = "completed"
			h.db.Save(&enrollment)
		}
	}

	c.JSON(http.StatusOK, learningAnalytics)
}

// GetLearningProgress returns detailed learning progress for a user
func (h *LearningProgressHandler) GetLearningProgress(c *gin.Context) {
	userID := c.GetUint("user_id")

	var learningAnalytics []models.LearningAnalytics
	if err := h.db.Where("user_id = ?", userID).
		Preload("Course").
		Order("last_accessed DESC").
		Find(&learningAnalytics).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch learning progress"})
		return
	}

	// Calculate overall statistics
	totalCourses := len(learningAnalytics)
	completedCourses := 0
	inProgressCourses := 0
	totalTimeSpent := 0.0
	totalSkills := make(map[string]bool)

	for _, la := range learningAnalytics {
		totalTimeSpent += la.TimeSpent

		if la.Progress >= 100 {
			completedCourses++
		} else if la.Progress > 0 {
			inProgressCourses++
		}

		for _, skill := range la.SkillsAcquired {
			totalSkills[skill] = true
		}
	}

	// Get recent activity
	var recentActivity []models.LearningAnalytics
	if err := h.db.Where("user_id = ? AND last_accessed >= ?",
		userID, time.Now().AddDate(0, 0, -7)).
		Preload("Course").
		Order("last_accessed DESC").
		Find(&recentActivity).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch recent activity"})
		return
	}

	// Convert skills map to slice
	skillsList := make([]string, 0, len(totalSkills))
	for skill := range totalSkills {
		skillsList = append(skillsList, skill)
	}

	c.JSON(http.StatusOK, gin.H{
		"learning_progress": learningAnalytics,
		"statistics": gin.H{
			"total_courses":       totalCourses,
			"completed_courses":   completedCourses,
			"in_progress_courses": inProgressCourses,
			"total_time_spent":    totalTimeSpent,
			"total_skills":        len(skillsList),
			"skills_acquired":     skillsList,
		},
		"recent_activity": recentActivity,
	})
}

// GetCourseProgress returns detailed progress for a specific course
func (h *LearningProgressHandler) GetCourseProgress(c *gin.Context) {
	userID := c.GetUint("user_id")
	courseID, err := strconv.ParseUint(c.Param("courseId"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid course ID"})
		return
	}

	var learningAnalytics models.LearningAnalytics
	if err := h.db.Where("user_id = ? AND course_id = ?", userID, courseID).
		Preload("Course").
		First(&learningAnalytics).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Course progress not found"})
		return
	}

	// Get detailed module progress if available
	var moduleProgress []gin.H
	// This would be implemented based on your course structure
	// For now, return placeholder data

	c.JSON(http.StatusOK, gin.H{
		"course_progress": learningAnalytics,
		"module_progress": moduleProgress,
		"insights":        h.generateLearningInsights(learningAnalytics),
	})
}

// MarkCourseCompleted marks a course as completed
func (h *LearningProgressHandler) MarkCourseCompleted(c *gin.Context) {
	userID := c.GetUint("user_id")
	courseID, err := strconv.ParseUint(c.Param("courseId"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid course ID"})
		return
	}

	var learningAnalytics models.LearningAnalytics
	if err := h.db.Where("user_id = ? AND course_id = ?", userID, courseID).
		First(&learningAnalytics).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Course progress not found"})
		return
	}

	learningAnalytics.Progress = 100
	learningAnalytics.CourseCompleted = true
	completedAt := time.Now()
	learningAnalytics.CompletedAt = &completedAt

	if err := h.db.Save(&learningAnalytics).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to mark course as completed"})
		return
	}

	// Update enrollment
	var enrollment models.Enrollment
	if err := h.db.Where("user_id = ? AND course_id = ?", userID, courseID).
		First(&enrollment).Error; err == nil {
		enrollment.CompletedAt = &completedAt
		enrollment.Status = "completed"
		h.db.Save(&enrollment)
	}

	c.JSON(http.StatusOK, gin.H{
		"message":         "Course marked as completed",
		"course_progress": learningAnalytics,
	})
}

// Helper functions

func (h *LearningProgressHandler) calculateLearningStreak(userID uint, courseID uint) int {
	// Calculate consecutive days with learning activity for this course
	streak := 0
	currentDate := time.Now().Truncate(24 * time.Hour)

	for i := 0; i < 365; i++ { // Check up to a year back
		checkDate := currentDate.AddDate(0, 0, -i)

		var count int64
		h.db.Model(&models.LearningAnalytics{}).
			Where("user_id = ? AND course_id = ? AND DATE(last_accessed) = ?",
				userID, courseID, checkDate.Format("2006-01-02")).
			Count(&count)

		if count > 0 {
			streak++
		} else {
			break
		}
	}

	return streak
}

func (h *LearningProgressHandler) generateLearningInsights(analytics models.LearningAnalytics) []string {
	insights := []string{}

	// Generate insights based on learning patterns
	if analytics.TimeSpent > 50 {
		insights = append(insights, "You've dedicated over 50 hours to this course!")
	}

	if analytics.StreakDays > 7 {
		insights = append(insights, "Great consistency! You've maintained a learning streak for over a week.")
	}

	if analytics.AverageScore > 85 {
		insights = append(insights, "Excellent quiz performance! You're mastering the material.")
	}

	if analytics.Progress > 80 && analytics.Progress < 100 {
		insights = append(insights, "You're almost there! Just a bit more to complete this course.")
	}

	if len(analytics.SkillsAcquired) > 5 {
		insights = append(insights, "You've acquired numerous skills from this course.")
	}

	return insights
}
