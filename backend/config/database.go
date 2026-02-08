package config

import (
	"fmt"
	"log"
	"os"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
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
	var err error

	// Configure GORM logger
	gormConfig := &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	}

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
		log.Println("Using PostgreSQL database")
	default:
		log.Fatal("Unsupported database type: " + dbType)
	}

	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	log.Println("Database connected successfully")
}

// GetDB returns the database instance
func GetDB() *gorm.DB {
	return DB
}
