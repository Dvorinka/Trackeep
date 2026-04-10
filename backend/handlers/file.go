package handlers

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/trackeep/backend/models"
	"gorm.io/gorm"
)

type createFileShareRequest struct {
	Title         string     `json:"title"`
	Description   string     `json:"description"`
	ExpiresAt     *time.Time `json:"expires_at,omitempty"`
	AllowDownload *bool      `json:"allow_download,omitempty"`
}

type fileShareResponse struct {
	ID             uint       `json:"id"`
	ContentType    string     `json:"content_type"`
	ContentID      uint       `json:"content_id"`
	ShareToken     string     `json:"share_token"`
	ShareURL       string     `json:"share_url"`
	PublicShareURL string     `json:"public_share_url"`
	Title          string     `json:"title"`
	Description    string     `json:"description"`
	AllowDownload  bool       `json:"allow_download"`
	IsActive       bool       `json:"is_active"`
	ExpiresAt      *time.Time `json:"expires_at,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
}

func generateSecureShareToken() (string, error) {
	raw := make([]byte, 24)
	if _, err := rand.Read(raw); err != nil {
		return "", err
	}

	return "share_" + base64.RawURLEncoding.EncodeToString(raw), nil
}

func buildPublicShareURL(c *gin.Context, relative string) string {
	relativePath := strings.TrimSpace(relative)
	if relativePath == "" {
		return ""
	}

	if strings.HasPrefix(relativePath, "http://") || strings.HasPrefix(relativePath, "https://") {
		return relativePath
	}

	if !strings.HasPrefix(relativePath, "/") {
		relativePath = "/" + relativePath
	}

	scheme := "http"
	if c.Request.TLS != nil {
		scheme = "https"
	}

	if forwardedProto := strings.TrimSpace(c.GetHeader("X-Forwarded-Proto")); forwardedProto != "" {
		scheme = forwardedProto
	}

	host := strings.TrimSpace(c.GetHeader("X-Forwarded-Host"))
	if host == "" {
		host = c.Request.Host
	}

	if host == "" {
		return relativePath
	}

	return fmt.Sprintf("%s://%s%s", scheme, host, relativePath)
}

func mapFileShareResponse(c *gin.Context, share models.ContentShare) fileShareResponse {
	return fileShareResponse{
		ID:             share.ID,
		ContentType:    share.ContentType,
		ContentID:      share.ContentID,
		ShareToken:     share.ShareToken,
		ShareURL:       share.ShareURL,
		PublicShareURL: buildPublicShareURL(c, share.ShareURL),
		Title:          share.Title,
		Description:    share.Description,
		AllowDownload:  share.AllowDownload,
		IsActive:       share.IsActive,
		ExpiresAt:      share.ExpiresAt,
		CreatedAt:      share.CreatedAt,
	}
}

// GetFiles retrieves all files for a user
func GetFiles(c *gin.Context) {
	var files []models.File

	userID := c.GetUint("user_id")
	if userID == 0 {
		userID = c.GetUint("userID")
	}
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	query := models.DB.Where("user_id = ?", userID)

	if rawQuery := strings.TrimSpace(c.Query("q")); rawQuery != "" {
		needle := "%" + strings.ToLower(rawQuery) + "%"
		query = query.Where("LOWER(original_name) LIKE ? OR LOWER(description) LIKE ?", needle, needle)
	}

	limitApplied := false
	if limitRaw := strings.TrimSpace(c.Query("limit")); limitRaw != "" {
		limit, err := strconv.Atoi(limitRaw)
		if err != nil || limit <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid limit"})
			return
		}
		if limit > 100 {
			limit = 100
		}
		query = query.Limit(limit)
		limitApplied = true
	}
	if !limitApplied && strings.TrimSpace(c.Query("q")) != "" {
		query = query.Limit(20)
	}

	if err := query.Order("created_at DESC").Find(&files).Error; err != nil {
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

// CreateFileShare creates a share link for a file owned by the current user.
func CreateFileShare(c *gin.Context) {
	id := c.Param("id")

	userID := c.GetUint("user_id")
	if userID == 0 {
		userID = c.GetUint("userID")
	}
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var file models.File
	if err := models.DB.Where("id = ? AND user_id = ?", id, userID).First(&file).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve file"})
		return
	}

	var req createFileShareRequest
	if c.Request.ContentLength > 0 {
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
	}

	if req.ExpiresAt != nil && req.ExpiresAt.Before(time.Now()) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Share expiration must be in the future"})
		return
	}

	shareToken, err := generateSecureShareToken()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate share token"})
		return
	}

	allowDownload := true
	if req.AllowDownload != nil {
		allowDownload = *req.AllowDownload
	}

	title := strings.TrimSpace(req.Title)
	if title == "" {
		title = file.OriginalName
	}

	share := models.ContentShare{
		OwnerID:       userID,
		ContentType:   "file",
		ContentID:     file.ID,
		ShareToken:    shareToken,
		ShareURL:      "/api/v1/shared/" + shareToken,
		Title:         title,
		Description:   strings.TrimSpace(req.Description),
		ExpiresAt:     req.ExpiresAt,
		AllowDownload: allowDownload,
		AllowComment:  false,
		AllowEdit:     false,
		IsActive:      true,
	}

	if err := models.DB.Create(&share).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create file share"})
		return
	}

	c.JSON(http.StatusCreated, mapFileShareResponse(c, share))
}

// GetFileShares lists active and historical shares for a file owned by the user.
func GetFileShares(c *gin.Context) {
	id := c.Param("id")

	userID := c.GetUint("user_id")
	if userID == 0 {
		userID = c.GetUint("userID")
	}
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var file models.File
	if err := models.DB.Where("id = ? AND user_id = ?", id, userID).First(&file).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve file"})
		return
	}

	var shares []models.ContentShare
	if err := models.DB.
		Where("owner_id = ? AND content_type = ? AND content_id = ?", userID, "file", file.ID).
		Order("created_at DESC").
		Find(&shares).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve file shares"})
		return
	}

	result := make([]fileShareResponse, 0, len(shares))
	for _, share := range shares {
		result = append(result, mapFileShareResponse(c, share))
	}

	c.JSON(http.StatusOK, gin.H{"shares": result})
}

// DeleteFileShare deletes a single share link for a file owned by the user.
func DeleteFileShare(c *gin.Context) {
	id := c.Param("id")
	shareID := c.Param("shareId")

	userID := c.GetUint("user_id")
	if userID == 0 {
		userID = c.GetUint("userID")
	}
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var file models.File
	if err := models.DB.Where("id = ? AND user_id = ?", id, userID).First(&file).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve file"})
		return
	}

	var share models.ContentShare
	if err := models.DB.
		Where("id = ? AND owner_id = ? AND content_type = ? AND content_id = ?", shareID, userID, "file", file.ID).
		First(&share).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "File share not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve file share"})
		return
	}

	if err := models.DB.Delete(&share).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete file share"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "File share deleted successfully"})
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
