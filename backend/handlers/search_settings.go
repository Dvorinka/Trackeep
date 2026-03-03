package handlers

import (
	"net/http"
	"os"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/trackeep/backend/models"
)

// SearchSettings represents search API configuration
type SearchSettings struct {
	BraveAPIKey        string `json:"brave_api_key"`
	BraveSearchBaseURL string `json:"brave_search_base_url"`
	SerperAPIKey       string `json:"serper_api_key"`
	SerperBaseURL      string `json:"serper_base_url"`
	SearchAPIProvider  string `json:"search_api_provider"`
	SearchResultsLimit int    `json:"search_results_limit"`
	SearchCacheTTL     int    `json:"search_cache_ttl"`
	SearchRateLimit    int    `json:"search_rate_limit"`
}

// GetSearchSettings handles GET /api/v1/auth/search/settings
func GetSearchSettings(c *gin.Context) {
	userID := c.GetInt("user_id")

	// Get settings from database
	settings, err := models.GetUserSearchSettings(uint(userID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get settings"})
		return
	}

	// Convert to response format
	response := SearchSettings{
		BraveSearchBaseURL: settings.BraveSearchBaseURL,
		SerperBaseURL:      settings.SerperBaseURL,
		SearchAPIProvider:  settings.SearchAPIProvider,
		SearchResultsLimit: settings.SearchResultsLimit,
		SearchCacheTTL:     settings.SearchCacheTTL,
		SearchRateLimit:    settings.SearchRateLimit,
	}

	// Mask API keys for security
	if settings.BraveAPIKey != "" && len(settings.BraveAPIKey) > 8 {
		response.BraveAPIKey = settings.BraveAPIKey[:4] + "********" + settings.BraveAPIKey[len(settings.BraveAPIKey)-4:]
	}
	if settings.SerperAPIKey != "" && len(settings.SerperAPIKey) > 8 {
		response.SerperAPIKey = settings.SerperAPIKey[:4] + "********" + settings.SerperAPIKey[len(settings.SerperAPIKey)-4:]
	}

	c.JSON(http.StatusOK, response)
}

// UpdateSearchSettings handles PUT /api/v1/auth/search/settings
func UpdateSearchSettings(c *gin.Context) {
	userID := c.GetInt("user_id")

	var newSettings SearchSettings
	if err := c.ShouldBindJSON(&newSettings); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get existing settings to preserve API keys if they're masked
	existingSettings, err := models.GetUserSearchSettings(uint(userID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get existing settings"})
		return
	}

	// Check if API keys are masked and preserve existing values
	if len(newSettings.BraveAPIKey) > 8 && newSettings.BraveAPIKey[4:12] == "********" {
		newSettings.BraveAPIKey = existingSettings.BraveAPIKey
	}
	if len(newSettings.SerperAPIKey) > 8 && newSettings.SerperAPIKey[4:12] == "********" {
		newSettings.SerperAPIKey = existingSettings.SerperAPIKey
	}

	// Update model
	updatedSettings := &models.UserSearchSettings{
		BraveAPIKey:        newSettings.BraveAPIKey,
		BraveSearchBaseURL: newSettings.BraveSearchBaseURL,
		SerperAPIKey:       newSettings.SerperAPIKey,
		SerperBaseURL:      newSettings.SerperBaseURL,
		SearchAPIProvider:  newSettings.SearchAPIProvider,
		SearchResultsLimit: newSettings.SearchResultsLimit,
		SearchCacheTTL:     newSettings.SearchCacheTTL,
		SearchRateLimit:    newSettings.SearchRateLimit,
	}

	// Save to database
	err = models.SaveUserSearchSettings(uint(userID), updatedSettings)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save settings"})
		return
	}

	// Return masked settings for consistency
	GetSearchSettings(c)
}

// GetTestSearchSettings handles GET /api/v1/test-search-settings (for demo mode)
func GetTestSearchSettings(c *gin.Context) {
	settings := getDefaultSearchSettings()

	// Mask API keys for security
	if settings.BraveAPIKey != "" && len(settings.BraveAPIKey) > 8 {
		settings.BraveAPIKey = settings.BraveAPIKey[:4] + "********" + settings.BraveAPIKey[len(settings.BraveAPIKey)-4:]
	}
	if settings.SerperAPIKey != "" && len(settings.SerperAPIKey) > 8 {
		settings.SerperAPIKey = settings.SerperAPIKey[:4] + "********" + settings.SerperAPIKey[len(settings.SerperAPIKey)-4:]
	}

	c.JSON(http.StatusOK, settings)
}

// GetSearchSettingsForAPI returns unmasked search settings for internal API use
func GetSearchSettingsForAPI(userID int) (SearchSettings, error) {
	settings, err := models.GetUserSearchSettings(uint(userID))
	if err != nil {
		// Return default settings if error
		defaultSettings := getDefaultSearchSettings()
		return defaultSettings, nil
	}

	return SearchSettings{
		BraveAPIKey:        settings.BraveAPIKey,
		BraveSearchBaseURL: settings.BraveSearchBaseURL,
		SerperAPIKey:       settings.SerperAPIKey,
		SerperBaseURL:      settings.SerperBaseURL,
		SearchAPIProvider:  settings.SearchAPIProvider,
		SearchResultsLimit: settings.SearchResultsLimit,
		SearchCacheTTL:     settings.SearchCacheTTL,
		SearchRateLimit:    settings.SearchRateLimit,
	}, nil
}

func getDefaultSearchSettings() SearchSettings {
	return SearchSettings{
		BraveAPIKey:        getEnvWithDefault("BRAVE_API_KEY", "BSAw0HNI1v3rKmXlSTr0C_UfZDjw7fT"),
		BraveSearchBaseURL: getEnvWithDefault("BRAVE_SEARCH_BASE_URL", "https://api.search.brave.com/res/v1/web/search"),
		SerperAPIKey:       getEnvWithDefault("SERPER_API_KEY", "6f1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2"),
		SerperBaseURL:      getEnvWithDefault("SERPER_BASE_URL", "https://google.serper.dev/search"),
		SearchAPIProvider:  getEnvWithDefault("SEARCH_API_PROVIDER", "brave"),
		SearchResultsLimit: getIntEnvWithDefault("SEARCH_RESULTS_LIMIT", 10),
		SearchCacheTTL:     getIntEnvWithDefault("SEARCH_CACHE_TTL", 300),
		SearchRateLimit:    getIntEnvWithDefault("SEARCH_RATE_LIMIT", 100),
	}
}

func getEnvWithDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getIntEnvWithDefault(key string, defaultValue int) int {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}

	if intValue, err := strconv.Atoi(value); err == nil {
		return intValue
	}

	return defaultValue
}

func getBoolEnvWithDefault(key string, defaultValue bool) bool {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}

	if value == "true" || value == "1" {
		return true
	}

	return false
}
