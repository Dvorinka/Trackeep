package models

import (
	"time"

	"gorm.io/gorm"
)

// TaskStatus represents the status of a task
type TaskStatus string

const (
	TaskStatusPending    TaskStatus = "pending"
	TaskStatusInProgress TaskStatus = "in_progress"
	TaskStatusCompleted  TaskStatus = "completed"
	TaskStatusCancelled  TaskStatus = "cancelled"
)

// TaskPriority represents the priority of a task
type TaskPriority string

const (
	TaskPriorityLow    TaskPriority = "low"
	TaskPriorityMedium TaskPriority = "medium"
	TaskPriorityHigh   TaskPriority = "high"
	TaskPriorityUrgent TaskPriority = "urgent"
)

// Task represents a task or todo item
type Task struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	UserID uint `json:"user_id" gorm:"not null;index"`
	User   User `json:"user,omitempty" gorm:"foreignKey:UserID"`

	Title       string       `json:"title" gorm:"not null"`
	Description string       `json:"description"`
	Status      TaskStatus   `json:"status" gorm:"default:pending"`
	Priority    TaskPriority `json:"priority" gorm:"default:medium"`
	
	// Organization
	Tags []Tag `json:"tags,omitempty" gorm:"many2many:task_tags;"`
	
	// Scheduling
	DueDate     *time.Time `json:"due_date"`
	CompletedAt *time.Time `json:"completed_at"`
	
	// Progress tracking
	Progress int `json:"progress" gorm:"default:0"` // 0-100 percentage
	
	// Relationships
	ParentTaskID *uint `json:"parent_task_id,omitempty"`
	ParentTask   *Task `json:"parent_task,omitempty" gorm:"foreignKey:ParentTaskID"`
	Subtasks     []Task `json:"subtasks,omitempty" gorm:"foreignKey:ParentTaskID"`
	
	// Dependencies
	Dependencies []Task `json:"dependencies,omitempty" gorm:"many2many:task_dependencies;"`
}
