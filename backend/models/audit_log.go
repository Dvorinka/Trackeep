package models

import (
	"time"

	"gorm.io/gorm"
)

// AuditAction represents the type of action performed
type AuditAction string

const (
	AuditActionCreate    AuditAction = "create"
	AuditActionRead      AuditAction = "read"
	AuditActionUpdate    AuditAction = "update"
	AuditActionDelete    AuditAction = "delete"
	AuditActionLogin     AuditAction = "login"
	AuditActionLogout    AuditAction = "logout"
	AuditActionLoginFail AuditAction = "login_failed"
	AuditActionExport    AuditAction = "export"
	AuditActionImport    AuditAction = "import"
	AuditActionEnable    AuditAction = "enable"
	AuditActionDisable   AuditAction = "disable"
	AuditActionUpload    AuditAction = "upload"
	AuditActionDownload  AuditAction = "download"
	AuditActionShare     AuditAction = "share"
	AuditActionAccess    AuditAction = "access"
)

// AuditResource represents the resource type
type AuditResource string

const (
	AuditResourceUser         AuditResource = "user"
	AuditResourceNote         AuditResource = "note"
	AuditResourceFile         AuditResource = "file"
	AuditResourceBookmark     AuditResource = "bookmark"
	AuditResourceTask         AuditResource = "task"
	AuditResourceTimeEntry    AuditResource = "time_entry"
	AuditResourceIntegration  AuditResource = "integration"
	AuditResourceTeam         AuditResource = "team"
	AuditResourceGoal         AuditResource = "goal"
	AuditResourceHabit        AuditResource = "habit"
	AuditResourceCalendar     AuditResource = "calendar"
	AuditResourceSearch       AuditResource = "search"
	AuditResourceAI           AuditResource = "ai"
	AuditResourceAnalytics    AuditResource = "analytics"
	AuditResourceSecurity     AuditResource = "security"
	AuditResourceSystem       AuditResource = "system"
)

// AuditLog represents an audit log entry
type AuditLog struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	// User information
	UserID      uint   `json:"user_id" gorm:"not null;index"`
	User        User   `json:"user,omitempty" gorm:"foreignKey:UserID"`
	UserEmail   string `json:"user_email" gorm:"not null"`
	UserIP      string `json:"user_ip"`
	UserAgent   string `json:"user_agent"`

	// Action information
	Action      AuditAction   `json:"action" gorm:"not null;index"`
	Resource    AuditResource `json:"resource" gorm:"not null;index"`
	ResourceID  *uint         `json:"resource_id,omitempty" gorm:"index"`

	// Details
	Description string                 `json:"description"`
	Details     map[string]interface{} `json:"details" gorm:"serializer:json"`
	OldValues   map[string]interface{} `json:"old_values" gorm:"serializer:json"`
	NewValues   map[string]interface{} `json:"new_values" gorm:"serializer:json"`

	// Security context
	SessionID   string `json:"session_id"`
	Success     bool   `json:"success" gorm:"default:true"`
	FailureReason string `json:"failure_reason"`

	// Geographic and device info
	Country     string `json:"country"`
	City        string `json:"city"`
	Device      string `json:"device"`
	Platform    string `json:"platform"`
	Browser     string `json:"browser"`

	// Risk assessment
	RiskLevel   string `json:"risk_level" gorm:"default:low"` // low, medium, high, critical
	Suspicious  bool   `json:"suspicious" gorm:"default:false"`
}

// TableName returns the table name for AuditLog
func (AuditLog) TableName() string {
	return "audit_logs"
}

// BeforeCreate hook to set default values
func (a *AuditLog) BeforeCreate(tx *gorm.DB) error {
	if a.RiskLevel == "" {
		a.RiskLevel = "low"
	}
	return nil
}
