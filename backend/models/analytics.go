package models

import (
	"time"

	"gorm.io/gorm"
)

// Analytics represents user analytics data
type Analytics struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	UserID uint `json:"user_id" gorm:"not null;index"`
	User   User `json:"user,omitempty" gorm:"foreignKey:UserID"`

	// Analytics data
	Date              time.Time `json:"date" gorm:"not null;index"`
	HoursTracked      float64   `json:"hours_tracked"`
	TasksCompleted    int       `json:"tasks_completed"`
	BookmarksAdded    int       `json:"bookmarks_added"`
	NotesCreated      int       `json:"notes_created"`
	CoursesStarted    int       `json:"courses_started"`
	CoursesCompleted  int       `json:"courses_completed"`
	GitHubCommits     int       `json:"github_commits"`
	GitHubPRs         int       `json:"github_prs"`
	StudyStreak       int       `json:"study_streak"`
	ProductivityScore float64   `json:"productivity_score"`
}

// ProductivityMetrics represents productivity analytics
type ProductivityMetrics struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	UserID uint `json:"user_id" gorm:"not null;index"`
	User   User `json:"user,omitempty" gorm:"foreignKey:UserID"`

	// Productivity data
	Period               string    `json:"period"` // daily, weekly, monthly, yearly
	StartDate            time.Time `json:"start_date"`
	EndDate              time.Time `json:"end_date"`
	TotalHours           float64   `json:"total_hours"`
	BillableHours        float64   `json:"billable_hours"`
	NonBillableHours     float64   `json:"non_billable_hours"`
	TasksCompleted       int       `json:"tasks_completed"`
	AverageTaskTime      float64   `json:"average_task_time"`
	PeakProductivityHour int       `json:"peak_productivity_hour"`
	FocusScore           float64   `json:"focus_score"`
	EfficiencyScore      float64   `json:"efficiency_score"`
}

// LearningAnalytics represents learning progress analytics
type LearningAnalytics struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	UserID uint `json:"user_id" gorm:"not null;index"`
	User   User `json:"user,omitempty" gorm:"foreignKey:UserID"`

	// Learning data
	CourseID         uint       `json:"course_id" gorm:"not null;index"`
	Course           Course     `json:"course,omitempty" gorm:"foreignKey:CourseID"`
	StartDate        time.Time  `json:"start_date"`
	LastAccessed     time.Time  `json:"last_accessed"`
	TimeSpent        float64    `json:"time_spent"` // in hours
	Progress         float64    `json:"progress"`   // percentage 0-100
	ModulesCompleted int        `json:"modules_completed"`
	TotalModules     int        `json:"total_modules"`
	QuizScores       []float64  `json:"quiz_scores" gorm:"serializer:json"`
	AverageScore     float64    `json:"average_score"`
	StreakDays       int        `json:"streak_days"`
	SkillsAcquired   []string   `json:"skills_acquired" gorm:"serializer:json"`
	CourseCompleted  bool       `json:"course_completed" gorm:"default:false"`
	CompletedAt      *time.Time `json:"completed_at,omitempty"`
}

// ContentAnalytics represents content consumption patterns
type ContentAnalytics struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	UserID uint `json:"user_id" gorm:"not null;index"`
	User   User `json:"user,omitempty" gorm:"foreignKey:UserID"`

	// Content data
	ContentType     string    `json:"content_type"` // bookmark, note, file, task
	ContentID       uint      `json:"content_id"`
	FirstAccessed   time.Time `json:"first_accessed"`
	LastAccessed    time.Time `json:"last_accessed"`
	AccessCount     int       `json:"access_count"`
	TimeSpent       float64   `json:"time_spent"` // in minutes
	Tags            []Tag     `json:"tags,omitempty" gorm:"many2many:content_analytics_tags;"`
	Category        string    `json:"category"`
	Priority        string    `json:"priority"`
	UsefulnessScore float64   `json:"usefulness_score"` // user-rated 1-5
}

// GitHubAnalytics represents GitHub contribution analytics
type GitHubAnalytics struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	UserID uint `json:"user_id" gorm:"not null;index"`
	User   User `json:"user,omitempty" gorm:"foreignKey:UserID"`

	// GitHub data
	Date          time.Time      `json:"date" gorm:"not null;index"`
	Commits       int            `json:"commits"`
	PullRequests  int            `json:"pull_requests"`
	IssuesOpened  int            `json:"issues_opened"`
	IssuesClosed  int            `json:"issues_closed"`
	Reviews       int            `json:"reviews"`
	Contributions int            `json:"contributions"`
	Languages     map[string]int `json:"languages" gorm:"serializer:json"`
	Repositories  []string       `json:"repositories" gorm:"serializer:json"`
	ActivityScore float64        `json:"activity_score"`
}

// HabitAnalytics represents habit formation insights
type HabitAnalytics struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	UserID uint `json:"user_id" gorm:"not null;index"`
	User   User `json:"user,omitempty" gorm:"foreignKey:UserID"`

	// Habit data
	HabitName      string    `json:"habit_name"`
	StartDate      time.Time `json:"start_date"`
	LastCompleted  time.Time `json:"last_completed"`
	Streak         int       `json:"streak"`
	BestStreak     int       `json:"best_streak"`
	TotalDays      int       `json:"total_days"`
	CompletionRate float64   `json:"completion_rate"`
	Frequency      string    `json:"frequency"` // daily, weekly, monthly
	Category       string    `json:"category"`  // productivity, learning, health, etc.
	GoalTarget     int       `json:"goal_target"`
	GoalAchieved   bool      `json:"goal_achieved"`
}

// Goal represents user goals for tracking
type Goal struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	UserID uint `json:"user_id" gorm:"not null;index"`
	User   User `json:"user,omitempty" gorm:"foreignKey:UserID"`

	// Goal data
	Title        string     `json:"title" gorm:"not null"`
	Description  string     `json:"description"`
	Category     string     `json:"category"` // learning, productivity, health, career
	TargetValue  float64    `json:"target_value"`
	CurrentValue float64    `json:"current_value"`
	Unit         string     `json:"unit"`
	Deadline     time.Time  `json:"deadline"`
	Status       string     `json:"status"`   // active, completed, paused, cancelled
	Priority     string     `json:"priority"` // low, medium, high, urgent
	Progress     float64    `json:"progress"` // percentage 0-100
	IsCompleted  bool       `json:"is_completed" gorm:"default:false"`
	CompletedAt  *time.Time `json:"completed_at,omitempty"`

	// Relationships
	Milestones []Milestone `json:"milestones,omitempty" gorm:"foreignKey:GoalID"`
}

// Milestone represents goal milestones
type Milestone struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	GoalID uint `json:"goal_id" gorm:"not null;index"`
	Goal   Goal `json:"goal,omitempty" gorm:"foreignKey:GoalID"`

	// Milestone data
	Title        string     `json:"title" gorm:"not null"`
	Description  string     `json:"description"`
	TargetValue  float64    `json:"target_value"`
	CurrentValue float64    `json:"current_value"`
	Deadline     time.Time  `json:"deadline"`
	Status       string     `json:"status"` // pending, completed, overdue
	IsCompleted  bool       `json:"is_completed" gorm:"default:false"`
	CompletedAt  *time.Time `json:"completed_at,omitempty"`
	Order        int        `json:"order"`
}

// AnalyticsReport represents a comprehensive analytics report
type AnalyticsReport struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	UserID uint `json:"user_id" gorm:"not null;index"`
	User   User `json:"user,omitempty" gorm:"foreignKey:UserID"`

	// Report data
	ReportType      string                 `json:"report_type"` // daily, weekly, monthly, yearly, custom
	StartDate       time.Time              `json:"start_date"`
	EndDate         time.Time              `json:"end_date"`
	Title           string                 `json:"title"`
	Summary         string                 `json:"summary"`
	Data            map[string]interface{} `json:"data" gorm:"serializer:json"`
	Insights        []string               `json:"insights" gorm:"serializer:json"`
	Recommendations []string               `json:"recommendations" gorm:"serializer:json"`
	ShareableLink   string                 `json:"shareable_link"`
	IsPublic        bool                   `json:"is_public" gorm:"default:false"`
}

// BeforeCreate hooks for default values
func (a *Analytics) BeforeCreate(tx *gorm.DB) error {
	if a.Date.IsZero() {
		a.Date = time.Now().Truncate(24 * time.Hour)
	}
	return nil
}

func (p *ProductivityMetrics) BeforeCreate(tx *gorm.DB) error {
	if p.StartDate.IsZero() {
		p.StartDate = time.Now().Truncate(24 * time.Hour)
	}
	if p.EndDate.IsZero() {
		p.EndDate = p.StartDate.Add(24 * time.Hour)
	}
	return nil
}

func (l *LearningAnalytics) BeforeCreate(tx *gorm.DB) error {
	if l.StartDate.IsZero() {
		l.StartDate = time.Now()
	}
	if l.LastAccessed.IsZero() {
		l.LastAccessed = time.Now()
	}
	return nil
}

func (c *ContentAnalytics) BeforeCreate(tx *gorm.DB) error {
	if c.FirstAccessed.IsZero() {
		c.FirstAccessed = time.Now()
	}
	if c.LastAccessed.IsZero() {
		c.LastAccessed = time.Now()
	}
	if c.AccessCount == 0 {
		c.AccessCount = 1
	}
	return nil
}

func (g *GitHubAnalytics) BeforeCreate(tx *gorm.DB) error {
	if g.Date.IsZero() {
		g.Date = time.Now().Truncate(24 * time.Hour)
	}
	return nil
}

func (h *HabitAnalytics) BeforeCreate(tx *gorm.DB) error {
	if h.StartDate.IsZero() {
		h.StartDate = time.Now()
	}
	return nil
}

func (g *Goal) BeforeCreate(tx *gorm.DB) error {
	if g.Status == "" {
		g.Status = "active"
	}
	if g.Priority == "" {
		g.Priority = "medium"
	}
	return nil
}

func (m *Milestone) BeforeCreate(tx *gorm.DB) error {
	if m.Status == "" {
		m.Status = "pending"
	}
	return nil
}
