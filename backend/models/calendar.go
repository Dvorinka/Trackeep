package models

import (
	"time"

	"gorm.io/gorm"
)

// CalendarEvent represents an event in the calendar
type CalendarEvent struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	UserID uint `json:"user_id" gorm:"not null;index"`
	User   User `json:"user,omitempty" gorm:"foreignKey:UserID"`

	Title       string `json:"title" gorm:"not null"`
	Description string `json:"description"`
	
	// Timing
	StartTime time.Time `json:"start_time" gorm:"not null"`
	EndTime   time.Time `json:"end_time" gorm:"not null"`
	
	// Classification
	Type     string `json:"type" gorm:"default:'reminder'"` // task, meeting, deadline, reminder, habit
	Priority string `json:"priority" gorm:"default:'medium'"` // low, medium, high, urgent
	
	// Location and attendees
	Location  string `json:"location"`
	Attendees string `json:"attendees"` // JSON string of attendee emails/names
	
	// Recurrence
	Recurring bool   `json:"recurring" gorm:"default:false"`
	Rrule     string `json:"rrule"` // RRULE format for recurrence
	
	// Source integration
	Source string `json:"source" gorm:"default:'trackeep'"` // trackeep, google, outlook, manual
	
	// Associations
	TaskID     *uint    `json:"task_id,omitempty"`
	Task       *Task    `json:"task,omitempty" gorm:"foreignKey:TaskID"`
	BookmarkID *uint    `json:"bookmark_id,omitempty"`
	Bookmark   *Bookmark `json:"bookmark,omitempty" gorm:"foreignKey:BookmarkID"`
	NoteID     *uint    `json:"note_id,omitempty"`
	Note       *Note    `json:"note,omitempty" gorm:"foreignKey:NoteID"`
	
	// Status
	IsCompleted bool `json:"is_completed" gorm:"default:false"`
	IsAllDay    bool `json:"is_all_day" gorm:"default:false"`
	
	// Notifications
	ReminderMinutes int `json:"reminder_minutes"` // Minutes before event to remind
}

// RecurrenceRule represents recurrence patterns for events
type RecurrenceRule struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	Frequency string `json:"frequency" gorm:"not null"` // daily, weekly, monthly, yearly
	Interval  int    `json:"interval" gorm:"default:1"`  // Every N days/weeks/months/years
	
	// End conditions
	EndDate    *time.Time `json:"end_date"`
	Count      *int       `json:"count"`      // Number of occurrences
	IsForever  bool       `json:"is_forever" gorm:"default:false"`
	
	// Weekly specifics
	DaysOfWeek string `json:"days_of_week"` // JSON array: [0,1,2,3,4,5,6] where 0=Sunday
	
	// Monthly specifics
	DayOfMonth     *int `json:"day_of_month"`      // 1-31
	WeekOfMonth    *int `json:"week_of_month"`     // 1-5 (first to fifth week)
	DayOfWeek      *int `json:"day_of_week"`       // 0-6 (Sunday to Saturday)
	
	// Event association
	EventID uint `json:"event_id" gorm:"not null"`
	Event   CalendarEvent `json:"event,omitempty" gorm:"foreignKey:EventID"`
}

// CalendarSettings represents user calendar preferences
type CalendarSettings struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	UserID uint `json:"user_id" gorm:"not null;uniqueIndex"`
	User   User `json:"user,omitempty" gorm:"foreignKey:UserID"`
	
	// Display preferences
	DefaultView     string `json:"default_view" gorm:"default:'week'"` // month, week, day
	WeekStartsOn    int    `json:"week_starts_on" gorm:"default:0"`   // 0=Sunday, 1=Monday
	Timezone        string `json:"timezone" gorm:"default:'UTC'"`
	TimeFormat24Hour bool   `json:"time_format_24_hour" gorm:"default:true"`
	
	// Integration settings
	GoogleCalendarEnabled bool   `json:"google_calendar_enabled" gorm:"default:false"`
	GoogleCalendarToken   string `json:"google_calendar_token"`
	OutlookEnabled        bool   `json:"outlook_enabled" gorm:"default:false"`
	OutlookToken          string `json:"outlook_token"`
	
	// Notification settings
	DefaultReminderMinutes int  `json:"default_reminder_minutes" gorm:"default:15"`
	EmailRemindersEnabled bool  `json:"email_reminders_enabled" gorm:"default:true"`
	PushRemindersEnabled  bool  `json:"push_reminders_enabled" gorm:"default:true"`
}

// GetDuration returns the duration of the event
func (e *CalendarEvent) GetDuration() time.Duration {
	return e.EndTime.Sub(e.StartTime)
}

// IsOverdue checks if the event is overdue
func (e *CalendarEvent) IsOverdue() bool {
	return !e.IsCompleted && time.Now().After(e.EndTime)
}

// IsToday checks if the event occurs today
func (e *CalendarEvent) IsToday() bool {
	now := time.Now()
	return e.StartTime.Year() == now.Year() &&
		e.StartTime.Month() == now.Month() &&
		e.StartTime.Day() == now.Day()
}

// IsUpcoming checks if the event is in the next 7 days
func (e *CalendarEvent) IsUpcoming() bool {
	now := time.Now()
	weekLater := now.AddDate(0, 0, 7)
	return e.StartTime.After(now) && e.StartTime.Before(weekLater)
}

// GetPriorityColor returns a color based on priority
func (e *CalendarEvent) GetPriorityColor() string {
	switch e.Priority {
	case "urgent":
		return "#ef4444" // red
	case "high":
		return "#f97316" // orange
	case "medium":
		return "#eab308" // yellow
	case "low":
		return "#22c55e" // green
	default:
		return "#6b7280" // gray
	}
}

// GetTypeColor returns a color based on event type
func (e *CalendarEvent) GetTypeColor() string {
	switch e.Type {
	case "task":
		return "#3b82f6" // blue
	case "meeting":
		return "#8b5cf6" // purple
	case "deadline":
		return "#ef4444" // red
	case "reminder":
		return "#06b6d4" // cyan
	case "habit":
		return "#10b981" // emerald
	default:
		return "#6b7280" // gray
	}
}
