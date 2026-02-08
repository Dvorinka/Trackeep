package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/trackeep/backend/config"
	"github.com/trackeep/backend/models"
)

// GetCourses handles GET /api/v1/courses
func GetCourses(c *gin.Context) {
	db := config.GetDB()
	var courses []models.Course

	// Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	category := c.Query("category")
	level := c.Query("level")
	isZTM := c.Query("is_ztm")

	// Validate pagination
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	offset := (page - 1) * limit

	// Build query
	query := db.Where("is_active = ?", true)

	if category != "" {
		query = query.Where("category = ?", category)
	}

	if level != "" {
		query = query.Where("level = ?", level)
	}

	if isZTM == "true" {
		query = query.Where("is_ztm_course = ?", true)
	}

	// Get total count
	var total int64
	query.Model(&models.Course{}).Count(&total)

	// Get courses with pagination
	if err := query.Order("is_featured DESC, rating DESC, students_count DESC").
		Offset(offset).Limit(limit).Find(&courses).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to fetch courses",
			"details": err.Error(),
		})
		return
	}

	// Calculate pagination info
	totalPages := (total + int64(limit) - 1) / int64(limit)

	c.JSON(http.StatusOK, gin.H{
		"courses": courses,
		"pagination": gin.H{
			"current_page": page,
			"total_pages":  totalPages,
			"total_count":  total,
			"limit":        limit,
		},
	})
}

// GetCourse handles GET /api/v1/courses/:id
func GetCourse(c *gin.Context) {
	db := config.GetDB()
	id := c.Param("id")

	var course models.Course
	if err := db.Where("id = ? AND is_active = ?", id, true).First(&course).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Course not found",
		})
		return
	}

	c.JSON(http.StatusOK, course)
}

// GetCourseBySlug handles GET /api/v1/courses/slug/:slug
func GetCourseBySlug(c *gin.Context) {
	db := config.GetDB()
	slug := c.Param("slug")

	var course models.Course
	if err := db.Where("slug = ? AND is_active = ?", slug, true).First(&course).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Course not found",
		})
		return
	}

	c.JSON(http.StatusOK, course)
}

// GetFeaturedCourses handles GET /api/v1/courses/featured
func GetFeaturedCourses(c *gin.Context) {
	db := config.GetDB()
	var courses []models.Course

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	if limit < 1 || limit > 20 {
		limit = 10
	}

	if err := db.Where("is_active = ? AND is_featured = ?", true, true).
		Order("rating DESC, students_count DESC").
		Limit(limit).Find(&courses).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to fetch featured courses",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"courses": courses,
		"count":   len(courses),
	})
}

// GetZTMCourses handles GET /api/v1/courses/ztm
func GetZTMCourses(c *gin.Context) {
	db := config.GetDB()
	var courses []models.Course

	// Parse query parameters
	category := c.Query("category")
	level := c.Query("level")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if limit < 1 || limit > 50 {
		limit = 20
	}

	// Build query
	query := db.Where("is_active = ? AND is_ztm_course = ?", true, true)

	if category != "" {
		query = query.Where("category = ?", category)
	}

	if level != "" {
		query = query.Where("level = ?", level)
	}

	if err := query.Order("is_featured DESC, rating DESC, students_count DESC").
		Limit(limit).Find(&courses).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to fetch ZTM courses",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"courses": courses,
		"count":   len(courses),
	})
}

// GetCourseCategories handles GET /api/v1/courses/categories
func GetCourseCategories(c *gin.Context) {
	db := config.GetDB()

	var categories []struct {
		Category string `json:"category"`
		Count    int64  `json:"count"`
	}

	if err := db.Model(&models.Course{}).
		Where("is_active = ?", true).
		Select("category, COUNT(*) as count").
		Group("category").
		Order("count DESC").
		Find(&categories).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to fetch course categories",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"categories": categories,
	})
}

// SearchCourses handles POST /api/v1/courses/search
func SearchCourses(c *gin.Context) {
	db := config.GetDB()

	type SearchRequest struct {
		Query    string `json:"query" binding:"required"`
		Category string `json:"category"`
		Level    string `json:"level"`
		Limit    int    `json:"limit"`
		Page     int    `json:"page"`
	}

	var req SearchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	// Set defaults
	if req.Limit <= 0 || req.Limit > 50 {
		req.Limit = 20
	}
	if req.Page <= 0 {
		req.Page = 1
	}

	offset := (req.Page - 1) * req.Limit

	// Build search query
	query := db.Where("is_active = ? AND (title ILIKE ? OR description ILIKE ? OR topics::text ILIKE ?)",
		true, "%"+req.Query+"%", "%"+req.Query+"%", "%"+req.Query+"%")

	if req.Category != "" {
		query = query.Where("category = ?", req.Category)
	}

	if req.Level != "" {
		query = query.Where("level = ?", req.Level)
	}

	// Get total count
	var total int64
	query.Model(&models.Course{}).Count(&total)

	// Get courses
	var courses []models.Course
	if err := query.Order("is_featured DESC, rating DESC, students_count DESC").
		Offset(offset).Limit(req.Limit).Find(&courses).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to search courses",
			"details": err.Error(),
		})
		return
	}

	// Calculate pagination info
	totalPages := (total + int64(req.Limit) - 1) / int64(req.Limit)

	c.JSON(http.StatusOK, gin.H{
		"courses": courses,
		"query":   req.Query,
		"pagination": gin.H{
			"current_page": req.Page,
			"total_pages":  totalPages,
			"total_count":  total,
			"limit":        req.Limit,
		},
	})
}

// GetLearningPathCourses handles GET /api/v1/learning-paths/:id/courses
func GetLearningPathCourses(c *gin.Context) {
	db := config.GetDB()
	learningPathID := c.Param("id")

	var learningPathCourses []models.LearningPathCourse
	if err := db.Where("learning_path_id = ?", learningPathID).
		Preload("Course").
		Order("order ASC").
		Find(&learningPathCourses).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to fetch learning path courses",
			"details": err.Error(),
		})
		return
	}

	// Extract courses
	courses := make([]models.Course, 0)
	for _, lpc := range learningPathCourses {
		if lpc.Course.IsActive {
			courses = append(courses, lpc.Course)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"courses": courses,
		"count":   len(courses),
	})
}
