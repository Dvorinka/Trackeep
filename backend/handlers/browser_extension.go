package handlers

import (
	"archive/zip"
	"crypto/rand"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/trackeep/backend/config"
	"github.com/trackeep/backend/models"
)

// CreateAPIKeyRequest represents a request to create an API key
type CreateAPIKeyRequest struct {
	Name        string   `json:"name" binding:"required,min=1,max=100"`
	Permissions []string `json:"permissions" binding:"required"`
	ExpiresIn   *int     `json:"expires_in,omitempty"` // Days until expiration
}

// APIKeyResponse represents API key response
type APIKeyResponse struct {
	ID          uint       `json:"id"`
	Name        string     `json:"name"`
	Key         string     `json:"key"`
	Permissions []string   `json:"permissions"`
	ExpiresAt   *time.Time `json:"expires_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
}

// BrowserExtensionAuth represents browser extension authentication
type BrowserExtensionAuth struct {
	ID          uint       `json:"id" gorm:"primaryKey"`
	UserID      uint       `json:"user_id" gorm:"not null"`
	ExtensionID string     `json:"extension_id" gorm:"not null"`
	Name        string     `json:"name" gorm:"not null"`
	IsActive    bool       `json:"is_active" gorm:"default:true"`
	LastSeen    *time.Time `json:"last_seen,omitempty" gorm:"not null"`
	CreatedAt   time.Time  `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt   time.Time  `json:"updated_at" gorm:"autoUpdateTime"`
}

// GenerateAPIKey creates a new API key for browser extension
func GenerateAPIKey(c *gin.Context) {
	user, exists := c.Get("user")
	if !exists {
		c.JSON(401, gin.H{"error": "User not authenticated"})
		return
	}

	currentUser := user.(models.User)

	var req CreateAPIKeyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	// Validate permissions
	validPermissions := map[string]bool{
		"bookmarks:read":  true,
		"bookmarks:write": true,
		"files:read":      true,
		"files:write":     true,
		"notes:read":      true,
		"notes:write":     true,
		"tasks:read":      true,
		"tasks:write":     true,
	}

	for _, perm := range req.Permissions {
		if !validPermissions[perm] {
			c.JSON(400, gin.H{"error": fmt.Sprintf("Invalid permission: %s", perm)})
			return
		}
	}

	// Generate API key
	key := generateAPIKey()

	// Set expiration if provided
	var expiresAt *time.Time
	if req.ExpiresIn != nil && *req.ExpiresIn > 0 {
		expiration := time.Now().AddDate(0, 0, *req.ExpiresIn)
		expiresAt = &expiration
	}

	// Create API key record
	apiKey := models.APIKey{
		Name:        req.Name,
		Key:         key,
		UserID:      currentUser.ID,
		Permissions: req.Permissions,
		IsActive:    true,
		ExpiresAt:   expiresAt,
	}

	db := config.GetDB()
	if err := db.Create(&apiKey).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to create API key"})
		return
	}

	response := APIKeyResponse{
		ID:          apiKey.ID,
		Name:        apiKey.Name,
		Key:         apiKey.Key,
		Permissions: apiKey.Permissions,
		ExpiresAt:   apiKey.ExpiresAt,
		CreatedAt:   apiKey.CreatedAt,
	}

	c.JSON(201, response)
}

// GetAPIKeys retrieves user's API keys
func GetAPIKeys(c *gin.Context) {
	user, exists := c.Get("user")
	if !exists {
		c.JSON(401, gin.H{"error": "User not authenticated"})
		return
	}

	currentUser := user.(models.User)

	var apiKeys []models.APIKey
	db := config.GetDB()
	if err := db.Where("user_id = ? AND is_active = ?", currentUser.ID, true).Order("created_at desc").Find(&apiKeys).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to retrieve API keys"})
		return
	}

	// Don't return the actual keys in list view
	var response []map[string]interface{}
	for _, key := range apiKeys {
		response = append(response, map[string]interface{}{
			"id":          key.ID,
			"name":        key.Name,
			"permissions": key.Permissions,
			"is_active":   key.IsActive,
			"last_used":   key.LastUsed,
			"expires_at":  key.ExpiresAt,
			"created_at":  key.CreatedAt,
			"updated_at":  key.UpdatedAt,
		})
	}

	c.JSON(200, response)
}

// RevokeAPIKey revokes an API key
func RevokeAPIKey(c *gin.Context) {
	user, exists := c.Get("user")
	if !exists {
		c.JSON(401, gin.H{"error": "User not authenticated"})
		return
	}

	currentUser := user.(models.User)
	keyID := c.Param("id")

	db := config.GetDB()
	var apiKey models.APIKey
	if err := db.Where("id = ? AND user_id = ?", keyID, currentUser.ID).First(&apiKey).Error; err != nil {
		c.JSON(404, gin.H{"error": "API key not found"})
		return
	}

	// Deactivate the key
	if err := db.Model(&apiKey).Update("is_active", false).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to revoke API key"})
		return
	}

	c.JSON(200, gin.H{"message": "API key revoked successfully"})
}

// ValidateAPIKey validates an API key from browser extension
func ValidateAPIKey(c *gin.Context) {
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		c.JSON(401, gin.H{"error": "Authorization header required"})
		return
	}

	// Extract Bearer token
	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || parts[0] != "Bearer" {
		c.JSON(401, gin.H{"error": "Invalid authorization format"})
		return
	}

	apiKey := parts[1]

	db := config.GetDB()
	var keyRecord models.APIKey
	if err := db.Where("key = ? AND is_active = ?", apiKey, true).Preload("User").First(&keyRecord).Error; err != nil {
		c.JSON(401, gin.H{"error": "Invalid API key"})
		return
	}

	// Check expiration
	if keyRecord.ExpiresAt != nil && keyRecord.ExpiresAt.Before(time.Now()) {
		c.JSON(401, gin.H{"error": "API key expired"})
		return
	}

	// Update last used timestamp
	now := time.Now()
	keyRecord.LastUsed = &now
	db.Model(&keyRecord).Update("last_used", now)

	// Return user info for extension
	c.JSON(200, gin.H{
		"valid":       true,
		"user_id":     keyRecord.UserID,
		"permissions": keyRecord.Permissions,
	})
}

// generateAPIKey generates a secure API key
func generateAPIKey() string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	keyLength := 32

	bytes := make([]byte, keyLength)
	rand.Read(bytes)

	for i, b := range bytes {
		bytes[i] = charset[b%byte(len(charset))]
	}

	return "tk_" + string(bytes)
}

// RegisterBrowserExtension registers a browser extension instance
func RegisterBrowserExtension(c *gin.Context) {
	user, exists := c.Get("user")
	if !exists {
		c.JSON(401, gin.H{"error": "User not authenticated"})
		return
	}

	currentUser := user.(models.User)

	var req struct {
		ExtensionID string `json:"extension_id" binding:"required"`
		Name        string `json:"name" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	// Check if extension already registered
	db := config.GetDB()
	var existingAuth BrowserExtensionAuth
	if err := db.Where("user_id = ? AND extension_id = ?", currentUser.ID, req.ExtensionID).First(&existingAuth).Error; err == nil {
		c.JSON(409, gin.H{"error": "Extension already registered"})
		return
	}

	// Create new extension registration
	extAuth := BrowserExtensionAuth{
		UserID:      currentUser.ID,
		ExtensionID: req.ExtensionID,
		Name:        req.Name,
		IsActive:    true,
		LastSeen:    &time.Time{},
	}

	if err := db.Create(&extAuth).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to register extension"})
		return
	}

	c.JSON(201, gin.H{
		"message":      "Extension registered successfully",
		"extension_id": extAuth.ExtensionID,
	})
}

// GetBrowserExtensions retrieves user's registered browser extensions
func GetBrowserExtensions(c *gin.Context) {
	user, exists := c.Get("user")
	if !exists {
		c.JSON(401, gin.H{"error": "User not authenticated"})
		return
	}

	currentUser := user.(models.User)

	var extensions []BrowserExtensionAuth
	db := config.GetDB()
	if err := db.Where("user_id = ?", currentUser.ID).Order("created_at desc").Find(&extensions).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to retrieve extensions"})
		return
	}

	c.JSON(200, extensions)
}

// RevokeBrowserExtension revokes a browser extension
func RevokeBrowserExtension(c *gin.Context) {
	user, exists := c.Get("user")
	if !exists {
		c.JSON(401, gin.H{"error": "User not authenticated"})
		return
	}

	currentUser := user.(models.User)
	extensionID := c.Param("id")

	db := config.GetDB()
	var extAuth BrowserExtensionAuth
	if err := db.Where("extension_id = ? AND user_id = ?", extensionID, currentUser.ID).First(&extAuth).Error; err != nil {
		c.JSON(404, gin.H{"error": "Extension not found"})
		return
	}

	// Deactivate the extension
	if err := db.Model(&extAuth).Update("is_active", false).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to revoke extension"})
		return
	}

	c.JSON(200, gin.H{"message": "Extension revoked successfully"})
}

// DownloadBrowserExtension serves the browser extension as a downloadable zip file
func DownloadBrowserExtension(c *gin.Context) {
	// Path to the browser extension directory
	extDir := "../browser-extension"

	// Create a temporary zip file
	zipPath := "/tmp/browser-extension.zip"

	// Create zip file
	err := createZip(extDir, zipPath)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to create zip file"})
		return
	}

	// Open the zip file
	zipFile, err := os.Open(zipPath)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to open zip file"})
		return
	}
	defer zipFile.Close()

	// Get file info
	fileInfo, err := zipFile.Stat()
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to get file info"})
		return
	}

	// Set headers for download
	c.Header("Content-Type", "application/zip")
	c.Header("Content-Disposition", "attachment; filename=browser-extension.zip")
	c.Header("Content-Length", fmt.Sprintf("%d", fileInfo.Size()))

	// Copy file to response
	io.Copy(c.Writer, zipFile)

	// Clean up temporary file
	os.Remove(zipPath)
}

// createZip creates a zip file from a directory
func createZip(source, target string) error {
	zipfile, err := os.Create(target)
	if err != nil {
		return err
	}
	defer zipfile.Close()

	archive := zip.NewWriter(zipfile)
	defer archive.Close()

	info, err := os.Stat(source)
	if err != nil {
		return nil
	}

	var baseDir string
	if info.IsDir() {
		baseDir = filepath.Base(source)
	}

	return filepath.Walk(source, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		header, err := zip.FileInfoHeader(info)
		if err != nil {
			return err
		}

		if baseDir != "" {
			header.Name = filepath.Join(baseDir, strings.TrimPrefix(path, source))
		}

		if info.IsDir() {
			header.Name += "/"
		} else {
			header.Method = zip.Deflate
		}

		writer, err := archive.CreateHeader(header)
		if err != nil {
			return err
		}

		if info.IsDir() {
			return nil
		}

		file, err := os.Open(path)
		if err != nil {
			return err
		}
		defer file.Close()

		_, err = io.Copy(writer, file)
		return err
	})
}
