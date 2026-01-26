package models

import (
	"time"

	"gorm.io/gorm"
)

// Tag represents a tag for organizing content
type Tag struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	UserID uint `json:"user_id" gorm:"not null;index"`
	User   User `json:"user,omitempty" gorm:"foreignKey:UserID"`

	Name        string `json:"name" gorm:"not null;uniqueIndex"`
	Description string `json:"description"`
	Color       string `json:"color" gorm:"default:#39b9ff"` // Go-inspired blue
	
	// Usage tracking
	UsageCount int `json:"usage_count" gorm:"default:0"`
	
	// Relationships
	Bookmarks []Bookmark `json:"bookmarks,omitempty" gorm:"many2many:bookmark_tags;"`
	Tasks     []Task     `json:"tasks,omitempty" gorm:"many2many:task_tags;"`
	Files     []File     `json:"files,omitempty" gorm:"many2many:file_tags;"`
	Notes     []Note     `json:"notes,omitempty" gorm:"many2many:note_tags;"`
}
