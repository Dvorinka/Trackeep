package models

import (
	"time"

	"gorm.io/gorm"
)

// AISummary represents an AI-generated summary
type AISummary struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	UserID uint `json:"user_id" gorm:"not null;index"`
	User   User `json:"user,omitempty" gorm:"foreignKey:UserID"`

	// Source content
	ContentType string `json:"content_type" gorm:"not null"` // "bookmark", "note", "file"
	ContentID   uint   `json:"content_id" gorm:"not null"`

	// Summary data
	Title       string `json:"title"`
	Summary     string `json:"summary" gorm:"type:text"`
	KeyPoints   string `json:"key_points" gorm:"type:text"`   // JSON array of key points
	Tags        string `json:"tags" gorm:"type:text"`        // JSON array of suggested tags
	ReadTime    int    `json:"read_time"`                    // Estimated reading time in minutes
	Complexity  string `json:"complexity" gorm:"default:'medium'"` // "low", "medium", "high"

	// AI metadata
	ModelUsed     string    `json:"model_used"`
	ProcessingMs  int64     `json:"processing_ms"`
	TokenCount    int       `json:"token_count"`
	Confidence    float64   `json:"confidence"` // AI confidence score 0-1
	LastAnalyzed  time.Time `json:"last_analyzed"`
}

// AITaskSuggestion represents AI-generated task suggestions
type AITaskSuggestion struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	UserID uint `json:"user_id" gorm:"not null;index"`
	User   User `json:"user,omitempty" gorm:"foreignKey:UserID"`

	// Suggestion data
	Title       string `json:"title" gorm:"not null"`
	Description string `json:"description" gorm:"type:text"`
	Priority    string `json:"priority" gorm:"default:'medium'"` // "low", "medium", "high", "urgent"
	Category    string `json:"category"`                        // "work", "personal", "learning", "health", etc.
	
	// Context and reasoning
	Reasoning     string `json:"reasoning" gorm:"type:text"`     // Why this task is suggested
	ContextType   string `json:"context_type"`                   // "calendar", "bookmarks", "deadlines", "habits"
	ContextData   string `json:"context_data" gorm:"type:text"`   // JSON data about context
	Deadline      *time.Time `json:"deadline"`
	EstimatedTime int    `json:"estimated_time"` // in minutes

	// AI metadata
	ModelUsed    string  `json:"model_used"`
	Confidence   float64 `json:"confidence"` // AI confidence score 0-1
	Accepted     bool    `json:"accepted" gorm:"default:false"`
	Dismissed    bool    `json:"dismissed" gorm:"default:false"`
}

// AITagSuggestion represents AI-generated tag suggestions
type AITagSuggestion struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	UserID uint `json:"user_id" gorm:"not null;index"`
	User   User `json:"user,omitempty" gorm:"foreignKey:UserID"`

	// Target content
	ContentType string `json:"content_type" gorm:"not null"` // "bookmark", "note", "task", "file"
	ContentID   uint   `json:"content_id" gorm:"not null"`

	// Tag suggestions
	SuggestedTags string `json:"suggested_tags" gorm:"type:text"` // JSON array of suggested tags
	ExistingTags  string `json:"existing_tags" gorm:"type:text"`  // JSON array of current tags
	Relevance     float64 `json:"relevance"`                     // Relevance score 0-1

	// AI metadata
	ModelUsed   string `json:"model_used"`
	Confidence  float64 `json:"confidence"`
	Applied     bool    `json:"applied" gorm:"default:false"`
	Dismissed   bool    `json:"dismissed" gorm:"default:false"`
}

// AIContentGeneration represents AI-generated content
type AIContentGeneration struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	UserID uint `json:"user_id" gorm:"not null;index"`
	User   User `json:"user,omitempty" gorm:"foreignKey:UserID"`

	// Generation request
	Prompt      string `json:"prompt" gorm:"type:text"`
	ContentType string `json:"content_type" gorm:"not null"` // "blog", "code", "email", "summary", "outline"
	Context     string `json:"context" gorm:"type:text"`     // Additional context for generation

	// Generated content
	Title       string `json:"title"`
	Content     string `json:"content" gorm:"type:text"`
	WordCount   int    `json:"word_count"`
	ReadTime    int    `json:"read_time"` // Estimated reading time in minutes

	// AI metadata
	ModelUsed     string  `json:"model_used"`
	ProcessingMs  int64   `json:"processing_ms"`
	TokenCount    int     `json:"token_count"`
	Confidence    float64 `json:"confidence"`
	Temperature   float64 `json:"temperature"`
	Used          bool    `json:"used" gorm:"default:false"`
	Rating        *int    `json:"rating"` // User rating 1-5
	Feedback      string  `json:"feedback" gorm:"type:text"`
}

// AICodeReview represents AI code review analysis
type AICodeReview struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	UserID uint `json:"user_id" gorm:"not null;index"`
	User   User `json:"user,omitempty" gorm:"foreignKey:UserID"`

	// Code context
	RepositoryURL string `json:"repository_url"`
	CommitHash    string `json:"commit_hash"`
	FilePath      string `json:"file_path"`
	PRNumber      int    `json:"pr_number"`
	BranchName    string `json:"branch_name"`

	// Review data
	OriginalCode  string `json:"original_code" gorm:"type:text"`
	Suggestions    string `json:"suggestions" gorm:"type:text"`    // JSON array of suggestions
	Issues         string `json:"issues" gorm:"type:text"`         // JSON array of issues found
	Score          int    `json:"score" gorm:"default:0"`          // Code quality score 0-100
	SecurityIssues string `json:"security_issues" gorm:"type:text"` // JSON array of security issues
	Performance    string `json:"performance" gorm:"type:text"`    // Performance suggestions

	// AI metadata
	ModelUsed    string  `json:"model_used"`
	Confidence   float64 `json:"confidence"`
	ProcessingMs int64   `json:"processing_ms"`
	TokenCount   int     `json:"token_count"`
	Applied      bool    `json:"applied" gorm:"default:false"`
}

// AILearningRecommendation represents AI-generated learning recommendations
type AILearningRecommendation struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	UserID uint `json:"user_id" gorm:"not null;index"`
	User   User `json:"user,omitempty" gorm:"foreignKey:UserID"`

	// Recommendation data
	Title           string `json:"title" gorm:"not null"`
	Description     string `json:"description" gorm:"type:text"`
	Category        string `json:"category"`        // "programming", "design", "business", etc.
	Difficulty      string `json:"difficulty"`      // "beginner", "intermediate", "advanced"
	EstimatedHours  int    `json:"estimated_hours"`  // Estimated time to complete
	Prerequisites   string `json:"prerequisites" gorm:"type:text"` // JSON array of prerequisites
	Resources       string `json:"resources" gorm:"type:text"`     // JSON array of learning resources
	CourseID        *uint  `json:"course_id"`        // Link to existing course if applicable

	// Personalization
	Reasoning       string  `json:"reasoning" gorm:"type:text"` // Why this is recommended
	RelevanceScore  float64 `json:"relevance_score"`           // How relevant to user 0-1
	CareerImpact    string  `json:"career_impact"`             // Career impact description
	SkillGained     string  `json:"skill_gained"`              // Primary skill gained

	// AI metadata
	ModelUsed    string  `json:"model_used"`
	Confidence   float64 `json:"confidence"`
	Started      bool    `json:"started" gorm:"default:false"`
	Completed    bool    `json:"completed" gorm:"default:false"`
	Rating       *int    `json:"rating"` // User rating 1-5
	Feedback     string  `json:"feedback" gorm:"type:text"`
}
