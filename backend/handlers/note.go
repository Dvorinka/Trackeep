package handlers

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/trackeep/backend/models"
	"gorm.io/gorm"
)

// GetNotes retrieves all notes for a user
func GetNotes(c *gin.Context) {
	var notes []models.Note

	// TODO: Get user ID from authentication context
	// Parse query parameters for filtering
	search := c.Query("search")
	tag := c.Query("tag")

	userID := c.GetUint("userID")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	query := models.DB.Where("user_id = ?", userID)

	// Add search filter
	if search != "" {
		query = query.Where("title ILIKE ? OR content ILIKE ?", "%"+search+"%", "%"+search+"%")
	}

	// Add tag filter
	if tag != "" {
		query = query.Joins("JOIN note_tags ON notes.id = note_tags.note_id").
			Joins("JOIN tags ON note_tags.tag_id = tags.id").
			Where("tags.name = ?", tag)
	}

	if err := query.Find(&notes).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve notes"})
		return
	}

	c.JSON(http.StatusOK, notes)
}

// CreateNote creates a new note
func CreateNote(c *gin.Context) {
	var input struct {
		Title       string   `json:"title" binding:"required"`
		Content     string   `json:"content"`
		Description string   `json:"description"`
		Tags        []string `json:"tags"`
		IsPublic    bool     `json:"is_public"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// TODO: Get user ID from authentication context
	userID := uint(1) // Placeholder

	// Create note
	note := models.Note{
		UserID:      userID,
		Title:       input.Title,
		Content:     input.Content,
		Description: input.Description,
		IsPublic:    input.IsPublic,
	}

	// Start transaction
	tx := models.DB.Begin()

	// Create note
	if err := tx.Create(&note).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create note"})
		return
	}

	// Add tags if provided
	if len(input.Tags) > 0 {
		for _, tagName := range input.Tags {
			var tag models.Tag
			// Find or create tag
			if err := tx.Where("name = ?", tagName).FirstOrCreate(&tag, models.Tag{Name: tagName}).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create tag"})
				return
			}

			// Associate tag with note
			if err := tx.Model(&note).Association("Tags").Append(&tag); err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to associate tag"})
				return
			}
		}
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create note"})
		return
	}

	// Reload note with tags
	models.DB.Preload("Tags").First(&note, note.ID)

	c.JSON(http.StatusCreated, note)
}

// GetNote retrieves a specific note
func GetNote(c *gin.Context) {
	id := c.Param("id")

	var note models.Note
	if err := models.DB.Preload("Tags").First(&note, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Note not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve note"})
		return
	}

	// TODO: Check if user has permission to view this note
	// For now, we'll assume user can access their own notes

	c.JSON(http.StatusOK, note)
}

// UpdateNote updates an existing note
func UpdateNote(c *gin.Context) {
	id := c.Param("id")

	var note models.Note
	if err := models.DB.First(&note, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Note not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve note"})
		return
	}

	// TODO: Check if user has permission to update this note

	var input struct {
		Title       string   `json:"title"`
		Content     string   `json:"content"`
		Description string   `json:"description"`
		Tags        []string `json:"tags"`
		IsPublic    bool     `json:"is_public"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Start transaction
	tx := models.DB.Begin()

	// Update note fields
	if input.Title != "" {
		note.Title = input.Title
	}
	if input.Content != "" {
		note.Content = input.Content
	}
	if input.Description != "" {
		note.Description = input.Description
	}
	note.IsPublic = input.IsPublic

	if err := tx.Save(&note).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update note"})
		return
	}

	// Update tags if provided
	if input.Tags != nil {
		// Clear existing tags
		if err := tx.Model(&note).Association("Tags").Clear(); err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to clear existing tags"})
			return
		}

		// Add new tags
		for _, tagName := range input.Tags {
			var tag models.Tag
			// Find or create tag
			if err := tx.Where("name = ?", tagName).FirstOrCreate(&tag, models.Tag{Name: tagName}).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create tag"})
				return
			}

			// Associate tag with note
			if err := tx.Model(&note).Association("Tags").Append(&tag); err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to associate tag"})
				return
			}
		}
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update note"})
		return
	}

	// Reload note with tags
	models.DB.Preload("Tags").First(&note, note.ID)

	c.JSON(http.StatusOK, note)
}

// DeleteNote deletes a note
func DeleteNote(c *gin.Context) {
	id := c.Param("id")

	var note models.Note
	if err := models.DB.First(&note, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Note not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve note"})
		return
	}

	// TODO: Check if user has permission to delete this note

	if err := models.DB.Delete(&note).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete note"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Note deleted successfully"})
}

// GetNoteStats retrieves statistics about notes
func GetNoteStats(c *gin.Context) {
	// TODO: Get user ID from authentication context
	userID := uint(1) // Placeholder

	var stats struct {
		TotalNotes   int64 `json:"total_notes"`
		PublicNotes  int64 `json:"public_notes"`
		PrivateNotes int64 `json:"private_notes"`
		TotalTags    int64 `json:"total_tags"`
		WordsCount   int64 `json:"words_count"`
	}

	// Count total notes
	models.DB.Model(&models.Note{}).Where("user_id = ?", userID).Count(&stats.TotalNotes)

	// Count public notes
	models.DB.Model(&models.Note{}).Where("user_id = ? AND is_public = ?", userID, true).Count(&stats.PublicNotes)

	// Count private notes
	models.DB.Model(&models.Note{}).Where("user_id = ? AND is_public = ?", userID, false).Count(&stats.PrivateNotes)

	// Count unique tags used by user
	models.DB.Table("tags").
		Joins("JOIN note_tags ON tags.id = note_tags.tag_id").
		Joins("JOIN notes ON note_tags.note_id = notes.id").
		Where("notes.user_id = ?", userID).
		Count(&stats.TotalTags)

	// Count total words in all notes (simplified approach)
	var notes []models.Note
	models.DB.Where("user_id = ?", userID).Select("content").Find(&notes)
	for _, note := range notes {
		// Simple word count - split by spaces
		if note.Content != "" {
			stats.WordsCount += int64(len(strings.Fields(note.Content)))
		}
	}

	c.JSON(http.StatusOK, stats)
}
