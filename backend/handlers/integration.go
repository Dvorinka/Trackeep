package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/trackeep/backend/models"
	"gorm.io/gorm"
)

// IntegrationHandler handles integration-related requests
type IntegrationHandler struct {
	db *gorm.DB
}

// NewIntegrationHandler creates a new integration handler
func NewIntegrationHandler(db *gorm.DB) *IntegrationHandler {
	return &IntegrationHandler{db: db}
}

// GetIntegrations returns all integrations for the current user
func (h *IntegrationHandler) GetIntegrations(c *gin.Context) {
	userID := c.GetString("userID")

	var integrations []models.Integration
	if err := h.db.Where("user_id = ?", userID).
		Preload("SyncLogs", func(db *gorm.DB) *gorm.DB {
			return db.Order("created_at DESC").Limit(10)
		}).
		Find(&integrations).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch integrations"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"integrations": integrations})
}

// GetIntegration returns a specific integration
func (h *IntegrationHandler) GetIntegration(c *gin.Context) {
	userID := c.GetString("userID")
	integrationID := c.Param("id")

	var integration models.Integration
	if err := h.db.Where("id = ? AND user_id = ?", integrationID, userID).
		Preload("SyncLogs", func(db *gorm.DB) *gorm.DB {
			return db.Order("created_at DESC").Limit(50)
		}).
		First(&integration).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Integration not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch integration"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"integration": integration})
}

// CreateIntegration creates a new integration
func (h *IntegrationHandler) CreateIntegration(c *gin.Context) {
	userID := c.GetString("userID")

	var req struct {
		Type        models.IntegrationType   `json:"type" binding:"required"`
		Name        string                   `json:"name" binding:"required"`
		Description string                   `json:"description"`
		Config      models.IntegrationConfig `json:"config"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	integration := models.Integration{
		UserID:       userID,
		Type:         req.Type,
		Status:       models.StatusPending,
		Name:         req.Name,
		Description:  req.Description,
		Config:       req.Config,
		SyncEnabled:  true,
		SyncInterval: 60, // Default 1 hour
	}

	if err := h.db.Create(&integration).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create integration"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"integration": integration})
}

// UpdateIntegration updates an existing integration
func (h *IntegrationHandler) UpdateIntegration(c *gin.Context) {
	userID := c.GetString("userID")
	integrationID := c.Param("id")

	var integration models.Integration
	if err := h.db.Where("id = ? AND user_id = ?", integrationID, userID).First(&integration).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Integration not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch integration"})
		return
	}

	var req struct {
		Name         *string                   `json:"name"`
		Description  *string                   `json:"description"`
		Config       *models.IntegrationConfig `json:"config"`
		SyncEnabled  *bool                     `json:"syncEnabled"`
		SyncInterval *int                      `json:"syncInterval"`
		WebhookURL   *string                   `json:"webhookUrl"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update fields if provided
	if req.Name != nil {
		integration.Name = *req.Name
	}
	if req.Description != nil {
		integration.Description = *req.Description
	}
	if req.Config != nil {
		integration.Config = *req.Config
	}
	if req.SyncEnabled != nil {
		integration.SyncEnabled = *req.SyncEnabled
	}
	if req.SyncInterval != nil {
		integration.SyncInterval = *req.SyncInterval
	}
	if req.WebhookURL != nil {
		integration.WebhookURL = *req.WebhookURL
	}

	if err := h.db.Save(&integration).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update integration"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"integration": integration})
}

// DeleteIntegration deletes an integration
func (h *IntegrationHandler) DeleteIntegration(c *gin.Context) {
	userID := c.GetString("userID")
	integrationID := c.Param("id")

	if err := h.db.Where("id = ? AND user_id = ?", integrationID, userID).Delete(&models.Integration{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete integration"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Integration deleted successfully"})
}

// AuthorizeIntegration starts the OAuth flow for an integration
func (h *IntegrationHandler) AuthorizeIntegration(c *gin.Context) {
	userID := c.GetString("userID")
	integrationID := c.Param("id")

	var integration models.Integration
	if err := h.db.Where("id = ? AND user_id = ?", integrationID, userID).First(&integration).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Integration not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch integration"})
		return
	}

	// Generate authorization URL based on integration type
	var authURL string
	switch integration.Type {
	case models.IntegrationSlack:
		authURL = h.getSlackAuthURL(integration.ID)
	case models.IntegrationDiscord:
		authURL = h.getDiscordAuthURL(integration.ID)
	case models.IntegrationNotion:
		authURL = h.getNotionAuthURL(integration.ID)
	case models.IntegrationGoogle:
		authURL = h.getGoogleAuthURL(integration.ID)
	case models.IntegrationGitHub:
		authURL = h.getGitHubAuthURL(integration.ID)
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "OAuth not supported for this integration type"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"authUrl": authURL})
}

// OAuthCallback handles the OAuth callback
func (h *IntegrationHandler) OAuthCallback(c *gin.Context) {
	integrationID := c.Query("state")
	code := c.Query("code")

	if integrationID == "" || code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing required parameters"})
		return
	}

	var integration models.Integration
	if err := h.db.Where("id = ?", integrationID).First(&integration).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Integration not found"})
		return
	}

	// Exchange code for tokens based on integration type
	var accessToken, refreshToken string
	var err error

	switch integration.Type {
	case models.IntegrationSlack:
		accessToken, refreshToken, err = h.exchangeSlackCode(code)
	case models.IntegrationDiscord:
		accessToken, refreshToken, err = h.exchangeDiscordCode(code)
	case models.IntegrationNotion:
		accessToken, refreshToken, err = h.exchangeNotionCode(code)
	case models.IntegrationGoogle:
		accessToken, refreshToken, err = h.exchangeGoogleCode(code)
	case models.IntegrationGitHub:
		accessToken, refreshToken, err = h.exchangeGitHubCode(code)
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Unsupported integration type"})
		return
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to exchange authorization code"})
		return
	}

	// Update integration with tokens
	integration.AccessToken = accessToken
	integration.RefreshToken = refreshToken
	integration.Status = models.StatusActive

	if err := h.db.Save(&integration).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update integration"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Integration authorized successfully", "integration": integration})
}

// SyncIntegration manually triggers a sync for an integration
func (h *IntegrationHandler) SyncIntegration(c *gin.Context) {
	userID := c.GetString("userID")
	integrationID := c.Param("id")

	var integration models.Integration
	if err := h.db.Where("id = ? AND user_id = ?", integrationID, userID).First(&integration).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Integration not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch integration"})
		return
	}

	if integration.Status != models.StatusActive {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Integration is not active"})
		return
	}

	// Start sync in background
	go h.performSync(integration)

	c.JSON(http.StatusOK, gin.H{"message": "Sync started"})
}

// GetSyncLogs returns sync logs for an integration
func (h *IntegrationHandler) GetSyncLogs(c *gin.Context) {
	userID := c.GetString("userID")
	integrationID := c.Param("id")

	// Verify integration belongs to user
	var integration models.Integration
	if err := h.db.Where("id = ? AND user_id = ?", integrationID, userID).First(&integration).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Integration not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch integration"})
		return
	}

	// Parse pagination parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset := (page - 1) * limit

	var logs []models.SyncLog
	var total int64

	if err := h.db.Where("integration_id = ?", integrationID).
		Model(&models.SyncLog{}).
		Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count sync logs"})
		return
	}

	if err := h.db.Where("integration_id = ?", integrationID).
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&logs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch sync logs"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"logs": logs,
		"pagination": gin.H{
			"page":  page,
			"limit": limit,
			"total": total,
		},
	})
}

// Helper methods for OAuth URLs (these would contain actual OAuth configuration)
func (h *IntegrationHandler) getSlackAuthURL(integrationID string) string {
	return fmt.Sprintf("https://slack.com/oauth/v2/authorize?client_id=SLACK_CLIENT_ID&scope=commands,chat:write,users:read&redirect_uri=%s&state=%s",
		"http://localhost:8080/api/integrations/oauth/callback", integrationID)
}

func (h *IntegrationHandler) getDiscordAuthURL(integrationID string) string {
	return fmt.Sprintf("https://discord.com/api/oauth2/authorize?client_id=DISCORD_CLIENT_ID&scope=bot&permissions=8&redirect_uri=%s&response_type=code&state=%s",
		"http://localhost:8080/api/integrations/oauth/callback", integrationID)
}

func (h *IntegrationHandler) getNotionAuthURL(integrationID string) string {
	return fmt.Sprintf("https://api.notion.com/v1/oauth/authorize?client_id=NOTION_CLIENT_ID&redirect_uri=%s&response_type=code&state=%s",
		"http://localhost:8080/api/integrations/oauth/callback", integrationID)
}

func (h *IntegrationHandler) getGoogleAuthURL(integrationID string) string {
	return fmt.Sprintf("https://accounts.google.com/o/oauth2/v2/auth?client_id=GOOGLE_CLIENT_ID&redirect_uri=%s&response_type=code&scope=https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/calendar&state=%s",
		"http://localhost:8080/api/integrations/oauth/callback", integrationID)
}

func (h *IntegrationHandler) getGitHubAuthURL(integrationID string) string {
	return fmt.Sprintf("https://github.com/login/oauth/authorize?client_id=GITHUB_CLIENT_ID&redirect_uri=%s&scope=repo&state=%s",
		"http://localhost:8080/api/integrations/oauth/callback", integrationID)
}

// Helper methods for token exchange (these would contain actual API calls)
func (h *IntegrationHandler) exchangeSlackCode(code string) (string, string, error) {
	// TODO: Implement actual Slack token exchange
	return "mock_access_token", "mock_refresh_token", nil
}

func (h *IntegrationHandler) exchangeDiscordCode(code string) (string, string, error) {
	// TODO: Implement actual Discord token exchange
	return "mock_access_token", "mock_refresh_token", nil
}

func (h *IntegrationHandler) exchangeNotionCode(code string) (string, string, error) {
	// TODO: Implement actual Notion token exchange
	return "mock_access_token", "", nil // Notion doesn't use refresh tokens
}

func (h *IntegrationHandler) exchangeGoogleCode(code string) (string, string, error) {
	// TODO: Implement actual Google token exchange
	return "mock_access_token", "mock_refresh_token", nil
}

func (h *IntegrationHandler) exchangeGitHubCode(code string) (string, string, error) {
	// TODO: Implement actual GitHub token exchange
	return "mock_access_token", "", nil // GitHub tokens don't expire
}

// performSync performs the actual sync operation
func (h *IntegrationHandler) performSync(integration models.Integration) {
	startTime := time.Now()

	syncLog := models.SyncLog{
		IntegrationID: integration.ID,
		Type:          "manual",
		Status:        "success",
		StartedAt:     startTime,
	}

	// Create initial sync log
	h.db.Create(&syncLog)

	// Perform sync based on integration type
	var itemsProcessed, itemsCreated, itemsUpdated, itemsDeleted, itemsSkipped int
	var err error

	switch integration.Type {
	case models.IntegrationSlack:
		itemsProcessed, itemsCreated, itemsUpdated, itemsDeleted, itemsSkipped, err = h.syncSlack(integration)
	case models.IntegrationDiscord:
		itemsProcessed, itemsCreated, itemsUpdated, itemsDeleted, itemsSkipped, err = h.syncDiscord(integration)
	case models.IntegrationNotion:
		itemsProcessed, itemsCreated, itemsUpdated, itemsDeleted, itemsSkipped, err = h.syncNotion(integration)
	case models.IntegrationGoogle:
		itemsProcessed, itemsCreated, itemsUpdated, itemsDeleted, itemsSkipped, err = h.syncGoogle(integration)
	case models.IntegrationGitHub:
		itemsProcessed, itemsCreated, itemsUpdated, itemsDeleted, itemsSkipped, err = h.syncGitHub(integration)
	default:
		err = fmt.Errorf("unsupported integration type")
	}

	// Update sync log
	completedAt := time.Now()
	duration := int(completedAt.Sub(startTime).Seconds())

	if err != nil {
		syncLog.Status = "error"
		syncLog.ErrorMessage = err.Error()

		// Update integration error count
		integration.ErrorCount++
		integration.LastError = err.Error()
	} else {
		syncLog.ItemsProcessed = itemsProcessed
		syncLog.ItemsCreated = itemsCreated
		syncLog.ItemsUpdated = itemsUpdated
		syncLog.ItemsDeleted = itemsDeleted
		syncLog.ItemsSkipped = itemsSkipped

		// Update integration sync count
		integration.SyncCount++
		integration.LastError = ""
	}

	syncLog.CompletedAt = &completedAt
	syncLog.Duration = duration

	h.db.Save(&syncLog)

	// Update integration
	integration.LastSyncAt = &completedAt
	h.db.Save(&integration)
}

// Mock sync methods (these would contain actual API calls)
func (h *IntegrationHandler) syncSlack(integration models.Integration) (int, int, int, int, int, error) {
	// TODO: Implement actual Slack sync
	return 0, 0, 0, 0, 0, nil
}

func (h *IntegrationHandler) syncDiscord(integration models.Integration) (int, int, int, int, int, error) {
	// TODO: Implement actual Discord sync
	return 0, 0, 0, 0, 0, nil
}

func (h *IntegrationHandler) syncNotion(integration models.Integration) (int, int, int, int, int, error) {
	// TODO: Implement actual Notion sync
	return 0, 0, 0, 0, 0, nil
}

func (h *IntegrationHandler) syncGoogle(integration models.Integration) (int, int, int, int, int, error) {
	// TODO: Implement actual Google sync
	return 0, 0, 0, 0, 0, nil
}

func (h *IntegrationHandler) syncGitHub(integration models.Integration) (int, int, int, int, int, error) {
	// TODO: Implement actual GitHub sync
	return 0, 0, 0, 0, 0, nil
}
