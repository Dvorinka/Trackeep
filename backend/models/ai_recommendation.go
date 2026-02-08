package models

import (
	"time"

	"gorm.io/gorm"
)

// AIRecommendation represents an AI-generated recommendation
type AIRecommendation struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	// User information
	UserID uint `json:"user_id" gorm:"not null;index"`
	User   User `json:"user,omitempty" gorm:"foreignKey:UserID"`

	// Recommendation details
	RecommendationType string `json:"recommendation_type" gorm:"not null;index"` // content, task, learning, connection
	ContentType       string `json:"content_type" gorm:"index"`                // bookmark, note, task, course, user
	ContentID         *uint `json:"content_id,omitempty" gorm:"index"`
	Title             string `json:"title" gorm:"not null"`
	Description       string `json:"description"`
	Reasoning         string `json:"reasoning"` // Why this was recommended

	// Content details (for display without additional queries)
	ContentTitle   string `json:"content_title"`
	ContentURL     string `json:"content_url"`
	ContentPreview string `json:"content_preview"`
	AuthorName     string `json:"author_name"`
	Tags           string `json:"tags" gorm:"serializer:json"`

	// Recommendation metadata
	Confidence    float64 `json:"confidence" gorm:"default:0.0"` // 0.0 to 1.0
	Priority      string  `json:"priority" gorm:"default:medium"` // low, medium, high
	Category      string  `json:"category"`                       // productivity, learning, collaboration, etc.
	ExpiresAt     *time.Time `json:"expires_at"`
	Clicked       bool      `json:"clicked" gorm:"default:false"`
	Dismissed     bool      `json:"dismissed" gorm:"default:false"`
	ClickedAt     *time.Time `json:"clicked_at"`
	DismissedAt   *time.Time `json:"dismissed_at"`

	// Feedback
	Feedback     string     `json:"feedback"` // helpful, not_helpful, irrelevant
	FeedbackAt   *time.Time `json:"feedback_at"`
	FeedbackText string     `json:"feedback_text"`

	// Source information
	SourceModel   string `json:"source_model"`   // Which AI model generated this
	SourceVersion string `json:"source_version"` // Version of the recommendation engine
	TrainingData  string `json:"training_data"`  // What data was used for training
}

// UserPreference represents user preferences for recommendations
type UserPreference struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	// User information
	UserID uint `json:"user_id" gorm:"not null;uniqueIndex"`
	User   User `json:"user,omitempty" gorm:"foreignKey:UserID"`

	// Recommendation preferences
	EnableRecommendations    bool     `json:"enable_recommendations" gorm:"default:true"`
	ContentRecommendations   bool     `json:"content_recommendations" gorm:"default:true"`
	TaskRecommendations      bool     `json:"task_recommendations" gorm:"default:true"`
	LearningRecommendations  bool     `json:"learning_recommendations" gorm:"default:true"`
	ConnectionRecommendations bool     `json:"connection_recommendations" gorm:"default:false"`
	
	// Frequency and timing
	MaxRecommendationsPerDay int      `json:"max_recommendations_per_day" gorm:"default:5"`
	PreferredCategories      []string `json:"preferred_categories" gorm:"serializer:json"`
	BlockedCategories        []string `json:"blocked_categories" gorm:"serializer:json"`
	PreferredContentTypes    []string `json:"preferred_content_types" gorm:"serializer:json"`
	
	// Quality thresholds
	MinConfidenceThreshold float64 `json:"min_confidence_threshold" gorm:"default:0.6"`
	MaxAgeHours           int     `json:"max_age_hours" gorm:"default:168"` // 1 week

	// Learning and adaptation
	EnablePersonalization bool `json:"enable_personalization" gorm:"default:true"`
	EnableFeedbackLearning bool `json:"enable_feedback_learning" gorm:"default:true"`
	LastRecommendationAt   *time.Time `json:"last_recommendation_at"`
}

// RecommendationInteraction tracks user interactions with recommendations
type RecommendationInteraction struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	// Related entities
	UserID          uint              `json:"user_id" gorm:"not null;index"`
	User            User              `json:"user,omitempty" gorm:"foreignKey:UserID"`
	RecommendationID uint             `json:"recommendation_id" gorm:"not null;index"`
	Recommendation  AIRecommendation  `json:"recommendation,omitempty" gorm:"foreignKey:RecommendationID"`

	// Interaction details
	InteractionType string `json:"interaction_type" gorm:"not null;index"` // view, click, dismiss, feedback, share
	InteractionData string `json:"interaction_data" gorm:"serializer:json"` // Additional context
	Duration        int    `json:"duration"` // Time spent in seconds (for views)
	Context         string `json:"context"`  // Where the interaction occurred (dashboard, search, etc.)

	// Machine learning features
	UserActivityBefore string `json:"user_activity_before"` // What user was doing before
	UserActivityAfter  string `json:"user_activity_after"`  // What user did after
	SessionID          string `json:"session_id"`
	DeviceType         string `json:"device_type"`
}

// TableName returns the table name for AIRecommendation
func (AIRecommendation) TableName() string {
	return "ai_recommendations"
}

// TableName returns the table name for UserPreference
func (UserPreference) TableName() string {
	return "user_preferences"
}

// TableName returns the table name for RecommendationInteraction
func (RecommendationInteraction) TableName() string {
	return "recommendation_interactions"
}

// BeforeCreate hooks
func (r *AIRecommendation) BeforeCreate(tx *gorm.DB) error {
	if r.Priority == "" {
		r.Priority = "medium"
	}
	if r.Confidence == 0 {
		r.Confidence = 0.5
	}
	return nil
}

func (up *UserPreference) BeforeCreate(tx *gorm.DB) error {
	if up.MaxRecommendationsPerDay == 0 {
		up.MaxRecommendationsPerDay = 5
	}
	if up.MinConfidenceThreshold == 0 {
		up.MinConfidenceThreshold = 0.6
	}
	if up.MaxAgeHours == 0 {
		up.MaxAgeHours = 168 // 1 week
	}
	return nil
}
