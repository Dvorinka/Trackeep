package migrations

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/lib/pq"
	"github.com/pressly/goose/v3"
)

// RunMigrations runs all database migrations using Goose
func RunMigrations() error {
	// Get database connection string
	dbType := os.Getenv("DB_TYPE")
	if dbType == "" {
		dbType = "postgres"
	}

	if dbType != "postgres" {
		return fmt.Errorf("goose migrations currently only support PostgreSQL, got: %s", dbType)
	}

	// Build connection string
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s",
		os.Getenv("DB_HOST"),
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_NAME"),
		os.Getenv("DB_PORT"),
		os.Getenv("DB_SSL_MODE"),
	)

	// Open database connection
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return fmt.Errorf("failed to open database for migrations: %w", err)
	}
	defer db.Close()

	// Test connection
	if err := db.Ping(); err != nil {
		return fmt.Errorf("failed to ping database for migrations: %w", err)
	}

	// Set goose dialect
	if err := goose.SetDialect("postgres"); err != nil {
		return fmt.Errorf("failed to set goose dialect: %w", err)
	}

	// Run migrations
	log.Println("Running database migrations...")
	if err := goose.Up(db, "migrations"); err != nil {
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	log.Println("Database migrations completed successfully")
	return nil
}

// GetMigrationStatus returns the current migration status
func GetMigrationStatus() error {
	// Get database connection string
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s",
		os.Getenv("DB_HOST"),
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_NAME"),
		os.Getenv("DB_PORT"),
		os.Getenv("DB_SSL_MODE"),
	)

	// Open database connection
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return fmt.Errorf("failed to open database for migration status: %w", err)
	}
	defer db.Close()

	// Set goose dialect
	if err := goose.SetDialect("postgres"); err != nil {
		return fmt.Errorf("failed to set goose dialect: %w", err)
	}

	// Get migration status
	log.Println("Checking migration status...")
	if err := goose.Status(db, "migrations"); err != nil {
		return fmt.Errorf("failed to get migration status: %w", err)
	}

	return nil
}

// CreateMigration creates a new migration file
func CreateMigration(name, migrationType string) error {
	var err error

	switch migrationType {
	case "up":
		err = goose.Create(nil, "migrations", name, "up")
	case "down":
		err = goose.Create(nil, "migrations", name, "down")
	default:
		return fmt.Errorf("invalid migration type: %s (must be 'up' or 'down')", migrationType)
	}

	if err != nil {
		return fmt.Errorf("failed to create migration: %w", err)
	}

	log.Printf("Migration file created: %s", name)
	return nil
}
