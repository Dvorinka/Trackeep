package examples

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/trackeep/backend/internal/db"
	"github.com/trackeep/backend/internal/db/sqlc"
)

// UserServiceExample demonstrates how to use sqlc with typed queries
type UserServiceExample struct {
	db *db.DB
}

// NewUserServiceExample creates a new user service example
func NewUserServiceExample(database *db.DB) *UserServiceExample {
	return &UserServiceExample{
		db: database,
	}
}

// CreateUserExample shows how to create a user with typed queries
func (s *UserServiceExample) CreateUserExample(ctx context.Context, email, passwordHash, firstName, lastName string) (sqlc.User, error) {
	// Use typed query - no SQL strings, no reflection
	user, err := s.db.CreateUser(ctx, sqlc.CreateUserParams{
		Email:        email,
		PasswordHash: passwordHash,
		FirstName:    &firstName,
		LastName:     &lastName,
		IsActive:     &[]bool{true}[0],
		IsVerified:   &[]bool{false}[0],
	})
	if err != nil {
		return sqlc.User{}, fmt.Errorf("failed to create user: %w", err)
	}

	// Convert CreateUserRow to User
	return sqlc.User{
		ID:         user.ID,
		Email:      user.Email,
		FirstName:  user.FirstName,
		LastName:   user.LastName,
		AvatarUrl:  user.AvatarUrl,
		IsActive:   user.IsActive,
		IsVerified: user.IsVerified,
		LastLogin:  user.LastLogin,
		CreatedAt:  user.CreatedAt,
		UpdatedAt:  user.UpdatedAt,
	}, nil
}

// GetUserExample shows how to get a user by ID
func (s *UserServiceExample) GetUserExample(ctx context.Context, userID pgtype.UUID) (sqlc.User, error) {
	// Use typed query
	user, err := s.db.GetUserByID(ctx, userID)
	if err != nil {
		return sqlc.User{}, fmt.Errorf("failed to get user: %w", err)
	}

	// Convert GetUserByIDRow to User
	return sqlc.User{
		ID:         user.ID,
		Email:      user.Email,
		FirstName:  user.FirstName,
		LastName:   user.LastName,
		AvatarUrl:  user.AvatarUrl,
		IsActive:   user.IsActive,
		IsVerified: user.IsVerified,
		LastLogin:  user.LastLogin,
		CreatedAt:  user.CreatedAt,
		UpdatedAt:  user.UpdatedAt,
	}, nil
}

// SearchUsersExample shows how to search users with pagination
func (s *UserServiceExample) SearchUsersExample(ctx context.Context, limit, offset int32) ([]sqlc.User, error) {
	// Use typed query with parameters
	users, err := s.db.ListUsers(ctx, sqlc.ListUsersParams{
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to list users: %w", err)
	}

	// Convert ListUsersRow to User
	result := make([]sqlc.User, len(users))
	for i, user := range users {
		result[i] = sqlc.User{
			ID:         user.ID,
			Email:      user.Email,
			FirstName:  user.FirstName,
			LastName:   user.LastName,
			AvatarUrl:  user.AvatarUrl,
			IsActive:   user.IsActive,
			IsVerified: user.IsVerified,
			LastLogin:  user.LastLogin,
			CreatedAt:  user.CreatedAt,
			UpdatedAt:  user.UpdatedAt,
		}
	}

	return result, nil
}

// TransactionExample shows how to use transactions with sqlc
func (s *UserServiceExample) TransactionExample(ctx context.Context, email, passwordHash string) (sqlc.User, error) {
	// Start transaction
	tx, err := s.db.BeginTx(ctx)
	if err != nil {
		return sqlc.User{}, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer func() {
		if err != nil {
			tx.Rollback()
		}
	}()

	// Create user within transaction
	user, err := tx.CreateUser(ctx, sqlc.CreateUserParams{
		Email:        email,
		PasswordHash: passwordHash,
		IsActive:     &[]bool{true}[0],
		IsVerified:   &[]bool{false}[0],
	})
	if err != nil {
		return sqlc.User{}, fmt.Errorf("failed to create user in transaction: %w", err)
	}

	// Update last login within transaction
	err = tx.UpdateLastLogin(ctx, user.ID)
	if err != nil {
		return sqlc.User{}, fmt.Errorf("failed to update last login: %w", err)
	}

	// Commit transaction
	if err := tx.Commit(); err != nil {
		return sqlc.User{}, fmt.Errorf("failed to commit transaction: %w", err)
	}

	// Convert CreateUserRow to User
	return sqlc.User{
		ID:         user.ID,
		Email:      user.Email,
		FirstName:  user.FirstName,
		LastName:   user.LastName,
		AvatarUrl:  user.AvatarUrl,
		IsActive:   user.IsActive,
		IsVerified: user.IsVerified,
		LastLogin:  user.LastLogin,
		CreatedAt:  user.CreatedAt,
		UpdatedAt:  user.UpdatedAt,
	}, nil
}
