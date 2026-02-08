package models

import (
	"fmt"
	"time"

	"gorm.io/gorm"
)

// TimeEntry represents a time tracking entry
type TimeEntry struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	UserID uint `json:"user_id" gorm:"not null;index"`
	User   User `json:"user,omitempty" gorm:"foreignKey:UserID"`

	// What is being tracked
	TaskID     *uint     `json:"task_id,omitempty"`
	Task       *Task     `json:"task,omitempty" gorm:"foreignKey:TaskID"`
	BookmarkID *uint     `json:"bookmark_id,omitempty"`
	Bookmark   *Bookmark `json:"bookmark,omitempty" gorm:"foreignKey:BookmarkID"`
	NoteID     *uint     `json:"note_id,omitempty"`
	Note       *Note     `json:"note,omitempty" gorm:"foreignKey:NoteID"`

	// Time tracking data
	StartTime   time.Time  `json:"start_time" gorm:"not null"`
	EndTime     *time.Time `json:"end_time"`
	Duration    *int       `json:"duration"` // Duration in seconds
	Description string     `json:"description"`

	// Organization and metadata
	Tags     []Tag `json:"tags,omitempty" gorm:"many2many:time_entry_tags;"`
	Billable bool  `json:"billable" gorm:"default:false"`

	// Billing information
	HourlyRate *float64 `json:"hourly_rate"`

	// Timer state
	IsRunning bool `json:"is_running" gorm:"default:false"`

	// Additional metadata
	Source string `json:"source" gorm:"default:manual"` // manual, auto, pomodoro
}

// BeforeCreate hook to set default values
func (t *TimeEntry) BeforeCreate(tx *gorm.DB) error {
	if t.StartTime.IsZero() {
		t.StartTime = time.Now()
	}
	return nil
}

// BeforeUpdate hook to calculate duration when end time is set
func (t *TimeEntry) BeforeUpdate(tx *gorm.DB) error {
	if t.EndTime != nil && !t.EndTime.IsZero() {
		duration := int(t.EndTime.Sub(t.StartTime).Seconds())
		t.Duration = &duration
		t.IsRunning = false
	}
	return nil
}

// Stop stops the timer and calculates duration
func (t *TimeEntry) Stop() {
	now := time.Now()
	t.EndTime = &now
	duration := int(now.Sub(t.StartTime).Seconds())
	t.Duration = &duration
	t.IsRunning = false
}

// GetDuration returns the duration in seconds
func (t *TimeEntry) GetDuration() int {
	if t.Duration != nil {
		return *t.Duration
	}
	if t.IsRunning {
		return int(time.Since(t.StartTime).Seconds())
	}
	if t.EndTime != nil {
		return int(t.EndTime.Sub(t.StartTime).Seconds())
	}
	return 0
}

// GetFormattedDuration returns a human-readable duration
func (t *TimeEntry) GetFormattedDuration() string {
	duration := t.GetDuration()
	hours := duration / 3600
	minutes := (duration % 3600) / 60
	seconds := duration % 60

	if hours > 0 {
		return fmt.Sprintf("%dh %dm %ds", hours, minutes, seconds)
	} else if minutes > 0 {
		return fmt.Sprintf("%dm %ds", minutes, seconds)
	}
	return fmt.Sprintf("%ds", seconds)
}
