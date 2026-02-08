package models

import (
	"time"

	"gorm.io/gorm"
)

// Habit represents a habit that can be tracked
type Habit struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	UserID uint `json:"user_id" gorm:"not null;index"`
	User   User `json:"user,omitempty" gorm:"foreignKey:UserID"`

	// Basic habit information
	Name        string `json:"name" gorm:"not null"`
	Description string `json:"description" gorm:"type:text"`
	Category    string `json:"category" gorm:"default:personal"` // health, productivity, learning, personal

	// Habit tracking
	TargetFrequency int     `json:"target_frequency"` // e.g., 7 times per week
	FrequencyUnit   string  `json:"frequency_unit"`   // daily, weekly, monthly
	TargetValue     float64 `json:"target_value"`     // e.g., 30 minutes, 8 glasses
	Unit            string  `json:"unit"`             // minutes, glasses, pages, etc.

	// Schedule
	TimeOfDay  string   `json:"time_of_day"`                         // morning, afternoon, evening, night
	DaysOfWeek []string `json:"days_of_week" gorm:"serializer:json"` // ["monday", "tuesday", etc.]

	// Status and settings
	IsActive       bool    `json:"is_active" gorm:"default:true"`
	IsPublic       bool    `json:"is_public" gorm:"default:false"`
	Streak         int     `json:"streak" gorm:"default:0"`
	LongestStreak  int     `json:"longest_streak" gorm:"default:0"`
	CompletionRate float64 `json:"completion_rate" gorm:"default:0"` // percentage

	// Relationships
	GoalID       *uint        `json:"goal_id,omitempty"`
	Goal         *Goal        `json:"goal,omitempty" gorm:"foreignKey:GoalID"`
	HabitEntries []HabitEntry `json:"habit_entries,omitempty" gorm:"foreignKey:HabitID"`
	HabitTags    []HabitTag   `json:"habit_tags,omitempty" gorm:"foreignKey:HabitID"`
}

// HabitEntry represents a single completion of a habit
type HabitEntry struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	HabitID uint  `json:"habit_id" gorm:"not null;index"`
	Habit   Habit `json:"habit,omitempty" gorm:"foreignKey:HabitID"`

	EntryDate   time.Time `json:"entry_date" gorm:"not null;index"`
	Value       float64   `json:"value"`        // actual value completed
	TargetValue float64   `json:"target_value"` // target value for this entry
	Unit        string    `json:"unit"`
	Notes       string    `json:"notes" gorm:"type:text"`
	IsCompleted bool      `json:"is_completed" gorm:"default:false"`
	Quality     int       `json:"quality" gorm:"default:3"` // 1-5 rating
	TimeSpent   int       `json:"time_spent"`               // minutes spent
	Location    string    `json:"location"`
	Mood        string    `json:"mood"` // happy, neutral, stressed, etc.
}

// GoalTag represents tags for goals
type GoalTag struct {
	ID     uint `json:"id" gorm:"primaryKey"`
	GoalID uint `json:"goal_id" gorm:"not null;index"`
	TagID  uint `json:"tag_id" gorm:"not null;index"`
	Goal   Goal `json:"goal,omitempty" gorm:"foreignKey:GoalID"`
	Tag    Tag  `json:"tag,omitempty" gorm:"foreignKey:TagID"`
}

// HabitTag represents tags for habits
type HabitTag struct {
	ID      uint  `json:"id" gorm:"primaryKey"`
	HabitID uint  `json:"habit_id" gorm:"not null;index"`
	TagID   uint  `json:"tag_id" gorm:"not null;index"`
	Habit   Habit `json:"habit,omitempty" gorm:"foreignKey:HabitID"`
	Tag     Tag   `json:"tag,omitempty" gorm:"foreignKey:TagID"`
}

// GoalTemplate represents templates for creating goals
type GoalTemplate struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	Name        string  `json:"name" gorm:"not null"`
	Description string  `json:"description" gorm:"type:text"`
	Category    string  `json:"category"`
	Unit        string  `json:"unit"`
	TargetValue float64 `json:"target_value"`
	Duration    int     `json:"duration"` // suggested duration in days
	IsPublic    bool    `json:"is_public" gorm:"default:false"`
	UsageCount  int     `json:"usage_count" gorm:"default:0"`

	// Template milestones
	Milestones []GoalTemplateMilestone `json:"milestones,omitempty" gorm:"foreignKey:GoalTemplateID"`
}

// GoalTemplateMilestone represents milestones in goal templates
type GoalTemplateMilestone struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	GoalTemplateID uint         `json:"goal_template_id" gorm:"not null;index"`
	GoalTemplate   GoalTemplate `json:"goal_template,omitempty" gorm:"foreignKey:GoalTemplateID"`

	Title       string  `json:"title" gorm:"not null"`
	Description string  `json:"description" gorm:"type:text"`
	TargetValue float64 `json:"target_value"`
	Unit        string  `json:"unit"`
	DayOffset   int     `json:"day_offset"` // days from start date
	SortOrder   int     `json:"sort_order" gorm:"default:0"`
}

// BeforeCreate hooks
func (h *Habit) BeforeCreate(tx *gorm.DB) error {
	if h.Category == "" {
		h.Category = "personal"
	}
	if h.FrequencyUnit == "" {
		h.FrequencyUnit = "daily"
	}
	return nil
}

func (he *HabitEntry) BeforeCreate(tx *gorm.DB) error {
	// Set completion based on value vs target
	if he.Value >= he.TargetValue {
		he.IsCompleted = true
	}
	return nil
}

// BeforeUpdate hooks
func (h *Habit) BeforeUpdate(tx *gorm.DB) error {
	// Update completion rate and streak
	h.updateStreakAndRate()
	return nil
}

// Helper methods

// updateStreakAndRate calculates current streak and completion rate
func (h *Habit) updateStreakAndRate() {
	// This would typically involve querying habit entries
	// For now, we'll keep the existing values
	// In a real implementation, you'd calculate based on recent entries
}

// GetTodayEntry gets today's habit entry if it exists
func (h *Habit) GetTodayEntry() *HabitEntry {
	// This would typically query the database
	// For now, return nil
	return nil
}

// GetWeeklyStreak gets the current weekly streak
func (h *Habit) GetWeeklyStreak() int {
	// This would calculate based on habit entries
	// For now, return the stored streak
	return h.Streak
}
