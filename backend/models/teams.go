package models

import (
	"time"

	"gorm.io/gorm"
)

// Team represents a collaborative workspace
type Team struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	Name        string `json:"name" gorm:"not null"`
	Description string `json:"description"`
	Avatar      string `json:"avatar"`
	IsPublic    bool   `json:"is_public" gorm:"default:false"`
	IsActive    bool   `json:"is_active" gorm:"default:true"`

	// Owner of the team
	OwnerID uint `json:"owner_id" gorm:"not null;index"`
	Owner   User `json:"owner,omitempty" gorm:"foreignKey:OwnerID"`

	// Team members and relationships
	Members     []TeamMember     `json:"members,omitempty" gorm:"foreignKey:TeamID"`
	Invitations []TeamInvitation `json:"invitations,omitempty" gorm:"foreignKey:TeamID"`
	Projects    []TeamProject    `json:"projects,omitempty" gorm:"foreignKey:TeamID"`
	Bookmarks   []TeamBookmark   `json:"bookmarks,omitempty" gorm:"foreignKey:TeamID"`
	Notes       []TeamNote       `json:"notes,omitempty" gorm:"foreignKey:TeamID"`
	Tasks       []TeamTask       `json:"tasks,omitempty" gorm:"foreignKey:TeamID"`
	Files       []TeamFile       `json:"files,omitempty" gorm:"foreignKey:TeamID"`
}

// TeamMember represents a user's membership in a team
type TeamMember struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	TeamID   uint      `json:"team_id" gorm:"not null;index"`
	UserID   uint      `json:"user_id" gorm:"not null;index"`
	Role     string    `json:"role" gorm:"default:member"` // owner, admin, member, viewer
	JoinedAt time.Time `json:"joined_at"`

	Team Team `json:"team,omitempty" gorm:"foreignKey:TeamID"`
	User User `json:"user,omitempty" gorm:"foreignKey:UserID"`
}

// TeamInvitation represents an invitation to join a team
type TeamInvitation struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	TeamID    uint      `json:"team_id" gorm:"not null;index"`
	UserID    uint      `json:"user_id" gorm:"not null;index"`
	Email     string    `json:"email" gorm:"not null"` // Email for non-registered users
	Role      string    `json:"role" gorm:"default:member"`
	Token     string    `json:"token" gorm:"uniqueIndex;not null"` // Invitation token
	Status    string    `json:"status" gorm:"default:pending"`     // pending, accepted, declined, expired
	ExpiresAt time.Time `json:"expires_at"`
	InvitedBy uint      `json:"invited_by" gorm:"not null"`

	Team    Team `json:"team,omitempty" gorm:"foreignKey:TeamID"`
	User    User `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Inviter User `json:"inviter,omitempty" gorm:"foreignKey:InvitedBy"`
}

// TeamProject represents a project within a team
type TeamProject struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	TeamID        uint             `json:"team_id" gorm:"not null;index"`
	Name          string           `json:"name" gorm:"not null"`
	Description   string           `json:"description"`
	Status        string           `json:"status" gorm:"default:active"` // active, archived, completed
	RepositoryURL string           `json:"repository_url"`
	LiveURL       string           `json:"live_url"`
	Tags          []TeamProjectTag `json:"tags,omitempty" gorm:"foreignKey:ProjectID"`

	Team Team `json:"team,omitempty" gorm:"foreignKey:TeamID"`
}

// TeamProjectTag represents tags for team projects
type TeamProjectTag struct {
	ID        uint   `json:"id" gorm:"primaryKey"`
	ProjectID uint   `json:"project_id" gorm:"not null;index"`
	Tag       string `json:"tag" gorm:"not null"`
}

// TeamBookmark represents a bookmark shared within a team
type TeamBookmark struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	TeamID     uint `json:"team_id" gorm:"not null;index"`
	UserID     uint `json:"user_id" gorm:"not null;index"`
	BookmarkID uint `json:"bookmark_id" gorm:"not null;index"`

	Team     Team     `json:"team,omitempty" gorm:"foreignKey:TeamID"`
	User     User     `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Bookmark Bookmark `json:"bookmark,omitempty" gorm:"foreignKey:BookmarkID"`
}

// TeamNote represents a note shared within a team
type TeamNote struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	TeamID uint `json:"team_id" gorm:"not null;index"`
	UserID uint `json:"user_id" gorm:"not null;index"`
	NoteID uint `json:"note_id" gorm:"not null;index"`

	Team Team `json:"team,omitempty" gorm:"foreignKey:TeamID"`
	User User `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Note Note `json:"note,omitempty" gorm:"foreignKey:NoteID"`
}

// TeamTask represents a task within a team
type TeamTask struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	TeamID uint `json:"team_id" gorm:"not null;index"`
	UserID uint `json:"user_id" gorm:"not null;index"`
	TaskID uint `json:"task_id" gorm:"not null;index"`

	Team Team `json:"team,omitempty" gorm:"foreignKey:TeamID"`
	User User `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Task Task `json:"task,omitempty" gorm:"foreignKey:TaskID"`
}

// TeamFile represents a file shared within a team
type TeamFile struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	TeamID uint `json:"team_id" gorm:"not null;index"`
	UserID uint `json:"user_id" gorm:"not null;index"`
	FileID uint `json:"file_id" gorm:"not null;index"`

	Team Team `json:"team,omitempty" gorm:"foreignKey:TeamID"`
	User User `json:"user,omitempty" gorm:"foreignKey:UserID"`
	File File `json:"file,omitempty" gorm:"foreignKey:FileID"`
}

// TeamActivity represents activity logs for team actions
type TeamActivity struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	TeamID     uint   `json:"team_id" gorm:"not null;index"`
	UserID     uint   `json:"user_id" gorm:"not null;index"`
	Action     string `json:"action" gorm:"not null"`      // created, updated, deleted, joined, left, etc.
	EntityType string `json:"entity_type" gorm:"not null"` // team, project, bookmark, note, task, file
	EntityID   uint   `json:"entity_id" gorm:"not null"`
	Details    string `json:"details"` // JSON string with additional details

	Team Team `json:"team,omitempty" gorm:"foreignKey:TeamID"`
	User User `json:"user,omitempty" gorm:"foreignKey:UserID"`
}

// TeamStats represents aggregated team statistics
type TeamStats struct {
	TeamID         uint  `json:"team_id"`
	MembersCount   int64 `json:"members_count"`
	ProjectsCount  int64 `json:"projects_count"`
	BookmarksCount int64 `json:"bookmarks_count"`
	NotesCount     int64 `json:"notes_count"`
	TasksCount     int64 `json:"tasks_count"`
	FilesCount     int64 `json:"files_count"`
	RecentActivity int64 `json:"recent_activity"` // Activity in last 7 days
}
