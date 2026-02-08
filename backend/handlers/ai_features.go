package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/trackeep/backend/models"
	"github.com/trackeep/backend/services"
)

// SummarizeContentRequest represents a request to summarize content
type SummarizeContentRequest struct {
	ContentType string `json:"content_type" binding:"required"` // "bookmark", "note", "file"
	ContentID   uint   `json:"content_id" binding:"required"`
	Provider    string `json:"provider"`   // "mistral", "longcat", "" for default
	ModelType   string `json:"model_type"` // "standard", "thinking", "upgraded_thinking"
	Options     struct {
		Length     string `json:"length"`      // "short", "medium", "long"
		Style      string `json:"style"`       // "bullet", "paragraph", "executive"
		IncludeKey bool   `json:"include_key"` // Include key points
	} `json:"options"`
}

// GenerateTaskSuggestionsRequest represents a request for task suggestions
type GenerateTaskSuggestionsRequest struct {
	Context   string `json:"context"`    // "calendar", "deadlines", "habits", "all"
	Timeframe string `json:"timeframe"`  // "today", "week", "month"
	Limit     int    `json:"limit"`      // Max number of suggestions
	Provider  string `json:"provider"`   // "mistral", "longcat", "" for default
	ModelType string `json:"model_type"` // "standard", "thinking", "upgraded_thinking"
}

// GenerateTagsRequest represents a request for tag suggestions
type GenerateTagsRequest struct {
	ContentType string `json:"content_type" binding:"required"`
	ContentID   uint   `json:"content_id" binding:"required"`
	Content     string `json:"content" binding:"required"`
	ExistingTag string `json:"existing_tags"`
	Provider    string `json:"provider"`   // "mistral", "longcat", "" for default
	ModelType   string `json:"model_type"` // "standard", "thinking", "upgraded_thinking"
}

// GenerateContentRequest represents a request for content generation
type GenerateContentRequest struct {
	Prompt      string  `json:"prompt" binding:"required"`
	ContentType string  `json:"content_type" binding:"required"`
	Context     string  `json:"context"`
	Temperature float64 `json:"temperature"`
	MaxLength   int     `json:"max_length"`
	Provider    string  `json:"provider"`   // "mistral", "longcat", "" for default
	ModelType   string  `json:"model_type"` // "standard", "thinking", "upgraded_thinking"
}

// SummarizeContent generates AI summary for content
func SummarizeContent(c *gin.Context) {
	userID := c.GetUint("user_id")

	var req SummarizeContentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get content based on type
	var content string
	var title string
	switch req.ContentType {
	case "bookmark":
		var bookmark models.Bookmark
		if err := models.DB.Where("id = ? AND user_id = ?", req.ContentID, userID).First(&bookmark).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Content not found"})
			return
		}
		content = bookmark.Content
		title = bookmark.Title
	case "note":
		var note models.Note
		if err := models.DB.Where("id = ? AND user_id = ?", req.ContentID, userID).First(&note).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Content not found"})
			return
		}
		content = note.Content
		title = note.Title
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Unsupported content type"})
		return
	}

	if content == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No content to summarize"})
		return
	}

	// Check if summary already exists
	var existingSummary models.AISummary
	if err := models.DB.Where("user_id = ? AND content_type = ? AND content_id = ?", userID, req.ContentType, req.ContentID).First(&existingSummary).Error; err == nil {
		c.JSON(http.StatusOK, existingSummary)
		return
	}

	// Generate summary using AI
	summary, err := generateAISummary(content, title, req.Options, req.Provider, req.ModelType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate summary: " + err.Error()})
		return
	}

	// Save summary
	aiSummary := models.AISummary{
		UserID:       userID,
		ContentType:  req.ContentType,
		ContentID:    req.ContentID,
		Title:        summary.Title,
		Summary:      summary.Summary,
		KeyPoints:    summary.KeyPoints,
		Tags:         summary.Tags,
		ReadTime:     summary.ReadTime,
		Complexity:   summary.Complexity,
		ModelUsed:    getProviderModel(req.Provider),
		Confidence:   summary.Confidence,
		LastAnalyzed: time.Now(),
	}

	if err := models.DB.Create(&aiSummary).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save summary"})
		return
	}

	c.JSON(http.StatusOK, aiSummary)
}

// GetTaskSuggestions generates AI task suggestions
func GetTaskSuggestions(c *gin.Context) {
	userID := c.GetUint("user_id")

	var req GenerateTaskSuggestionsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Build context from user data
	contextData, err := buildTaskContext(userID, req.Context, req.Timeframe)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to build context"})
		return
	}

	// Generate suggestions
	suggestions, err := generateTaskSuggestions(contextData, req.Limit, req.Provider, req.ModelType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate suggestions: " + err.Error()})
		return
	}

	// Save suggestions
	var aiSuggestions []models.AITaskSuggestion
	for _, suggestion := range suggestions {
		aiSuggestion := models.AITaskSuggestion{
			UserID:        userID,
			Title:         suggestion.Title,
			Description:   suggestion.Description,
			Priority:      suggestion.Priority,
			Category:      suggestion.Category,
			Reasoning:     suggestion.Reasoning,
			ContextType:   req.Context,
			ContextData:   suggestion.ContextData,
			Deadline:      suggestion.Deadline,
			EstimatedTime: suggestion.EstimatedTime,
			ModelUsed:     getProviderModel(req.Provider),
			Confidence:    suggestion.Confidence,
		}
		models.DB.Create(&aiSuggestion)
		aiSuggestions = append(aiSuggestions, aiSuggestion)
	}

	c.JSON(http.StatusOK, aiSuggestions)
}

// GenerateTagSuggestions generates AI tag suggestions
func GenerateTagSuggestions(c *gin.Context) {
	userID := c.GetUint("user_id")

	var req GenerateTagsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Generate tags
	tags, err := generateTagSuggestions(req.Content, req.ExistingTag, req.Provider, req.ModelType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate tags: " + err.Error()})
		return
	}

	// Save suggestion
	tagSuggestion := models.AITagSuggestion{
		UserID:        userID,
		ContentType:   req.ContentType,
		ContentID:     req.ContentID,
		SuggestedTags: tags.Suggested,
		ExistingTags:  req.ExistingTag,
		Relevance:     tags.Relevance,
		ModelUsed:     getProviderModel(req.Provider),
		Confidence:    tags.Confidence,
	}

	if err := models.DB.Create(&tagSuggestion).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save tag suggestion"})
		return
	}

	c.JSON(http.StatusOK, tagSuggestion)
}

// GenerateContent generates AI content
func GenerateContent(c *gin.Context) {
	userID := c.GetUint("user_id")

	var req GenerateContentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Generate content
	content, err := generateAIContent(req.Prompt, req.ContentType, req.Context, req.Temperature, req.MaxLength, req.Provider, req.ModelType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate content: " + err.Error()})
		return
	}

	// Save generation
	aiContent := models.AIContentGeneration{
		UserID:       userID,
		Prompt:       req.Prompt,
		ContentType:  req.ContentType,
		Context:      req.Context,
		Title:        content.Title,
		Content:      content.Content,
		WordCount:    content.WordCount,
		ReadTime:     content.ReadTime,
		ModelUsed:    getProviderModel(req.Provider),
		ProcessingMs: content.ProcessingMs,
		TokenCount:   content.TokenCount,
		Confidence:   content.Confidence,
		Temperature:  req.Temperature,
	}

	if err := models.DB.Create(&aiContent).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save content"})
		return
	}

	c.JSON(http.StatusOK, aiContent)
}

// GetAIProviders returns available AI providers
func GetAIProviders(c *gin.Context) {
	providers := services.GetAvailableProviders()

	providerInfo := make([]map[string]interface{}, 0)
	for _, provider := range providers {
		info := map[string]interface{}{
			"id":   string(provider),
			"name": getProviderDisplayName(provider),
		}

		// Add model info
		switch provider {
		case services.ProviderMistral:
			standardModel := os.Getenv("MISTRAL_MODEL")
			thinkingModel := os.Getenv("MISTRAL_MODEL_THINKING")

			info["models"] = []map[string]string{
				{"id": "standard", "name": standardModel, "type": "Standard"},
				{"id": "thinking", "name": thinkingModel, "type": "Thinking"},
			}
			info["description"] = "Mistral AI - Fast and efficient European AI"
			info["icon"] = "🇪🇺"

		case services.ProviderLongCat:
			standardModel := os.Getenv("LONGCAT_MODEL")
			thinkingModel := os.Getenv("LONGCAT_MODEL_THINKING")
			upgradedModel := os.Getenv("LONGCAT_MODEL_THINKING_UPGRADED")

			models := []map[string]string{
				{"id": "standard", "name": standardModel, "type": "Standard"},
				{"id": "thinking", "name": thinkingModel, "type": "Thinking"},
			}

			if upgradedModel != "" {
				models = append(models, map[string]string{"id": "upgraded_thinking", "name": upgradedModel, "type": "Upgraded Thinking"})
			}

			info["models"] = models
			info["description"] = "LongCat AI - High-performance AI models"
			info["icon"] = "🐱"

		case services.ProviderGrok:
			standardModel := os.Getenv("GROK_MODEL")
			thinkingModel := os.Getenv("GROK_MODEL_THINKING")

			models := []map[string]string{
				{"id": "standard", "name": standardModel, "type": "Standard"},
			}

			if thinkingModel != "" && thinkingModel != standardModel {
				models = append(models, map[string]string{"id": "thinking", "name": thinkingModel, "type": "Thinking"})
			}

			info["models"] = models
			info["description"] = "Grok AI - Real-time information from X"
			info["icon"] = "🐦"

		case services.ProviderDeepSeek:
			standardModel := os.Getenv("DEEPSEEK_MODEL")
			thinkingModel := os.Getenv("DEEPSEEK_MODEL_THINKING")

			models := []map[string]string{
				{"id": "standard", "name": standardModel, "type": "Standard"},
			}

			if thinkingModel != "" && thinkingModel != standardModel {
				models = append(models, map[string]string{"id": "thinking", "name": thinkingModel, "type": "Reasoning"})
			}

			info["models"] = models
			info["description"] = "DeepSeek - Advanced reasoning AI"
			info["icon"] = "🔍"

		case services.ProviderOllama:
			standardModel := os.Getenv("OLLAMA_MODEL")
			thinkingModel := os.Getenv("OLLAMA_MODEL_THINKING")

			models := []map[string]string{
				{"id": "standard", "name": standardModel, "type": "Standard"},
			}

			if thinkingModel != "" && thinkingModel != standardModel {
				models = append(models, map[string]string{"id": "thinking", "name": thinkingModel, "type": "Local"})
			}

			info["models"] = models
			info["description"] = "Ollama - Local AI models"
			info["icon"] = "🦙"

		case services.ProviderOpenRouter:
			standardModel := os.Getenv("OPENROUTER_MODEL")
			thinkingModel := os.Getenv("OPENROUTER_MODEL_THINKING")

			models := []map[string]string{
				{"id": "standard", "name": standardModel, "type": "Standard"},
			}

			if thinkingModel != "" && thinkingModel != standardModel {
				models = append(models, map[string]string{"id": "thinking", "name": thinkingModel, "type": "Thinking"})
			}

			info["models"] = models
			info["description"] = "OpenRouter - Unified access to many models"
			info["icon"] = "🌀"
		}

		providerInfo = append(providerInfo, info)
	}

	c.JSON(http.StatusOK, gin.H{"providers": providerInfo})
}

// Helper function to get display name for provider
func getProviderDisplayName(provider services.AIProvider) string {
	switch provider {
	case services.ProviderMistral:
		return "Mistral AI"
	case services.ProviderLongCat:
		return "LongCat AI"
	case services.ProviderGrok:
		return "Grok AI"
	case services.ProviderDeepSeek:
		return "DeepSeek"
	case services.ProviderOllama:
		return "Ollama"
	case services.ProviderOpenRouter:
		return "OpenRouter"
	default:
		return string(provider)
	}
}

// GetAISummaries retrieves AI summaries for user
func GetAISummaries(c *gin.Context) {
	userID := c.GetUint("user_id")

	var summaries []models.AISummary
	models.DB.Where("user_id = ?", userID).Order("created_at desc").Find(&summaries)

	c.JSON(http.StatusOK, summaries)
}

// GetTaskSuggestions retrieves task suggestions for user
func GetTaskSuggestionsList(c *gin.Context) {
	userID := c.GetUint("user_id")

	var suggestions []models.AITaskSuggestion
	models.DB.Where("user_id = ? AND accepted = false AND dismissed = false", userID).Order("created_at desc").Find(&suggestions)

	c.JSON(http.StatusOK, suggestions)
}

// AcceptTaskSuggestion accepts a task suggestion
func AcceptTaskSuggestion(c *gin.Context) {
	userID := c.GetUint("user_id")
	suggestionID := c.Param("id")

	var suggestion models.AITaskSuggestion
	if err := models.DB.Where("id = ? AND user_id = ?", suggestionID, userID).First(&suggestion).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Suggestion not found"})
		return
	}

	// Create actual task
	task := models.Task{
		UserID:      userID,
		Title:       suggestion.Title,
		Description: suggestion.Description,
		Priority:    models.TaskPriority(suggestion.Priority),
		Status:      models.TaskStatusPending,
		DueDate:     suggestion.Deadline,
	}

	if err := models.DB.Create(&task).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create task"})
		return
	}

	// Mark suggestion as accepted
	suggestion.Accepted = true
	models.DB.Save(&suggestion)

	c.JSON(http.StatusOK, gin.H{"message": "Task created successfully", "task_id": task.ID})
}

// DismissTaskSuggestion dismisses a task suggestion
func DismissTaskSuggestion(c *gin.Context) {
	userID := c.GetUint("user_id")
	suggestionID := c.Param("id")

	var suggestion models.AITaskSuggestion
	if err := models.DB.Where("id = ? AND user_id = ?", suggestionID, userID).First(&suggestion).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Suggestion not found"})
		return
	}

	suggestion.Dismissed = true
	models.DB.Save(&suggestion)

	c.JSON(http.StatusOK, gin.H{"message": "Suggestion dismissed"})
}

// Helper structs for AI responses
type AISummaryResponse struct {
	Title      string  `json:"title"`
	Summary    string  `json:"summary"`
	KeyPoints  string  `json:"key_points"`
	Tags       string  `json:"tags"`
	ReadTime   int     `json:"read_time"`
	Complexity string  `json:"complexity"`
	Confidence float64 `json:"confidence"`
}

type TaskSuggestionResponse struct {
	Title         string     `json:"title"`
	Description   string     `json:"description"`
	Priority      string     `json:"priority"`
	Category      string     `json:"category"`
	Reasoning     string     `json:"reasoning"`
	ContextData   string     `json:"context_data"`
	Deadline      *time.Time `json:"deadline"`
	EstimatedTime int        `json:"estimated_time"`
	Confidence    float64    `json:"confidence"`
}

type TagSuggestionResponse struct {
	Suggested  string  `json:"suggested"`
	Relevance  float64 `json:"relevance"`
	Confidence float64 `json:"confidence"`
}

type ContentGenerationResponse struct {
	Title        string  `json:"title"`
	Content      string  `json:"content"`
	WordCount    int     `json:"word_count"`
	ReadTime     int     `json:"read_time"`
	ProcessingMs int64   `json:"processing_ms"`
	TokenCount   int     `json:"token_count"`
	Confidence   float64 `json:"confidence"`
}

// AI generation functions (simplified - would call actual AI models)
func generateAISummary(content, title string, options struct {
	Length     string `json:"length"`
	Style      string `json:"style"`
	IncludeKey bool   `json:"include_key"`
}, provider string, modelType string) (*AISummaryResponse, error) {
	// Build prompt for summarization
	prompt := fmt.Sprintf(`Please summarize the following content:
Title: %s
Content: %s

Length: %s
Style: %s
Include key points: %t

Provide a JSON response with:
- title: Brief title
- summary: Main summary
- key_points: Array of key points (if requested)
- tags: Array of relevant tags
- read_time: Estimated reading time in minutes
- complexity: "low", "medium", or "high"
- confidence: Confidence score 0-1`, title, content, options.Length, options.Style, options.IncludeKey)

	messages := []services.Message{
		{Role: "system", Content: "You are an expert content summarizer. Always respond with valid JSON."},
		{Role: "user", Content: prompt},
	}

	// Determine provider
	aiProvider := services.ProviderMistral // default
	if provider == "longcat" {
		aiProvider = services.ProviderLongCat
	}

	aiService := services.NewAIService(aiProvider)

	req := services.AIRequest{
		Messages:    messages,
		MaxTokens:   2000,
		Temperature: 0.3,
		ModelType:   modelType,
	}

	var resp *services.AIResponse
	var err error

	// Choose the appropriate method based on model type
	switch req.ModelType {
	case "thinking":
		resp, err = aiService.ChatCompletionWithThinking(req)
	case "upgraded_thinking":
		resp, err = aiService.ChatCompletionWithUpgradedThinking(req)
	default:
		resp, err = aiService.ChatCompletion(req)
	}

	if err != nil {
		return nil, err
	}

	// Parse the response content properly for thinking models
	actualContent := services.ParseThinkingResponse(resp, aiProvider, modelType)

	var summary AISummaryResponse
	if err := json.Unmarshal([]byte(actualContent), &summary); err != nil {
		return nil, err
	}

	return &summary, nil
}

func generateTaskSuggestions(contextData map[string]interface{}, limit int, provider string, modelType string) ([]TaskSuggestionResponse, error) {
	// Build prompt for task suggestions
	prompt := fmt.Sprintf(`Based on the following user context, suggest %d tasks:
Context: %+v

Provide a JSON array of task objects with:
- title: Task title
- description: Task description
- priority: "low", "medium", "high", "urgent"
- category: Task category
- reasoning: Why this task is suggested
- context_data: Additional context
- deadline: Suggested deadline (ISO date or null)
- estimated_time: Estimated time in minutes
- confidence: Confidence score 0-1`, contextData, limit)

	messages := []services.Message{
		{Role: "system", Content: "You are a productivity assistant. Always respond with valid JSON array."},
		{Role: "user", Content: prompt},
	}

	// Determine provider
	aiProvider := services.ProviderMistral // default
	if provider == "longcat" {
		aiProvider = services.ProviderLongCat
	}

	aiService := services.NewAIService(aiProvider)

	req := services.AIRequest{
		Messages:    messages,
		MaxTokens:   2000,
		Temperature: 0.7,
		ModelType:   modelType,
	}

	var resp *services.AIResponse
	var err error

	// Choose the appropriate method based on model type
	switch req.ModelType {
	case "thinking":
		resp, err = aiService.ChatCompletionWithThinking(req)
	case "upgraded_thinking":
		resp, err = aiService.ChatCompletionWithUpgradedThinking(req)
	default:
		resp, err = aiService.ChatCompletion(req)
	}

	if err != nil {
		return nil, err
	}

	// Parse the response content properly for thinking models
	actualContent := services.ParseThinkingResponse(resp, aiProvider, modelType)

	var suggestions []TaskSuggestionResponse
	if err := json.Unmarshal([]byte(actualContent), &suggestions); err != nil {
		return nil, err
	}

	return suggestions, nil
}

func generateTagSuggestions(content, existingTags string, provider string, modelType string) (*TagSuggestionResponse, error) {
	prompt := fmt.Sprintf(`Suggest relevant tags for this content:
Content: %s
Existing tags: %s

Provide JSON response with:
- suggested: Array of suggested tags
- relevance: Relevance score 0-1
- confidence: Confidence score 0-1`, content, existingTags)

	messages := []services.Message{
		{Role: "system", Content: "You are a tagging expert. Always respond with valid JSON."},
		{Role: "user", Content: prompt},
	}

	// Determine provider
	aiProvider := services.ProviderMistral // default
	if provider == "longcat" {
		aiProvider = services.ProviderLongCat
	}

	aiService := services.NewAIService(aiProvider)

	req := services.AIRequest{
		Messages:    messages,
		MaxTokens:   1000,
		Temperature: 0.5,
		ModelType:   modelType,
	}

	var resp *services.AIResponse
	var err error

	// Choose the appropriate method based on model type
	switch req.ModelType {
	case "thinking":
		resp, err = aiService.ChatCompletionWithThinking(req)
	case "upgraded_thinking":
		resp, err = aiService.ChatCompletionWithUpgradedThinking(req)
	default:
		resp, err = aiService.ChatCompletion(req)
	}

	if err != nil {
		return nil, err
	}

	// Parse the response content properly for thinking models
	actualContent := services.ParseThinkingResponse(resp, aiProvider, modelType)

	var tags TagSuggestionResponse
	if err := json.Unmarshal([]byte(actualContent), &tags); err != nil {
		return nil, err
	}

	return &tags, nil
}

func generateAIContent(prompt, contentType, context string, temperature float64, maxLength int, provider string, modelType string) (*ContentGenerationResponse, error) {
	fullPrompt := fmt.Sprintf(`Generate %s content based on this prompt:
%s
Additional context: %s
Max length: %d words

Provide JSON response with:
- title: Generated title
- content: Generated content
- word_count: Word count
- read_time: Estimated reading time in minutes
- confidence: Confidence score 0-1`, contentType, prompt, context, maxLength)

	messages := []services.Message{
		{Role: "system", Content: "You are a content generation expert. Always respond with valid JSON."},
		{Role: "user", Content: fullPrompt},
	}

	// Determine provider
	aiProvider := services.ProviderMistral // default
	if provider == "longcat" {
		aiProvider = services.ProviderLongCat
	}

	aiService := services.NewAIService(aiProvider)

	// Adjust temperature if provided
	temp := 0.7
	if temperature > 0 {
		temp = temperature
	}

	req := services.AIRequest{
		Messages:    messages,
		MaxTokens:   maxLength * 2, // Rough estimate
		Temperature: temp,
		ModelType:   modelType,
	}

	var resp *services.AIResponse
	var err error

	// Choose the appropriate method based on model type
	switch req.ModelType {
	case "thinking":
		resp, err = aiService.ChatCompletionWithThinking(req)
	case "upgraded_thinking":
		resp, err = aiService.ChatCompletionWithUpgradedThinking(req)
	default:
		resp, err = aiService.ChatCompletion(req)
	}

	if err != nil {
		return nil, err
	}

	// Parse the response content properly for thinking models
	actualContent := services.ParseThinkingResponse(resp, aiProvider, modelType)

	var content ContentGenerationResponse
	if err := json.Unmarshal([]byte(actualContent), &content); err != nil {
		return nil, err
	}

	content.ProcessingMs = 0 // Would track actual processing time
	content.TokenCount = resp.Usage.TotalTokens

	return &content, nil
}

func buildTaskContext(userID uint, contextType, timeframe string) (map[string]interface{}, error) {
	ctx := make(map[string]interface{})

	// Get upcoming tasks
	var tasks []models.Task
	query := models.DB.Where("user_id = ?", userID)

	if timeframe == "today" {
		query = query.Where("deadline <= ?", time.Now().AddDate(0, 0, 1))
	} else if timeframe == "week" {
		query = query.Where("deadline <= ?", time.Now().AddDate(0, 0, 7))
	}

	query.Find(&tasks)
	ctx["tasks"] = tasks

	// Get calendar events
	var events []models.CalendarEvent
	models.DB.Where("user_id = ? AND start_time >= ?", userID, time.Now()).Find(&events)
	ctx["events"] = events

	return ctx, nil
}

// Helper function to get model name based on provider
func getProviderModel(provider string) string {
	switch provider {
	case "mistral":
		return os.Getenv("MISTRAL_MODEL")
	case "longcat":
		return os.Getenv("LONGCAT_MODEL")
	case "grok":
		return os.Getenv("GROK_MODEL")
	case "deepseek":
		return os.Getenv("DEEPSEEK_MODEL")
	case "ollama":
		return os.Getenv("OLLAMA_MODEL")
	case "openrouter":
		return os.Getenv("OPENROUTER_MODEL")
	default:
		return os.Getenv("MISTRAL_MODEL")
	}
}
