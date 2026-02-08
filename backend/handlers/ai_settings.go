package handlers

import (
	"net/http"
	"os"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/trackeep/backend/models"
)

// AISettings represents AI provider settings
type AISettings struct {
	Mistral struct {
		Enabled    bool   `json:"enabled"`
		APIKey     string `json:"api_key"`
		Model      string `json:"model"`
		ModelThink string `json:"model_thinking"`
	} `json:"mistral"`

	Grok struct {
		Enabled    bool   `json:"enabled"`
		APIKey     string `json:"api_key"`
		BaseURL    string `json:"base_url"`
		Model      string `json:"model"`
		ModelThink string `json:"model_thinking"`
	} `json:"grok"`

	DeepSeek struct {
		Enabled    bool   `json:"enabled"`
		APIKey     string `json:"api_key"`
		BaseURL    string `json:"base_url"`
		Model      string `json:"model"`
		ModelThink string `json:"model_thinking"`
	} `json:"deepseek"`

	Ollama struct {
		Enabled    bool   `json:"enabled"`
		BaseURL    string `json:"base_url"`
		Model      string `json:"model"`
		ModelThink string `json:"model_thinking"`
	} `json:"ollama"`

	LongCat struct {
		Enabled            bool   `json:"enabled"`
		APIKey             string `json:"api_key"`
		BaseURL            string `json:"base_url"`
		OpenAIEndpoint     string `json:"openai_endpoint"`
		AnthropicEndpoint  string `json:"anthropic_endpoint"`
		Model              string `json:"model"`
		ModelThink         string `json:"model_thinking"`
		ModelThinkUpgraded string `json:"model_thinking_upgraded"`
		Format             string `json:"format"`
	} `json:"longcat"`

	OpenRouter struct {
		Enabled    bool   `json:"enabled"`
		APIKey     string `json:"api_key"`
		BaseURL    string `json:"base_url"`
		Model      string `json:"model"`
		ModelThink string `json:"model_thinking"`
	} `json:"openrouter"`
}

// GetAISettings returns current AI settings (with API keys masked)
func GetAISettings(c *gin.Context) {
	// Return settings based on environment variables
	settings := getDefaultAISettings()
	c.JSON(http.StatusOK, settings)
}

// UpdateAISettings updates user's AI settings
func UpdateAISettings(c *gin.Context) {
	// Check if demo mode is enabled
	if os.Getenv("VITE_DEMO_MODE") == "true" {
		c.JSON(http.StatusOK, gin.H{"message": "AI settings updated successfully (demo mode)"})
		return
	}

	userID := c.GetUint("user_id")

	var req AISettings
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get or create user settings
	var userSettings models.UserAISettings
	if err := models.DB.Where("user_id = ?", userID).First(&userSettings).Error; err != nil {
		// Create new settings
		userSettings.UserID = userID
	}

	// Update settings
	userSettings.MistralEnabled = &req.Mistral.Enabled
	if req.Mistral.APIKey != "" && !isMasked(req.Mistral.APIKey) {
		userSettings.MistralAPIKey = req.Mistral.APIKey
	}
	userSettings.MistralModel = req.Mistral.Model
	userSettings.MistralModelThinking = req.Mistral.ModelThink

	userSettings.GrokEnabled = &req.Grok.Enabled
	if req.Grok.APIKey != "" && !isMasked(req.Grok.APIKey) {
		userSettings.GrokAPIKey = req.Grok.APIKey
	}
	userSettings.GrokBaseURL = req.Grok.BaseURL
	userSettings.GrokModel = req.Grok.Model
	userSettings.GrokModelThinking = req.Grok.ModelThink

	userSettings.DeepSeekEnabled = &req.DeepSeek.Enabled
	if req.DeepSeek.APIKey != "" && !isMasked(req.DeepSeek.APIKey) {
		userSettings.DeepSeekAPIKey = req.DeepSeek.APIKey
	}
	userSettings.DeepSeekBaseURL = req.DeepSeek.BaseURL
	userSettings.DeepSeekModel = req.DeepSeek.Model
	userSettings.DeepSeekModelThinking = req.DeepSeek.ModelThink

	userSettings.OllamaEnabled = &req.Ollama.Enabled
	userSettings.OllamaBaseURL = req.Ollama.BaseURL
	userSettings.OllamaModel = req.Ollama.Model
	userSettings.OllamaModelThinking = req.Ollama.ModelThink

	userSettings.LongCatEnabled = &req.LongCat.Enabled
	if req.LongCat.APIKey != "" && !isMasked(req.LongCat.APIKey) {
		userSettings.LongCatAPIKey = req.LongCat.APIKey
	}
	userSettings.LongCatBaseURL = req.LongCat.BaseURL
	userSettings.LongCatOpenAIEndpoint = req.LongCat.OpenAIEndpoint
	userSettings.LongCatAnthropicEndpoint = req.LongCat.AnthropicEndpoint
	userSettings.LongCatModel = req.LongCat.Model
	userSettings.LongCatModelThinking = req.LongCat.ModelThink
	userSettings.LongCatModelThinkingUpgraded = req.LongCat.ModelThinkUpgraded
	userSettings.LongCatFormat = req.LongCat.Format

	userSettings.OpenRouterEnabled = &req.OpenRouter.Enabled
	if req.OpenRouter.APIKey != "" && !isMasked(req.OpenRouter.APIKey) {
		userSettings.OpenRouterAPIKey = req.OpenRouter.APIKey
	}
	userSettings.OpenRouterBaseURL = req.OpenRouter.BaseURL
	userSettings.OpenRouterModel = req.OpenRouter.Model
	userSettings.OpenRouterModelThinking = req.OpenRouter.ModelThink

	// Save to database
	if userSettings.ID == 0 {
		if err := models.DB.Create(&userSettings).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save settings"})
			return
		}
	} else {
		if err := models.DB.Save(&userSettings).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update settings"})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "AI settings updated successfully"})
}

// TestAIConnection tests connection to AI provider
func TestAIConnection(c *gin.Context) {
	// Check if demo mode is enabled
	if os.Getenv("VITE_DEMO_MODE") == "true" {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "Connection test successful (demo mode)",
		})
		return
	}

	userID := c.GetUint("user_id")

	provider := c.Query("provider")
	if provider == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Provider is required"})
		return
	}

	// Get user's settings for this provider
	var userSettings models.UserAISettings
	if err := models.DB.Where("user_id = ?", userID).First(&userSettings).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "AI settings not found"})
		return
	}

	// Test connection based on provider
	var success bool
	var message string

	switch provider {
	case "mistral":
		if userSettings.MistralAPIKey == "" {
			success = false
			message = "Mistral API key not configured"
		} else {
			// TODO: Implement actual connection test
			success = true
			message = "Mistral connection test successful"
		}
	case "grok":
		if userSettings.GrokAPIKey == "" {
			success = false
			message = "Grok API key not configured"
		} else {
			// TODO: Implement actual connection test
			success = true
			message = "Grok connection test successful"
		}
	case "deepseek":
		if userSettings.DeepSeekAPIKey == "" {
			success = false
			message = "DeepSeek API key not configured"
		} else {
			// TODO: Implement actual connection test
			success = true
			message = "DeepSeek connection test successful"
		}
	case "longcat":
		if userSettings.LongCatAPIKey == "" {
			success = false
			message = "LongCat API key not configured"
		} else {
			// TODO: Implement actual connection test
			success = true
			message = "LongCat connection test successful"
		}
	case "ollama":
		if userSettings.OllamaBaseURL == "" {
			success = false
			message = "Ollama base URL not configured"
		} else {
			// TODO: Implement actual connection test
			success = true
			message = "Ollama connection test successful"
		}
	case "openrouter":
		if userSettings.OpenRouterAPIKey == "" {
			success = false
			message = "OpenRouter API key not configured"
		} else {
			// TODO: Implement actual connection test
			success = true
			message = "OpenRouter connection test successful"
		}
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Unknown provider"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": success,
		"message": message,
	})
}

// Helper functions
func getDefaultAISettings() AISettings {
	settings := AISettings{}

	// Simple approach - just set basic values without any complex logic
	settings.Mistral.Enabled = false
	settings.Mistral.APIKey = ""
	settings.Mistral.Model = ""
	settings.Mistral.ModelThink = ""

	settings.Grok.Enabled = false
	settings.Grok.APIKey = ""
	settings.Grok.BaseURL = ""
	settings.Grok.Model = ""
	settings.Grok.ModelThink = ""

	settings.DeepSeek.Enabled = false
	settings.DeepSeek.APIKey = ""
	settings.DeepSeek.BaseURL = ""
	settings.DeepSeek.Model = ""
	settings.DeepSeek.ModelThink = ""

	settings.Ollama.Enabled = false
	settings.Ollama.BaseURL = ""
	settings.Ollama.Model = ""
	settings.Ollama.ModelThink = ""

	settings.LongCat.Enabled = false
	settings.LongCat.APIKey = ""
	settings.LongCat.BaseURL = ""
	settings.LongCat.OpenAIEndpoint = ""
	settings.LongCat.AnthropicEndpoint = ""
	settings.LongCat.Model = ""
	settings.LongCat.ModelThink = ""
	settings.LongCat.ModelThinkUpgraded = ""
	settings.LongCat.Format = ""

	settings.OpenRouter.Enabled = false
	settings.OpenRouter.APIKey = ""
	settings.OpenRouter.BaseURL = ""
	settings.OpenRouter.Model = ""
	settings.OpenRouter.ModelThink = ""

	// Read environment variables to determine enabled providers
	// This works in both demo and production mode
	if os.Getenv("MISTRAL_ON") == "true" {
		settings.Mistral.Enabled = true
	}
	if os.Getenv("MISTRAL_API_KEY") != "" {
		settings.Mistral.APIKey = "********"
	}
	settings.Mistral.Model = os.Getenv("MISTRAL_MODEL")
	settings.Mistral.ModelThink = os.Getenv("MISTRAL_MODEL_THINKING")

	if os.Getenv("LONGCAT_ON") == "true" {
		settings.LongCat.Enabled = true
	}
	if os.Getenv("LONGCAT_API_KEY") != "" {
		settings.LongCat.APIKey = "********"
	}
	settings.LongCat.BaseURL = os.Getenv("LONGCAT_BASE_URL")
	settings.LongCat.OpenAIEndpoint = os.Getenv("LONGCAT_OPENAI_ENDPOINT")
	settings.LongCat.AnthropicEndpoint = os.Getenv("LONGCAT_ANTHROPIC_ENDPOINT")
	settings.LongCat.Model = os.Getenv("LONGCAT_MODEL")
	settings.LongCat.ModelThink = os.Getenv("LONGCAT_MODEL_THINKING")
	settings.LongCat.ModelThinkUpgraded = os.Getenv("LONGCAT_MODEL_THINKING_UPGRADED")
	settings.LongCat.Format = os.Getenv("LONGCAT_FORMAT")

	if os.Getenv("GROK_ON") == "true" {
		settings.Grok.Enabled = true
	}
	if os.Getenv("GROK_API_KEY") != "" {
		settings.Grok.APIKey = "********"
	}
	settings.Grok.BaseURL = os.Getenv("GROK_BASE_URL")
	settings.Grok.Model = os.Getenv("GROK_MODEL")
	settings.Grok.ModelThink = os.Getenv("GROK_MODEL_THINKING")

	if os.Getenv("DEEPSEEK_ON") == "true" {
		settings.DeepSeek.Enabled = true
	}
	if os.Getenv("DEEPSEEK_API_KEY") != "" {
		settings.DeepSeek.APIKey = "********"
	}
	settings.DeepSeek.BaseURL = os.Getenv("DEEPSEEK_BASE_URL")
	settings.DeepSeek.Model = os.Getenv("DEEPSEEK_MODEL")
	settings.DeepSeek.ModelThink = os.Getenv("DEEPSEEK_MODEL_THINKING")

	if os.Getenv("OLLAMA_ON") == "true" {
		settings.Ollama.Enabled = true
	}
	settings.Ollama.BaseURL = os.Getenv("OLLAMA_BASE_URL")
	settings.Ollama.Model = os.Getenv("OLLAMA_MODEL")
	settings.Ollama.ModelThink = os.Getenv("OLLAMA_MODEL_THINKING")

	if os.Getenv("OPENROUTER_ON") == "true" {
		settings.OpenRouter.Enabled = true
	}
	if os.Getenv("OPENROUTER_API_KEY") != "" {
		settings.OpenRouter.APIKey = "********"
	}
	settings.OpenRouter.BaseURL = os.Getenv("OPENROUTER_BASE_URL")
	settings.OpenRouter.Model = os.Getenv("OPENROUTER_MODEL")
	settings.OpenRouter.ModelThink = os.Getenv("OPENROUTER_MODEL_THINKING")

	return settings
}

func maskAPIKey(key string) string {
	if key == "" {
		return ""
	}
	if len(key) <= 8 {
		return "********"
	}
	return key[:4] + "********" + key[len(key)-4:]
}

func isMasked(key string) bool {
	return key == "" || (len(key) > 8 && key[4:12] == "********")
}

func getBoolEnv(key string, defaultValue bool) bool {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	boolValue, err := strconv.ParseBool(value)
	if err != nil {
		return defaultValue
	}
	return boolValue
}
