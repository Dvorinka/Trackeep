package handlers

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/trackeep/backend/config"
	"github.com/trackeep/backend/models"
	"github.com/trackeep/backend/utils"
)

// EncryptionRequest represents a request to encrypt content
type EncryptionRequest struct {
	Content      string `json:"content" binding:"required"`
	EncryptTitle bool   `json:"encrypt_title"`
}

// EncryptionResponse represents a response with encrypted content
type EncryptionResponse struct {
	EncryptedContent string `json:"encrypted_content"`
	IsEncrypted      bool   `json:"is_encrypted"`
}

// EncryptNoteContent encrypts note content
func EncryptNoteContent(c *gin.Context) {
	var req EncryptionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	// Encrypt the content
	encryptedContent, err := utils.Encrypt(req.Content)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to encrypt content"})
		return
	}

	c.JSON(200, EncryptionResponse{
		EncryptedContent: encryptedContent,
		IsEncrypted:      true,
	})
}

// DecryptNoteContent decrypts note content
func DecryptNoteContent(c *gin.Context) {
	var req struct {
		EncryptedContent string `json:"encrypted_content" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	// Decrypt the content
	decryptedContent, err := utils.Decrypt(req.EncryptedContent)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to decrypt content"})
		return
	}

	c.JSON(200, gin.H{
		"decrypted_content": decryptedContent,
		"is_encrypted":      false,
	})
}

// CreateEncryptedNote creates a new encrypted note
func CreateEncryptedNote(c *gin.Context) {
	user, exists := c.Get("user")
	if !exists {
		c.JSON(401, gin.H{"error": "User not authenticated"})
		return
	}

	currentUser := user.(models.User)

	var req struct {
		Title        string   `json:"title" binding:"required"`
		Content      string   `json:"content" binding:"required"`
		Description  string   `json:"description"`
		Tags         []string `json:"tags"`
		ContentType  string   `json:"content_type"`
		EncryptTitle bool     `json:"encrypt_title"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	db := config.GetDB()

	// Encrypt content
	encryptedContent, err := utils.Encrypt(req.Content)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to encrypt content"})
		return
	}

	// Encrypt title if requested
	var encryptedTitle string
	var titleToStore string
	if req.EncryptTitle {
		encryptedTitle, err = utils.Encrypt(req.Title)
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to encrypt title"})
			return
		}
		titleToStore = encryptedTitle
	} else {
		titleToStore = req.Title
	}

	// Create note
	note := models.Note{
		UserID:      currentUser.ID,
		Title:       titleToStore,
		Content:     encryptedContent,
		Description: req.Description,
		ContentType: req.ContentType,
		IsEncrypted: true,
		IsPublic:    false, // Encrypted notes are private by default
	}

	if err := db.Create(&note).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to create note"})
		return
	}

	// Handle tags if provided
	if len(req.Tags) > 0 {
		var tags []models.Tag
		for _, tagName := range req.Tags {
			var tag models.Tag
			if err := db.Where("name = ?", tagName).First(&tag).Error; err != nil {
				if err == gorm.ErrRecordNotFound {
					tag = models.Tag{Name: tagName}
					db.Create(&tag)
				}
			}
			tags = append(tags, tag)
		}
		db.Model(&note).Association("Tags").Append(tags)
	}

	// Return note without encrypted content for security
	responseNote := note
	responseNote.Content = "[ENCRYPTED]"
	if req.EncryptTitle {
		responseNote.Title = "[ENCRYPTED]"
	}

	c.JSON(201, gin.H{"note": responseNote})
}

// GetEncryptedNote retrieves and decrypts a note
func GetEncryptedNote(c *gin.Context) {
	user, exists := c.Get("user")
	if !exists {
		c.JSON(401, gin.H{"error": "User not authenticated"})
		return
	}

	currentUser := user.(models.User)
	noteID := c.Param("id")

	db := config.GetDB()

	var note models.Note
	if err := db.Where("id = ? AND user_id = ?", noteID, currentUser.ID).First(&note).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(404, gin.H{"error": "Note not found"})
			return
		}
		c.JSON(500, gin.H{"error": "Database error"})
		return
	}

	// If note is encrypted, decrypt it
	if note.IsEncrypted {
		decryptedContent, err := utils.Decrypt(note.Content)
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to decrypt note content"})
			return
		}
		note.Content = decryptedContent

		// Check if title is also encrypted (simple heuristic)
		if note.Title != "[ENCRYPTED]" && utils.IsEncrypted(note.Title) {
			decryptedTitle, err := utils.Decrypt(note.Title)
			if err == nil {
				note.Title = decryptedTitle
			}
		}
	}

	c.JSON(200, gin.H{"note": note})
}

// UploadEncryptedFile uploads and encrypts a file
func UploadEncryptedFile(c *gin.Context) {
	user, exists := c.Get("user")
	if !exists {
		c.JSON(401, gin.H{"error": "User not authenticated"})
		return
	}

	currentUser := user.(models.User)

	// Parse multipart form
	err := c.Request.ParseMultipartForm(32 << 20) // 32MB max
	if err != nil {
		c.JSON(400, gin.H{"error": "Failed to parse form"})
		return
	}

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(400, gin.H{"error": "No file provided"})
		return
	}
	defer file.Close()

	description := c.PostForm("description")
	tagsStr := c.PostForm("tags")
	isPublicStr := c.PostForm("is_public")

	// Parse tags
	var tags []string
	if tagsStr != "" {
		tags = strings.Split(tagsStr, ",")
		for i, tag := range tags {
			tags[i] = strings.TrimSpace(tag)
		}
	}

	// Parse is_public
	isPublic := false
	if isPublicStr != "" {
		isPublic, _ = strconv.ParseBool(isPublicStr)
	}

	// Read file content
	fileContent, err := io.ReadAll(file)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to read file"})
		return
	}

	// Encrypt file content
	encryptedContent, err := utils.EncryptFile(fileContent)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to encrypt file"})
		return
	}

	// Generate unique filename
	originalName := header.Filename
	fileName := fmt.Sprintf("%d_%s", currentUser.ID, generateRandomStringForFile(16))
	filePath := filepath.Join("uploads", fileName)

	// Save encrypted file to disk
	if err := os.WriteFile(filePath, encryptedContent, 0644); err != nil {
		c.JSON(500, gin.H{"error": "Failed to save encrypted file"})
		return
	}

	// Determine file type
	fileType := determineFileTypeForEncryption(header.Filename, header.Header.Get("Content-Type"))

	// Create file record
	db := config.GetDB()
	fileRecord := models.File{
		UserID:       currentUser.ID,
		OriginalName: originalName,
		FileName:     fileName,
		FilePath:     filePath,
		FileSize:     int64(len(encryptedContent)),
		MimeType:     header.Header.Get("Content-Type"),
		FileType:     fileType,
		Description:  description,
		IsPublic:     isPublic,
		IsEncrypted:  true,
	}

	if err := db.Create(&fileRecord).Error; err != nil {
		// Clean up file if database insert fails
		os.Remove(filePath)
		c.JSON(500, gin.H{"error": "Failed to create file record"})
		return
	}

	// Handle tags if provided
	if len(tags) > 0 {
		var tagModels []models.Tag
		for _, tagName := range tags {
			var tag models.Tag
			if err := db.Where("name = ?", tagName).First(&tag).Error; err != nil {
				if err == gorm.ErrRecordNotFound {
					tag = models.Tag{Name: tagName}
					db.Create(&tag)
				}
			}
			tagModels = append(tagModels, tag)
		}
		db.Model(&fileRecord).Association("Tags").Append(tagModels)
	}

	c.JSON(201, gin.H{"file": fileRecord})
}

// DownloadEncryptedFile downloads and decrypts a file
func DownloadEncryptedFile(c *gin.Context) {
	user, exists := c.Get("user")
	if !exists {
		c.JSON(401, gin.H{"error": "User not authenticated"})
		return
	}

	currentUser := user.(models.User)
	fileID := c.Param("id")

	db := config.GetDB()

	var fileRecord models.File
	if err := db.Where("id = ? AND user_id = ?", fileID, currentUser.ID).First(&fileRecord).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(404, gin.H{"error": "File not found"})
			return
		}
		c.JSON(500, gin.H{"error": "Database error"})
		return
	}

	// Read encrypted file
	encryptedContent, err := os.ReadFile(fileRecord.FilePath)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to read file"})
		return
	}

	// Decrypt file content
	var fileContent []byte
	if fileRecord.IsEncrypted {
		fileContent, err = utils.DecryptFile(encryptedContent)
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to decrypt file"})
			return
		}
	} else {
		fileContent = encryptedContent
	}

	// Set headers for file download
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", fileRecord.OriginalName))
	c.Header("Content-Type", fileRecord.MimeType)
	c.Data(200, fileRecord.MimeType, fileContent)
}

// GetEncryptionStatus returns encryption status and statistics
func GetEncryptionStatus(c *gin.Context) {
	user, exists := c.Get("user")
	if !exists {
		c.JSON(401, gin.H{"error": "User not authenticated"})
		return
	}

	currentUser := user.(models.User)
	db := config.GetDB()

	// Count encrypted vs unencrypted notes
	var encryptedNotesCount, totalNotesCount int64
	db.Model(&models.Note{}).Where("user_id = ?", currentUser.ID).Count(&totalNotesCount)
	db.Model(&models.Note{}).Where("user_id = ? AND is_encrypted = ?", currentUser.ID, true).Count(&encryptedNotesCount)

	// Count encrypted vs unencrypted files
	var encryptedFilesCount, totalFilesCount int64
	db.Model(&models.File{}).Where("user_id = ?", currentUser.ID).Count(&totalFilesCount)
	db.Model(&models.File{}).Where("user_id = ? AND is_encrypted = ?", currentUser.ID, true).Count(&encryptedFilesCount)

	status := gin.H{
		"notes": gin.H{
			"total":      totalNotesCount,
			"encrypted":  encryptedNotesCount,
			"percentage": float64(encryptedNotesCount) / float64(totalNotesCount) * 100,
		},
		"files": gin.H{
			"total":      totalFilesCount,
			"encrypted":  encryptedFilesCount,
			"percentage": float64(encryptedFilesCount) / float64(totalFilesCount) * 100,
		},
		"encryption_enabled": true,
	}

	c.JSON(200, status)
}

// Helper functions

func generateRandomStringForFile(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, length)
	for i := range b {
		b[i] = charset[i%len(charset)]
	}
	return string(b)
}

func determineFileTypeForEncryption(filename, mimeType string) models.FileType {
	ext := strings.ToLower(filepath.Ext(filename))

	switch {
	case strings.Contains(mimeType, "image/") || ext == ".jpg" || ext == ".jpeg" || ext == ".png" || ext == ".gif" || ext == ".webp":
		return models.FileTypeImage
	case strings.Contains(mimeType, "video/") || ext == ".mp4" || ext == ".avi" || ext == ".mov" || ext == ".mkv":
		return models.FileTypeVideo
	case strings.Contains(mimeType, "audio/") || ext == ".mp3" || ext == ".wav" || ext == ".flac" || ext == ".ogg":
		return models.FileTypeAudio
	case ext == ".zip" || ext == ".rar" || ext == ".7z" || ext == ".tar" || ext == ".gz":
		return models.FileTypeArchive
	case strings.Contains(mimeType, "text/") || ext == ".pdf" || ext == ".doc" || ext == ".docx" || ext == ".txt" || ext == ".md":
		return models.FileTypeDocument
	default:
		return models.FileTypeOther
	}
}
