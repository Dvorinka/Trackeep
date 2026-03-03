package models

import (
	"time"
)

// APIKey represents an API key for browser extension
type APIKey struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	Name        string    `json:"name" gorm:"not null"`
	Key         string    `json:"key" gorm:"not null;uniqueIndex"`
	UserID      uint      `json:"user_id" gorm:"not null"`
	Permissions []string  `json:"permissions" gorm:"serializer:json"`
	IsActive    bool      `json:"is_active" gorm:"default:true"`
	LastUsed    *time.Time `json:"last_used,omitempty" gorm:"not null"`
	CreatedAt   time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt   time.Time `json:"updated_at" gorm:"autoUpdateTime"`
	ExpiresAt   *time.Time `json:"expires_at,omitempty" gorm:"not null"`
	User        User      `json:"user,omitempty" gorm:"foreignKey:UserID"`
}

// BrowserExtension represents a browser extension registration
type BrowserExtension struct {
	ID           uint      `json:"id" gorm:"primaryKey"`
	UserID       uint      `json:"user_id" gorm:"not null"`
	ExtensionID  string    `json:"extension_id" gorm:"not null"`
	Name         string    `json:"name" gorm:"not null"`
	IsActive     bool      `json:"is_active" gorm:"default:true"`
	LastSeen     *time.Time `json:"last_seen,omitempty" gorm:"not null"`
	CreatedAt     time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt     time.Time `json:"updated_at" gorm:"autoUpdateTime"`
	User         User      `json:"user,omitempty" gorm:"foreignKey:UserID"`
}
