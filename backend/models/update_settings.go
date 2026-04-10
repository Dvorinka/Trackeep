package models

import (
	"time"

	"github.com/trackeep/backend/config"
	"gorm.io/gorm"
)

// UserUpdateSettings stores user-specific update and OAuth configurations
type UserUpdateSettings struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	UserID uint `json:"user_id" gorm:"not null;uniqueIndex"`
	User   User `json:"user,omitempty" gorm:"foreignKey:UserID"`

	// OAuth Service Configuration
	OAuthServiceURL string `json:"oauth_service_url" gorm:"default:https://hq.trackeep.org"`

	// Update Configuration
	AutoUpdateCheck     bool   `json:"auto_update_check" gorm:"default:false"`
	UpdateCheckInterval string `json:"update_check_interval" gorm:"default:24h"` // 1h, 6h, 12h, 24h, 168h
	PrereleaseUpdates   bool   `json:"prerelease_updates" gorm:"default:false"`
}

// GetUserUpdateSettings retrieves update settings for a user
func GetUserUpdateSettings(userID uint) (*UserUpdateSettings, error) {
	var settings UserUpdateSettings
	err := DB.Where("user_id = ?", userID).First(&settings).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			// Create default settings
			settings = UserUpdateSettings{
				UserID:              userID,
				OAuthServiceURL:     config.ControlServiceURL,
				AutoUpdateCheck:     false,
				UpdateCheckInterval: "24h",
				PrereleaseUpdates:   false,
			}
			// Save defaults
			if err := DB.Create(&settings).Error; err != nil {
				return nil, err
			}
			return &settings, nil
		}
		return nil, err
	}

	if settings.OAuthServiceURL != config.ControlServiceURL {
		settings.OAuthServiceURL = config.ControlServiceURL
		if err := DB.Model(&settings).Update("oauth_service_url", config.ControlServiceURL).Error; err != nil {
			return nil, err
		}
	}

	return &settings, nil
}

// SaveUserUpdateSettings saves update settings for a user
func SaveUserUpdateSettings(userID uint, settings *UserUpdateSettings) error {
	settings.UserID = userID
	return DB.Where("user_id = ?", userID).Assign(settings).FirstOrCreate(settings).Error
}
