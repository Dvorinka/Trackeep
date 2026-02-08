package models

import (
	"time"

	"gorm.io/gorm"
)

// ChatMessage represents a chat message in the AI conversation
type ChatMessage struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	UserID uint `json:"user_id" gorm:"not null;index"`
	User   User `json:"user,omitempty" gorm:"foreignKey:UserID"`

	Content string `json:"content" gorm:"not null"`
	Role    string `json:"role" gorm:"not null"` // "user" or "assistant"

	// Session tracking
	SessionID string `json:"session_id" gorm:"not null;index"`

	// Metadata
	TokenCount    int       `json:"token_count"`
	ModelUsed     string    `json:"model_used"`
	ProcessingMs  int64     `json:"processing_ms"`
	ContextItems  []string  `json:"context_items" gorm:"serializer:json"` // IDs of referenced items
}

// ChatSession represents a chat session
type ChatSession struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	UserID uint `json:"user_id" gorm:"not null;index"`
	User   User `json:"user,omitempty" gorm:"foreignKey:UserID"`

	Title string `json:"title"`
	
	// Session metadata
	MessageCount int       `json:"message_count" gorm:"default:0"`
	LastMessageAt *time.Time `json:"last_message_at"`
	
	// Context configuration
	IncludeBookmarks bool `json:"include_bookmarks" gorm:"default:true"`
	IncludeTasks     bool `json:"include_tasks" gorm:"default:true"`
	IncludeFiles     bool `json:"include_files" gorm:"default:true"`
	IncludeNotes     bool `json:"include_notes" gorm:"default:true"`
	
	// Relationships
	Messages []ChatMessage `json:"messages,omitempty" gorm:"foreignKey:SessionID"`
}
