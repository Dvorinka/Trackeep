package models

import (
	"time"

	"gorm.io/gorm"
)

// UserAISettings stores user-specific AI provider configurations
type UserAISettings struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	UserID uint `json:"user_id" gorm:"not null;uniqueIndex"`
	User   User `json:"user,omitempty" gorm:"foreignKey:UserID"`

	// Mistral Settings
	MistralEnabled       *bool  `json:"mistral_enabled" gorm:"default:false"`
	MistralAPIKey        string `json:"-" gorm:"column:mistral_api_key"` // Encrypted
	MistralModel         string `json:"mistral_model" gorm:"default:mistral-small-latest"`
	MistralModelThinking string `json:"mistral_model_thinking" gorm:"default:mistral-large-latest"`

	// Grok Settings
	GrokEnabled       *bool  `json:"grok_enabled" gorm:"default:false"`
	GrokAPIKey        string `json:"-" gorm:"column:grok_api_key"` // Encrypted
	GrokBaseURL       string `json:"grok_base_url" gorm:"default:https://api.x.ai/v1"`
	GrokModel         string `json:"grok_model" gorm:"default:grok-4-1-fast-non-reasoning-latest"`
	GrokModelThinking string `json:"grok_model_thinking" gorm:"default:grok-4-1-fast-reasoning-latest"`

	// DeepSeek Settings
	DeepSeekEnabled       *bool  `json:"deepseek_enabled" gorm:"default:false"`
	DeepSeekAPIKey        string `json:"-" gorm:"column:deepseek_api_key"` // Encrypted
	DeepSeekBaseURL       string `json:"deepseek_base_url" gorm:"default:https://api.deepseek.com"`
	DeepSeekModel         string `json:"deepseek_model" gorm:"default:deepseek-chat"`
	DeepSeekModelThinking string `json:"deepseek_model_thinking" gorm:"default:deepseek-reasoner"`

	// Ollama Settings
	OllamaEnabled       *bool  `json:"ollama_enabled" gorm:"default:false"`
	OllamaBaseURL       string `json:"ollama_base_url" gorm:"default:http://localhost:11434"`
	OllamaModel         string `json:"ollama_model" gorm:"default:llama3.1"`
	OllamaModelThinking string `json:"ollama_model_thinking" gorm:"default:llama3.1"`

	// LongCat Settings
	LongCatEnabled               *bool  `json:"longcat_enabled" gorm:"default:false"`
	LongCatAPIKey                string `json:"-" gorm:"column:longcat_api_key"` // Encrypted
	LongCatBaseURL               string `json:"longcat_base_url" gorm:"default:https://api.longcat.chat"`
	LongCatOpenAIEndpoint        string `json:"longcat_openai_endpoint" gorm:"default:https://api.longcat.chat/openai"`
	LongCatAnthropicEndpoint     string `json:"longcat_anthropic_endpoint" gorm:"default:https://api.longcat.chat/anthropic"`
	LongCatModel                 string `json:"longcat_model" gorm:"default:LongCat-Flash-Chat"`
	LongCatModelThinking         string `json:"longcat_model_thinking" gorm:"default:LongCat-Flash-Thinking"`
	LongCatModelThinkingUpgraded string `json:"longcat_model_thinking_upgraded" gorm:"default:LongCat-Flash-Thinking-2601"`
	LongCatFormat                string `json:"longcat_format" gorm:"default:openai"`

	// OpenRouter Settings
	OpenRouterEnabled       *bool  `json:"openrouter_enabled" gorm:"default:false"`
	OpenRouterAPIKey        string `json:"-" gorm:"column:openrouter_api_key"` // Encrypted
	OpenRouterBaseURL       string `json:"openrouter_base_url" gorm:"default:https://openrouter.ai/api"`
	OpenRouterModel         string `json:"openrouter_model" gorm:"default:openrouter/auto"`
	OpenRouterModelThinking string `json:"openrouter_model_thinking" gorm:"default:openrouter/auto"`
}
