package models

import (
	"time"
)

// VideoBookmark represents a bookmarked YouTube video
type VideoBookmark struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	VideoID     string    `json:"video_id" gorm:"uniqueIndex;not null"` // YouTube video ID
	Title       string    `json:"title" gorm:"not null"`
	Channel     string    `json:"channel" gorm:"not null"`
	Thumbnail   string    `json:"thumbnail" gorm:"not null"`
	URL         string    `json:"url" gorm:"not null"`
	UserID      uint      `json:"user_id" gorm:"not null"` // Foreign key to User
	Description string    `json:"description" gorm:"type:text"`
	Tags        string    `json:"tags" gorm:"type:text"` // Comma-separated tags
	IsWatched   bool      `json:"is_watched" gorm:"default:false"`
	IsFavorite  bool      `json:"is_favorite" gorm:"default:false"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// TableName specifies the table name for VideoBookmark
func (VideoBookmark) TableName() string {
	return "video_bookmarks"
}
