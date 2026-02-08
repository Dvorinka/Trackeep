package models

import (
	"time"
)

// YouTubeChannelCache represents cached YouTube channel data
type YouTubeChannelCache struct {
	ID          int       `json:"id" gorm:"primaryKey"`
	ChannelID   string    `json:"channel_id" gorm:"uniqueIndex"`
	ChannelName string    `json:"channel_name"`
	ChannelURL  string    `json:"channel_url"`
	Videos      string    `json:"videos" gorm:"type:text"` // JSON array of videos
	LastUpdated time.Time `json:"last_updated"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// TableName specifies the table name for YouTubeChannelCache
func (YouTubeChannelCache) TableName() string {
	return "youtube_channel_cache"
}

// IsExpired checks if the cache is older than 2 hours
func (y *YouTubeChannelCache) IsExpired() bool {
	return time.Since(y.LastUpdated) > 2*time.Hour
}
