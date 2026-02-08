package models

import (
	"time"

	"gorm.io/gorm"
)

// Skill represents a user's skill
type Skill struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	UserID uint   `json:"user_id" gorm:"not null;index"`
	Name   string `json:"name" gorm:"not null"`
	Level  string `json:"level" gorm:"default:intermediate"` // beginner, intermediate, advanced, expert
	Category string `json:"category"` // programming, design, business, etc.
	Endorsements int `json:"endorsements" gorm:"default:0"`
	Verified bool `json:"verified" gorm:"default:false"`

	User User `json:"user,omitempty" gorm:"foreignKey:UserID"`
}

// Project represents a user's project showcase
type Project struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	UserID          uint   `json:"user_id" gorm:"not null;index"`
	Title           string `json:"title" gorm:"not null"`
	Description     string `json:"description"`
	RepositoryURL   string `json:"repository_url"`
	LiveURL         string `json:"live_url"`
	Thumbnail       string `json:"thumbnail"`
	Tags            []ProjectTag `json:"tags,omitempty" gorm:"foreignKey:ProjectID"`
	Featured        bool   `json:"featured" gorm:"default:false"`
	Views           int    `json:"views" gorm:"default:0"`
	Likes           int    `json:"likes" gorm:"default:0"`

	User User `json:"user,omitempty" gorm:"foreignKey:UserID"`
}

// ProjectTag represents tags for projects
type ProjectTag struct {
	ID        uint   `json:"id" gorm:"primaryKey"`
	ProjectID uint   `json:"project_id" gorm:"not null;index"`
	Tag       string `json:"tag" gorm:"not null"`
}

// SocialLink represents social media links
type SocialLink struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	UserID uint   `json:"user_id" gorm:"not null;index"`
	Platform string `json:"platform" gorm:"not null"` // github, linkedin, twitter, etc.
	URL     string `json:"url" gorm:"not null"`
	Username string `json:"username"`
	Verified bool `json:"verified" gorm:"default:false"`

	User User `json:"user,omitempty" gorm:"foreignKey:UserID"`
}

// Follow represents user following relationships
type Follow struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	FollowerID uint `json:"follower_id" gorm:"not null;index"`
	FollowingID uint `json:"following_id" gorm:"not null;index"`

	Follower  User `json:"follower,omitempty" gorm:"foreignKey:FollowerID"`
	Following User `json:"following,omitempty" gorm:"foreignKey:FollowingID"`
}

// UserProfileStats represents aggregated user statistics
type UserProfileStats struct {
	UserID            uint    `json:"user_id"`
	FollowersCount    int     `json:"followers_count"`
	FollowingCount    int     `json:"following_count"`
	PublicBookmarks   int     `json:"public_bookmarks"`
	PublicNotes       int     `json:"public_notes"`
	ProjectsCount     int     `json:"projects_count"`
	SkillsCount       int     `json:"skills_count"`
	TotalViews        int     `json:"total_views"`
	TotalLikes        int     `json:"total_likes"`
	ProfileCompletion float64 `json:"profile_completion"` // 0-100 percentage
}
