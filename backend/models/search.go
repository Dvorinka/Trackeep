package models

import (
	"time"

	"gorm.io/gorm"
)

// ContentEmbedding stores vector embeddings for semantic search
type ContentEmbedding struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	// Content reference
	ContentType string `json:"content_type" gorm:"not null;index"` // 'bookmark', 'task', 'note', 'file'
	ContentID   uint   `json:"content_id" gorm:"not null;index"`

	// Embedding data
	Embedding   string  `json:"embedding" gorm:"type:text"` // JSON array of floats
	Model       string  `json:"model" gorm:"not null"`       // AI model used
	Dimensions  int     `json:"dimensions" gorm:"not null"`  // Vector dimensions
	TextContent string  `json:"text_content" gorm:"type:text"` // Original text for embedding

	// Metadata
	UserID uint `json:"user_id" gorm:"not null;index"`
	User   User `json:"user,omitempty" gorm:"foreignKey:UserID"`
}

// SavedSearch represents a user's saved search query
type SavedSearch struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	UserID uint `json:"user_id" gorm:"not null;index"`
	User   User `json:"user,omitempty" gorm:"foreignKey:UserID"`

	Name        string          `json:"name" gorm:"not null"`
	Query       string          `json:"query" gorm:"not null"`
	Filters     string          `json:"filters" gorm:"type:json"` // JSON serialized filters
	Alert       bool            `json:"alert" gorm:"default:false"`
	LastRun     *time.Time      `json:"last_run"`
	RunCount    int             `json:"run_count" gorm:"default:0"`
	IsPublic    bool            `json:"is_public" gorm:"default:false"`
	Description string          `json:"description"`
	Tags        []SavedSearchTag `json:"tags,omitempty" gorm:"many2many:saved_search_tags;"`
}

// SavedSearchTag represents tags for saved searches
type SavedSearchTag struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	Name  string `json:"name" gorm:"unique;not null"`
	Color string `json:"color" gorm:"default:#3b82f6"`
}

// SearchAnalytics stores search analytics data
type SearchAnalytics struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	UserID uint `json:"user_id" gorm:"not null;index"`
	User   User `json:"user,omitempty" gorm:"foreignKey:UserID"`

	Query       string    `json:"query" gorm:"not null;index"`
	Filters     string    `json:"filters" gorm:"type:json"`
	ResultsCount int      `json:"results_count"`
	Took        int       `json:"took"` // Time in milliseconds
	ContentType string    `json:"content_type"`
	ClickedResultID *uint  `json:"clicked_result_id"` // Track which result was clicked
	SessionID   string    `json:"session_id" gorm:"index"`
	IPAddress   string    `json:"ip_address"`
	UserAgent   string    `json:"user_agent"`
}

// SearchSuggestion represents search suggestions
type SearchSuggestion struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	Text        string  `json:"text" gorm:"not null;uniqueIndex"`
	Type        string  `json:"type" gorm:"not null"` // 'query', 'tag', 'content'
	Frequency   int     `json:"frequency" gorm:"default:1"`
	LastUsed    time.Time `json:"last_used"`
	ContentType *string `json:"content_type,omitempty"`
	IsPublic    bool    `json:"is_public" gorm:"default:true"`
}

// BeforeCreate hook for ContentEmbedding
func (ce *ContentEmbedding) BeforeCreate(tx *gorm.DB) error {
	// Set default model if not specified
	if ce.Model == "" {
		ce.Model = "text-embedding-ada-002"
	}
	
	// Set default dimensions if not specified
	if ce.Dimensions == 0 {
		ce.Dimensions = 1536 // Default for OpenAI embeddings
	}
	
	return nil
}
