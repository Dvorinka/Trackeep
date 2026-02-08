package handlers

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/trackeep/backend/config"
	"github.com/trackeep/backend/models"
	"gorm.io/gorm"
)

// SearchFilters represents the search filters
type SearchFilters struct {
	Query       string    `json:"query" binding:"required"`
	ContentType string    `json:"content_type"` // 'all' | 'bookmarks' | 'tasks' | 'notes' | 'files'
	Tags        []string  `json:"tags"`
	DateRange   DateRange `json:"date_range"`
	Author      string    `json:"author"`
	Language    string    `json:"language"`
	FileTypes   []string  `json:"file_types"`
	IsFavorite  *bool     `json:"is_favorite"`
	IsRead      *bool     `json:"is_read"`
	IsPublic    *bool     `json:"is_public"`
	Limit       int       `json:"limit"`
	Offset      int       `json:"offset"`
}

type DateRange struct {
	Start time.Time `json:"start"`
	End   time.Time `json:"end"`
}

// SearchResult represents a unified search result
type SearchResult struct {
	ID          uint                `json:"id"`
	Type        string              `json:"type"` // 'bookmark', 'task', 'note', 'file'
	Title       string              `json:"title"`
	Description string              `json:"description"`
	Content     string              `json:"content"`
	Tags        []models.Tag        `json:"tags"`
	CreatedAt   time.Time           `json:"created_at"`
	UpdatedAt   time.Time           `json:"updated_at"`
	URL         string              `json:"url,omitempty"`
	Status      string              `json:"status,omitempty"`
	Priority    string              `json:"priority,omitempty"`
	DueDate     *time.Time          `json:"due_date,omitempty"`
	IsFavorite  bool                `json:"is_favorite,omitempty"`
	IsRead      bool                `json:"is_read,omitempty"`
	IsPublic    bool                `json:"is_public,omitempty"`
	Author      string              `json:"author,omitempty"`
	FileSize    int64               `json:"file_size,omitempty"`
	MimeType    string              `json:"mime_type,omitempty"`
	FileType    string              `json:"file_type,omitempty"`
	Progress    int                 `json:"progress,omitempty"`
	Highights   map[string][]string `json:"highlights,omitempty"` // Search highlights
	Score       float64             `json:"score"`                // Relevance score
}

// SearchResponse represents the search response
type SearchResponse struct {
	Results      []SearchResult `json:"results"`
	Total        int64          `json:"total"`
	Query        string         `json:"query"`
	Filters      SearchFilters  `json:"filters"`
	Took         int64          `json:"took"`         // Time taken in milliseconds
	Suggestions  []string       `json:"suggestions"`  // Search suggestions
	Aggregations map[string]int `json:"aggregations"` // Content type counts
}

// EnhancedSearch handles POST /api/v1/search/enhanced
func EnhancedSearch(c *gin.Context) {
	var filters SearchFilters
	if err := c.ShouldBindJSON(&filters); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Set defaults
	if filters.ContentType == "" {
		filters.ContentType = "all"
	}
	if filters.Limit == 0 {
		filters.Limit = 20
	}
	if filters.Limit > 100 {
		filters.Limit = 100
	}

	startTime := time.Now()
	db := config.GetDB()
	userID := c.GetUint("user_id")

	var results []SearchResult
	var total int64
	aggregations := make(map[string]int)

	// Search based on content type
	switch filters.ContentType {
	case "bookmarks":
		results, total = searchBookmarks(db, userID, filters)
		aggregations["bookmarks"] = int(total)
	case "tasks":
		results, total = searchTasks(db, userID, filters)
		aggregations["tasks"] = int(total)
	case "notes":
		results, total = searchNotes(db, userID, filters)
		aggregations["notes"] = int(total)
	case "files":
		results, total = searchFiles(db, userID, filters)
		aggregations["files"] = int(total)
	default: // all
		bookmarkResults, bookmarkTotal := searchBookmarks(db, userID, filters)
		taskResults, taskTotal := searchTasks(db, userID, filters)
		noteResults, noteTotal := searchNotes(db, userID, filters)
		fileResults, fileTotal := searchFiles(db, userID, filters)

		results = append(append(append(bookmarkResults, taskResults...), noteResults...), fileResults...)
		total = bookmarkTotal + taskTotal + noteTotal + fileTotal

		aggregations["bookmarks"] = int(bookmarkTotal)
		aggregations["tasks"] = int(taskTotal)
		aggregations["notes"] = int(noteTotal)
		aggregations["files"] = int(fileTotal)
	}

	// Apply pagination
	if filters.Offset > 0 && len(results) > filters.Offset {
		results = results[filters.Offset:]
	}
	if len(results) > filters.Limit {
		results = results[:filters.Limit]
	}

	// Get search suggestions
	suggestions := getSearchSuggestions(db, userID, filters.Query)

	// Calculate time taken
	took := time.Since(startTime).Milliseconds()

	response := SearchResponse{
		Results:      results,
		Total:        total,
		Query:        filters.Query,
		Filters:      filters,
		Took:         took,
		Suggestions:  suggestions,
		Aggregations: aggregations,
	}

	c.JSON(http.StatusOK, response)
}

// searchBookmarks searches bookmarks with filters
func searchBookmarks(db *gorm.DB, userID uint, filters SearchFilters) ([]SearchResult, int64) {
	var bookmarks []models.Bookmark
	var results []SearchResult

	query := db.Where("user_id = ?", userID)

	// Text search
	if filters.Query != "" {
		searchTerm := "%" + strings.ToLower(filters.Query) + "%"
		query = query.Where("LOWER(title) LIKE ? OR LOWER(description) LIKE ? OR LOWER(content) LIKE ? OR LOWER(url) LIKE ?",
			searchTerm, searchTerm, searchTerm, searchTerm)
	}

	// Tags filter
	if len(filters.Tags) > 0 {
		query = query.Joins("JOIN bookmark_tags ON bookmarks.id = bookmark_tags.bookmark_id").
			Joins("JOIN tags ON bookmark_tags.tag_id = tags.id").
			Where("tags.name IN ?", filters.Tags)
	}

	// Date range filter
	if !filters.DateRange.Start.IsZero() {
		query = query.Where("created_at >= ?", filters.DateRange.Start)
	}
	if !filters.DateRange.End.IsZero() {
		query = query.Where("created_at <= ?", filters.DateRange.End)
	}

	// Boolean filters
	if filters.IsFavorite != nil {
		query = query.Where("is_favorite = ?", *filters.IsFavorite)
	}
	if filters.IsRead != nil {
		query = query.Where("is_read = ?", *filters.IsRead)
	}

	// Author filter
	if filters.Author != "" {
		query = query.Where("LOWER(author) LIKE ?", "%"+strings.ToLower(filters.Author)+"%")
	}

	// Count total
	var total int64
	query.Model(&models.Bookmark{}).Count(&total)

	// Get results with tags
	if err := query.Preload("Tags").Find(&bookmarks).Error; err != nil {
		return results, 0
	}

	// Convert to search results
	for _, bookmark := range bookmarks {
		result := SearchResult{
			ID:          bookmark.ID,
			Type:        "bookmark",
			Title:       bookmark.Title,
			Description: bookmark.Description,
			Content:     bookmark.Content,
			Tags:        bookmark.Tags,
			CreatedAt:   bookmark.CreatedAt,
			UpdatedAt:   bookmark.UpdatedAt,
			URL:         bookmark.URL,
			IsFavorite:  bookmark.IsFavorite,
			IsRead:      bookmark.IsRead,
			Author:      bookmark.Author,
			Score:       calculateRelevanceScore(filters.Query, bookmark.Title, bookmark.Description, bookmark.Content),
		}

		if bookmark.PublishedAt != nil {
			result.DueDate = bookmark.PublishedAt // Using DueDate field for published date
		}

		results = append(results, result)
	}

	return results, total
}

// searchTasks searches tasks with filters
func searchTasks(db *gorm.DB, userID uint, filters SearchFilters) ([]SearchResult, int64) {
	var tasks []models.Task
	var results []SearchResult

	query := db.Where("user_id = ?", userID)

	// Text search
	if filters.Query != "" {
		searchTerm := "%" + strings.ToLower(filters.Query) + "%"
		query = query.Where("LOWER(title) LIKE ? OR LOWER(description) LIKE ?", searchTerm, searchTerm)
	}

	// Tags filter
	if len(filters.Tags) > 0 {
		query = query.Joins("JOIN task_tags ON tasks.id = task_tags.task_id").
			Joins("JOIN tags ON task_tags.tag_id = tags.id").
			Where("tags.name IN ?", filters.Tags)
	}

	// Date range filter
	if !filters.DateRange.Start.IsZero() {
		query = query.Where("created_at >= ?", filters.DateRange.Start)
	}
	if !filters.DateRange.End.IsZero() {
		query = query.Where("created_at <= ?", filters.DateRange.End)
	}

	// Count total
	var total int64
	query.Model(&models.Task{}).Count(&total)

	// Get results with tags
	if err := query.Preload("Tags").Find(&tasks).Error; err != nil {
		return results, 0
	}

	// Convert to search results
	for _, task := range tasks {
		result := SearchResult{
			ID:          task.ID,
			Type:        "task",
			Title:       task.Title,
			Description: task.Description,
			Tags:        task.Tags,
			CreatedAt:   task.CreatedAt,
			UpdatedAt:   task.UpdatedAt,
			Status:      string(task.Status),
			Priority:    string(task.Priority),
			DueDate:     task.DueDate,
			Progress:    task.Progress,
			Score:       calculateRelevanceScore(filters.Query, task.Title, task.Description, ""),
		}

		results = append(results, result)
	}

	return results, total
}

// searchNotes searches notes with filters
func searchNotes(db *gorm.DB, userID uint, filters SearchFilters) ([]SearchResult, int64) {
	var notes []models.Note
	var results []SearchResult

	query := db.Where("user_id = ?", userID)

	// Text search
	if filters.Query != "" {
		searchTerm := "%" + strings.ToLower(filters.Query) + "%"
		query = query.Where("LOWER(title) LIKE ? OR LOWER(description) LIKE ? OR LOWER(content) LIKE ?",
			searchTerm, searchTerm, searchTerm)
	}

	// Tags filter
	if len(filters.Tags) > 0 {
		query = query.Joins("JOIN note_tags ON notes.id = note_tags.note_id").
			Joins("JOIN tags ON note_tags.tag_id = tags.id").
			Where("tags.name IN ?", filters.Tags)
	}

	// Date range filter
	if !filters.DateRange.Start.IsZero() {
		query = query.Where("created_at >= ?", filters.DateRange.Start)
	}
	if !filters.DateRange.End.IsZero() {
		query = query.Where("created_at <= ?", filters.DateRange.End)
	}

	// Boolean filters
	if filters.IsPublic != nil {
		query = query.Where("is_public = ?", *filters.IsPublic)
	}

	// Count total
	var total int64
	query.Model(&models.Note{}).Count(&total)

	// Get results with tags
	if err := query.Preload("Tags").Find(&notes).Error; err != nil {
		return results, 0
	}

	// Convert to search results
	for _, note := range notes {
		result := SearchResult{
			ID:          note.ID,
			Type:        "note",
			Title:       note.Title,
			Description: note.Description,
			Content:     note.Content,
			Tags:        note.Tags,
			CreatedAt:   note.CreatedAt,
			UpdatedAt:   note.UpdatedAt,
			IsPublic:    note.IsPublic,
			Score:       calculateRelevanceScore(filters.Query, note.Title, note.Description, note.Content),
		}

		results = append(results, result)
	}

	return results, total
}

// searchFiles searches files with filters
func searchFiles(db *gorm.DB, userID uint, filters SearchFilters) ([]SearchResult, int64) {
	var files []models.File
	var results []SearchResult

	query := db.Where("user_id = ?", userID)

	// Text search
	if filters.Query != "" {
		searchTerm := "%" + strings.ToLower(filters.Query) + "%"
		query = query.Where("LOWER(original_name) LIKE ? OR LOWER(description) LIKE ? OR LOWER(content) LIKE ?",
			searchTerm, searchTerm, searchTerm)
	}

	// Tags filter
	if len(filters.Tags) > 0 {
		query = query.Joins("JOIN file_tags ON files.id = file_tags.file_id").
			Joins("JOIN tags ON file_tags.tag_id = tags.id").
			Where("tags.name IN ?", filters.Tags)
	}

	// Date range filter
	if !filters.DateRange.Start.IsZero() {
		query = query.Where("created_at >= ?", filters.DateRange.Start)
	}
	if !filters.DateRange.End.IsZero() {
		query = query.Where("created_at <= ?", filters.DateRange.End)
	}

	// File type filter
	if len(filters.FileTypes) > 0 {
		query = query.Where("file_type IN ?", filters.FileTypes)
	}

	// Boolean filters
	if filters.IsPublic != nil {
		query = query.Where("is_public = ?", *filters.IsPublic)
	}

	// Count total
	var total int64
	query.Model(&models.File{}).Count(&total)

	// Get results with tags
	if err := query.Preload("Tags").Find(&files).Error; err != nil {
		return results, 0
	}

	// Convert to search results
	for _, file := range files {
		result := SearchResult{
			ID:          file.ID,
			Type:        "file",
			Title:       file.OriginalName,
			Description: file.Description,
			Content:     file.Content,
			Tags:        file.Tags,
			CreatedAt:   file.CreatedAt,
			UpdatedAt:   file.UpdatedAt,
			FileSize:    file.FileSize,
			MimeType:    file.MimeType,
			FileType:    string(file.FileType),
			IsPublic:    file.IsPublic,
			Score:       calculateRelevanceScore(filters.Query, file.OriginalName, file.Description, file.Content),
		}

		results = append(results, result)
	}

	return results, total
}

// calculateRelevanceScore calculates a simple relevance score for search results
func calculateRelevanceScore(query, title, description, content string) float64 {
	if query == "" {
		return 1.0
	}

	queryLower := strings.ToLower(query)
	titleLower := strings.ToLower(title)
	descLower := strings.ToLower(description)
	contentLower := strings.ToLower(content)

	score := 0.0

	// Title matches are most important
	if strings.Contains(titleLower, queryLower) {
		score += 10.0
		if strings.HasPrefix(titleLower, queryLower) {
			score += 5.0 // Bonus for prefix match
		}
	}

	// Description matches
	if strings.Contains(descLower, queryLower) {
		score += 5.0
	}

	// Content matches
	if strings.Contains(contentLower, queryLower) {
		score += 2.0
	}

	// Word-based scoring
	queryWords := strings.Fields(queryLower)
	for _, word := range queryWords {
		if strings.Contains(titleLower, word) {
			score += 3.0
		}
		if strings.Contains(descLower, word) {
			score += 1.5
		}
		if strings.Contains(contentLower, word) {
			score += 1.0
		}
	}

	return score
}

// getSearchSuggestions gets search suggestions based on user's search history and popular content
func getSearchSuggestions(db *gorm.DB, userID uint, query string) []string {
	// For now, return empty suggestions
	// In a future implementation, this could:
	// - Look at user's search history
	// - Suggest popular tags
	// - Suggest based on content titles
	// - Use AI to generate semantic suggestions
	return []string{}
}

// SaveSearch handles POST /api/v1/search/save
func SaveSearch(c *gin.Context) {
	var req struct {
		Query   string        `json:"query" binding:"required"`
		Filters SearchFilters `json:"filters"`
		Name    string        `json:"name" binding:"required"`
		Alert   bool          `json:"alert"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// TODO: Implement saved searches functionality
	// This would require a SavedSearch model

	c.JSON(http.StatusNotImplemented, gin.H{
		"message": "Saved searches functionality coming soon",
	})
}

// GetSearchAnalytics handles GET /api/v1/search/analytics
func GetSearchAnalytics(c *gin.Context) {
	// TODO: Implement search analytics
	// This could include:
	// - Most searched terms
	// - Search frequency over time
	// - Content type distribution
	// - Popular filters

	c.JSON(http.StatusNotImplemented, gin.H{
		"message": "Search analytics functionality coming soon",
	})
}
