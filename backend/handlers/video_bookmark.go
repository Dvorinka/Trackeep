package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/trackeep/backend/config"
	"github.com/trackeep/backend/services"
	"gorm.io/gorm"
)

// VideoBookmarkHandler handles video bookmark API endpoints
type VideoBookmarkHandler struct {
	bookmarkService *services.VideoBookmarkService
}

// NewVideoBookmarkHandler creates a new video bookmark handler
func NewVideoBookmarkHandler() *VideoBookmarkHandler {
	var db *gorm.DB
	if config.GetDB() != nil {
		db = config.GetDB()
	}
	bookmarkService := services.NewVideoBookmarkService(db)
	return &VideoBookmarkHandler{bookmarkService: bookmarkService}
}

// SaveVideoBookmark saves a video bookmark
func (vbh *VideoBookmarkHandler) SaveVideoBookmark(c *gin.Context) {
	var req services.SaveVideoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	// TODO: Get user ID from JWT token (for now using demo user ID 1)
	userID := uint(1)

	bookmark, err := vbh.bookmarkService.SaveVideoBookmark(userID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to save bookmark",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"bookmark": bookmark,
	})
}

// GetUserBookmarks gets all bookmarks for a user
func (vbh *VideoBookmarkHandler) GetUserBookmarks(c *gin.Context) {
	// Parse query parameters
	limit := 20
	offset := 0

	if limitStr := c.Query("limit"); limitStr != "" {
		if parsed, err := strconv.Atoi(limitStr); err == nil && parsed > 0 && parsed <= 100 {
			limit = parsed
		}
	}

	if offsetStr := c.Query("offset"); offsetStr != "" {
		if parsed, err := strconv.Atoi(offsetStr); err == nil && parsed >= 0 {
			offset = parsed
		}
	}

	// TODO: Get user ID from JWT token (for now using demo user ID 1)
	userID := uint(1)

	bookmarks, err := vbh.bookmarkService.GetUserBookmarks(userID, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get bookmarks",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"bookmarks": bookmarks,
		"count": len(bookmarks),
	})
}

// GetBookmarkByID gets a specific bookmark
func (vbh *VideoBookmarkHandler) GetBookmarkByID(c *gin.Context) {
	bookmarkID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid bookmark ID",
		})
		return
	}

	// TODO: Get user ID from JWT token (for now using demo user ID 1)
	userID := uint(1)

	bookmark, err := vbh.bookmarkService.GetBookmarkByID(userID, uint(bookmarkID))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Bookmark not found",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"bookmark": bookmark,
	})
}

// UpdateBookmark updates a bookmark
func (vbh *VideoBookmarkHandler) UpdateBookmark(c *gin.Context) {
	bookmarkID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid bookmark ID",
		})
		return
	}

	var req services.SaveVideoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	// TODO: Get user ID from JWT token (for now using demo user ID 1)
	userID := uint(1)

	bookmark, err := vbh.bookmarkService.UpdateBookmark(userID, uint(bookmarkID), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to update bookmark",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"bookmark": bookmark,
	})
}

// DeleteBookmark deletes a bookmark
func (vbh *VideoBookmarkHandler) DeleteBookmark(c *gin.Context) {
	bookmarkID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid bookmark ID",
		})
		return
	}

	// TODO: Get user ID from JWT token (for now using demo user ID 1)
	userID := uint(1)

	if err := vbh.bookmarkService.DeleteBookmark(userID, uint(bookmarkID)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to delete bookmark",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Bookmark deleted successfully",
	})
}

// ToggleWatched toggles the watched status of a bookmark
func (vbh *VideoBookmarkHandler) ToggleWatched(c *gin.Context) {
	bookmarkID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid bookmark ID",
		})
		return
	}

	// TODO: Get user ID from JWT token (for now using demo user ID 1)
	userID := uint(1)

	bookmark, err := vbh.bookmarkService.ToggleWatched(userID, uint(bookmarkID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to toggle watched status",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"bookmark": bookmark,
	})
}

// ToggleFavorite toggles the favorite status of a bookmark
func (vbh *VideoBookmarkHandler) ToggleFavorite(c *gin.Context) {
	bookmarkID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid bookmark ID",
		})
		return
	}

	// TODO: Get user ID from JWT token (for now using demo user ID 1)
	userID := uint(1)

	bookmark, err := vbh.bookmarkService.ToggleFavorite(userID, uint(bookmarkID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to toggle favorite status",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"bookmark": bookmark,
	})
}

// SearchBookmarks searches bookmarks
func (vbh *VideoBookmarkHandler) SearchBookmarks(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Search query is required",
		})
		return
	}

	// Parse query parameters
	limit := 20
	offset := 0

	if limitStr := c.Query("limit"); limitStr != "" {
		if parsed, err := strconv.Atoi(limitStr); err == nil && parsed > 0 && parsed <= 100 {
			limit = parsed
		}
	}

	if offsetStr := c.Query("offset"); offsetStr != "" {
		if parsed, err := strconv.Atoi(offsetStr); err == nil && parsed >= 0 {
			offset = parsed
		}
	}

	// TODO: Get user ID from JWT token (for now using demo user ID 1)
	userID := uint(1)

	bookmarks, err := vbh.bookmarkService.SearchBookmarks(userID, query, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to search bookmarks",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"bookmarks": bookmarks,
		"count": len(bookmarks),
		"query": query,
	})
}

// GetBookmarkStats gets statistics about user's bookmarks
func (vbh *VideoBookmarkHandler) GetBookmarkStats(c *gin.Context) {
	// TODO: Get user ID from JWT token (for now using demo user ID 1)
	userID := uint(1)

	stats, err := vbh.bookmarkService.GetBookmarkStats(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get bookmark stats",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"stats": stats,
	})
}
