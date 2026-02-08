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
	Role     string `json:"role" gorm:"default:user"` // user, admin

	// GitHub OAuth fields
	GitHubID  int    `json:"github_id" gorm:"uniqueIndex"`
	AvatarURL string `json:"avatar_url"`
	Provider  string `json:"provider" gorm:"default:email"` // email, github

	// Preferences
	Theme    string `json:"theme" gorm:"default:dark"`
	Language string `json:"language" gorm:"default:en"`
	Timezone string `json:"timezone" gorm:"default:UTC"`

	// Social Profile Features
	Bio         string       `json:"bio"`
	Location    string       `json:"location"`
	Website     string       `json:"website"`
	Company     string       `json:"company"`
	JobTitle    string       `json:"job_title"`
	Skills      []Skill      `json:"skills,omitempty" gorm:"foreignKey:UserID"`
	Projects    []Project    `json:"projects,omitempty" gorm:"foreignKey:UserID"`
	SocialLinks []SocialLink `json:"social_links,omitempty" gorm:"foreignKey:UserID"`

	// Security & 2FA
	TOTPSecret    string     `json:"-" gorm:"column:totp_secret"` // Encrypted TOTP secret
	TOTPEnabled   bool       `json:"totp_enabled" gorm:"default:false"`
	BackupCodes   string     `json:"-" gorm:"column:backup_codes"` // Encrypted backup codes
	LastLoginAt   *time.Time `json:"last_login_at"`
	LoginAttempts int        `json:"login_attempts" gorm:"default:0"`
	LockedUntil   *time.Time `json:"locked_until"`

	// Privacy Settings
	ProfileVisibility string `json:"profile_visibility" gorm:"default:public"` // public, private, friends
	ShowEmail         bool   `json:"show_email" gorm:"default:false"`
	ShowActivity      bool   `json:"show_activity" gorm:"default:true"`
	AllowMessages     bool   `json:"allow_messages" gorm:"default:true"`

	// Social Stats
	FollowersCount  int `json:"followers_count" gorm:"default:0"`
	FollowingCount  int `json:"following_count" gorm:"default:0"`
	PublicBookmarks int `json:"public_bookmarks" gorm:"default:0"`
	PublicNotes     int `json:"public_notes" gorm:"default:0"`

	// Relationships
	Bookmarks   []Bookmark  `json:"bookmarks,omitempty" gorm:"foreignKey:UserID"`
	Tasks       []Task      `json:"tasks,omitempty" gorm:"foreignKey:UserID"`
	Files       []File      `json:"files,omitempty" gorm:"foreignKey:UserID"`
	Notes       []Note      `json:"notes,omitempty" gorm:"foreignKey:UserID"`
	TimeEntries []TimeEntry `json:"time_entries,omitempty" gorm:"foreignKey:UserID"`
}
