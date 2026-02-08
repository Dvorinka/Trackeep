package models

import (
	"time"

	"gorm.io/gorm"
)

// FileAnalysis represents analysis results for a file
type FileAnalysis struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	// File information
	FileID       uint `json:"file_id" gorm:"not null;uniqueIndex:idx_file_analysis_type"`
	File         File `json:"file,omitempty" gorm:"foreignKey:FileID"`
	AnalysisType string `json:"analysis_type" gorm:"not null;uniqueIndex:idx_file_analysis_type"` // computer_vision, nlp, metadata

	// Analysis results
	Results    string  `json:"results" gorm:"type:text"`    // JSON-encoded analysis results
	Confidence float64 `json:"confidence" gorm:"default:0.0"` // 0.0 to 1.0
	Status     string  `json:"status" gorm:"default:pending"`  // pending, processing, completed, failed

	// Processing metadata
	ProcessedAt   *time.Time `json:"processed_at"`
	ProcessingTime int        `json:"processing_time"` // in milliseconds
	ModelVersion   string     `json:"model_version"`   // AI model version used
	Error          string     `json:"error"`           // Error message if failed

	// Additional metadata
	Tags       string `json:"tags" gorm:"serializer:json"`
	Metadata   string `json:"metadata" gorm:"serializer:json"`
	ExtractedData string `json:"extracted_data" gorm:"type:text"` // Extracted text, objects, etc.
}

// TableName returns the table name for FileAnalysis
func (FileAnalysis) TableName() string {
	return "file_analyses"
}

// BeforeCreate hook to set default values
func (fa *FileAnalysis) BeforeCreate(tx *gorm.DB) error {
	if fa.Status == "" {
		fa.Status = "pending"
	}
	if fa.Confidence == 0 {
		fa.Confidence = 0.0
	}
	return nil
}
