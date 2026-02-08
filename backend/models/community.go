package models

import (
	"time"

	"gorm.io/gorm"
)

// Challenge represents a community challenge
type Challenge struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	// Creator information
	CreatorID uint `json:"creator_id" gorm:"not null;index"`
	Creator   User `json:"creator,omitempty" gorm:"foreignKey:CreatorID"`

	// Basic information
	Title       string `json:"title" gorm:"not null"`
	Description string `json:"description" gorm:"type:text"`
	Category    string `json:"category" gorm:"not null"` // learning, productivity, fitness, creativity, technical

	// Challenge details
	Difficulty    string `json:"difficulty" gorm:"not null"` // beginner, intermediate, advanced, expert
	Duration      int    `json:"duration" gorm:"not null"`   // Duration in days
	Requirements  string `json:"requirements" gorm:"type:text"`
	Rewards       string `json:"rewards" gorm:"type:text"`
	Rules         string `json:"rules" gorm:"type:text"`

	// Timeline
	StartDate time.Time `json:"start_date"`
	EndDate   time.Time `json:"end_date"`

	// Participation settings
	MaxParticipants *int `json:"max_participants,omitempty"` // nil for unlimited
	IsTeamChallenge bool `json:"is_team_challenge" gorm:"default:false"`
	TeamSize        int  `json:"team_size" gorm:"default:1"`

	// Status and visibility
	Status     string `json:"status" gorm:"default:draft"` // draft, active, completed, cancelled
	IsPublic   bool   `json:"is_public" gorm:"default:true"`
	IsFeatured bool   `json:"is_featured" gorm:"default:false"`

	// Tags and metadata
	Tags        []ChallengeTag `json:"tags,omitempty" gorm:"many2many:challenge_tags;"`
	Image       string         `json:"image"`       // Challenge banner/image
	Badge       string         `json:"badge"`       // Completion badge

	// Analytics
	ParticipantCount int       `json:"participant_count" gorm:"default:0"`
	CompletionCount  int       `json:"completion_count" gorm:"default:0"`
	CompletionRate   float64   `json:"completion_rate" gorm:"default:0"`
	LastActivityAt   *time.Time `json:"last_activity_at,omitempty"`

	// Relationships
	Participants []ChallengeParticipant `json:"participants,omitempty" gorm:"foreignKey:ChallengeID"`
	Milestones   []ChallengeMilestone   `json:"milestones,omitempty" gorm:"foreignKey:ChallengeID"`
	Resources    []ChallengeResource    `json:"resources,omitempty" gorm:"foreignKey:ChallengeID"`
}

// ChallengeParticipant represents a user's participation in a challenge
type ChallengeParticipant struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	// Participation information
	ChallengeID uint `json:"challenge_id" gorm:"not null;index"`
	Challenge   Challenge `json:"challenge,omitempty" gorm:"foreignKey:ChallengeID"`
	UserID      uint `json:"user_id" gorm:"not null;index"`
	User        User `json:"user,omitempty" gorm:"foreignKey:UserID"`

	// Team information (for team challenges)
	TeamID   *uint            `json:"team_id,omitempty"`
	Team     *ChallengeTeam   `json:"team,omitempty" gorm:"foreignKey:TeamID"`
	Role     string           `json:"role" gorm:"default:participant"` // participant, team_leader

	// Progress tracking
	Status        string     `json:"status" gorm:"default:joined"` // joined, in_progress, completed, dropped_out
	Progress      float64    `json:"progress" gorm:"default:0"`    // Progress percentage (0-100)
	StartedAt     *time.Time `json:"started_at,omitempty"`
	CompletedAt   *time.Time `json:"completed_at,omitempty"`
	DroppedOutAt  *time.Time `json:"dropped_out_at,omitempty"`

	// Performance metrics
	Score         int       `json:"score" gorm:"default:0"`
	Rank          int       `json:"rank"`
	BadgeEarned   bool      `json:"badge_earned" gorm:"default:false"`
	LastActivityAt *time.Time `json:"last_activity_at,omitempty"`

	// Notes and reflection
	Notes         string `json:"notes" gorm:"type:text"`
	Reflection    string `json:"reflection" gorm:"type:text"`
}

// ChallengeTeam represents a team in a team challenge
type ChallengeTeam struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	// Team information
	ChallengeID uint     `json:"challenge_id" gorm:"not null;index"`
	Challenge   Challenge `json:"challenge,omitempty" gorm:"foreignKey:ChallengeID"`
	Name        string   `json:"name" gorm:"not null"`
	Description string   `json:"description" gorm:"type:text"`
	Avatar      string   `json:"avatar"`

	// Team settings
	IsPrivate  bool `json:"is_private" gorm:"default:false"`
	MaxMembers int  `json:"max_members" gorm:"default:5"`

	// Team progress
	Status        string     `json:"status" gorm:"default:active"` // active, completed, disbanded
	Progress      float64    `json:"progress" gorm:"default:0"`
	Score         int        `json:"score" gorm:"default:0"`
	Rank          int        `json:"rank"`
	CompletedAt   *time.Time `json:"completed_at,omitempty"`
	LastActivityAt *time.Time `json:"last_activity_at,omitempty"`

	// Relationships
	LeaderID uint `json:"leader_id" gorm:"not null"`
	Leader   User `json:"leader,omitempty" gorm:"foreignKey:LeaderID"`
	Members  []ChallengeParticipant `json:"members,omitempty" gorm:"foreignKey:TeamID"`
}

// ChallengeMilestone represents a milestone in a challenge
type ChallengeMilestone struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	// Milestone information
	ChallengeID uint     `json:"challenge_id" gorm:"not null;index"`
	Challenge   Challenge `json:"challenge,omitempty" gorm:"foreignKey:ChallengeID"`
	Title       string   `json:"title" gorm:"not null"`
	Description string   `json:"description" gorm:"type:text"`

	// Milestone details
	Order         int       `json:"order" gorm:"not null"` // Order in the challenge
	TargetValue   float64   `json:"target_value" gorm:"not null"`
	Unit          string    `json:"unit"` // days, points, hours, etc.
	Deadline      time.Time `json:"deadline"`
	PointsAwarded int       `json:"points_awarded" gorm:"default:0"`

	// Status
	IsActive bool `json:"is_active" gorm:"default:true"`

	// Relationships
	Completions []ChallengeMilestoneCompletion `json:"completions,omitempty" gorm:"foreignKey:MilestoneID"`
}

// ChallengeMilestoneCompletion represents a user's completion of a milestone
type ChallengeMilestoneCompletion struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	// Completion information
	MilestoneID uint `json:"milestone_id" gorm:"not null;index"`
	Milestone   ChallengeMilestone `json:"milestone,omitempty" gorm:"foreignKey:MilestoneID"`
	UserID      uint `json:"user_id" gorm:"not null;index"`
	User        User `json:"user,omitempty" gorm:"foreignKey:UserID"`
	TeamID      *uint `json:"team_id,omitempty"`

	// Completion details
	CompletedAt time.Time `json:"completed_at"`
	Notes       string    `json:"notes" gorm:"type:text"`
	Evidence    string    `json:"evidence" gorm:"type:text"` // Proof of completion
	PointsEarned int       `json:"points_earned"`
}

// ChallengeResource represents a resource for a challenge
type ChallengeResource struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	// Resource information
	ChallengeID uint     `json:"challenge_id" gorm:"not null;index"`
	Challenge   Challenge `json:"challenge,omitempty" gorm:"foreignKey:ChallengeID"`
	Title       string   `json:"title" gorm:"not null"`
	Description string   `json:"description" gorm:"type:text"`
	URL         string   `json:"url"`
	Type        string   `json:"type" gorm:"not null"` // article, video, tool, template, guide

	// Resource details
	Order      int    `json:"order" gorm:"default:0"`
	IsRequired bool   `json:"is_required" gorm:"default:false"`
	Duration   int    `json:"duration"` // Estimated duration in minutes
	Tags       string `json:"tags"`     // Comma-separated tags
}

// ChallengeTag represents tags for challenges
type ChallengeTag struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	Name        string `json:"name" gorm:"uniqueIndex;not null"`
	Description string `json:"description"`
	Color       string `json:"color" gorm:"default:#10b981"` // Tag color
	UsageCount  int    `json:"usage_count" gorm:"default:0"`
}

// Mentorship represents a mentorship relationship
type Mentorship struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	// Participants
	MentorID uint `json:"mentor_id" gorm:"not null;index"`
	Mentor   User `json:"mentor,omitempty" gorm:"foreignKey:MentorID"`
	MenteeID uint `json:"mentee_id" gorm:"not null;index"`
	Mentee   User `json:"mentee,omitempty" gorm:"foreignKey:MenteeID"`

	// Mentorship details
	Category    string `json:"category" gorm:"not null"` // career, technical, business, personal
	Description string `json:"description" gorm:"type:text"`
	Goals       string `json:"goals" gorm:"type:text"`

	// Timeline
	StartDate time.Time `json:"start_date"`
	EndDate   *time.Time `json:"end_date,omitempty"`

	// Status and settings
	Status       string `json:"status" gorm:"default:pending"` // pending, active, paused, completed, terminated
	IsPaid       bool   `json:"is_paid" gorm:"default:false"`
	Rate         float64 `json:"rate" gorm:"default:0"` // Hourly rate or monthly rate
	Currency     string `json:"currency" gorm:"default:USD"`
	SessionLimit int    `json:"session_limit" gorm:"default:0"` // 0 for unlimited

	// Matching preferences
	MentorPreferences string `json:"mentor_preferences" gorm:"type:text"`
	MenteePreferences string `json:"mentee_preferences" gorm:"type:text"`

	// Analytics
	SessionCount    int       `json:"session_count" gorm:"default:0"`
	TotalHours     float64   `json:"total_hours" gorm:"default:0"`
	LastSessionAt  *time.Time `json:"last_session_at,omitempty"`
	SatisfactionScore float64 `json:"satisfaction_score" gorm:"default:0"` // 1-5 rating

	// Relationships
	Sessions    []MentorshipSession    `json:"sessions,omitempty" gorm:"foreignKey:MentorshipID"`
	Reviews     []MentorshipReview     `json:"reviews,omitempty" gorm:"foreignKey:MentorshipID"`
	Milestones  []MentorshipMilestone  `json:"milestones,omitempty" gorm:"foreignKey:MentorshipID"`
}

// MentorshipSession represents a mentoring session
type MentorshipSession struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	// Session information
	MentorshipID uint        `json:"mentorship_id" gorm:"not null;index"`
	Mentorship   Mentorship   `json:"mentorship,omitempty" gorm:"foreignKey:MentorshipID"`
	ScheduledFor time.Time   `json:"scheduled_for"`
	Duration     int         `json:"duration"` // Duration in minutes
	Status       string      `json:"status" gorm:"default:scheduled"` // scheduled, completed, cancelled, no_show

	// Session details
	Title       string `json:"title"`
	Agenda      string `json:"agenda" gorm:"type:text"`
	Notes       string `json:"notes" gorm:"type:text"`
	RecordingURL string `json:"recording_url"`
	Materials   string `json:"materials" gorm:"type:text"`

	// Completion details
	CompletedAt   *time.Time `json:"completed_at,omitempty"`
	MentorNotes   string     `json:"mentor_notes" gorm:"type:text"`
	MenteeNotes   string     `json:"mentee_notes" gorm:"type:text"`
	ActionItems   string     `json:"action_items" gorm:"type:text"`
	NextSteps     string     `json:"next_steps" gorm:"type:text"`

	// Feedback
	MentorRating   *int   `json:"mentor_rating,omitempty"`   // 1-5 rating from mentee
	MenteeRating   *int   `json:"mentee_rating,omitempty"`   // 1-5 rating from mentor
	MentorFeedback string `json:"mentor_feedback" gorm:"type:text"`
	MenteeFeedback string `json:"mentee_feedback" gorm:"type:text"`
}

// MentorshipReview represents a review for a mentorship
type MentorshipReview struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	// Review information
	MentorshipID uint      `json:"mentorship_id" gorm:"not null;index"`
	Mentorship   Mentorship `json:"mentorship,omitempty" gorm:"foreignKey:MentorshipID"`
	ReviewerID   uint      `json:"reviewer_id" gorm:"not null;index"`
	Reviewer     User      `json:"reviewer,omitempty" gorm:"foreignKey:ReviewerID"`
	TargetID     uint      `json:"target_id" gorm:"not null;index"` // The person being reviewed
	Target       User      `json:"target,omitempty" gorm:"foreignKey:TargetID"`

	// Review content
	Rating      int    `json:"rating" gorm:"not null;check:rating >= 1 AND rating <= 5"` // 1-5 stars
	Title       string `json:"title"`
	Content     string `json:"content" gorm:"type:text"`
	IsPublic    bool   `json:"is_public" gorm:"default:false"`
	IsVerified  bool   `json:"is_verified" gorm:"default:false"` // Verified mentorship

	// Review metadata
	HelpfulCount int `json:"helpful_count" gorm:"default:0"`
	ReviewType   string `json:"review_type" gorm:"not null"` // mentor_review, mentee_review
}

// MentorshipMilestone represents a milestone in a mentorship
type MentorshipMilestone struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	// Milestone information
	MentorshipID uint      `json:"mentorship_id" gorm:"not null;index"`
	Mentorship   Mentorship `json:"mentorship,omitempty" gorm:"foreignKey:MentorshipID"`
	Title        string    `json:"title" gorm:"not null"`
	Description  string    `json:"description" gorm:"type:text"`

	// Milestone details
	TargetDate   time.Time `json:"target_date"`
	CompletedAt  *time.Time `json:"completed_at,omitempty"`
	Status       string    `json:"status" gorm:"default:pending"` // pending, completed, overdue
	Priority     string    `json:"priority" gorm:"default:medium"` // low, medium, high

	// Progress tracking
	Progress     float64 `json:"progress" gorm:"default:0"` // 0-100
	Evidence     string  `json:"evidence" gorm:"type:text"`
	Notes        string  `json:"notes" gorm:"type:text"`
}

// MentorshipRequest represents a mentorship request
type MentorshipRequest struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	// Request information
	FromUserID uint `json:"from_user_id" gorm:"not null;index"`
	FromUser   User `json:"from_user,omitempty" gorm:"foreignKey:FromUserID"`
	ToUserID   uint `json:"to_user_id" gorm:"not null;index"`
	ToUser     User `json:"to_user,omitempty" gorm:"foreignKey:ToUserID"`

	// Request details
	Role         string `json:"role" gorm:"not null"` // mentor, mentee
	Category     string `json:"category" gorm:"not null"`
	Description  string `json:"description" gorm:"type:text"`
	Goals        string `json:"goals" gorm:"type:text"`
	Availability string `json:"availability" gorm:"type:text"`
	Duration     int    `json:"duration"` // Desired duration in months
	IsPaid       bool   `json:"is_paid"`
	Rate         float64 `json:"rate"`
	Currency     string `json:"currency" gorm:"default:USD"`

	// Status
	Status       string     `json:"status" gorm:"default:pending"` // pending, accepted, rejected, withdrawn
	RespondedAt  *time.Time `json:"responded_at,omitempty"`
	Response     string     `json:"response" gorm:"type:text"`

	// Matching score (calculated by matching algorithm)
	MatchScore   float64 `json:"match_score" gorm:"default:0"`
	MatchReasons string  `json:"match_reasons" gorm:"type:text"`
}

// BeforeCreate hooks
func (c *Challenge) BeforeCreate(tx *gorm.DB) error {
	if c.Status == "" {
		c.Status = "draft"
	}
	return nil
}

func (cp *ChallengeParticipant) BeforeCreate(tx *gorm.DB) error {
	if cp.Status == "" {
		cp.Status = "joined"
	}
	return nil
}

func (ct *ChallengeTeam) BeforeCreate(tx *gorm.DB) error {
	if ct.Status == "" {
		ct.Status = "active"
	}
	return nil
}

func (m *Mentorship) BeforeCreate(tx *gorm.DB) error {
	if m.Status == "" {
		m.Status = "pending"
	}
	if m.Currency == "" {
		m.Currency = "USD"
	}
	return nil
}

func (ms *MentorshipSession) BeforeCreate(tx *gorm.DB) error {
	if ms.Status == "" {
		ms.Status = "scheduled"
	}
	return nil
}

func (mr *MentorshipReview) BeforeCreate(tx *gorm.DB) error {
	if mr.ReviewType == "" {
		mr.ReviewType = "mentor_review"
	}
	return nil
}

func (mm *MentorshipMilestone) BeforeCreate(tx *gorm.DB) error {
	if mm.Status == "" {
		mm.Status = "pending"
	}
	if mm.Priority == "" {
		mm.Priority = "medium"
	}
	return nil
}

func (mr *MentorshipRequest) BeforeCreate(tx *gorm.DB) error {
	if mr.Status == "" {
		mr.Status = "pending"
	}
	if mr.Currency == "" {
		mr.Currency = "USD"
	}
	return nil
}
