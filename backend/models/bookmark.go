package models

import (
	"time"

	"gorm.io/gorm"
)

// Bookmark represents a saved bookmark/link
type Bookmark struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	UserID uint `json:"user_id" gorm:"not null;index"`
	User   User `json:"user,omitempty" gorm:"foreignKey:UserID"`

	Title       string `json:"title" gorm:"not null"`
	URL         string `json:"url" gorm:"not null"`
	Description string `json:"description"`
	
	// Organization
	Tags  []Tag `json:"tags,omitempty" gorm:"many2many:bookmark_tags;"`
	
	// Metadata
	Favicon    string `json:"favicon"`
	Screenshot string `json:"screenshot"`
	IsRead     bool   `json:"is_read" gorm:"default:false"`
	IsFavorite bool   `json:"is_favorite" gorm:"default:false"`
	
	// Content extraction
	Content     string `json:"content"`
	Author      string `json:"author"`
	PublishedAt *time.Time `json:"published_at"`
	
	// Reading tracking
	ReadAt *time.Time `json:"read_at"`
}
