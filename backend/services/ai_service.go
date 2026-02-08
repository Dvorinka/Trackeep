package services

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"
)

// AIProvider represents different AI providers
type AIProvider string

const (
	ProviderMistral    AIProvider = "mistral"
	ProviderLongCat    AIProvider = "longcat"
	ProviderGrok       AIProvider = "grok"
	ProviderDeepSeek   AIProvider = "deepseek"
	ProviderOllama     AIProvider = "ollama"
	ProviderOpenRouter AIProvider = "openrouter"
)

// AIRequest represents a generic AI request
type AIRequest struct {
	Messages    []Message `json:"messages"`
	Model       string    `json:"model"`
	MaxTokens   int       `json:"max_tokens,omitempty"`
	Temperature float64   `json:"temperature,omitempty"`
	ModelType   string    `json:"model_type,omitempty"` // "standard", "thinking", "upgraded_thinking"
}

// Message represents a chat message
type Message struct {
	Role             string `json:"role"`
	Content          string `json:"content"`
	ReasoningContent string `json:"reasoning_content,omitempty"`
}

// AIResponse represents a generic AI response
type AIResponse struct {
	ID      string   `json:"id"`
	Object  string   `json:"object"`
	Created int64    `json:"created"`
	Model   string   `json:"model"`
	Choices []Choice `json:"choices"`
	Usage   Usage    `json:"usage"`
}

// Choice represents a choice in AI response
type Choice struct {
	Index        int     `json:"index"`
	Message      Message `json:"message"`
	FinishReason string  `json:"finish_reason"`
}

// Usage represents token usage
type Usage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
}

// AIService handles multiple AI providers
type AIService struct {
	provider AIProvider
}

// NewAIService creates a new AI service with the specified provider
func NewAIService(provider AIProvider) *AIService {
	return &AIService{provider: provider}
}

// GetAvailableProviders returns available AI providers
func GetAvailableProviders() []AIProvider {
	// Return all known providers so the frontend can show them in settings
	// regardless of current environment configuration. Environment flags
	// and API keys still control whether requests actually succeed.
	return []AIProvider{
		ProviderMistral,
		ProviderLongCat,
		ProviderGrok,
		ProviderDeepSeek,
		ProviderOllama,
		ProviderOpenRouter,
	}
}

// ChatCompletion sends a chat completion request to the configured provider
func (s *AIService) ChatCompletion(req AIRequest) (*AIResponse, error) {
	switch s.provider {
	case ProviderMistral:
		return s.callMistral(req)
	case ProviderLongCat:
		return s.callLongCat(req)
	case ProviderGrok:
		return s.callGrok(req)
	case ProviderDeepSeek:
		return s.callDeepSeek(req)
	case ProviderOllama:
		return s.callOllama(req)
	case ProviderOpenRouter:
		return s.callOpenRouter(req)
	default:
		return nil, fmt.Errorf("unsupported AI provider: %s", s.provider)
	}
}

// ChatCompletionWithThinking sends a chat completion request with thinking model
func (s *AIService) ChatCompletionWithThinking(req AIRequest) (*AIResponse, error) {
	// Override model with thinking model
	thinkingModel := s.getThinkingModel()
	if thinkingModel != "" {
		req.Model = thinkingModel
	}

	return s.ChatCompletion(req)
}

// ChatCompletionWithUpgradedThinking sends a chat completion request with upgraded thinking model (LongCat only)
func (s *AIService) ChatCompletionWithUpgradedThinking(req AIRequest) (*AIResponse, error) {
	if s.provider != ProviderLongCat {
		return nil, fmt.Errorf("upgraded thinking model only available for LongCat provider")
	}

	// Override model with upgraded thinking model
	upgradedModel := os.Getenv("LONGCAT_MODEL_THINKING_UPGRADED")
	if upgradedModel != "" {
		req.Model = upgradedModel
	}

	return s.ChatCompletion(req)
}

// ParseThinkingResponse extracts the actual content from thinking model responses
func ParseThinkingResponse(resp *AIResponse, provider AIProvider, modelType string) string {
	if provider == ProviderLongCat {
		// Handle LongCat thinking models
		if resp.Choices[0].Message.Content != "" {
			content := resp.Choices[0].Message.Content

			// For LongCat-Flash-Thinking, remove thinking tags
			if strings.Contains(content, "<longcat_think>") {
				// Extract content after thinking tags
				parts := strings.Split(content, "</longcat_think>")
				if len(parts) > 1 {
					return strings.TrimSpace(parts[1])
				}
				// If no closing tag, try to extract after the thinking content
				lines := strings.Split(content, "\n")
				for i, line := range lines {
					if strings.Contains(line, "</longcat_think>") {
						return strings.TrimSpace(strings.Join(lines[i+1:], "\n"))
					}
				}
			}

			return content
		} else if resp.Choices[0].Message.ReasoningContent != "" {
			// For LongCat-Flash-Thinking-2601, check if there's actual content
			// This model puts reasoning in reasoning_content and final answer in content
			// If content is null, we might need to extract from reasoning or return the reasoning itself
			return resp.Choices[0].Message.ReasoningContent
		}
	}

	// For Grok, DeepSeek, Mistral and other providers, or if no special handling needed
	return resp.Choices[0].Message.Content
}

// getThinkingModel returns the appropriate thinking model for the provider
func (s *AIService) getThinkingModel() string {
	switch s.provider {
	case ProviderMistral:
		return os.Getenv("MISTRAL_MODEL_THINKING")
	case ProviderLongCat:
		return os.Getenv("LONGCAT_MODEL_THINKING")
	case ProviderGrok:
		return os.Getenv("GROK_MODEL_THINKING")
	case ProviderDeepSeek:
		return os.Getenv("DEEPSEEK_MODEL_THINKING")
	case ProviderOllama:
		return os.Getenv("OLLAMA_MODEL_THINKING")
	case ProviderOpenRouter:
		return os.Getenv("OPENROUTER_MODEL_THINKING")
	default:
		return ""
	}
}

// callOpenRouter calls the OpenRouter API (OpenAI-compatible)
func (s *AIService) callOpenRouter(req AIRequest) (*AIResponse, error) {
	apiKey := os.Getenv("OPENROUTER_API_KEY")
	baseURL := os.Getenv("OPENROUTER_BASE_URL")
	if baseURL == "" {
		baseURL = "https://openrouter.ai/api"
	}

	model := os.Getenv("OPENROUTER_MODEL")
	if model == "" {
		model = "openrouter/auto"
	}

	if req.Model == "" {
		req.Model = model
	}

	jsonData, err := json.Marshal(req)
	if err != nil {
		return nil, err
	}

	httpReq, err := http.NewRequest("POST", baseURL+"/v1/chat/completions", strings.NewReader(string(jsonData)))
	if err != nil {
		return nil, err
	}

	httpReq.Header.Set("Content-Type", "application/json")
	if apiKey != "" {
		httpReq.Header.Set("Authorization", "Bearer "+apiKey)
	}

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("OpenRouter API returned status %d", resp.StatusCode)
	}

	var orResp AIResponse
	if err := json.NewDecoder(resp.Body).Decode(&orResp); err != nil {
		return nil, err
	}

	return &orResp, nil
}

// callMistral calls Mistral AI API
func (s *AIService) callMistral(req AIRequest) (*AIResponse, error) {
	apiKey := os.Getenv("MISTRAL_API_KEY")
	baseURL := "https://api.mistral.ai/v1"
	model := os.Getenv("MISTRAL_MODEL")
	if model == "" {
		model = "mistral-small-latest"
	}

	if req.Model == "" {
		req.Model = model
	}

	jsonData, err := json.Marshal(req)
	if err != nil {
		return nil, err
	}

	httpReq, err := http.NewRequest("POST", baseURL+"/chat/completions", strings.NewReader(string(jsonData)))
	if err != nil {
		return nil, err
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Mistral API returned status %d", resp.StatusCode)
	}

	var mistralResp AIResponse
	if err := json.NewDecoder(resp.Body).Decode(&mistralResp); err != nil {
		return nil, err
	}

	return &mistralResp, nil
}

// callLongCat calls LongCat AI API
func (s *AIService) callLongCat(req AIRequest) (*AIResponse, error) {
	apiKey := os.Getenv("LONGCAT_API_KEY")

	// Determine format and endpoint
	format := os.Getenv("LONGCAT_FORMAT")
	if format == "" {
		format = "openai" // Default to OpenAI format
	}

	var baseURL string
	switch format {
	case "openai":
		baseURL = "https://api.longcat.chat/openai"
	case "anthropic":
		baseURL = "https://api.longcat.chat/anthropic"
	default:
		baseURL = "https://api.longcat.chat/openai"
	}

	model := os.Getenv("LONGCAT_MODEL")
	if model == "" {
		model = "LongCat-Flash-Chat"
	}

	if req.Model == "" {
		req.Model = model
	}

	var jsonBody []byte
	var httpReq *http.Request
	var err error

	if format == "anthropic" {
		// Convert to Anthropic format
		anthropicReq := map[string]interface{}{
			"model":      req.Model,
			"max_tokens": req.MaxTokens,
			"messages":   req.Messages,
		}
		if req.Temperature > 0 {
			anthropicReq["temperature"] = req.Temperature
		}

		jsonBody, err = json.Marshal(anthropicReq)
		if err != nil {
			return nil, err
		}

		httpReq, err = http.NewRequest("POST", baseURL+"/v1/messages", strings.NewReader(string(jsonBody)))
		if err != nil {
			return nil, err
		}

		httpReq.Header.Set("Content-Type", "application/json")
		httpReq.Header.Set("Authorization", "Bearer "+apiKey)
		httpReq.Header.Set("anthropic-version", "2023-06-01")
	} else {
		// OpenAI format
		jsonBody, err = json.Marshal(req)
		if err != nil {
			return nil, err
		}

		httpReq, err = http.NewRequest("POST", baseURL+"/v1/chat/completions", strings.NewReader(string(jsonBody)))
		if err != nil {
			return nil, err
		}

		httpReq.Header.Set("Content-Type", "application/json")
		httpReq.Header.Set("Authorization", "Bearer "+apiKey)
	}

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("LongCat API returned status %d", resp.StatusCode)
	}

	var longcatResp AIResponse
	if err := json.NewDecoder(resp.Body).Decode(&longcatResp); err != nil {
		return nil, err
	}

	return &longcatResp, nil
}

// callGrok calls Grok AI API
func (s *AIService) callGrok(req AIRequest) (*AIResponse, error) {
	apiKey := os.Getenv("GROK_API_KEY")
	baseURL := os.Getenv("GROK_BASE_URL")
	if baseURL == "" {
		baseURL = "https://api.x.ai/v1"
	}

	model := os.Getenv("GROK_MODEL")
	if model == "" {
		model = "grok-beta"
	}

	if req.Model == "" {
		req.Model = model
	}

	jsonData, err := json.Marshal(req)
	if err != nil {
		return nil, err
	}

	httpReq, err := http.NewRequest("POST", baseURL+"/chat/completions", strings.NewReader(string(jsonData)))
	if err != nil {
		return nil, err
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Grok API returned status %d", resp.StatusCode)
	}

	var grokResp AIResponse
	if err := json.NewDecoder(resp.Body).Decode(&grokResp); err != nil {
		return nil, err
	}

	return &grokResp, nil
}

// callDeepSeek calls DeepSeek API
func (s *AIService) callDeepSeek(req AIRequest) (*AIResponse, error) {
	apiKey := os.Getenv("DEEPSEEK_API_KEY")
	baseURL := os.Getenv("DEEPSEEK_BASE_URL")
	if baseURL == "" {
		baseURL = "https://api.deepseek.com"
	}

	model := os.Getenv("DEEPSEEK_MODEL")
	if model == "" {
		model = "deepseek-chat"
	}

	if req.Model == "" {
		req.Model = model
	}

	jsonData, err := json.Marshal(req)
	if err != nil {
		return nil, err
	}

	httpReq, err := http.NewRequest("POST", baseURL+"/chat/completions", strings.NewReader(string(jsonData)))
	if err != nil {
		return nil, err
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("DeepSeek API returned status %d", resp.StatusCode)
	}

	var deepseekResp AIResponse
	if err := json.NewDecoder(resp.Body).Decode(&deepseekResp); err != nil {
		return nil, err
	}

	return &deepseekResp, nil
}

// callOllama calls Ollama API
func (s *AIService) callOllama(req AIRequest) (*AIResponse, error) {
	baseURL := os.Getenv("OLLAMA_BASE_URL")
	if baseURL == "" {
		baseURL = "http://localhost:11434"
	}

	model := os.Getenv("OLLAMA_MODEL")
	if model == "" {
		model = "llama3.1"
	}

	if req.Model == "" {
		req.Model = model
	}

	jsonData, err := json.Marshal(req)
	if err != nil {
		return nil, err
	}

	httpReq, err := http.NewRequest("POST", baseURL+"/api/chat", strings.NewReader(string(jsonData)))
	if err != nil {
		return nil, err
	}

	httpReq.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 60 * time.Second} // Ollama can be slower
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Ollama API returned status %d", resp.StatusCode)
	}

	var ollamaResp AIResponse
	if err := json.NewDecoder(resp.Body).Decode(&ollamaResp); err != nil {
		return nil, err
	}

	return &ollamaResp, nil
}

// SetProvider changes the AI provider
func (s *AIService) SetProvider(provider AIProvider) {
	s.provider = provider
}

// GetProvider returns the current AI provider
func (s *AIService) GetProvider() AIProvider {
	return s.provider
}
