-- name: GetTaskByID :one
SELECT id, title, description, status, priority, due_date, user_id, created_at, updated_at
FROM tasks
WHERE id = $1 AND user_id = $2 LIMIT 1;

-- name: GetTasksByUser :many
SELECT id, title, description, status, priority, due_date, user_id, created_at, updated_at
FROM tasks
WHERE user_id = $1
ORDER BY 
    CASE priority 
        WHEN 'high' THEN 1 
        WHEN 'medium' THEN 2 
        WHEN 'low' THEN 3 
    END,
    due_date ASC NULLS LAST,
    created_at DESC
LIMIT $2 OFFSET $3;

-- name: GetTasksByStatus :many
SELECT id, title, description, status, priority, due_date, user_id, created_at, updated_at
FROM tasks
WHERE user_id = $1 AND status = $2
ORDER BY 
    CASE priority 
        WHEN 'high' THEN 1 
        WHEN 'medium' THEN 2 
        WHEN 'low' THEN 3 
    END,
    due_date ASC NULLS LAST,
    created_at DESC
LIMIT $3 OFFSET $4;

-- name: GetTasksByTag :many
SELECT t.id, t.title, t.description, t.status, t.priority, t.due_date, t.user_id, t.created_at, t.updated_at
FROM tasks t
INNER JOIN task_tags tt ON t.id = tt.task_id
INNER JOIN tags tg ON tt.tag_id = tg.id
WHERE tg.id = $1 AND t.user_id = $2
ORDER BY 
    CASE t.priority 
        WHEN 'high' THEN 1 
        WHEN 'medium' THEN 2 
        WHEN 'low' THEN 3 
    END,
    t.due_date ASC NULLS LAST,
    t.created_at DESC
LIMIT $3 OFFSET $4;

-- name: SearchTasks :many
SELECT id, title, description, status, priority, due_date, user_id, created_at, updated_at
FROM tasks
WHERE user_id = $1 AND (
    title ILIKE $2 OR 
    description ILIKE $2
)
ORDER BY 
    CASE priority 
        WHEN 'high' THEN 1 
        WHEN 'medium' THEN 2 
        WHEN 'low' THEN 3 
    END,
    due_date ASC NULLS LAST,
    created_at DESC
LIMIT $3 OFFSET $4;

-- name: CreateTask :one
INSERT INTO tasks (title, description, status, priority, due_date, user_id)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id, title, description, status, priority, due_date, user_id, created_at, updated_at;

-- name: UpdateTask :one
UPDATE tasks
SET title = $2,
    description = $3,
    status = $4,
    priority = $5,
    due_date = $6,
    updated_at = CURRENT_TIMESTAMP
WHERE id = $1 AND user_id = $7
RETURNING id, title, description, status, priority, due_date, user_id, created_at, updated_at;

-- name: DeleteTask :exec
DELETE FROM tasks WHERE id = $1 AND user_id = $2;

-- name: AddTaskTag :exec
INSERT INTO task_tags (task_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;

-- name: RemoveTaskTag :exec
DELETE FROM task_tags WHERE task_id = $1 AND tag_id = $2;
