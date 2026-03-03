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

### Login with TOTP
```http
POST /auth/login-totp
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "token": "123456"
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

### Check Users Exist
```http
GET /auth/check-users
```

**Response:**
```json
{
  "hasUsers": true,
  "count": 5
}
```

### Request Password Reset
```http
POST /auth/password-reset
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "Password reset email sent"
}
```

### Confirm Password Reset
```http
POST /auth/password-reset/confirm
Content-Type: application/json

{
  "token": "reset_token_here",
  "new_password": "newpassword123"
}
```

**Response:**
```json
{
  "message": "Password reset successfully"
}
```

### GitHub OAuth Login
```http
GET /auth/github
```

### GitHub OAuth Callback
```http
GET /auth/github/callback?code=github_code_here
```

### Handle OAuth Callback
```http
GET /auth/oauth/callback?provider=github&code=code_here
```

### Update Profile
```http
PUT /auth/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Name",
  "email": "updated@example.com"
}
```

### Change Password
```http
PUT /auth/password
Authorization: Bearer <token>
Content-Type: application/json

{
  "current_password": "oldpassword",
  "new_password": "newpassword123"
}
```

## Two-Factor Authentication (2FA)

### Setup TOTP
```http
POST /auth/2fa/setup
Authorization: Bearer <token>
```

**Response:**
```json
{
  "qr_code": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "secret": "JBSWY3DPEHPK3PXP",
  "backup_codes": ["123456", "789012", "345678", "901234", "567890"]
}
```

### Verify TOTP
```http
POST /auth/2fa/verify
Authorization: Bearer <token>
Content-Type: application/json

{
  "token": "123456"
}
```

### Enable TOTP
```http
POST /auth/2fa/enable
Authorization: Bearer <token>
Content-Type: application/json

{
  "token": "123456"
}
```

### Disable TOTP
```http
POST /auth/2fa/disable
Authorization: Bearer <token>
Content-Type: application/json

{
  "password": "userpassword"
}
```

### Get TOTP Status
```http
GET /auth/2fa/status
Authorization: Bearer <token>
```

**Response:**
```json
{
  "enabled": true,
  "setup_completed": true
}
```

### Verify Backup Code
```http
POST /auth/2fa/backup-codes/verify
Authorization: Bearer <token>
Content-Type: application/json

{
  "code": "123456"
}
```

### Regenerate Backup Codes
```http
POST /auth/2fa/backup-codes/regenerate
Authorization: Bearer <token>
Content-Type: application/json

{
  "password": "userpassword"
}
```

**Response:**
```json
{
  "backup_codes": ["123456", "789012", "345678", "901234", "567890"]
}
```

## Encryption

### Encrypt Note Content
```http
POST /auth/encrypt/content
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Sensitive note content"
}
```

**Response:**
```json
{
  "encrypted_content": "U2FsdGVkX1+vupppZksvRf5pq5g5XjFRIipRkwB0K1Y96Qsv2Lm+31cmzaAILwyt"
}
```

### Decrypt Note Content
```http
POST /auth/decrypt/content
Authorization: Bearer <token>
Content-Type: application/json

{
  "encrypted_content": "U2FsdGVkX1+vupppZksvRf5pq5g5XjFRIipRkwB0K1Y96Qsv2Lm+31cmzaAILwyt"
}
```

**Response:**
```json
{
  "content": "Sensitive note content"
}
```

### Get Encryption Status
```http
GET /auth/encryption/status
Authorization: Bearer <token>
```

**Response:**
```json
{
  "encryption_enabled": true,
  "key_initialized": true
}
```

## AI Settings

### Get AI Settings
```http
GET /auth/ai/settings
Authorization: Bearer <token>
```

**Response:**
```json
{
  "mistral_enabled": true,
  "mistral_api_key": "set",
  "mistral_model": "mistral-small-latest",
  "longcat_enabled": true,
  "longcat_api_key": "set",
  "longcat_base_url": "https://api.longcat.chat"
}
```

### Update AI Settings
```http
PUT /auth/ai/settings
Authorization: Bearer <token>
Content-Type: application/json

{
  "mistral_enabled": true,
  "mistral_api_key": "new_mistral_key",
  "mistral_model": "mistral-small-latest",
  "longcat_enabled": true,
  "longcat_api_key": "new_longcat_key",
  "longcat_base_url": "https://api.longcat.chat"
}
```

### Test AI Connection
```http
POST /auth/ai/test-connection
Authorization: Bearer <token>
Content-Type: application/json

{
  "provider": "mistral"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Connection successful",
  "provider": "mistral"
}
```

### Test AI Settings (No Auth)
```http
GET /test-ai-settings
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

### Refresh Bookmark Metadata
```http
POST /bookmarks/{id}/refresh-metadata
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": 1,
  "title": "Updated Title",
  "description": "Updated description",
  "metadata_updated": true
}
```

### Get Bookmark Metadata
```http
POST /bookmarks/metadata
Authorization: Bearer <token>
Content-Type: application/json

{
  "url": "https://example.com"
}
```

**Response:**
```json
{
  "title": "Example Domain",
  "description": "This domain is for use in illustrative examples",
  "image": "https://example.com/image.jpg",
  "favicon": "https://example.com/favicon.ico"
}
```

### Get Bookmark Content
```http
POST /bookmarks/content
Authorization: Bearer <token>
Content-Type: application/json

{
  "url": "https://example.com"
}
```

**Response:**
```json
{
  "content": "Extracted content from the webpage...",
  "word_count": 250,
  "reading_time": "1 min"
}
```

## GitHub Integration

### Get GitHub Repositories
```http
GET /github/repos
Authorization: Bearer <token>
```

**Response:**
```json
{
  "repos": [
    {
      "id": 123456789,
      "name": "trackeep",
      "full_name": "username/trackeep",
      "description": "A comprehensive productivity tool",
      "language": "Go",
      "stars": 42,
      "forks": 8,
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
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

### Upload Encrypted File
```http
POST /files/upload/encrypted
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <binary data>
description: "Encrypted file description"
encryption_key: "optional_encryption_key"
```

### Download Encrypted File
```http
GET /files/{id}/download/encrypted
Authorization: Bearer <token>
```

**Response:** Encrypted file data

## YouTube Integration

### Search YouTube
```http
POST /youtube/search
Authorization: Bearer <token>
Content-Type: application/json

{
  "query": "golang tutorial",
  "max_results": 10
}
```

**Response:**
```json
{
  "videos": [
    {
      "id": "dQw4w9WgXcQ",
      "title": "Never Gonna Give You Up",
      "description": "Official music video",
      "channel": "RickAstleyVEVO",
      "published_at": "2009-10-25T06:57:33Z",
      "duration": "3:33",
      "view_count": 1400000000,
      "thumbnail": "https://img.youtube.com/vi/dQw4w9WgXcQ/default.jpg"
    }
  ]
}
```

### Get YouTube Video Details
```http
POST /youtube/video-details
Authorization: Bearer <token>
Content-Type: application/json

{
  "video_id": "dQw4w9WgXcQ"
}
```

### Get YouTube Channel Videos
```http
POST /youtube/channel-videos
Authorization: Bearer <token>
Content-Type: application/json

{
  "channel_id": "UCuAXFkgsw1L7xaCfnd5JJOw",
  "max_results": 10
}
```

### Get YouTube Channel Videos from URL
```http
POST /youtube/channel-from-url
Authorization: Bearer <token>
Content-Type: application/json

{
  "channel_url": "https://www.youtube.com/c/RickAstleyVEVO"
}
```

### Get YouTube Trending Videos
```http
GET /youtube/trending
Authorization: Bearer <token>
```

### Get Predefined Channel Videos
```http
GET /youtube/predefined-channels
Authorization: Bearer <token>
```

### Get Fireship Videos
```http
GET /youtube/fireship
Authorization: Bearer <token>
```

### Get NetworkChuck Videos
```http
GET /youtube/network-chuck
Authorization: Bearer <token>
```

### Get Channel Videos
```http
POST /youtube/channel
Authorization: Bearer <token>
Content-Type: application/json

{
  "channel_id": "UCuAXFkgsw1L7xaCfnd5JJOw"
}
```

## Video Bookmarks

### Save Video Bookmark
```http
POST /video-bookmarks
Authorization: Bearer <token>
Content-Type: application/json

{
  "video_id": "dQw4w9WgXcQ",
  "title": "Never Gonna Give You Up",
  "description": "Classic Rick Astley video",
  "channel": "RickAstleyVEVO",
  "thumbnail": "https://img.youtube.com/vi/dQw4w9WgXcQ/default.jpg",
  "duration": "3:33",
  "tags": ["music", "classic", "80s"]
}
```

### Get User Bookmarks
```http
GET /video-bookmarks?page=1&limit=20&search=rick&channel=RickAstleyVEVO
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (int): Page number
- `limit` (int): Items per page
- `search` (string): Search in title and description
- `channel` (string): Filter by channel

### Search Bookmarks
```http
GET /video-bookmarks/search?q=rick&channel=RickAstleyVEVO
Authorization: Bearer <token>
```

### Get Bookmark Stats
```http
GET /video-bookmarks/stats
Authorization: Bearer <token>
```

**Response:**
```json
{
  "total_bookmarks": 25,
  "total_channels": 8,
  "total_watch_time": "2h 15m",
  "recent_bookmarks": 5,
  "top_channels": [
    {"channel": "RickAstleyVEVO", "count": 5},
    {"channel": "Fireship", "count": 3}
  ]
}
```

### Get Bookmark by ID
```http
GET /video-bookmarks/{id}
Authorization: Bearer <token>
```

### Update Bookmark
```http
PUT /video-bookmarks/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Title",
  "description": "Updated description",
  "tags": ["updated", "tags"]
}
```

### Delete Bookmark
```http
DELETE /video-bookmarks/{id}
Authorization: Bearer <token>
```

### Toggle Watched Status
```http
POST /video-bookmarks/{id}/toggle-watched
Authorization: Bearer <token>
```

### Toggle Favorite Status
```http
POST /video-bookmarks/{id}/toggle-favorite
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

### Create Encrypted Note
```http
POST /notes/encrypted
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Encrypted Note",
  "content": "Sensitive content",
  "tags": ["encrypted", "secret"]
}
```

### Get Encrypted Note
```http
GET /notes/{id}/encrypted
Authorization: Bearer <token>
```

## Search

### Web Search
```http
POST /search/web
Authorization: Bearer <token>
Content-Type: application/json

{
  "query": "golang best practices",
  "limit": 10
}
```

### News Search
```http
POST /search/news
Authorization: Bearer <token>
Content-Type: application/json

{
  "query": "technology news",
  "limit": 10
}
```

### Get Search Suggestions
```http
GET /search/suggestions?q=golang
Authorization: Bearer <token>
```

### Enhanced Search
```http
POST /search/enhanced
Authorization: Bearer <token>
Content-Type: application/json

{
  "query": "project management",
  "filters": {
    "type": ["notes", "bookmarks"],
    "tags": ["work"],
    "date_range": "last_30_days"
  }
}
```

### Save Search
```http
POST /search/save
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Work Projects",
  "query": "project management",
  "filters": {"tags": ["work"]}
}
```

### Get Search Analytics
```http
GET /search/analytics
Authorization: Bearer <token>
```

## Saved Searches

### Create Saved Search
```http
POST /search/saved
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Daily Review",
  "query": "status:pending priority:high",
  "tags": ["daily", "review"]
}
```

### Get User Saved Searches
```http
GET /search/saved
Authorization: Bearer <token>
```

### Get Saved Search
```http
GET /search/saved/{id}
Authorization: Bearer <token>
```

### Update Saved Search
```http
PUT /search/saved/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Search",
  "query": "updated query"
}
```

### Delete Saved Search
```http
DELETE /search/saved/{id}
Authorization: Bearer <token>
```

### Run Saved Search
```http
POST /search/saved/{id}/run
Authorization: Bearer <token>
```

### Get Saved Search Tags
```http
GET /search/saved/tags
Authorization: Bearer <token>
```

## Semantic Search

### Semantic Search
```http
POST /search/semantic
Authorization: Bearer <token>
Content-Type: application/json

{
  "query": "machine learning algorithms",
  "content_types": ["notes", "bookmarks"],
  "limit": 10
}
```

### Generate Embedding
```http
POST /search/embeddings/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Text to generate embedding for"
}
```

### Reindex Content
```http
POST /search/reindex
Authorization: Bearer <token>
Content-Type: application/json

{
  "content_types": ["notes", "bookmarks"]
}
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

## Time Tracking

### Get Time Entries
```http
GET /time-entries?page=1&limit=20&start_date=2024-01-01&end_date=2024-01-31
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (int): Page number
- `limit` (int): Items per page
- `start_date` (string): Filter by start date
- `end_date` (string): Filter by end date

**Response:**
```json
{
  "time_entries": [
    {
      "id": 1,
      "description": "Working on Trackeep API",
      "start_time": "2024-01-01T09:00:00Z",
      "end_time": "2024-01-01T11:00:00Z",
      "duration": "2h 0m",
      "project": "Trackeep",
      "tags": ["development", "api"]
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

### Create Time Entry
```http
POST /time-entries
Authorization: Bearer <token>
Content-Type: application/json

{
  "description": "Meeting with team",
  "start_time": "2024-01-01T14:00:00Z",
  "end_time": "2024-01-01T15:00:00Z",
  "project": "Trackeep",
  "tags": ["meeting", "team"]
}
```

### Get Time Stats
```http
GET /time-entries/stats?period=week&project=Trackeep
Authorization: Bearer <token>
```

**Response:**
```json
{
  "total_time": "40h 30m",
  "total_entries": 25,
  "average_duration": "1h 37m",
  "project_breakdown": [
    {"project": "Trackeep", "time": "30h 15m"},
    {"project": "Other", "time": "10h 15m"}
  ]
}
```

### Get Time Entry
```http
GET /time-entries/{id}
Authorization: Bearer <token>
```

### Update Time Entry
```http
PUT /time-entries/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "description": "Updated description",
  "end_time": "2024-01-01T16:00:00Z"
}
```

### Stop Time Entry
```http
POST /time-entries/{id}/stop
Authorization: Bearer <token>
```

### Delete Time Entry
```http
DELETE /time-entries/{id}
Authorization: Bearer <token>
```

## Calendar

### Get Events
```http
GET /calendar?start_date=2024-01-01&end_date=2024-01-31
Authorization: Bearer <token>
```

**Response:**
```json
{
  "events": [
    {
      "id": 1,
      "title": "Team Meeting",
      "description": "Weekly team sync",
      "start_time": "2024-01-01T10:00:00Z",
      "end_time": "2024-01-01T11:00:00Z",
      "location": "Conference Room",
      "is_completed": false,
      "reminder": "15m"
    }
  ]
}
```

### Get Event
```http
GET /calendar/{id}
Authorization: Bearer <token>
```

### Create Event
```http
POST /calendar
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Project Review",
  "description": "Review project progress",
  "start_time": "2024-01-15T14:00:00Z",
  "end_time": "2024-01-15T15:30:00Z",
  "location": "Meeting Room A",
  "reminder": "30m"
}
```

### Update Event
```http
PUT /calendar/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Event",
  "description": "Updated description"
}
```

### Delete Event
```http
DELETE /calendar/{id}
Authorization: Bearer <token>
```

### Get Upcoming Events
```http
GET /calendar/upcoming?limit=10
Authorization: Bearer <token>
```

### Get Today's Events
```http
GET /calendar/today
Authorization: Bearer <token>
```

### Get Deadlines
```http
GET /calendar/deadlines?days=7
Authorization: Bearer <token>
```

### Toggle Event Completion
```http
PUT /calendar/{id}/toggle-complete
Authorization: Bearer <token>
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

## AI Features

### Get AI Providers
```http
GET /ai/providers
Authorization: Bearer <token>
```

**Response:**
```json
{
  "providers": [
    {
      "name": "mistral",
      "display_name": "Mistral AI",
      "enabled": true,
      "models": ["mistral-small-latest", "mistral-medium-latest"]
    },
    {
      "name": "longcat",
      "display_name": "LongCat AI",
      "enabled": true,
      "models": ["longcat-flash-chat"]
    }
  ]
}
```

### Summarize Content
```http
POST /ai/summarize
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Long text to summarize...",
  "provider": "mistral",
  "max_length": 150
}
```

**Response:**
```json
{
  "summary": "Concise summary of the content...",
  "provider": "mistral",
  "word_count": 45
}
```

### Get AI Summaries
```http
GET /ai/summaries?page=1&limit=20
Authorization: Bearer <token>
```

### Get Task Suggestions
```http
POST /ai/tasks/suggest
Authorization: Bearer <token>
Content-Type: application/json

{
  "context": "Working on web development project",
  "current_tasks": ["Setup database", "Create API endpoints"],
  "priority": "high"
}
```

**Response:**
```json
{
  "suggestions": [
    {
      "id": 1,
      "title": "Add input validation",
      "description": "Implement validation for API endpoints",
      "priority": "high",
      "estimated_time": "2h"
    }
  ]
}
```

### Get Task Suggestions List
```http
GET /ai/tasks/suggestions
Authorization: Bearer <token>
```

### Accept Task Suggestion
```http
POST /ai/tasks/suggestions/{id}/accept
Authorization: Bearer <token>
```

### Dismiss Task Suggestion
```http
POST /ai/tasks/suggestions/{id}/dismiss
Authorization: Bearer <token>
```

### Generate Tag Suggestions
```http
POST /ai/tags/suggest
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Article about machine learning algorithms",
  "existing_tags": ["ai", "technology"]
}
```

**Response:**
```json
{
  "suggestions": ["machine-learning", "algorithms", "data-science", "ml"]
}
```

### Generate Content
```http
POST /ai/content/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "prompt": "Write a blog post about productivity tips",
  "type": "blog_post",
  "length": "medium",
  "tone": "professional"
}
```

**Response:**
```json
{
  "content": "Generated content...",
  "word_count": 500,
  "provider": "mistral"
}
```

## Chat

### Send Message
```http
POST /chat/send
Authorization: Bearer <token>
Content-Type: application/json

{
  "message": "Hello, how can you help me today?",
  "session_id": "optional_session_id",
  "provider": "mistral"
}
```

**Response:**
```json
{
  "id": "msg_123",
  "message": "I'm here to help! What would you like to know?",
  "session_id": "session_456",
  "timestamp": "2024-01-01T10:00:00Z"
}
```

### Get Chat Sessions
```http
GET /chat/sessions?page=1&limit=20
Authorization: Bearer <token>
```

### Get Session Messages
```http
GET /chat/sessions/{id}/messages?page=1&limit=50
Authorization: Bearer <token>
```

### Delete Session
```http
DELETE /chat/sessions/{id}
Authorization: Bearer <token>
```

## Messaging (Discord-like Communication)

### Get Conversations
```http
GET /messages/conversations?page=1&limit=20
Authorization: Bearer <token>
```

### Create Conversation
```http
POST /messages/conversations
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Project Discussion",
  "type": "group",
  "member_ids": [2, 3, 4]
}
```

### Get Conversation
```http
GET /messages/conversations/{id}
Authorization: Bearer <token>
```

### Update Conversation
```http
PATCH /messages/conversations/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Conversation Name"
}
```

### Add Conversation Member
```http
POST /messages/conversations/{id}/members
Authorization: Bearer <token>
Content-Type: application/json

{
  "user_id": 5
}
```

### Remove Conversation Member
```http
DELETE /messages/conversations/{id}/members/{userId}
Authorization: Bearer <token>
```

### Get Conversation Messages
```http
GET /messages/conversations/{id}/messages?page=1&limit=50
Authorization: Bearer <token>
```

### Create Conversation Message
```http
POST /messages/conversations/{id}/messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Hello team!",
  "type": "text"
}
```

### Update Message
```http
PATCH /messages/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Updated message content"
}
```

### Delete Message
```http
DELETE /messages/{id}
Authorization: Bearer <token>
```

### Add Message Reaction
```http
POST /messages/{id}/reactions
Authorization: Bearer <token>
Content-Type: application/json

{
  "emoji": "👍"
}
```

### Remove Message Reaction
```http
DELETE /messages/{id}/reactions/{emoji}
Authorization: Bearer <token>
```

### Search Messages
```http
POST /messages/search
Authorization: Bearer <token>
Content-Type: application/json

{
  "query": "project deadline",
  "conversation_id": "optional_conversation_id"
}
```

### Get Message Suggestions
```http
GET /messages/{id}/suggestions
Authorization: Bearer <token>
```

### Accept Message Suggestion
```http
POST /messages/{id}/suggestions/{suggestionId}/accept
Authorization: Bearer <token>
```

### Dismiss Message Suggestion
```http
POST /messages/{id}/suggestions/{suggestionId}/dismiss
Authorization: Bearer <token>
```

### Reveal Sensitive Message
```http
POST /messages/{id}/reveal-sensitive
Authorization: Bearer <token>
```

### Messages WebSocket
```http
GET /messages/ws
Authorization: Bearer <token>
```

## Password Vault

### Get Password Vault Items
```http
GET /messages/password-vault/items?page=1&limit=20
Authorization: Bearer <token>
```

### Create Password Vault Item
```http
POST /messages/password-vault/items
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "GitHub Account",
  "username": "myusername",
  "password": "encrypted_password",
  "url": "https://github.com",
  "notes": "Main GitHub account"
}
```

### Share Password Vault Item
```http
POST /messages/password-vault/items/{id}/share
Authorization: Bearer <token>
Content-Type: application/json

{
  "user_id": 2,
  "expires_at": "2024-12-31T23:59:59Z"
}
```

### Reveal Password Vault Item
```http
POST /messages/password-vault/items/{id}/reveal
Authorization: Bearer <token>
```

### Unshare Password Vault Item
```http
POST /messages/password-vault/items/{id}/unshare
Authorization: Bearer <token>
Content-Type: application/json

{
  "user_id": 2
}
```

## Dashboard

### Get Dashboard Stats
```http
GET /dashboard/stats
Authorization: Bearer <token>
```

**Response:**
```json
{
  "total_bookmarks": 150,
  "total_tasks": 25,
  "completed_tasks": 18,
  "total_notes": 42,
  "recent_activity": [
    {
      "type": "bookmark_created",
      "title": "New bookmark added",
      "timestamp": "2024-01-01T10:00:00Z"
    }
  ]
}
```

## Learning Paths

### Get Learning Path Categories
```http
GET /learning-paths/categories
```

**Response:**
```json
{
  "categories": [
    {
      "id": 1,
      "name": "Web Development",
      "description": "Learn modern web development",
      "path_count": 15
    }
  ]
}
```

### Get Learning Paths
```http
GET /learning-paths?page=1&limit=20&category=web-development&difficulty=intermediate
Authorization: Bearer <token>
```

### Create Learning Path
```http
POST /learning-paths
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Advanced React Development",
  "description": "Master React with advanced patterns",
  "category_id": 1,
  "difficulty": "advanced",
  "estimated_hours": 40,
  "tags": ["react", "javascript", "frontend"]
}
```

### Get Learning Path
```http
GET /learning-paths/{id}
Authorization: Bearer <token>
```

### Update Learning Path
```http
PUT /learning-paths/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Learning Path",
  "description": "Updated description"
}
```

### Delete Learning Path
```http
DELETE /learning-paths/{id}
Authorization: Bearer <token>
```

### Enroll in Learning Path
```http
POST /learning-paths/{id}/enroll
Authorization: Bearer <token>
```

### Get Learning Path Courses
```http
GET /learning-paths/{id}/courses
Authorization: Bearer <token>
```

## Courses

### Get Courses
```http
GET /courses?page=1&limit=20&category=programming&level=beginner
Authorization: Bearer <token>
```

### Get Featured Courses
```http
GET /courses/featured
Authorization: Bearer <token>
```

### Get ZTM Courses
```http
GET /courses/ztm
Authorization: Bearer <token>
```

### Get Course Categories
```http
GET /courses/categories
Authorization: Bearer <token>
```

### Search Courses
```http
POST /courses/search
Authorization: Bearer <token>
Content-Type: application/json

{
  "query": "react development",
  "category": "programming",
  "level": "intermediate"
}
```

### Get Course
```http
GET /courses/{id}
Authorization: Bearer <token>
```

### Get Course by Slug
```http
GET /courses/slug/{slug}
Authorization: Bearer <token>
```

## Enrollments

### Get User Enrollments
```http
GET /enrollments?page=1&limit=20&status=active
Authorization: Bearer <token>
```

### Update Progress
```http
PUT /enrollments/{id}/progress
Authorization: Bearer <token>
Content-Type: application/json

{
  "progress_percentage": 75,
  "completed_lessons": [1, 2, 3],
  "notes": "Great progress on React hooks"
}
```

### Rate Learning Path
```http
POST /enrollments/{id}/rate
Authorization: Bearer <token>
Content-Type: application/json

{
  "rating": 5,
  "review": "Excellent learning path!"
}
```

## Integrations

### Get Integrations
```http
GET /integrations?page=1&limit=20
Authorization: Bearer <token>
```

### Create Integration
```http
POST /integrations
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "GitHub",
  "type": "github",
  "config": {
    "repository": "username/repo"
  }
}
```

### Get Integration
```http
GET /integrations/{id}
Authorization: Bearer <token>
```

### Update Integration
```http
PUT /integrations/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "config": {
    "repository": "username/new-repo"
  }
}
```

### Delete Integration
```http
DELETE /integrations/{id}
Authorization: Bearer <token>
```

### Authorize Integration
```http
POST /integrations/{id}/authorize
Authorization: Bearer <token>
```

### Sync Integration
```http
POST /integrations/{id}/sync
Authorization: Bearer <token>
```

### Get Sync Logs
```http
GET /integrations/{id}/sync-logs?page=1&limit=20
Authorization: Bearer <token>
```

### OAuth Callback
```http
GET /integrations/oauth/callback?provider=github&code=code_here&state=state_here
```

## Analytics

### Get Dashboard Analytics
```http
GET /analytics/dashboard?period=30d
Authorization: Bearer <token>
```

### Get Productivity Metrics
```http
GET /analytics/productivity?start_date=2024-01-01&end_date=2024-01-31
Authorization: Bearer <token>
```

### Get Learning Analytics
```http
GET /analytics/learning?period=90d
Authorization: Bearer <token>
```

### Get Content Analytics
```http
GET /analytics/content?type=bookmarks&period=30d
Authorization: Bearer <token>
```

### Get GitHub Analytics
```http
GET /analytics/github?period=30d
Authorization: Bearer <token>
```

### Get Goals
```http
GET /analytics/goals?status=active
Authorization: Bearer <token>
```

### Create Goal
```http
POST /analytics/goals
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Complete React Course",
  "description": "Finish the advanced React development course",
  "target_date": "2024-03-01T00:00:00Z",
  "type": "learning"
}
```

### Update Goal
```http
PUT /analytics/goals/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "progress": 75,
  "status": "in_progress"
}
```

### Delete Goal
```http
DELETE /analytics/goals/{id}
Authorization: Bearer <token>
```

### Generate Analytics Report
```http
POST /analytics/reports
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "productivity",
  "period": "monthly",
  "format": "pdf"
}
```

### Generate Daily Analytics
```http
POST /analytics/generate-daily
Authorization: Bearer <token>
```

## Health Check
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

### Readiness Check
```http
GET /ready
```

**Response:**
```json
{
  "status": "ready",
  "checks": {
    "database": "ok",
    "redis": "ok",
    "ai_services": "ok"
  }
}
```

### Liveness Check
```http
GET /live
```

**Response:**
```json
{
  "status": "alive",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Get API Config
```http
GET /api/v1/config
```

**Response:**
```json
{
  "version": "1.0.0",
  "features": {
    "ai_enabled": true,
    "encryption_enabled": true,
    "2fa_enabled": true
  },
  "limits": {
    "max_file_size": 104857600,
    "max_requests_per_minute": 100
  }
}
```

### Get Demo Status
```http
GET /api/demo/status
```

**Response:**
```json
{
  "demo_mode": true,
  "features": ["bookmarks", "notes", "tasks"]
}
```

### Get Version
```http
GET /api/version
```

**Response:**
```json
{
  "version": "1.0.0",
  "build": "2024.01.01.001",
  "commit": "abc123def456"
}
```

## Update Management

### Check for Updates
```http
GET /api/updates/check
```

**Response:**
```json
{
  "update_available": true,
  "current_version": "1.0.0",
  "latest_version": "1.1.0",
  "release_notes": "Bug fixes and new features..."
}
```

### Install Update
```http
POST /api/updates/install
Content-Type: application/json

{
  "version": "1.1.0"
}
```

### Get Update Progress
```http
GET /api/updates/progress
```

**Response:**
```json
{
  "status": "downloading",
  "progress": 45,
  "message": "Downloading update..."
}
```

### Update Progress WebSocket
```http
GET /api/updates/ws
```

## Social Features

### Get User Profile
```http
GET /social/users/{id}
Authorization: Bearer <token>
```

### Update Profile
```http
PUT /social/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "bio": "Software developer passionate about learning",
  "location": "San Francisco",
  "website": "https://example.com"
}
```

### Search Users
```http
GET /social/users/search?q=john&limit=10
Authorization: Bearer <token>
```

### Follow User
```http
POST /social/users/{id}/follow
Authorization: Bearer <token>
```

### Get Followers
```http
GET /social/users/{id}/followers?page=1&limit=20
Authorization: Bearer <token>
```

### Get Following
```http
GET /social/users/{id}/following?page=1&limit=20
Authorization: Bearer <token>
```

## Teams

### Get Teams
```http
GET /teams?page=1&limit=20
Authorization: Bearer <token>
```

### Create Team
```http
POST /teams
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Development Team",
  "description": "Main development team",
  "is_private": false
}
```

### Get Team
```http
GET /teams/{id}
Authorization: Bearer <token>
```

### Update Team
```http
PUT /teams/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Team Name",
  "description": "Updated description"
}
```

### Delete Team
```http
DELETE /teams/{id}
Authorization: Bearer <token>
```

### Get Team Members
```http
GET /teams/{id}/members?page=1&limit=20
Authorization: Bearer <token>
```

### Remove Team Member
```http
DELETE /teams/{id}/members/{memberId}
Authorization: Bearer <token>
```

### Invite Team Member
```http
POST /teams/{id}/invite
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "newmember@example.com",
  "role": "member"
}
```

### Accept Team Invitation
```http
POST /teams/invitations/{token}/accept
Authorization: Bearer <token>
```

### Get Team Activity
```http
GET /teams/{id}/activity?page=1&limit=20
Authorization: Bearer <token>
```

### Get Team Stats
```http
GET /teams/{id}/stats
Authorization: Bearer <token>
```

## Marketplace

### Get Marketplace Items
```http
GET /marketplace/items?page=1&limit=20&category=templates&sort=popular
Authorization: Bearer <token>
```

### Get Marketplace Item
```http
GET /marketplace/items/{id}
Authorization: Bearer <token>
```

### Get Marketplace Reviews
```http
GET /marketplace/items/{id}/reviews?page=1&limit=20
Authorization: Bearer <token>
```

### Get Marketplace Stats
```http
GET /marketplace/stats
Authorization: Bearer <token>
```

### Get My Marketplace Items
```http
GET /marketplace/my-items?page=1&limit=20
Authorization: Bearer <token>
```

### Create Marketplace Item
```http
POST /marketplace/items
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Project Template",
  "description": "Complete project template for startups",
  "category": "templates",
  "price": 9.99,
  "files": ["template.zip"]
}
```

### Update Marketplace Item
```http
PUT /marketplace/items/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Template",
  "price": 14.99
}
```

### Delete Marketplace Item
```http
DELETE /marketplace/items/{id}
Authorization: Bearer <token>
```

### Create Marketplace Review
```http
POST /marketplace/items/{id}/reviews
Authorization: Bearer <token>
Content-Type: application/json

{
  "rating": 5,
  "review": "Excellent template!"
}
```

### Get Content Shares
```http
GET /marketplace/shares?page=1&limit=20
Authorization: Bearer <token>
```

### Create Content Share
```http
POST /marketplace/shares
Authorization: Bearer <token>
Content-Type: application/json

{
  "item_id": 123,
  "share_type": "public",
  "expires_at": "2024-12-31T23:59:59Z"
}
```

### Delete Content Share
```http
DELETE /marketplace/shares/{id}
Authorization: Bearer <token>
```

### Get Shared Content (Public)
```http
GET /shared/{token}
```

## Community

### Get Challenges
```http
GET /community/challenges?page=1&limit=20&status=active
Authorization: Bearer <token>
```

### Get Challenge
```http
GET /community/challenges/{id}
Authorization: Bearer <token>
```

### Create Challenge
```http
POST /community/challenges
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "30-Day Coding Challenge",
  "description": "Code every day for 30 days",
  "rules": "Submit at least one commit per day",
  "rewards": "Certificate and badge"
}
```

### Join Challenge
```http
POST /community/challenges/{id}/join
Authorization: Bearer <token>
```

### Update Challenge Progress
```http
PUT /community/challenges/{id}/progress
Authorization: Bearer <token>
Content-Type: application/json

{
  "progress": 15,
  "notes": "Halfway there!"
}
```

### Get My Challenges
```http
GET /community/my-challenges?page=1&limit=20
Authorization: Bearer <token>
```

### Get Mentorship Requests
```http
GET /community/mentorship/requests?page=1&limit=20
Authorization: Bearer <token>
```

### Create Mentorship Request
```http
POST /community/mentorship/requests
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Need help with React",
  "description": "Looking for mentor to help with advanced React concepts",
  "goals": ["Master hooks", "Learn state management"]
}
```

### Respond to Mentorship Request
```http
PUT /community/mentorship/requests/{id}/respond
Authorization: Bearer <token>
Content-Type: application/json

{
  "response": "accepted",
  "message": "I'd be happy to help!"
}
```

### Get My Mentorships
```http
GET /community/mentorship/my-mentorships?page=1&limit=20
Authorization: Bearer <token>
```

### Create Mentorship Session
```http
POST /community/mentorship/{id}/sessions
Authorization: Bearer <token>
Content-Type: application/json

{
  "scheduled_at": "2024-01-15T14:00:00Z",
  "duration": 60,
  "notes": "Discuss React hooks"
}
```

### Get Mentorship Sessions
```http
GET /community/mentorship/{id}/sessions?page=1&limit=20
Authorization: Bearer <token>
```

### Get Community Stats
```http
GET /community/stats
Authorization: Bearer <token>
```

## Admin Endpoints

### Get All Learning Paths (Admin)
```http
GET /admin/learning-paths?page=1&limit=50&status=pending
Authorization: Bearer <token>
```

### Review Learning Path (Admin)
```http
PUT /admin/learning-paths/{id}/review
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "approved",
  "feedback": "Great content structure!"
}
```

### Delete Learning Path (Admin)
```http
DELETE /admin/learning-paths/{id}
Authorization: Bearer <token>
```

### Get Users (Admin)
```http
GET /admin/users?page=1&limit=50&role=user
Authorization: Bearer <token>
```

### Update User Role (Admin)
```http
PUT /admin/users/{id}/role
Authorization: Bearer <token>
Content-Type: application/json

{
  "role": "admin"
}
```

### Get Admin Stats
```http
GET /admin/stats
Authorization: Bearer <token>
```

### Get Audit Logs
```http
GET /admin/audit-logs?page=1&limit=50&action=login&user_id=123
Authorization: Bearer <token>
```

### Get Audit Log Stats
```http
GET /admin/audit-logs/stats?period=30d
Authorization: Bearer <token>
```

### Get Audit Log
```http
GET /admin/audit-logs/{id}
Authorization: Bearer <token>
```

### Export Audit Logs
```http
GET /admin/audit-logs/export?format=csv&start_date=2024-01-01&end_date=2024-01-31
Authorization: Bearer <token>
```

### Cleanup Audit Logs
```http
DELETE /admin/audit-logs/cleanup?days=90
Authorization: Bearer <token>
```

## Performance Monitoring

### Get Database Stats
```http
GET /performance/stats
Authorization: Bearer <token>
```

**Response:**
```json
{
  "database_size": "2.5GB",
  "total_records": 150000,
  "active_connections": 25,
  "query_performance": {
    "avg_response_time": "45ms",
    "slow_queries": 3
  }
}
```

### Monitor Performance
```http
GET /performance/monitor?duration=60s
Authorization: Bearer <token>
```

### Optimize Database
```http
POST /performance/optimize
Authorization: Bearer <token>
```

### Cleanup Old Audit Logs
```http
POST /performance/cleanup-audit-logs
Authorization: Bearer <token>
Content-Type: application/json

{
  "days": 90
}
```

## Browser Extension API

### Generate API Key
```http
POST /browser-extension/api-keys/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Chrome Extension",
  "permissions": ["bookmarks:read", "bookmarks:write"]
}
```

**Response:**
```json
{
  "api_key": "ext_1234567890abcdef",
  "name": "Chrome Extension",
  "permissions": ["bookmarks:read", "bookmarks:write"],
  "expires_at": "2024-12-31T23:59:59Z"
}
```

### Get API Keys
```http
GET /browser-extension/api-keys
Authorization: Bearer <token>
```

### Revoke API Key
```http
DELETE /browser-extension/api-keys/{id}
Authorization: Bearer <token>
```

### Register Browser Extension
```http
POST /browser-extension/register
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Trackeep Extension",
  "version": "1.0.0",
  "browser": "chrome"
}
```

### Get Browser Extensions
```http
GET /browser-extension/extensions
Authorization: Bearer <token>
```

### Revoke Browser Extension
```http
DELETE /browser-extension/extensions/{id}
Authorization: Bearer <token>
```

### Validate API Key (Public)
```http
GET /browser-extension/validate?api_key=ext_1234567890abcdef
```

**Response:**
```json
{
  "valid": true,
  "permissions": ["bookmarks:read", "bookmarks:write"],
  "expires_at": "2024-12-31T23:59:59Z"
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
