package models

import (
	"time"

	"gorm.io/gorm"
)

// LearningPath represents a structured learning path
type LearningPath struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	// Basic information
	Title       string `json:"title" gorm:"not null"`
	Description string `json:"description"`
	Category    string `json:"category" gorm:"not null"`           // programming, design, business, etc.
	Difficulty  string `json:"difficulty" gorm:"default:beginner"` // beginner, intermediate, advanced

	// Metadata
	Duration    string `json:"duration"`  // estimated time to complete
	Thumbnail   string `json:"thumbnail"` // cover image
	IsPublished bool   `json:"is_published" gorm:"default:false"`
	IsFeatured  bool   `json:"is_featured" gorm:"default:false"`

	// Creator information
	CreatorID uint `json:"creator_id" gorm:"not null;index"`
	Creator   User `json:"creator,omitempty" gorm:"foreignKey:CreatorID"`

	// Relationships
	Modules     []LearningModule     `json:"modules,omitempty" gorm:"foreignKey:LearningPathID"`
	Courses     []LearningPathCourse `json:"courses,omitempty" gorm:"foreignKey:LearningPathID"`
	Tags        []Tag                `json:"tags,omitempty" gorm:"many2many:learning_path_tags;"`
	Enrollments []Enrollment         `json:"enrollments,omitempty" gorm:"foreignKey:LearningPathID"`

	// Statistics
	EnrollmentCount int     `json:"enrollment_count" gorm:"default:0"`
	Rating          float64 `json:"rating" gorm:"default:0"`
	ReviewCount     int     `json:"review_count" gorm:"default:0"`
}

// LearningModule represents a module within a learning path
type LearningModule struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	// Basic information
	LearningPathID uint         `json:"learning_path_id" gorm:"not null;index"`
	LearningPath   LearningPath `json:"learning_path,omitempty" gorm:"foreignKey:LearningPathID"`

	Title       string `json:"title" gorm:"not null"`
	Description string `json:"description"`
	Content     string `json:"content" gorm:"type:text"`
	Order       int    `json:"order" gorm:"not null"`

	// Module type
	ModuleType string `json:"module_type" gorm:"default:lesson"` // lesson, project, quiz, video, reading

	// Resources
	Resources []ModuleResource `json:"resources,omitempty" gorm:"foreignKey:LearningModuleID"`

	// Completion tracking
	EstimatedDuration string `json:"estimated_duration"`
	IsRequired        bool   `json:"is_required" gorm:"default:true"`
}

// ModuleResource represents a resource within a learning module
type ModuleResource struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	LearningModuleID uint           `json:"learning_module_id" gorm:"not null;index"`
	LearningModule   LearningModule `json:"learning_module,omitempty" gorm:"foreignKey:LearningModuleID"`

	Title       string `json:"title" gorm:"not null"`
	URL         string `json:"url"`
	Type        string `json:"type" gorm:"not null"` // video, article, book, tool, download
	Description string `json:"description"`
	Order       int    `json:"order" gorm:"not null"`

	// External resource metadata
	Thumbnail  string `json:"thumbnail"`
	Duration   string `json:"duration"`
	IsExternal bool   `json:"is_external" gorm:"default:true"`
}

// Enrollment represents a user's enrollment in a learning path
type Enrollment struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	UserID         uint         `json:"user_id" gorm:"not null;index"`
	User           User         `json:"user,omitempty" gorm:"foreignKey:UserID"`
	LearningPathID uint         `json:"learning_path_id" gorm:"not null;index"`
	LearningPath   LearningPath `json:"learning_path,omitempty" gorm:"foreignKey:LearningPathID"`
	CourseID       *uint        `json:"course_id,omitempty"` // for direct course enrollment
	Course         *Course      `json:"course,omitempty" gorm:"foreignKey:CourseID"`

	// Enrollment status
	Status      string     `json:"status" gorm:"default:enrolled"` // enrolled, in_progress, completed, dropped
	StartedAt   *time.Time `json:"started_at"`
	CompletedAt *time.Time `json:"completed_at"`

	// Progress tracking
	Progress         float64 `json:"progress" gorm:"default:0"` // percentage 0-100
	CompletedModules []uint  `json:"completed_modules" gorm:"serializer:json"`
	CurrentModuleID  *uint   `json:"current_module_id"`

	// User feedback
	Rating     *float64   `json:"rating"`
	Review     string     `json:"review"`
	ReviewDate *time.Time `json:"review_date"`
}

// Progress represents a user's progress in a specific module
type Progress struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	UserID           uint `json:"user_id" gorm:"not null;index"`
	EnrollmentID     uint `json:"enrollment_id" gorm:"not null;index"`
	LearningModuleID uint `json:"learning_module_id" gorm:"not null;index"`

	// Progress status
	Status      string     `json:"status" gorm:"default:not_started"` // not_started, in_progress, completed
	StartedAt   *time.Time `json:"started_at"`
	CompletedAt *time.Time `json:"completed_at"`

	// Progress details
	TimeSpent    int    `json:"time_spent"`                     // minutes
	ProgressData string `json:"progress_data" gorm:"type:json"` // additional progress data
}
