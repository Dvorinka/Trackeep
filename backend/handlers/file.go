package handlers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/trackeep/backend/models"
	"gorm.io/gorm"
)

// GetFiles retrieves all files for a user
func GetFiles(c *gin.Context) {
	var files []models.File

	// TODO: Get user ID from authentication context
	userID := uint(1) // Placeholder

	if err := models.DB.Where("user_id = ?", userID).Find(&files).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve files"})
		return
	}

	c.JSON(http.StatusOK, files)
}

// UploadFile handles file upload
func UploadFile(c *gin.Context) {
	// TODO: Get user ID from authentication context
	userID := c.GetUint("userID")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Parse multipart form (max 32MB)
	if err := c.Request.ParseMultipartForm(32 << 20); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File too large"})
		return
	}

	// Get file from form
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file provided"})
		return
	}
	defer file.Close()

	// Get description from form
	description := c.PostForm("description")

	// Create uploads directory if it doesn't exist
	uploadsDir := "uploads"
	if err := os.MkdirAll(uploadsDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create uploads directory"})
		return
	}

	// Generate unique filename
	ext := filepath.Ext(header.Filename)
	fileName := fmt.Sprintf("%d_%s%s", time.Now().Unix(), strings.TrimSuffix(header.Filename, ext), ext)
	filePath := filepath.Join(uploadsDir, fileName)

	// Create the file on disk
	dst, err := os.Create(filePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create file"})
		return
	}
	defer dst.Close()

	// Copy the uploaded file to the destination
	if _, err := io.Copy(dst, file); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}

	// Get file info
	fileInfo, err := os.Stat(filePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get file info"})
		return
	}

	// Determine file type
	fileType := determineFileType(header.Filename, header.Header.Get("Content-Type"))

	// Create file record
	newFile := models.File{
		UserID:       userID,
		OriginalName: header.Filename,
		FileName:     fileName,
		FilePath:     filePath,
		FileSize:     fileInfo.Size(),
		MimeType:     header.Header.Get("Content-Type"),
		FileType:     fileType,
		Description:  description,
		IsPublic:     false,
	}

	if err := models.DB.Create(&newFile).Error; err != nil {
		// Clean up the file if database insert fails
		os.Remove(filePath)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file record"})
		return
	}

	c.JSON(http.StatusCreated, newFile)
}

// GetFile retrieves a specific file
func GetFile(c *gin.Context) {
	id := c.Param("id")

	var file models.File
	if err := models.DB.First(&file, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve file"})
		return
	}

	c.JSON(http.StatusOK, file)
}

// DownloadFile serves the actual file content
func DownloadFile(c *gin.Context) {
	id := c.Param("id")

	var file models.File
	if err := models.DB.First(&file, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve file"})
		return
	}

	// Check if file exists on disk
	if _, err := os.Stat(file.FilePath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found on disk"})
		return
	}

	// Set appropriate headers
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", file.OriginalName))
	c.Header("Content-Type", file.MimeType)
	c.File(file.FilePath)
}

// DeleteFile removes a file record and the actual file
func DeleteFile(c *gin.Context) {
	id := c.Param("id")

	var file models.File
	if err := models.DB.First(&file, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve file"})
		return
	}

	// Delete file from disk
	if err := os.Remove(file.FilePath); err != nil {
		// Log error but continue with database deletion
		fmt.Printf("Warning: Failed to delete file from disk: %v\n", err)
	}

	// Delete thumbnail and preview if they exist
	if file.ThumbnailPath != "" {
		os.Remove(file.ThumbnailPath)
	}
	if file.PreviewPath != "" {
		os.Remove(file.PreviewPath)
	}

	// Delete database record
	if err := models.DB.Delete(&file).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete file record"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "File deleted successfully"})
}

// determineFileType determines the file type based on filename and MIME type
func determineFileType(filename, mimeType string) models.FileType {
	ext := strings.ToLower(filepath.Ext(filename))

	// Check by extension first
	switch ext {
	case ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".svg", ".webp":
		return models.FileTypeImage
	case ".mp4", ".avi", ".mov", ".wmv", ".flv", ".webm":
		return models.FileTypeVideo
	case ".mp3", ".wav", ".ogg", ".flac", ".aac":
		return models.FileTypeAudio
	case ".pdf", ".doc", ".docx", ".txt", ".rtf", ".odt":
		return models.FileTypeDocument
	case ".zip", ".rar", ".7z", ".tar", ".gz":
		return models.FileTypeArchive
	}

	// Check by MIME type
	switch {
	case strings.HasPrefix(mimeType, "image/"):
		return models.FileTypeImage
	case strings.HasPrefix(mimeType, "video/"):
		return models.FileTypeVideo
	case strings.HasPrefix(mimeType, "audio/"):
		return models.FileTypeAudio
	case strings.HasPrefix(mimeType, "text/") ||
		mimeType == "application/pdf" ||
		mimeType == "application/msword" ||
		mimeType == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
		return models.FileTypeDocument
	case strings.Contains(mimeType, "zip") || strings.Contains(mimeType, "archive"):
		return models.FileTypeArchive
	}

	return models.FileTypeOther
}
