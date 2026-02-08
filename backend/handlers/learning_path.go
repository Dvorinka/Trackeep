package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/trackeep/backend/config"
	"github.com/trackeep/backend/models"
)

// GetLearningPaths handles GET /api/v1/learning-paths
func GetLearningPaths(c *gin.Context) {
	db := config.GetDB()
	var learningPaths []models.LearningPath

	// Parse query parameters
	category := c.Query("category")
	difficulty := c.Query("difficulty")
	featured := c.Query("featured")
	search := c.Query("search")

	query := db.Where("is_published = ?", true)

	// Add filters
	if category != "" {
		query = query.Where("category = ?", category)
	}
	if difficulty != "" {
		query = query.Where("difficulty = ?", difficulty)
	}
	if featured == "true" {
		query = query.Where("is_featured = ?", true)
	}
	if search != "" {
		query = query.Where("title ILIKE ? OR description ILIKE ?", "%"+search+"%", "%"+search+"%")
	}

	// Preload relationships
	if err := query.Preload("Creator").Preload("Tags").Preload("Modules").Find(&learningPaths).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch learning paths"})
		return
	}

	c.JSON(http.StatusOK, learningPaths)
}

// GetLearningPath handles GET /api/v1/learning-paths/:id
func GetLearningPath(c *gin.Context) {
	db := config.GetDB()
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid learning path ID"})
		return
	}

	var learningPath models.LearningPath
	if err := db.Where("id = ? AND is_published = ?", id, true).
		Preload("Creator").
		Preload("Tags").
		Preload("Modules", "ORDER BY \"order\" ASC").
		Preload("Modules.Resources", "ORDER BY \"order\" ASC").
		First(&learningPath).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Learning path not found"})
		return
	}

	c.JSON(http.StatusOK, learningPath)
}

// CreateLearningPath handles POST /api/v1/learning-paths
func CreateLearningPath(c *gin.Context) {
	db := config.GetDB()
	var learningPath models.LearningPath

	if err := c.ShouldBindJSON(&learningPath); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get user ID from auth middleware
	userID := c.GetUint("userID")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	learningPath.CreatorID = userID

	// Create learning path
	if err := db.Create(&learningPath).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create learning path"})
		return
	}

	// Preload relationships for response
	db.Preload("Creator").Preload("Tags").First(&learningPath, learningPath.ID)

	c.JSON(http.StatusCreated, learningPath)
}

// UpdateLearningPath handles PUT /api/v1/learning-paths/:id
func UpdateLearningPath(c *gin.Context) {
	db := config.GetDB()
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid learning path ID"})
		return
	}

	var learningPath models.LearningPath
	userID := c.GetUint("userID")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Find existing learning path (creator or admin only)
	if err := db.Where("id = ? AND creator_id = ?", id, userID).First(&learningPath).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Learning path not found or no permission"})
		return
	}

	// Update fields
	var updateData models.LearningPath
	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := db.Model(&learningPath).Updates(updateData).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update learning path"})
		return
	}

	// Get updated learning path with relationships
	db.Preload("Creator").Preload("Tags").Preload("Modules").First(&learningPath, learningPath.ID)

	c.JSON(http.StatusOK, learningPath)
}

// DeleteLearningPath handles DELETE /api/v1/learning-paths/:id
func DeleteLearningPath(c *gin.Context) {
	db := config.GetDB()
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid learning path ID"})
		return
	}

	var learningPath models.LearningPath
	userID := c.GetUint("userID")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Find and delete learning path (creator or admin only)
	if err := db.Where("id = ? AND creator_id = ?", id, userID).First(&learningPath).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Learning path not found or no permission"})
		return
	}

	if err := db.Delete(&learningPath).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete learning path"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Learning path deleted successfully"})
}

// EnrollInLearningPath handles POST /api/v1/learning-paths/:id/enroll
func EnrollInLearningPath(c *gin.Context) {
	db := config.GetDB()
	pathID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid learning path ID"})
		return
	}

	userID := c.GetUint("userID")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Check if learning path exists
	var learningPath models.LearningPath
	if err := db.First(&learningPath, pathID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Learning path not found"})
		return
	}

	// Check if already enrolled
	var existingEnrollment models.Enrollment
	if err := db.Where("user_id = ? AND learning_path_id = ?", userID, pathID).First(&existingEnrollment).Error; err == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Already enrolled in this learning path"})
		return
	}

	// Create enrollment
	enrollment := models.Enrollment{
		UserID:          userID,
		LearningPathID: uint(pathID),
		Status:          "enrolled",
		Progress:        0,
		CompletedModules: []uint{},
	}

	if err := db.Create(&enrollment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to enroll in learning path"})
		return
	}

	// Update enrollment count
	db.Model(&learningPath).UpdateColumn("enrollment_count", learningPath.EnrollmentCount + 1)

	c.JSON(http.StatusCreated, enrollment)
}

// GetUserEnrollments handles GET /api/v1/enrollments
func GetUserEnrollments(c *gin.Context) {
	db := config.GetDB()
	userID := c.GetUint("userID")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var enrollments []models.Enrollment
	if err := db.Where("user_id = ?", userID).
		Preload("LearningPath").
		Preload("LearningPath.Creator").
		Preload("LearningPath.Tags").
		Find(&enrollments).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch enrollments"})
		return
	}

	c.JSON(http.StatusOK, enrollments)
}

// UpdateProgress handles PUT /api/v1/enrollments/:id/progress
func UpdateProgress(c *gin.Context) {
	db := config.GetDB()
	enrollmentID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid enrollment ID"})
		return
	}

	userID := c.GetUint("userID")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var input struct {
		ModuleID       uint    `json:"module_id"`
		Status         string  `json:"status"`
		Progress       float64 `json:"progress"`
		CompletedModules []uint `json:"completed_modules"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Find enrollment
	var enrollment models.Enrollment
	if err := db.Where("id = ? AND user_id = ?", enrollmentID, userID).First(&enrollment).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Enrollment not found"})
		return
	}

	// Update enrollment
	now := time.Now()
	if enrollment.Status == "enrolled" {
		enrollment.StartedAt = &now
		enrollment.Status = "in_progress"
	}

	enrollment.Progress = input.Progress
	enrollment.CompletedModules = input.CompletedModules
	enrollment.CurrentModuleID = &input.ModuleID

	// Check if completed
	if input.Progress >= 100 {
		enrollment.Status = "completed"
		enrollment.CompletedAt = &now
	}

	if err := db.Save(&enrollment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update progress"})
		return
	}

	c.JSON(http.StatusOK, enrollment)
}

// RateLearningPath handles POST /api/v1/enrollments/:id/rate
func RateLearningPath(c *gin.Context) {
	db := config.GetDB()
	enrollmentID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid enrollment ID"})
		return
	}

	userID := c.GetUint("userID")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var input struct {
		Rating float64 `json:"rating" binding:"required,min=1,max=5"`
		Review string  `json:"review"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Find enrollment
	var enrollment models.Enrollment
	if err := db.Where("id = ? AND user_id = ?", enrollmentID, userID).First(&enrollment).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Enrollment not found"})
		return
	}

	// Update enrollment with rating
	now := time.Now()
	enrollment.Rating = &input.Rating
	enrollment.Review = input.Review
	enrollment.ReviewDate = &now

	if err := db.Save(&enrollment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save rating"})
		return
	}

	// Update learning path rating
	var learningPath models.LearningPath
	db.First(&learningPath, enrollment.LearningPathID)
	
	// Recalculate average rating
	var avgRating struct {
		AvgRating float64
		Count     int
	}
	
	db.Model(&models.Enrollment{}).
		Select("AVG(rating) as avg_rating, COUNT(*) as count").
		Where("learning_path_id = ? AND rating IS NOT NULL", enrollment.LearningPathID).
		Scan(&avgRating)

	learningPath.Rating = avgRating.AvgRating
	learningPath.ReviewCount = avgRating.Count
	db.Save(&learningPath)

	c.JSON(http.StatusOK, enrollment)
}

// GetLearningPathCategories handles GET /api/v1/learning-paths/categories
func GetLearningPathCategories(c *gin.Context) {
	categories := []string{
		"programming",
		"web-development",
		"mobile-development",
		"data-science",
		"machine-learning",
		"cybersecurity",
		"design",
		"business",
		"marketing",
		"photography",
		"music",
		"writing",
		"languages",
		"other",
	}

	c.JSON(http.StatusOK, gin.H{"categories": categories})
}
