-- name: GetBookmarkByID :one
SELECT id, title, url, description, favicon_url, screenshot_url, user_id, is_archived, is_favorite, created_at, updated_at
FROM bookmarks
WHERE id = $1 AND user_id = $2 LIMIT 1;

-- name: GetBookmarksByUser :many
SELECT id, title, url, description, favicon_url, screenshot_url, user_id, is_archived, is_favorite, created_at, updated_at
FROM bookmarks
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: GetBookmarksByTag :many
SELECT b.id, b.title, b.url, b.description, b.favicon_url, b.screenshot_url, b.user_id, b.is_archived, b.is_favorite, b.created_at, b.updated_at
FROM bookmarks b
INNER JOIN bookmark_tags bt ON b.id = bt.bookmark_id
INNER JOIN tags t ON bt.tag_id = t.id
WHERE t.id = $1 AND b.user_id = $2
ORDER BY b.created_at DESC
LIMIT $3 OFFSET $4;

-- name: SearchBookmarks :many
SELECT id, title, url, description, favicon_url, screenshot_url, user_id, is_archived, is_favorite, created_at, updated_at
FROM bookmarks
WHERE user_id = $1 AND (
    title ILIKE $2 OR 
    description ILIKE $2 OR 
    url ILIKE $2
)
ORDER BY created_at DESC
LIMIT $3 OFFSET $4;

-- name: CreateBookmark :one
INSERT INTO bookmarks (title, url, description, favicon_url, screenshot_url, user_id, is_archived, is_favorite)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING id, title, url, description, favicon_url, screenshot_url, user_id, is_archived, is_favorite, created_at, updated_at;

-- name: UpdateBookmark :one
UPDATE bookmarks
SET title = $2,
    url = $3,
    description = $4,
    favicon_url = $5,
    screenshot_url = $6,
    is_archived = $7,
    is_favorite = $8,
    updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND user_id = $9
RETURNING id, title, url, description, favicon_url, screenshot_url, user_id, is_archived, is_favorite, created_at, updated_at;

-- name: DeleteBookmark :exec
DELETE FROM bookmarks WHERE id = $1 AND user_id = $2;

-- name: AddBookmarkTag :exec
INSERT INTO bookmark_tags (bookmark_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;

-- name: RemoveBookmarkTag :exec
DELETE FROM bookmark_tags WHERE bookmark_id = $1 AND tag_id = $2;
