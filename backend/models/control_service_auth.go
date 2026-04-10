package models

import (
	"time"

	"gorm.io/gorm"
)

// ControlServiceSession stores the opaque hq.trackeep.org token for a Trackeep user.
type ControlServiceSession struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	UserID           uint   `json:"user_id" gorm:"column:user_id;not null;uniqueIndex"`
	ControllerUserID int    `json:"controller_user_id" gorm:"column:controller_user_id;not null;index"`
	GitHubID         int    `json:"github_id" gorm:"column:github_id;index"`
	Username         string `json:"username" gorm:"size:255"`
	Email            string `json:"email" gorm:"size:255"`
	Token            string `json:"-" gorm:"type:text;not null"`

	LastValidatedAt *time.Time `json:"last_validated_at"`

	User User `json:"-" gorm:"foreignKey:UserID;-:migration"`
}
