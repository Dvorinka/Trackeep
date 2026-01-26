package models

import (
	"time"

	"gorm.io/gorm"
)

// User represents a user in the system
type User struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	Email    string `json:"email" gorm:"uniqueIndex;not null"`
	Username string `json:"username" gorm:"uniqueIndex;not null"`
	Password string `json:"-" gorm:"not null"` // Hashed password
	FullName string `json:"full_name"`
	
	// Preferences
	Theme       string `json:"theme" gorm:"default:dark"`
	Language    string `json:"language" gorm:"default:en"`
	Timezone    string `json:"timezone" gorm:"default:UTC"`
	
	// Relationships
	Bookmarks []Bookmark `json:"bookmarks,omitempty" gorm:"foreignKey:UserID"`
	Tasks     []Task     `json:"tasks,omitempty" gorm:"foreignKey:UserID"`
	Files     []File     `json:"files,omitempty" gorm:"foreignKey:UserID"`
	Notes     []Note     `json:"notes,omitempty" gorm:"foreignKey:UserID"`
}
