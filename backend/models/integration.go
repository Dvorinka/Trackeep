package models

import (
	"time"
	"gorm.io/gorm"
)

// IntegrationType represents the type of integration
type IntegrationType string

const (
	IntegrationSlack   IntegrationType = "slack"
	IntegrationDiscord IntegrationType = "discord"
	IntegrationNotion  IntegrationType = "notion"
	IntegrationPocket   IntegrationType = "pocket"
	IntegrationTodoist  IntegrationType = "todoist"
	IntegrationGoogle  IntegrationType = "google"
	IntegrationGitHub  IntegrationType = "github"
	IntegrationTwitter IntegrationType = "twitter"
	IntegrationReddit  IntegrationType = "reddit"
	IntegrationObsidian IntegrationType = "obsidian"
)

// IntegrationStatus represents the status of an integration
type IntegrationStatus string

const (
	StatusActive   IntegrationStatus = "active"
	StatusInactive IntegrationStatus = "inactive"
	StatusError    IntegrationStatus = "error"
	StatusPending  IntegrationStatus = "pending"
)

// Integration represents a third-party service integration
type Integration struct {
	ID           string            `json:"id" gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	UserID       string            `json:"userId" gorm:"not null;index;type:uuid"`
	Type         IntegrationType   `json:"type" gorm:"not null;index"`
	Status       IntegrationStatus `json:"status" gorm:"not null;default:'pending'"`
	Name         string            `json:"name" gorm:"not null"`
	Description  string            `json:"description"`
	
	// Configuration stored as JSON
	Config       IntegrationConfig `json:"config" gorm:"type:jsonb"`
	
	// Authentication tokens (encrypted)
	AccessToken  string            `json:"-" gorm:"type:text"` // Encrypted
	RefreshToken string            `json:"-" gorm:"type:text"` // Encrypted
	
	// Sync settings
	SyncEnabled  bool              `json:"syncEnabled" gorm:"default:true"`
	LastSyncAt   *time.Time        `json:"lastSyncAt"`
	SyncInterval int               `json:"syncInterval"` // in minutes, 0 = manual
	
	// Webhook settings
	WebhookURL   string            `json:"webhookUrl" gorm:"type:text"`
	WebhookSecret string           `json:"-" gorm:"type:text"` // Encrypted
	
	// Statistics
	SyncCount    int               `json:"syncCount" gorm:"default:0"`
	ErrorCount   int               `json:"errorCount" gorm:"default:0"`
	LastError    string            `json:"lastError" gorm:"type:text"`
	
	// Timestamps
	CreatedAt    time.Time         `json:"createdAt"`
	UpdatedAt    time.Time         `json:"updatedAt"`
	DeletedAt    gorm.DeletedAt    `json:"-" gorm:"index"`
	
	// Relationships
	User         User              `json:"user,omitempty" gorm:"foreignKey:UserID"`
	SyncLogs     []SyncLog         `json:"syncLogs,omitempty" gorm:"foreignKey:IntegrationID"`
}

// IntegrationConfig holds configuration specific to each integration type
type IntegrationConfig struct {
	// Slack configuration
	SlackConfig *SlackConfig `json:"slackConfig,omitempty"`
	
	// Discord configuration
	DiscordConfig *DiscordConfig `json:"discordConfig,omitempty"`
	
	// Notion configuration
	NotionConfig *NotionConfig `json:"notionConfig,omitempty"`
	
	// Google configuration
	GoogleConfig *GoogleConfig `json:"googleConfig,omitempty"`
	
	// Pocket configuration
	PocketConfig *PocketConfig `json:"pocketConfig,omitempty"`
	
	// Todoist configuration
	TodoistConfig *TodoistConfig `json:"todoistConfig,omitempty"`
	
	// GitHub configuration
	GitHubConfig *GitHubConfig `json:"gitHubConfig,omitempty"`
	
	// Twitter configuration
	TwitterConfig *TwitterConfig `json:"twitterConfig,omitempty"`
	
	// Reddit configuration
	RedditConfig *RedditConfig `json:"redditConfig,omitempty"`
	
	// Obsidian configuration
	ObsidianConfig *ObsidianConfig `json:"obsidianConfig,omitempty"`
}

// SlackConfig holds Slack-specific configuration
type SlackConfig struct {
	TeamID      string   `json:"teamId"`
	TeamName    string   `json:"teamName"`
	ChannelID   string   `json:"channelId"`
	ChannelName string   `json:"channelName"`
	BotUserID   string   `json:"botUserId"`
	Scopes      []string `json:"scopes"`
	
	// Notification settings
	NotifyTasks       bool `json:"notifyTasks"`
	NotifyBookmarks   bool `json:"notifyBookmarks"`
	NotifyNotes       bool `json:"notifyNotes"`
	NotifyDeadlines   bool `json:"notifyDeadlines"`
	NotifyTimeEntries bool `json:"notifyTimeEntries"`
}

// DiscordConfig holds Discord-specific configuration
type DiscordConfig struct {
	GuildID     string   `json:"guildId"`
	GuildName   string   `json:"guildName"`
	ChannelID   string   `json:"channelId"`
	ChannelName string   `json:"channelName"`
	BotUserID   string   `json:"botUserId"`
	Scopes      []string `json:"scopes"`
	
	// Notification settings
	NotifyTasks       bool `json:"notifyTasks"`
	NotifyBookmarks   bool `json:"notifyBookmarks"`
	NotifyNotes       bool `json:"notifyNotes"`
	NotifyDeadlines   bool `json:"notifyDeadlines"`
	NotifyTimeEntries bool `json:"notifyTimeEntries"`
}

// NotionConfig holds Notion-specific configuration
type NotionConfig struct {
	DatabaseID string `json:"databaseId"`
	WorkspaceID string `json:"workspaceId"`
	WorkspaceName string `json:"workspaceName"`
	
	// Sync settings
	SyncBookmarks bool `json:"syncBookmarks"`
	SyncTasks     bool `json:"syncTasks"`
	SyncNotes     bool `json:"syncNotes"`
	SyncFiles     bool `json:"syncFiles"`
	
	// Mapping settings
	BookmarkDatabaseID string `json:"bookmarkDatabaseId"`
	TaskDatabaseID     string `json:"taskDatabaseId"`
	NoteDatabaseID     string `json:"noteDatabaseId"`
	FileDatabaseID     string `json:"fileDatabaseId"`
}

// GoogleConfig holds Google-specific configuration
type GoogleConfig struct {
	// Google Drive
	DriveEnabled    bool   `json:"driveEnabled"`
	DriveFolderID   string `json:"driveFolderId"`
	
	// Google Calendar
	CalendarEnabled bool     `json:"calendarEnabled"`
	CalendarIDs     []string `json:"calendarIds"`
	
	// Google Docs
	DocsEnabled     bool `json:"docsEnabled"`
	
	// Sync settings
	SyncBookmarks   bool `json:"syncBookmarks"`
	SyncTasks       bool `json:"syncTasks"`
	SyncNotes       bool `json:"syncNotes"`
	SyncFiles       bool `json:"syncFiles"`
	SyncCalendar    bool `json:"syncCalendar"`
}

// PocketConfig holds Pocket-specific configuration
type PocketConfig struct {
	Username string `json:"username"`
	
	// Sync settings
	SyncBookmarks bool `json:"syncBookmarks"`
	SyncTags     bool `json:"syncTags"`
	ImportAll    bool `json:"importAll"`
}

// TodoistConfig holds Todoist-specific configuration
type TodoistConfig struct {
	ProjectID   string `json:"projectId"`
	ProjectName string `json:"projectName"`
	
	// Sync settings
	SyncTasks     bool `json:"syncTasks"`
	SyncProjects  bool `json:"syncProjects"`
	SyncLabels    bool `json:"syncLabels"`
	ImportAll     bool `json:"importAll"`
}

// GitHubConfig holds GitHub-specific configuration
type GitHubConfig struct {
	Username     string `json:"username"`
	RepoSync     bool   `json:"repoSync"`
	IssueSync    bool   `json:"issueSync"`
	PRSync       bool   `json:"prSync"`
	StarSync     bool   `json:"starSync"`
	WatchSync    bool   `json:"watchSync"`
}

// TwitterConfig holds Twitter-specific configuration
type TwitterConfig struct {
	Username     string `json:"username"`
	SyncTweets   bool   `json:"syncTweets"`
	SyncLikes    bool   `json:"syncLikes"`
	SyncBookmarks bool `json:"syncBookmarks"`
}

// RedditConfig holds Reddit-specific configuration
type RedditConfig struct {
	Username     string `json:"username"`
	SyncPosts    bool   `json:"syncPosts"`
	SyncComments bool   `json:"syncComments"`
	SyncSaved    bool   `json:"syncSaved"`
	SyncUpvoted  bool   `json:"syncUpvoted"`
}

// ObsidianConfig holds Obsidian-specific configuration
type ObsidianConfig struct {
	VaultPath    string `json:"vaultPath"`
	VaultName    string `json:"vaultName"`
	SyncNotes    bool   `json:"syncNotes"`
	SyncBookmarks bool `json:"syncBookmarks"`
	SyncTasks    bool   `json:"syncTasks"`
	AutoSync     bool   `json:"autoSync"`
}

// SyncLog represents a sync operation log
type SyncLog struct {
	ID           string    `json:"id" gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	IntegrationID string    `json:"integrationId" gorm:"not null;index;type:uuid"`
	Type         string    `json:"type"` // "full", "incremental", "manual", "webhook"
	Status       string    `json:"status"` // "success", "error", "partial"
	
	// Sync statistics
	ItemsProcessed int       `json:"itemsProcessed"`
	ItemsCreated   int       `json:"itemsCreated"`
	ItemsUpdated   int       `json:"itemsUpdated"`
	ItemsDeleted   int       `json:"itemsDeleted"`
	ItemsSkipped   int       `json:"itemsSkipped"`
	
	// Timing
	StartedAt     time.Time `json:"startedAt"`
	CompletedAt   *time.Time `json:"completedAt"`
	Duration      int       `json:"duration"` // in seconds
	
	// Error details
	ErrorMessage  string    `json:"errorMessage" gorm:"type:text"`
	ErrorDetails  string    `json:"errorDetails" gorm:"type:text"`
	
	// Additional data
	SyncData      string    `json:"syncData" gorm:"type:jsonb"`
	
	// Timestamps
	CreatedAt     time.Time `json:"createdAt"`
	
	// Relationships
	Integration   Integration `json:"integration,omitempty" gorm:"foreignKey:IntegrationID"`
}

// WebhookEvent represents an incoming webhook event
type WebhookEvent struct {
	ID           string    `json:"id" gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	IntegrationID string    `json:"integrationId" gorm:"not null;index;type:uuid"`
	Type         string    `json:"type"` // "slack", "discord", etc.
	EventType    string    `json:"eventType"` // "message", "reaction_added", etc.
	
	// Event data
	Payload      string    `json:"payload" gorm:"type:jsonb"`
	Processed    bool      `json:"processed" gorm:"default:false"`
	
	// Processing details
	ProcessedAt  *time.Time `json:"processedAt"`
	ErrorMessage string    `json:"errorMessage" gorm:"type:text"`
	
	// Timestamps
	CreatedAt    time.Time `json:"createdAt"`
	
	// Relationships
	Integration  Integration `json:"integration,omitempty" gorm:"foreignKey:IntegrationID"`
}
