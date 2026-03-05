package config

import (
	"fmt"
	"os"

	"github.com/trackeep/backend/migrations"
	"go.uber.org/zap"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

// JWTSecret for signing tokens
var JWTSecret = getJWTSecret()

// getJWTSecret retrieves JWT secret from environment or uses a default
func getJWTSecret() string {
	if secret := os.Getenv("JWT_SECRET"); secret != "" {
		return secret
	}
	// Default secret for development (should be changed in production)
	return "your-secret-key-change-in-production"
}

// InitDatabase initializes the database connection
func InitDatabase() {
	// Initialize logger first
	InitLogger()
	logger := GetLogger()

	// Check if demo mode is enabled
	if os.Getenv("VITE_DEMO_MODE") == "true" {
		logger.Info("Demo mode enabled - skipping database initialization")
		return
	}

	var err error

	// Configure GORM
	gormConfig := &gorm.Config{}

	dbType := os.Getenv("DB_TYPE")
	if dbType == "" {
		dbType = "postgres" // Always use PostgreSQL
	}

	switch dbType {
	case "postgres":
		dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s",
			os.Getenv("DB_HOST"),
			os.Getenv("DB_USER"),
			os.Getenv("DB_PASSWORD"),
			os.Getenv("DB_NAME"),
			os.Getenv("DB_PORT"),
			os.Getenv("DB_SSL_MODE"),
		)
		DB, err = gorm.Open(postgres.Open(dsn), gormConfig)
		logger.Info("Using PostgreSQL database")
	default:
		logger.Fatal("Unsupported database type", zap.String("type", dbType))
	}

	if err != nil {
		logger.Fatal("Failed to connect to database", zap.Error(err))
	}

	logger.Info("Database connected successfully")

	// Run database migrations
	if err := migrations.RunMigrations(); err != nil {
		logger.Fatal("Failed to run database migrations", zap.Error(err))
	}
}

// GetDB returns the database instance
func GetDB() *gorm.DB {
	// In demo mode, return nil since no database is available
	if os.Getenv("VITE_DEMO_MODE") == "true" {
		return nil
	}
	return DB
}
