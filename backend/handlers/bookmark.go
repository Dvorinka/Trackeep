package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/trackeep/backend/config"
	"github.com/trackeep/backend/models"
)

// GetBookmarks handles GET /api/v1/bookmarks
func GetBookmarks(c *gin.Context) {
	db := config.GetDB()
	var bookmarks []models.Bookmark

	// Get user ID from context (set by auth middleware)
	userID := c.GetUint("userID")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Preload tags for the bookmarks
	if err := db.Where("user_id = ?", userID).Preload("Tags").Find(&bookmarks).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch bookmarks"})
		return
	}

	c.JSON(http.StatusOK, bookmarks)
}

// CreateBookmark handles POST /api/v1/bookmarks
func CreateBookmark(c *gin.Context) {
	db := config.GetDB()
	var bookmark models.Bookmark

	if err := c.ShouldBindJSON(&bookmark); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Set user ID from auth middleware
	userID := c.GetUint("userID")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	bookmark.UserID = userID

	// Create bookmark
	if err := db.Create(&bookmark).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create bookmark"})
		return
	}

	// Preload tags for response
	db.Preload("Tags").First(&bookmark, bookmark.ID)

	c.JSON(http.StatusCreated, bookmark)
}

// GetBookmark handles GET /api/v1/bookmarks/:id
func GetBookmark(c *gin.Context) {
	db := config.GetDB()
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid bookmark ID"})
		return
	}

	var bookmark models.Bookmark
	userID := c.GetUint("userID")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Find bookmark with tags
	if err := db.Where("id = ? AND user_id = ?", id, userID).Preload("Tags").First(&bookmark).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Bookmark not found"})
		return
	}

	c.JSON(http.StatusOK, bookmark)
}

// UpdateBookmark handles PUT /api/v1/bookmarks/:id
func UpdateBookmark(c *gin.Context) {
	db := config.GetDB()
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid bookmark ID"})
		return
	}

	var bookmark models.Bookmark
	userID := c.GetUint("userID")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Find existing bookmark
	if err := db.Where("id = ? AND user_id = ?", id, userID).First(&bookmark).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Bookmark not found"})
		return
	}

	// Update fields
	var updateData models.Bookmark
	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update bookmark
	if err := db.Model(&bookmark).Updates(updateData).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update bookmark"})
		return
	}

	// Get updated bookmark with tags
	db.Preload("Tags").First(&bookmark, bookmark.ID)

	c.JSON(http.StatusOK, bookmark)
}

// DeleteBookmark handles DELETE /api/v1/bookmarks/:id
func DeleteBookmark(c *gin.Context) {
	db := config.GetDB()
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid bookmark ID"})
		return
	}

	var bookmark models.Bookmark
	userID := c.GetUint("userID")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Find and delete bookmark
	if err := db.Where("id = ? AND user_id = ?", id, userID).First(&bookmark).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Bookmark not found"})
		return
	}

	if err := db.Delete(&bookmark).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete bookmark"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Bookmark deleted successfully"})
}
