package models

import (
	"time"

	"gorm.io/gorm"
)

// GitHubAppInstallState stores short-lived install state values for GitHub App callbacks.
type GitHubAppInstallState struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	UserID uint `json:"user_id" gorm:"not null;index"`
	User   User `json:"user,omitempty" gorm:"foreignKey:UserID;-:migration"`

	State     string     `json:"state" gorm:"not null;size:128;uniqueIndex"`
	ExpiresAt time.Time  `json:"expires_at" gorm:"not null;index"`
	UsedAt    *time.Time `json:"used_at"`
}

// GitHubAppInstallation stores GitHub App installation metadata linked to a Trackeep user.
type GitHubAppInstallation struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	UserID uint `json:"user_id" gorm:"not null;index"`
	User   User `json:"user,omitempty" gorm:"foreignKey:UserID;-:migration"`

	InstallationID int64      `json:"installation_id" gorm:"not null;uniqueIndex"`
	AppSlug        string     `json:"app_slug" gorm:"size:255"`
	AccountLogin   string     `json:"account_login" gorm:"size:255"`
	AccountType    string     `json:"account_type" gorm:"size:64"`
	LastValidated  *time.Time `json:"last_validated,omitempty"`
}

// GitHubRepoBackup tracks local repository backups created by Trackeep.
type GitHubRepoBackup struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	UserID uint `json:"user_id" gorm:"not null;index:idx_github_backup_user_repo,unique"`
	User   User `json:"user,omitempty" gorm:"foreignKey:UserID;-:migration"`

	RepositoryID       int64      `json:"repository_id" gorm:"index"`
	RepositoryName     string     `json:"repository_name" gorm:"size:255"`
	RepositoryFullName string     `json:"repository_full_name" gorm:"not null;size:255;index:idx_github_backup_user_repo,unique"`
	DefaultBranch      string     `json:"default_branch" gorm:"size:255"`
	CloneURL           string     `json:"clone_url" gorm:"type:text"`
	LocalPath          string     `json:"local_path" gorm:"not null;type:text"`
	Source             string     `json:"source" gorm:"not null;size:32"` // github_user or github_app
	InstallationID     *int64     `json:"installation_id,omitempty"`
	LastBackupAt       *time.Time `json:"last_backup_at"`
	LastBackupStatus   string     `json:"last_backup_status" gorm:"not null;default:'pending';size:32"` // pending, success, error
	LastBackupError    string     `json:"last_backup_error"`
	LastBackupSize     int64      `json:"last_backup_size"`
}
