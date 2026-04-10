package models

import (
	"time"

	"gorm.io/gorm"
)

// GitHubUserAuth stores encrypted GitHub App user tokens for a Trackeep user.
type GitHubUserAuth struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	UserID       uint   `json:"user_id" gorm:"column:user_id;not null;uniqueIndex"`
	GitHubUserID int    `json:"github_user_id" gorm:"column:github_user_id;not null;uniqueIndex"`
	GitHubLogin  string `json:"github_login" gorm:"column:github_login;not null;size:255"`

	AccessToken  string `json:"-" gorm:"type:text;not null"`
	RefreshToken string `json:"-" gorm:"type:text"`

	AccessTokenExpiresAt  *time.Time `json:"access_token_expires_at"`
	RefreshTokenExpiresAt *time.Time `json:"refresh_token_expires_at"`
	LastRefreshedAt       *time.Time `json:"last_refreshed_at"`

	User User `json:"-" gorm:"foreignKey:UserID;-:migration"`
}
