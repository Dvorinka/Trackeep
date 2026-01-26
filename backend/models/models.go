package models

import (
	"github.com/trackeep/backend/config"
	"gorm.io/gorm"
)

// DB is the global database instance
var DB *gorm.DB

// InitDB initializes the global database variable
func InitDB() {
	DB = config.GetDB()
}

// AutoMigrate runs database migrations for all models
func AutoMigrate() {
	db := config.GetDB()

	// Auto migrate all models
	db.AutoMigrate(
		&User{},
		&Tag{},
		&Bookmark{},
		&Task{},
		&File{},
		&Note{},
	)
}
