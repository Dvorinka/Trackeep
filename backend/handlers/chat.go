package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/trackeep/backend/models"
	"github.com/trackeep/backend/services"
)

// MistralConfig holds configuration for Mistral AI
type MistralConfig struct {
	APIKey      string
	BaseURL     string
	Model       string
	MaxTokens   int
	Temperature float64
}

// ChatRequest represents a chat message request
type ChatRequest struct {
	Message   string          `json:"message" binding:"required"`
	SessionID *string         `json:"session_id,omitempty"`
	Context   map[string]bool `json:"context,omitempty"`    // what data to include
	Provider  string          `json:"provider,omitempty"`   // "mistral", "longcat", "grok", "deepseek", "ollama", "openrouter"
	ModelType string          `json:"model_type,omitempty"` // "standard", "thinking", "upgraded_thinking"
}

// ChatResponse represents a chat response
type ChatResponse struct {
	ID          string     `json:"id"`
	Message     string     `json:"message"`
	Role        string     `json:"role"`
	SessionID   string     `json:"session_id"`
	Timestamp   time.Time  `json:"timestamp"`
	Model       string     `json:"model"`
	TokenUsage  TokenUsage `json:"token_usage"`
	ContextUsed []string   `json:"context_used"`
}

// TokenUsage represents token usage information
type TokenUsage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
}

// MistralMessage represents a message for Mistral API
type MistralMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// MistralRequest represents a request to Mistral API
type MistralRequest struct {
	Model       string           `json:"model"`
	Messages    []MistralMessage `json:"messages"`
	MaxTokens   int              `json:"max_tokens,omitempty"`
	Temperature float64          `json:"temperature,omitempty"`
}

// MistralResponse represents a response from Mistral API
type MistralResponse struct {
	ID      string `json:"id"`
	Object  string `json:"object"`
	Created int64  `json:"created"`
	Model   string `json:"model"`
	Choices []struct {
		Index   int `json:"index"`
		Message struct {
			Role    string `json:"role"`
			Content string `json:"content"`
		} `json:"message"`
		FinishReason string `json:"finish_reason"`
	} `json:"choices"`
	Usage struct {
		PromptTokens     int `json:"prompt_tokens"`
		CompletionTokens int `json:"completion_tokens"`
		TotalTokens      int `json:"total_tokens"`
	} `json:"usage"`
}

var mistralConfig = MistralConfig{
	APIKey:      os.Getenv("MISTRAL_API_KEY"),
	BaseURL:     "https://api.mistral.ai/v1",
	Model:       "mistral-small-latest", // Cheap and capable model
	MaxTokens:   4000,
	Temperature: 0.7,
}

// GetMistralConfig returns current Mistral configuration
func GetMistralConfig() MistralConfig {
	return mistralConfig
}

// SendMessage handles chat message requests
func SendMessage(c *gin.Context) {
	userID := c.GetUint("user_id")

	var req ChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get or create session
	var session models.ChatSession
	if req.SessionID != nil {
		if err := models.DB.Where("id = ? AND user_id = ?", *req.SessionID, userID).First(&session).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Session not found"})
			return
		}
	} else {
		// Create new session
		session = models.ChatSession{
			UserID:           userID,
			Title:            fmt.Sprintf("Chat %s", time.Now().Format("Jan 2, 3:04 PM")),
			IncludeBookmarks: true,
			IncludeTasks:     true,
			IncludeFiles:     true,
			IncludeNotes:     true,
		}
		if req.Context != nil {
			session.IncludeBookmarks = req.Context["bookmarks"]
			session.IncludeTasks = req.Context["tasks"]
			session.IncludeFiles = req.Context["files"]
			session.IncludeNotes = req.Context["notes"]
		}
		if err := models.DB.Create(&session).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create session"})
			return
		}
	}

	// Save user message
	userMessage := models.ChatMessage{
		UserID:    userID,
		SessionID: strconv.Itoa(int(session.ID)),
		Content:   req.Message,
		Role:      "user",
	}
	if err := models.DB.Create(&userMessage).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save message"})
		return
	}

	// Get conversation history
	var messages []models.ChatMessage
	models.DB.Where("session_id = ?", session.ID).Order("created_at asc").Find(&messages)

	// Build context from user data
	contextData, err := buildUserContext(userID, session)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to build context"})
		return
	}

	// Build messages for AI provider (system + history)
	aiMessages := []services.Message{
		{
			Role:    "system",
			Content: buildSystemPrompt(contextData),
		},
	}

	// Add conversation history (limit to last 10 messages to manage token count)
	startIdx := 0
	if len(messages) > 11 { // system + 10 messages
		startIdx = len(messages) - 10
	}
	for i := startIdx; i < len(messages); i++ {
		aiMessages = append(aiMessages, services.Message{
			Role:    messages[i].Role,
			Content: messages[i].Content,
		})
	}

	// Determine AI provider
	aiProvider := services.ProviderMistral
	switch req.Provider {
	case "longcat":
		aiProvider = services.ProviderLongCat
	case "grok":
		aiProvider = services.ProviderGrok
	case "deepseek":
		aiProvider = services.ProviderDeepSeek
	case "ollama":
		aiProvider = services.ProviderOllama
	case "openrouter":
		aiProvider = services.ProviderOpenRouter
	}

	aiService := services.NewAIService(aiProvider)
	aiReq := services.AIRequest{
		Messages:    aiMessages,
		MaxTokens:   2000,
		Temperature: 0.7,
		ModelType:   req.ModelType,
	}

	// Call AI provider
	startTime := time.Now()
	var aiResp *services.AIResponse
	switch req.ModelType {
	case "thinking":
		aiResp, err = aiService.ChatCompletionWithThinking(aiReq)
	case "upgraded_thinking":
		aiResp, err = aiService.ChatCompletionWithUpgradedThinking(aiReq)
	default:
		aiResp, err = aiService.ChatCompletion(aiReq)
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to call AI: " + err.Error()})
		return
	}
	processingMs := time.Since(startTime).Milliseconds()

	if len(aiResp.Choices) == 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "No response from AI"})
		return
	}

	// Extract assistant response, handling thinking models where needed
	assistantContent := services.ParseThinkingResponse(aiResp, aiProvider, req.ModelType)

	// Save assistant message
	assistantMessage := models.ChatMessage{
		UserID:       userID,
		SessionID:    strconv.Itoa(int(session.ID)),
		Content:      assistantContent,
		Role:         "assistant",
		ModelUsed:    aiResp.Model,
		TokenCount:   aiResp.Usage.TotalTokens,
		ProcessingMs: processingMs,
		ContextItems: getContextItemIDs(contextData),
	}
	if err := models.DB.Create(&assistantMessage).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save response"})
		return
	}

	// Update session
	session.MessageCount = len(messages) + 1
	now := time.Now()
	session.LastMessageAt = &now
	models.DB.Save(&session)

	// Return response
	response := ChatResponse{
		ID:        aiResp.ID,
		Message:   assistantContent,
		Role:      "assistant",
		SessionID: strconv.Itoa(int(session.ID)),
		Timestamp: time.Now(),
		Model:     aiResp.Model,
		TokenUsage: TokenUsage{
			PromptTokens:     aiResp.Usage.PromptTokens,
			CompletionTokens: aiResp.Usage.CompletionTokens,
			TotalTokens:      aiResp.Usage.TotalTokens,
		},
		ContextUsed: getContextItemIDs(contextData),
	}

	c.JSON(http.StatusOK, response)
}

// GetSessions retrieves user's chat sessions
func GetSessions(c *gin.Context) {
	userID := c.GetUint("user_id")

	var sessions []models.ChatSession
	models.DB.Where("user_id = ?", userID).Order("updated_at desc").Find(&sessions)

	c.JSON(http.StatusOK, sessions)
}

// GetSessionMessages retrieves messages for a specific session
func GetSessionMessages(c *gin.Context) {
	userID := c.GetUint("user_id")
	sessionID := c.Param("id")

	// Verify session belongs to user
	var session models.ChatSession
	if err := models.DB.Where("id = ? AND user_id = ?", sessionID, userID).First(&session).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Session not found"})
		return
	}

	var messages []models.ChatMessage
	models.DB.Where("session_id = ?", sessionID).Order("created_at asc").Find(&messages)

	c.JSON(http.StatusOK, messages)
}

// DeleteSession deletes a chat session and its messages
func DeleteSession(c *gin.Context) {
	userID := c.GetUint("user_id")
	sessionID := c.Param("id")

	// Verify session belongs to user
	var session models.ChatSession
	if err := models.DB.Where("id = ? AND user_id = ?", sessionID, userID).First(&session).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Session not found"})
		return
	}

	// Delete messages first
	models.DB.Where("session_id = ?", sessionID).Delete(&models.ChatMessage{})

	// Delete session
	models.DB.Delete(&session)

	c.JSON(http.StatusOK, gin.H{"message": "Session deleted"})
}

func callMistral(messages []MistralMessage) (*MistralResponse, error) {
	reqBody := MistralRequest{
		Model:       mistralConfig.Model,
		Messages:    messages,
		MaxTokens:   mistralConfig.MaxTokens,
		Temperature: mistralConfig.Temperature,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest("POST", mistralConfig.BaseURL+"/chat/completions", strings.NewReader(string(jsonData)))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+mistralConfig.APIKey)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Mistral API returned status %d", resp.StatusCode)
	}

	var mistralResp MistralResponse
	if err := json.NewDecoder(resp.Body).Decode(&mistralResp); err != nil {
		return nil, err
	}

	return &mistralResp, nil
}
