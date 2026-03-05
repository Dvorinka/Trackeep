-- name: GetUserByID :one
SELECT id, email, first_name, last_name, avatar_url, is_active, is_verified, last_login, created_at, updated_at
FROM users
WHERE id = $1 LIMIT 1;

-- name: GetUserByEmail :one
SELECT id, email, first_name, last_name, avatar_url, is_active, is_verified, last_login, created_at, updated_at
FROM users
WHERE email = $1 LIMIT 1;

-- name: CreateUser :one
INSERT INTO users (email, password_hash, first_name, last_name, avatar_url, is_active, is_verified)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING id, email, first_name, last_name, avatar_url, is_active, is_verified, last_login, created_at, updated_at;

-- name: UpdateUser :one
UPDATE users
SET first_name = $2,
    last_name = $3,
    avatar_url = $4,
    is_active = $5,
    updated_at = CURRENT_TIMESTAMP
WHERE id = $1
RETURNING id, email, first_name, last_name, avatar_url, is_active, is_verified, last_login, created_at, updated_at;

-- name: UpdateLastLogin :exec
UPDATE users
SET last_login = CURRENT_TIMESTAMP
WHERE id = $1;

-- name: DeleteUser :exec
DELETE FROM users WHERE id = $1;

-- name: ListUsers :many
SELECT id, email, first_name, last_name, avatar_url, is_active, is_verified, last_login, created_at, updated_at
FROM users
ORDER BY created_at DESC
LIMIT $1 OFFSET $2;
