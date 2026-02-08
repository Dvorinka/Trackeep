package models

import (
	"time"

	"gorm.io/gorm"
)

// Course represents a Zero to Mastery course
type Course struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	// Basic course information
	Title       string `json:"title" gorm:"not null"`
	Description string `json:"description" gorm:"type:text"`
	Slug        string `json:"slug" gorm:"uniqueIndex;not null"` // URL-friendly course identifier
	URL         string `json:"url" gorm:"not null"`              // ZTM course URL
	Thumbnail   string `json:"thumbnail"`
	Instructor  string `json:"instructor"`

	// Course metadata
	Duration      string  `json:"duration"`       // e.g., "32 Hours"
	LessonsCount  int     `json:"lessons_count"`  // number of lessons
	ModuleCount   int     `json:"module_count"`   // number of modules
	Level         string  `json:"level"`          // beginner, intermediate, advanced
	Category      string  `json:"category"`       // programming, design, cybersecurity, etc.
	Price         float64 `json:"price"`          // course price
	Rating        float64 `json:"rating"`         // average rating
	StudentsCount int     `json:"students_count"` // number of enrolled students

	// Course content
	Prerequisites []string `json:"prerequisites" gorm:"serializer:json"`
	WhatYouLearn  []string `json:"what_you_learn" gorm:"serializer:json"`
	Topics        []string `json:"topics" gorm:"serializer:json"`
	ToolsAndTech  []string `json:"tools_and_tech" gorm:"serializer:json"`

	// ZTM specific data
	ZTMCourseID    string     `json:"ztm_course_id"` // internal ZTM course ID
	ZTMCategory    string     `json:"ztm_category"`  // ZTM category classification
	IsZTMCourse    bool       `json:"is_ztm_course" gorm:"default:true"`
	LastUpdatedZTM *time.Time `json:"last_updated_ztm"` // last sync with ZTM

	// Status
	IsActive   bool `json:"is_active" gorm:"default:true"`
	IsFeatured bool `json:"is_featured" gorm:"default:false"`
}

// LearningPathCourse represents the relationship between learning paths and courses
type LearningPathCourse struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	LearningPathID uint         `json:"learning_path_id" gorm:"not null;index"`
	LearningPath   LearningPath `json:"learning_path,omitempty" gorm:"foreignKey:LearningPathID"`

	CourseID uint   `json:"course_id" gorm:"not null;index"`
	Course   Course `json:"course,omitempty" gorm:"foreignKey:CourseID"`

	// Relationship metadata
	Order          int    `json:"order" gorm:"not null"`           // order in the learning path
	IsRequired     bool   `json:"is_required" gorm:"default:true"` // whether this course is required
	Notes          string `json:"notes" gorm:"type:text"`          // additional notes about why this course is included
	EstimatedWeeks int    `json:"estimated_weeks"`                 // estimated weeks to complete this course
}
