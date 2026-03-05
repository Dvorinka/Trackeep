package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/trackeep/backend/models"
)

// UpdateSettings represents update and OAuth configuration
type UpdateSettings struct {
	OAuthServiceURL     string `json:"oauth_service_url"`
	AutoUpdateCheck     bool   `json:"auto_update_check"`
	UpdateCheckInterval string `json:"update_check_interval"`
	PrereleaseUpdates   bool   `json:"prerelease_updates"`
}

// GetUpdateSettings handles GET /api/v1/auth/update/settings
func GetUpdateSettings(c *gin.Context) {
	userID := c.GetInt("user_id")

	// Get settings from database
	settings, err := models.GetUserUpdateSettings(uint(userID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get settings"})
		return
	}

	// Convert to response format
	response := UpdateSettings{
		OAuthServiceURL:     settings.OAuthServiceURL,
		AutoUpdateCheck:     settings.AutoUpdateCheck,
		UpdateCheckInterval: settings.UpdateCheckInterval,
		PrereleaseUpdates:   settings.PrereleaseUpdates,
	}

	c.JSON(http.StatusOK, response)
}

// UpdateUpdateSettings handles PUT /api/v1/auth/update/settings
func UpdateUpdateSettings(c *gin.Context) {
	userID := c.GetInt("user_id")

	var newSettings UpdateSettings
	if err := c.ShouldBindJSON(&newSettings); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update model
	updatedSettings := &models.UserUpdateSettings{
		OAuthServiceURL:     newSettings.OAuthServiceURL,
		AutoUpdateCheck:     newSettings.AutoUpdateCheck,
		UpdateCheckInterval: newSettings.UpdateCheckInterval,
		PrereleaseUpdates:   newSettings.PrereleaseUpdates,
	}

	// Save to database
	err := models.SaveUserUpdateSettings(uint(userID), updatedSettings)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save settings"})
		return
	}

	// Return updated settings
	GetUpdateSettings(c)
}

// GetTestUpdateSettings handles GET /api/v1/test-update-settings (for demo mode)
func GetTestUpdateSettings(c *gin.Context) {
	settings := getDefaultUpdateSettings()
	c.JSON(http.StatusOK, settings)
}

// GetUpdateSettingsForAPI returns update settings for internal API use
func GetUpdateSettingsForAPI(userID int) (UpdateSettings, error) {
	settings, err := models.GetUserUpdateSettings(uint(userID))
	if err != nil {
		// Return default settings if error
		defaultSettings := getDefaultUpdateSettings()
		return defaultSettings, nil
	}

	return UpdateSettings{
		OAuthServiceURL:     settings.OAuthServiceURL,
		AutoUpdateCheck:     settings.AutoUpdateCheck,
		UpdateCheckInterval: settings.UpdateCheckInterval,
		PrereleaseUpdates:   settings.PrereleaseUpdates,
	}, nil
}

func getDefaultUpdateSettings() UpdateSettings {
	return UpdateSettings{
		OAuthServiceURL:     getEnvWithDefault("OAUTH_SERVICE_URL", "https://oauth.trackeep.org"),
		AutoUpdateCheck:     getBoolEnvWithDefault("AUTO_UPDATE_CHECK", false),
		UpdateCheckInterval: getEnvWithDefault("UPDATE_CHECK_INTERVAL", "24h"),
		PrereleaseUpdates:   getBoolEnvWithDefault("PRERELEASE_UPDATES", false),
	}
}
