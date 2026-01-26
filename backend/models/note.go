package models

import (
	"time"

	"gorm.io/gorm"
)

// Note represents a note or document
type Note struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	UserID uint `json:"user_id" gorm:"not null;index"`
	User   User `json:"user,omitempty" gorm:"foreignKey:UserID"`

	Title string `json:"title" gorm:"not null"`
	Content string `json:"content" gorm:"type:text"`
	
	// Organization
	Tags []Tag `json:"tags,omitempty" gorm:"many2many:note_tags;"`
	
	// Metadata
	Description string `json:"description"`
	IsPublic    bool   `json:"is_public" gorm:"default:false"`
	IsPinned    bool   `json:"is_pinned" gorm:"default:false"`
	
	// Formatting
	ContentType string `json:"content_type" gorm:"default:markdown"` // markdown, html, plain
	
	// Relationships
	ParentNoteID *uint `json:"parent_note_id,omitempty"`
	ParentNote   *Note `json:"parent_note,omitempty" gorm:"foreignKey:ParentNoteID"`
	Subnotes     []Note `json:"subnotes,omitempty" gorm:"foreignKey:ParentNoteID"`
}
