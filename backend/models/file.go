package models

import (
	"time"

	"gorm.io/gorm"
)

// FileType represents the type of file
type FileType string

const (
	FileTypeDocument FileType = "document"
	FileTypeImage    FileType = "image"
	FileTypeVideo    FileType = "video"
	FileTypeAudio    FileType = "audio"
	FileTypeArchive  FileType = "archive"
	FileTypeOther    FileType = "other"
)

// File represents a stored file
type File struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	UserID uint `json:"user_id" gorm:"not null;index"`
	User   User `json:"user,omitempty" gorm:"foreignKey:UserID"`

	OriginalName string    `json:"original_name" gorm:"not null"`
	FileName     string    `json:"file_name" gorm:"not null;uniqueIndex"`
	FilePath     string    `json:"file_path" gorm:"not null"`
	FileSize     int64     `json:"file_size" gorm:"not null"`
	MimeType     string    `json:"mime_type" gorm:"not null"`
	FileType     FileType  `json:"file_type" gorm:"not null"`
	
	// Organization
	Tags []Tag `json:"tags,omitempty" gorm:"many2many:file_tags;"`
	
	// Metadata
	Description string `json:"description"`
	IsPublic     bool   `json:"is_public" gorm:"default:false"`
	
	// Preview/Thumbnail
	ThumbnailPath string `json:"thumbnail_path"`
	PreviewPath   string `json:"preview_path"`
	
	// Content extraction (for documents)
	Content string `json:"content"`
}
