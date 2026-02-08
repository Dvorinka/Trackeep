package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/trackeep/backend/config"
	"github.com/trackeep/backend/models"
)

// AdminMiddleware checks if user is admin
func AdminMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetUint("userID")
		if userID == 0 {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
			c.Abort()
			return
		}

		var user models.User
		db := config.GetDB()
		if err := db.First(&user, userID).Error; err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
			c.Abort()
			return
		}

		if user.Role != "admin" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
			c.Abort()
			return
		}

		c.Set("user", user)
		c.Next()
	}
}

// AdminGetAllLearningPaths handles GET /api/v1/admin/learning-paths
func AdminGetAllLearningPaths(c *gin.Context) {
	db := config.GetDB()
	var learningPaths []models.LearningPath

	// Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	status := c.Query("status")
	creator := c.Query("creator")

	offset := (page - 1) * limit

	query := db.Model(&models.LearningPath{})

	// Add filters
	if status == "published" {
		query = query.Where("is_published = ?", true)
	} else if status == "draft" {
		query = query.Where("is_published = ?", false)
	}

	if creator != "" {
		// Escape special SQL characters to prevent SQL injection
		escapedCreator := strings.ReplaceAll(creator, "%", "\\%")
		escapedCreator = strings.ReplaceAll(escapedCreator, "_", "\\_")
		query = query.Joins("JOIN users ON users.id = learning_paths.creator_id").
			Where("users.username ILIKE ? OR users.full_name ILIKE ?", "%"+escapedCreator+"%", "%"+escapedCreator+"%")
	}

	// Count total records
	var total int64
	query.Count(&total)

	// Fetch learning paths with relationships
	if err := query.Preload("Creator").
		Preload("Tags").
		Offset(offset).
		Limit(limit).
		Order("created_at DESC").
		Find(&learningPaths).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch learning paths"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"learning_paths": learningPaths,
		"pagination": gin.H{
			"page":  page,
			"limit": limit,
			"total": total,
			"pages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}

// AdminReviewLearningPath handles PUT /api/v1/admin/learning-paths/:id/review
func AdminReviewLearningPath(c *gin.Context) {
	db := config.GetDB()
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid learning path ID"})
		return
	}

	var input struct {
		Action       string `json:"action" binding:"required"` // approve, reject, feature
		IsPublished  *bool  `json:"is_published"`
		IsFeatured   *bool  `json:"is_featured"`
		AdminNotes   string `json:"admin_notes"`
		RejectReason string `json:"reject_reason"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var learningPath models.LearningPath
	if err := db.Preload("Creator").First(&learningPath, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Learning path not found"})
		return
	}

	// Perform action based on input
	switch input.Action {
	case "approve":
		if input.IsPublished != nil {
			learningPath.IsPublished = *input.IsPublished
		} else {
			learningPath.IsPublished = true
		}
	case "reject":
		learningPath.IsPublished = false
		// Could add rejection reason field to model if needed
	case "feature":
		if input.IsFeatured != nil {
			learningPath.IsFeatured = *input.IsFeatured
		} else {
			learningPath.IsFeatured = true
		}
	case "unfeature":
		learningPath.IsFeatured = false
	}

	if err := db.Save(&learningPath).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update learning path"})
		return
	}

	// Log admin action (could implement audit log here)
	c.JSON(http.StatusOK, gin.H{
		"message":       "Learning path reviewed successfully",
		"learning_path": learningPath,
	})
}

// AdminGetUsers handles GET /api/v1/admin/users
func AdminGetUsers(c *gin.Context) {
	db := config.GetDB()
	var users []models.User

	// Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	role := c.Query("role")
	search := c.Query("search")

	offset := (page - 1) * limit

	query := db.Model(&models.User{})

	// Add filters
	if role != "" {
		query = query.Where("role = ?", role)
	}
	if search != "" {
		// Escape special SQL characters to prevent SQL injection
		escapedSearch := strings.ReplaceAll(search, "%", "\\%")
		escapedSearch = strings.ReplaceAll(escapedSearch, "_", "\\_")
		query = query.Where("username ILIKE ? OR full_name ILIKE ? OR email ILIKE ?",
			"%"+escapedSearch+"%", "%"+escapedSearch+"%", "%"+escapedSearch+"%")
	}

	// Count total records
	var total int64
	query.Count(&total)

	// Fetch users
	if err := query.Offset(offset).
		Limit(limit).
		Order("created_at DESC").
		Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
		return
	}

	// Remove passwords from response
	for i := range users {
		users[i].Password = ""
	}

	c.JSON(http.StatusOK, gin.H{
		"users": users,
		"pagination": gin.H{
			"page":  page,
			"limit": limit,
			"total": total,
			"pages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}

// AdminUpdateUserRole handles PUT /api/v1/admin/users/:id/role
func AdminUpdateUserRole(c *gin.Context) {
	db := config.GetDB()
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var input struct {
		Role string `json:"role" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate role
	if input.Role != "user" && input.Role != "admin" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role. Must be 'user' or 'admin'"})
		return
	}

	var user models.User
	if err := db.First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Prevent admin from changing their own role
	currentUserID := c.GetUint("userID")
	if currentUserID == uint(id) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot change your own role"})
		return
	}

	user.Role = input.Role
	if err := db.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user role"})
		return
	}

	// Remove password from response
	user.Password = ""

	c.JSON(http.StatusOK, gin.H{
		"message": "User role updated successfully",
		"user":    user,
	})
}

// AdminGetStats handles GET /api/v1/admin/stats
func AdminGetStats(c *gin.Context) {
	db := config.GetDB()

	var stats struct {
		TotalUsers           int64 `json:"total_users"`
		AdminUsers           int64 `json:"admin_users"`
		TotalLearningPaths   int64 `json:"total_learning_paths"`
		PublishedPaths       int64 `json:"published_paths"`
		DraftPaths           int64 `json:"draft_paths"`
		FeaturedPaths        int64 `json:"featured_paths"`
		TotalEnrollments     int64 `json:"total_enrollments"`
		ActiveEnrollments    int64 `json:"active_enrollments"`
		CompletedEnrollments int64 `json:"completed_enrollments"`
	}

	// User stats
	db.Model(&models.User{}).Count(&stats.TotalUsers)
	db.Model(&models.User{}).Where("role = ?", "admin").Count(&stats.AdminUsers)

	// Learning path stats
	db.Model(&models.LearningPath{}).Count(&stats.TotalLearningPaths)
	db.Model(&models.LearningPath{}).Where("is_published = ?", true).Count(&stats.PublishedPaths)
	db.Model(&models.LearningPath{}).Where("is_published = ?", false).Count(&stats.DraftPaths)
	db.Model(&models.LearningPath{}).Where("is_featured = ?", true).Count(&stats.FeaturedPaths)

	// Enrollment stats
	db.Model(&models.Enrollment{}).Count(&stats.TotalEnrollments)
	db.Model(&models.Enrollment{}).Where("status = ?", "in_progress").Count(&stats.ActiveEnrollments)
	db.Model(&models.Enrollment{}).Where("status = ?", "completed").Count(&stats.CompletedEnrollments)

	c.JSON(http.StatusOK, stats)
}

// AdminDeleteLearningPath handles DELETE /api/v1/admin/learning-paths/:id
func AdminDeleteLearningPath(c *gin.Context) {
	db := config.GetDB()
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid learning path ID"})
		return
	}

	var learningPath models.LearningPath
	if err := db.First(&learningPath, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Learning path not found"})
		return
	}

	if err := db.Delete(&learningPath).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete learning path"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Learning path deleted successfully"})
}
