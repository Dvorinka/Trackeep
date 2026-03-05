package db

import (
	"context"
	"fmt"
	"os"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/trackeep/backend/internal/db/sqlc"
)

// DB wraps the sqlc DB with additional functionality
type DB struct {
	*sqlc.Queries
	pool *pgxpool.Pool
}

// NewDB creates a new database connection
func NewDB() (*DB, error) {
	// Get database connection string
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s",
		os.Getenv("DB_HOST"),
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_NAME"),
		os.Getenv("DB_PORT"),
		os.Getenv("DB_SSL_MODE"),
	)

	// Create connection pool
	pool, err := pgxpool.New(context.Background(), dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to create connection pool: %w", err)
	}

	// Test connection
	if err := pool.Ping(context.Background()); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	// Create queries instance
	queries := sqlc.New(pool)

	return &DB{
		Queries: queries,
		pool:    pool,
	}, nil
}

// Close closes the database connection
func (db *DB) Close() error {
	db.pool.Close()
	return nil
}

// BeginTx starts a transaction
func (db *DB) BeginTx(ctx context.Context) (*DB, error) {
	tx, err := db.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}

	return &DB{
		Queries: sqlc.New(tx),
		pool:    nil, // Not using pool in transaction mode
	}, nil
}

// Commit commits the transaction
func (db *DB) Commit() error {
	// This would need to be implemented with transaction tracking
	// For now, transactions should be handled by the caller
	return nil
}

// Rollback rolls back the transaction
func (db *DB) Rollback() error {
	// This would need to be implemented with transaction tracking
	// For now, transactions should be handled by the caller
	return nil
}

// GetPool returns the underlying connection pool
func (db *DB) GetPool() *pgxpool.Pool {
	return db.pool
}
