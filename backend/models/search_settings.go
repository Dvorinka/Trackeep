package models

import (
	"time"

	"gorm.io/gorm"
)

// UserSearchSettings stores user-specific search API configurations
type UserSearchSettings struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	UserID uint `json:"user_id" gorm:"not null;uniqueIndex"`
	User   User `json:"user,omitempty" gorm:"foreignKey:UserID"`

	// Brave Search Settings
	BraveAPIKey        string `json:"-" gorm:"column:brave_api_key"` // Encrypted
	BraveSearchBaseURL string `json:"brave_search_base_url" gorm:"default:https://api.search.brave.com/res/v1/web/search"`

	// Serper (Google) Search Settings
	SerperAPIKey  string `json:"-" gorm:"column:serper_api_key"` // Encrypted
	SerperBaseURL string `json:"serper_base_url" gorm:"default:https://google.serper.dev/search"`

	// Search Configuration
	SearchAPIProvider  string `json:"search_api_provider" gorm:"default:brave"` // brave, serper
	SearchResultsLimit int    `json:"search_results_limit" gorm:"default:10"`
	SearchCacheTTL     int    `json:"search_cache_ttl" gorm:"default:300"`  // seconds
	SearchRateLimit    int    `json:"search_rate_limit" gorm:"default:100"` // requests per minute
}

// GetUserSearchSettings retrieves search settings for a user
func GetUserSearchSettings(userID uint) (*UserSearchSettings, error) {
	var settings UserSearchSettings
	err := DB.Where("user_id = ?", userID).First(&settings).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			// Create default settings
			settings = UserSearchSettings{
				UserID:             userID,
				BraveSearchBaseURL: "https://api.search.brave.com/res/v1/web/search",
				SerperBaseURL:      "https://google.serper.dev/search",
				SearchAPIProvider:  "brave",
				SearchResultsLimit: 10,
				SearchCacheTTL:     300,
				SearchRateLimit:    100,
			}
			// Save defaults
			if err := DB.Create(&settings).Error; err != nil {
				return nil, err
			}
			return &settings, nil
		}
		return nil, err
	}
	return &settings, nil
}

// SaveUserSearchSettings saves search settings for a user
func SaveUserSearchSettings(userID uint, settings *UserSearchSettings) error {
	settings.UserID = userID
	return DB.Where("user_id = ?", userID).Assign(settings).FirstOrCreate(settings).Error
}
