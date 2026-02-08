# Trackeep API Documentation

## Overview

Trackeep provides a RESTful API for managing bookmarks, tasks, files, and notes. All API endpoints (except authentication) require a valid JWT token. The application also integrates with AI services (Mistral and LongCat) for enhanced functionality.

**Base URL:** `http://localhost:8080/api/v1`

**Authentication:** Bearer Token (JWT)

## AI Services Integration

Trackeep integrates with multiple AI providers to enhance functionality:

### Mistral AI
- **Purpose:** General AI tasks and text processing
- **Model:** mistral-small-latest (configurable)
- **Environment Variables:**
  - `MISTRAL_API_KEY`: Your Mistral API key
  - `MISTRAL_MODEL`: The model to use (default: mistral-small-latest)

### LongCat AI
- **Purpose:** Advanced AI features and specialized tasks
- **API Documentation:** https://longcat.chat/platform/docs/
- **Environment Variables:**
  - `LONGCAT_API_KEY`: Your LongCat API key
  - `LONGCAT_BASE_URL`: LongCat API base URL (default: https://api.longcat.chat)
- **API Key Format:** `ak_xxxxxxxxxxxxxxxxxxxxxxxxxxx`
- **Supported Formats:** OpenAI API Format and Anthropic API Format
- **Endpoints:**
  - OpenAI Format: `https://api.longcat.chat/openai`
  - Anthropic Format: `https://api.longcat.chat/anthropic`
- **Supported Models:** LongCat-Flash-Chat and others
- **Authentication:** Bearer token in Authorization header

## Environment Configuration

To use AI features, configure the following environment variables in your `.env` file:

```bash
# Mistral AI Configuration
MISTRAL_API_KEY=your_mistral_api_key_here
MISTRAL_MODEL=mistral-small-latest

# LongCat AI Configuration
LONGCAT_API_KEY=ak_2886WQ2oE7rX3Ll3XD3pj1oM8iB4u
LONGCAT_BASE_URL=https://api.longcat.chat
```

## Authentication

### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "message": "User created successfully",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

### Get Current User
```http
GET /auth/me
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "John Doe",
  "created_at": "2024-01-01T00:00:00Z"
}
```

### Logout
```http
POST /auth/logout
Authorization: Bearer <token>
```

## Bookmarks

### Get All Bookmarks
```http
GET /bookmarks?page=1&limit=20&search=example&tag=important
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (int): Page number (default: 1)
- `limit` (int): Items per page (default: 20)
- `search` (string): Search in title and description
- `tag` (string): Filter by tag

**Response:**
```json
{
  "bookmarks": [
    {
      "id": 1,
      "title": "Example Bookmark",
      "url": "https://example.com",
      "description": "An example bookmark",
      "tags": ["important", "reference"],
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

### Create Bookmark
```http
POST /bookmarks
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "New Bookmark",
  "url": "https://example.com",
  "description": "A new bookmark",
  "tags": ["new", "example"]
}
```

### Get Bookmark
```http
GET /bookmarks/{id}
Authorization: Bearer <token>
```

### Update Bookmark
```http
PUT /bookmarks/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Bookmark",
  "description": "Updated description",
  "tags": ["updated", "example"]
}
```

### Delete Bookmark
```http
DELETE /bookmarks/{id}
Authorization: Bearer <token>
```

## Tasks

### Get All Tasks
```http
GET /tasks?page=1&limit=20&status=pending&priority=high
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (int): Page number
- `limit` (int): Items per page
- `status` (string): Filter by status (pending, in_progress, completed)
- `priority` (string): Filter by priority (low, medium, high)

**Response:**
```json
{
  "tasks": [
    {
      "id": 1,
      "title": "Complete project",
      "description": "Finish the Trackeep project",
      "status": "in_progress",
      "priority": "high",
      "due_date": "2024-01-15T00:00:00Z",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

### Create Task
```http
POST /tasks
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "New Task",
  "description": "Task description",
  "status": "pending",
  "priority": "medium",
  "due_date": "2024-01-15T00:00:00Z"
}
```

### Get Task
```http
GET /tasks/{id}
Authorization: Bearer <token>
```

### Update Task
```http
PUT /tasks/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Task",
  "status": "completed",
  "priority": "high"
}
```

### Delete Task
```http
DELETE /tasks/{id}
Authorization: Bearer <token>
```

## Files

### Get All Files
```http
GET /files?page=1&limit=20&type=image
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (int): Page number
- `limit` (int): Items per page
- `type` (string): Filter by file type

**Response:**
```json
{
  "files": [
    {
      "id": 1,
      "filename": "document.pdf",
      "original_name": "My Document.pdf",
      "file_size": 1024000,
      "file_type": "application/pdf",
      "description": "Important document",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

### Upload File
```http
POST /files/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <binary data>
description: "File description"
```

### Get File
```http
GET /files/{id}
Authorization: Bearer <token>
```

### Download File
```http
GET /files/{id}/download
Authorization: Bearer <token>
```

### Delete File
```http
DELETE /files/{id}
Authorization: Bearer <token>
```

## Notes

### Get All Notes
```http
GET /notes?page=1&limit=20&search=example&tag=important
Authorization: Bearer <token>
```

**Response:**
```json
{
  "notes": [
    {
      "id": 1,
      "title": "Meeting Notes",
      "content": "Important meeting notes...",
      "tags": ["meeting", "important"],
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

### Create Note
```http
POST /notes
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "New Note",
  "content": "Note content",
  "tags": ["new", "example"]
}
```

### Get Note
```http
GET /notes/{id}
Authorization: Bearer <token>
```

### Update Note
```http
PUT /notes/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Note",
  "content": "Updated content",
  "tags": ["updated", "example"]
}
```

### Delete Note
```http
DELETE /notes/{id}
Authorization: Bearer <token>
```

### Get Note Statistics
```http
GET /notes/stats
Authorization: Bearer <token>
```

**Response:**
```json
{
  "total_notes": 42,
  "total_tags": 15,
  "recent_notes": 5,
  "popular_tags": [
    {"tag": "important", "count": 10},
    {"tag": "work", "count": 8}
  ]
}
```

## Export/Import

### Export Data
```http
GET /export
Authorization: Bearer <token>
```

**Response:** JSON file containing all user data

### Import Data
```http
POST /import
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <json data file>
```

## Health Check

### System Health
```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "message": "Trackeep API is running",
  "version": "1.0.0",
  "database": "connected",
  "timestamp": {
    "unix": 1704067200,
    "human": "2024-01-01T00:00:00Z"
  }
}
```

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "error": "Invalid request data",
  "details": "Field 'title' is required"
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing token"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "Access denied"
}
```

### 404 Not Found
```json
{
  "error": "Not found",
  "message": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "Something went wrong"
}
```

## Rate Limiting

API requests are rate-limited to prevent abuse:
- **Default limit:** 100 requests per minute
- **Burst limit:** 200 requests per minute

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Request limit per window
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Time when limit resets

## Pagination

List endpoints support pagination with the following parameters:
- `page` (int, default: 1): Page number
- `limit` (int, default: 20, max: 100): Items per page

Pagination metadata is included in responses:
```json
{
  "data": [...],
  "total": 150,
  "page": 1,
  "limit": 20,
  "pages": 8
}
```

## Search and Filtering

Most list endpoints support search and filtering:
- `search` (string): Search in relevant fields
- `tag` (string): Filter by tags
- `status` (string): Filter by status (for tasks)
- `priority` (string): Filter by priority (for tasks)
- `type` (string): Filter by file type (for files)

## File Upload Limits

- **Maximum file size:** 100MB
- **Allowed file types:** Images, documents, archives
- **Storage location:** Configurable (local/cloud)

## Security Considerations

- All sensitive endpoints require JWT authentication
- Passwords are hashed using bcrypt
- File uploads are scanned for security threats
- CORS is configured for cross-origin requests
- Rate limiting prevents abuse
- Input validation prevents injection attacks
