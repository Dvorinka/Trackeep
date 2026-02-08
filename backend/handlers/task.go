package handlers

import (
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/trackeep/backend/config"
	"github.com/trackeep/backend/models"
)

// GetTasks handles GET /api/v1/tasks
func GetTasks(c *gin.Context) {
	// Check if demo mode is enabled
	if os.Getenv("VITE_DEMO_MODE") == "true" {
		// Parse dates for demo mode
		dueDate1, _ := time.Parse("2006-01-02", "2024-02-15")
		dueDate2, _ := time.Parse("2006-01-02", "2024-02-10")
		dueDate3, _ := time.Parse("2006-01-02", "2024-02-01")
		dueDate4, _ := time.Parse("2006-01-02", "2024-02-08")
		dueDate5, _ := time.Parse("2006-01-02", "2024-02-20")
		completedAt := time.Now().AddDate(0, 0, -1)

		// Return mock tasks for demo mode
		mockTasks := []models.Task{
			{
				ID:          1,
				Title:       "Complete API documentation",
				Description: "Write comprehensive documentation for all API endpoints",
				Status:      "in_progress",
				Priority:    "high",
				DueDate:     &dueDate1,
				UserID:      1,
				CreatedAt:   time.Now().AddDate(0, 0, -7),
				UpdatedAt:   time.Now(),
			},
			{
				ID:          2,
				Title:       "Fix responsive design issues",
				Description: "Resolve mobile layout problems on dashboard",
				Status:      "pending",
				Priority:    "medium",
				DueDate:     &dueDate2,
				UserID:      1,
				CreatedAt:   time.Now().AddDate(0, 0, -3),
				UpdatedAt:   time.Now(),
			},
			{
				ID:          3,
				Title:       "Deploy to production",
				Description: "Deploy latest changes to production environment",
				Status:      "completed",
				Priority:    "high",
				DueDate:     &dueDate3,
				UserID:      1,
				CreatedAt:   time.Now().AddDate(0, 0, -14),
				UpdatedAt:   time.Now().AddDate(0, 0, -1),
				CompletedAt: &completedAt,
			},
			{
				ID:          4,
				Title:       "Review pull requests",
				Description: "Review and merge pending pull requests",
				Status:      "pending",
				Priority:    "medium",
				DueDate:     &dueDate4,
				UserID:      1,
				CreatedAt:   time.Now().AddDate(0, 0, -1),
				UpdatedAt:   time.Now(),
			},
			{
				ID:          5,
				Title:       "Update dependencies",
				Description: "Update all npm packages to latest stable versions",
				Status:      "pending",
				Priority:    "low",
				DueDate:     &dueDate5,
				UserID:      1,
				CreatedAt:   time.Now().AddDate(0, 0, -5),
				UpdatedAt:   time.Now(),
			},
		}
		c.JSON(http.StatusOK, mockTasks)
		return
	}

	db := config.GetDB()
	var tasks []models.Task

	userID := c.GetUint("userID")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	if err := db.Where("user_id = ?", userID).Preload("Tags").Find(&tasks).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch tasks"})
		return
	}

	c.JSON(http.StatusOK, tasks)
}

// CreateTask handles POST /api/v1/tasks
func CreateTask(c *gin.Context) {
	db := config.GetDB()
	var task models.Task

	if err := c.ShouldBindJSON(&task); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.GetUint("userID")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	task.UserID = userID

	if err := db.Create(&task).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create task"})
		return
	}

	db.Preload("Tags").First(&task, task.ID)

	c.JSON(http.StatusCreated, task)
}

// GetTask handles GET /api/v1/tasks/:id
func GetTask(c *gin.Context) {
	db := config.GetDB()
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
		return
	}

	var task models.Task
	userID := c.GetUint("userID")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	if err := db.Where("id = ? AND user_id = ?", id, userID).Preload("Tags").First(&task).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		return
	}

	c.JSON(http.StatusOK, task)
}

// UpdateTask handles PUT /api/v1/tasks/:id
func UpdateTask(c *gin.Context) {
	db := config.GetDB()
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
		return
	}

	var task models.Task
	userID := c.GetUint("userID")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	if err := db.Where("id = ? AND user_id = ?", id, userID).First(&task).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		return
	}

	var updateData models.Task
	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := db.Model(&task).Updates(updateData).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update task"})
		return
	}

	db.Preload("Tags").First(&task, task.ID)

	c.JSON(http.StatusOK, task)
}

// DeleteTask handles DELETE /api/v1/tasks/:id
func DeleteTask(c *gin.Context) {
	db := config.GetDB()
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
		return
	}

	var task models.Task
	userID := c.GetUint("userID")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	if err := db.Where("id = ? AND user_id = ?", id, userID).First(&task).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		return
	}

	if err := db.Delete(&task).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete task"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Task deleted successfully"})
}
