package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/trackeep/backend/models"
)

// SavedSearchRequest represents the request payload for creating/updating saved searches
type SavedSearchRequest struct {
	Name        string                 `json:"name" binding:"required"`
	Query       string                 `json:"query" binding:"required"`
	Filters     map[string]interface{} `json:"filters"`
	Alert       bool                   `json:"alert"`
	IsPublic    bool                   `json:"is_public"`
	Description string                 `json:"description"`
	Tags        []string               `json:"tags"`
}

// SavedSearchResponse represents the response payload for saved searches
type SavedSearchResponse struct {
	ID          uint                    `json:"id"`
	Name        string                  `json:"name"`
	Query       string                  `json:"query"`
	Filters     map[string]interface{}  `json:"filters"`
	Alert       bool                    `json:"alert"`
	LastRun     *time.Time              `json:"last_run"`
	RunCount    int                     `json:"run_count"`
	IsPublic    bool                    `json:"is_public"`
	Description string                  `json:"description"`
	Tags        []models.SavedSearchTag `json:"tags"`
	CreatedAt   time.Time               `json:"created_at"`
	UpdatedAt   time.Time               `json:"updated_at"`
}

// CreateSavedSearch handles POST /api/v1/search/saved
func CreateSavedSearch(c *gin.Context) {
	var req SavedSearchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.GetUint("user_id")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Serialize filters to JSON
	filtersJSON, err := json.Marshal(req.Filters)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid filters format"})
		return
	}

	// Create saved search
	savedSearch := models.SavedSearch{
		UserID:   userID,
		Name:     req.Name,
		Query:    req.Query,
		Filters:  string(filtersJSON),
		Alert:    req.Alert,
		IsPublic: req.IsPublic,
		RunCount: 0,
		Tags:     []models.SavedSearchTag{},
	}

	// Handle tags
	if len(req.Tags) > 0 {
		db := c.MustGet("db").(*gorm.DB)
		for _, tagName := range req.Tags {
			var tag models.SavedSearchTag
			if err := db.Where("name = ?", tagName).First(&tag).Error; err != nil {
				// Create new tag if it doesn't exist
				tag = models.SavedSearchTag{
					Name:  tagName,
					Color: "#3b82f6", // Default blue color
				}
				db.Create(&tag)
			}
			savedSearch.Tags = append(savedSearch.Tags, tag)
		}
	}

	db := c.MustGet("db").(*gorm.DB)
	if err := db.Create(&savedSearch).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create saved search"})
		return
	}

	// Load tags for response
	db.Preload("Tags").First(&savedSearch, savedSearch.ID)

	response := SavedSearchResponse{
		ID:          savedSearch.ID,
		Name:        savedSearch.Name,
		Query:       savedSearch.Query,
		Alert:       savedSearch.Alert,
		LastRun:     savedSearch.LastRun,
		RunCount:    savedSearch.RunCount,
		IsPublic:    savedSearch.IsPublic,
		Description: savedSearch.Description,
		Tags:        savedSearch.Tags,
		CreatedAt:   savedSearch.CreatedAt,
		UpdatedAt:   savedSearch.UpdatedAt,
	}

	// Parse filters back to map
	json.Unmarshal([]byte(savedSearch.Filters), &response.Filters)

	c.JSON(http.StatusCreated, response)
}

// GetUserSavedSearches handles GET /api/v1/search/saved
func GetUserSavedSearches(c *gin.Context) {
	userID := c.GetUint("user_id")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	db := c.MustGet("db").(*gorm.DB)

	// Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	tagFilter := c.Query("tag")
	alertFilter := c.Query("alert")

	offset := (page - 1) * limit

	query := db.Model(&models.SavedSearch{}).Where("user_id = ? OR is_public = ?", userID, true)

	// Apply filters
	if tagFilter != "" {
		query = query.Joins("JOIN saved_search_tags ON saved_search_tags.id = saved_searches.id").
			Joins("JOIN saved_search_tag_saved_searches ON saved_search_tag_saved_searches.saved_search_id = saved_searches.id").
			Joins("JOIN saved_search_tags t ON t.id = saved_search_tag_saved_searches.saved_search_tag_id").
			Where("t.name = ?", tagFilter)
	}

	if alertFilter == "true" {
		query = query.Where("alert = ?", true)
	} else if alertFilter == "false" {
		query = query.Where("alert = ?", false)
	}

	var savedSearches []models.SavedSearch
	var total int64

	if err := query.Preload("Tags").Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count saved searches"})
		return
	}

	if err := query.Preload("Tags").Offset(offset).Limit(limit).Order("created_at DESC").Find(&savedSearches).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch saved searches"})
		return
	}

	// Convert to response format
	var responses []SavedSearchResponse
	for _, ss := range savedSearches {
		var filters map[string]interface{}
		json.Unmarshal([]byte(ss.Filters), &filters)

		response := SavedSearchResponse{
			ID:          ss.ID,
			Name:        ss.Name,
			Query:       ss.Query,
			Filters:     filters,
			Alert:       ss.Alert,
			LastRun:     ss.LastRun,
			RunCount:    ss.RunCount,
			IsPublic:    ss.IsPublic,
			Description: ss.Description,
			Tags:        ss.Tags,
			CreatedAt:   ss.CreatedAt,
			UpdatedAt:   ss.UpdatedAt,
		}
		responses = append(responses, response)
	}

	c.JSON(http.StatusOK, gin.H{
		"saved_searches": responses,
		"total":          total,
		"page":           page,
		"limit":          limit,
	})
}

// GetSavedSearch handles GET /api/v1/search/saved/:id
func GetSavedSearch(c *gin.Context) {
	userID := c.GetUint("user_id")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid saved search ID"})
		return
	}

	db := c.MustGet("db").(*gorm.DB)
	var savedSearch models.SavedSearch

	if err := db.Preload("Tags").Where("id = ? AND (user_id = ? OR is_public = ?)", id, userID, true).First(&savedSearch).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Saved search not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch saved search"})
		}
		return
	}

	var filters map[string]interface{}
	json.Unmarshal([]byte(savedSearch.Filters), &filters)

	response := SavedSearchResponse{
		ID:          savedSearch.ID,
		Name:        savedSearch.Name,
		Query:       savedSearch.Query,
		Filters:     filters,
		Alert:       savedSearch.Alert,
		LastRun:     savedSearch.LastRun,
		RunCount:    savedSearch.RunCount,
		IsPublic:    savedSearch.IsPublic,
		Description: savedSearch.Description,
		Tags:        savedSearch.Tags,
		CreatedAt:   savedSearch.CreatedAt,
		UpdatedAt:   savedSearch.UpdatedAt,
	}

	c.JSON(http.StatusOK, response)
}

// UpdateSavedSearch handles PUT /api/v1/search/saved/:id
func UpdateSavedSearch(c *gin.Context) {
	userID := c.GetUint("user_id")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid saved search ID"})
		return
	}

	var req SavedSearchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	db := c.MustGet("db").(*gorm.DB)
	var savedSearch models.SavedSearch

	if err := db.Where("id = ? AND user_id = ?", id, userID).First(&savedSearch).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Saved search not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch saved search"})
		}
		return
	}

	// Update fields
	savedSearch.Name = req.Name
	savedSearch.Query = req.Query
	savedSearch.Alert = req.Alert
	savedSearch.IsPublic = req.IsPublic
	savedSearch.Description = req.Description

	// Update filters
	filtersJSON, err := json.Marshal(req.Filters)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid filters format"})
		return
	}
	savedSearch.Filters = string(filtersJSON)

	// Update tags
	if err := db.Model(&savedSearch).Association("Tags").Clear(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to clear tags"})
		return
	}

	for _, tagName := range req.Tags {
		var tag models.SavedSearchTag
		if err := db.Where("name = ?", tagName).First(&tag).Error; err != nil {
			tag = models.SavedSearchTag{
				Name:  tagName,
				Color: "#3b82f6",
			}
			db.Create(&tag)
		}
		if err := db.Model(&savedSearch).Association("Tags").Append(&tag); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add tag"})
			return
		}
	}

	if err := db.Save(&savedSearch).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update saved search"})
		return
	}

	// Load updated data
	db.Preload("Tags").First(&savedSearch, savedSearch.ID)

	var filters map[string]interface{}
	json.Unmarshal([]byte(savedSearch.Filters), &filters)

	response := SavedSearchResponse{
		ID:          savedSearch.ID,
		Name:        savedSearch.Name,
		Query:       savedSearch.Query,
		Filters:     filters,
		Alert:       savedSearch.Alert,
		LastRun:     savedSearch.LastRun,
		RunCount:    savedSearch.RunCount,
		IsPublic:    savedSearch.IsPublic,
		Description: savedSearch.Description,
		Tags:        savedSearch.Tags,
		CreatedAt:   savedSearch.CreatedAt,
		UpdatedAt:   savedSearch.UpdatedAt,
	}

	c.JSON(http.StatusOK, response)
}

// DeleteSavedSearch handles DELETE /api/v1/search/saved/:id
func DeleteSavedSearch(c *gin.Context) {
	userID := c.GetUint("user_id")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid saved search ID"})
		return
	}

	db := c.MustGet("db").(*gorm.DB)
	result := db.Where("id = ? AND user_id = ?", id, userID).Delete(&models.SavedSearch{})

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete saved search"})
		return
	}

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Saved search not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Saved search deleted successfully"})
}

// RunSavedSearch handles POST /api/v1/search/saved/:id/run
func RunSavedSearch(c *gin.Context) {
	userID := c.GetUint("user_id")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid saved search ID"})
		return
	}

	db := c.MustGet("db").(*gorm.DB)
	var savedSearch models.SavedSearch

	if err := db.Where("id = ? AND (user_id = ? OR is_public = ?)", id, userID, true).First(&savedSearch).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Saved search not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch saved search"})
		}
		return
	}

	// Parse filters
	var filters map[string]interface{}
	if err := json.Unmarshal([]byte(savedSearch.Filters), &filters); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse filters"})
		return
	}

	// Create search request based on saved search
	searchReq := map[string]interface{}{
		"query": savedSearch.Query,
	}

	// Merge filters
	for k, v := range filters {
		searchReq[k] = v
	}

	// Perform the search using existing enhanced search logic
	// This is a simplified version - in production, you'd want to reuse the actual search handler
	searchResults, err := performSearchFromSavedSearch(searchReq, userID, db)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to execute search"})
		return
	}

	// Update saved search run statistics
	now := time.Now()
	savedSearch.LastRun = &now
	savedSearch.RunCount++
	db.Save(&savedSearch)

	// Log search analytics
	logSearchAnalytics(userID, savedSearch.Query, savedSearch.Filters, len(searchResults), db)

	c.JSON(http.StatusOK, gin.H{
		"results": searchResults,
		"query":   savedSearch.Query,
		"filters": filters,
		"total":   len(searchResults),
		"saved_search": gin.H{
			"id":        savedSearch.ID,
			"name":      savedSearch.Name,
			"last_run":  savedSearch.LastRun,
			"run_count": savedSearch.RunCount,
		},
	})
}

// GetSavedSearchTags handles GET /api/v1/search/saved/tags
func GetSavedSearchTags(c *gin.Context) {
	userID := c.GetUint("user_id")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	db := c.MustGet("db").(*gorm.DB)
	var tags []models.SavedSearchTag

	if err := db.Order("name").Find(&tags).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch tags"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"tags": tags})
}

// Helper function to perform search from saved search
func performSearchFromSavedSearch(searchReq map[string]interface{}, userID uint, db *gorm.DB) ([]interface{}, error) {
	// Build search filters from the request
	filters := SearchFilters{
		Query:       getStringValue(searchReq, "query"),
		ContentType: getStringValue(searchReq, "content_type"),
		Limit:       getIntValue(searchReq, "limit", 20),
		Offset:      getIntValue(searchReq, "offset", 0),
	}

	// Parse tags if present
	if tags, ok := searchReq["tags"].([]interface{}); ok {
		for _, tag := range tags {
			if tagStr, ok := tag.(string); ok {
				filters.Tags = append(filters.Tags, tagStr)
			}
		}
	}

	// Parse date range if present
	if dateRange, ok := searchReq["date_range"].(map[string]interface{}); ok {
		if startStr, ok := dateRange["start"].(string); ok && startStr != "" {
			if startTime, err := time.Parse("2006-01-02", startStr); err == nil {
				filters.DateRange.Start = startTime
			}
		}
		if endStr, ok := dateRange["end"].(string); ok && endStr != "" {
			if endTime, err := time.Parse("2006-01-02", endStr); err == nil {
				filters.DateRange.End = endTime
			}
		}
	}

	// Parse boolean filters
	if isFavorite, ok := searchReq["is_favorite"].(bool); ok {
		filters.IsFavorite = &isFavorite
	}
	if isRead, ok := searchReq["is_read"].(bool); ok {
		filters.IsRead = &isRead
	}
	if isPublic, ok := searchReq["is_public"].(bool); ok {
		filters.IsPublic = &isPublic
	}

	// Perform the search using existing enhanced search logic
	results, err := performEnhancedSearch(filters, userID, db)
	if err != nil {
		return nil, err
	}

	// Convert results to interface slice
	var interfaceResults []interface{}
	for _, result := range results {
		interfaceResults = append(interfaceResults, result)
	}

	return interfaceResults, nil
}

// Helper function to perform enhanced search (reused from search_enhanced.go)
func performEnhancedSearch(filters SearchFilters, userID uint, db *gorm.DB) ([]SearchResult, error) {
	var results []SearchResult

	// Search bookmarks
	if filters.ContentType == "all" || filters.ContentType == "bookmarks" {
		var bookmarks []models.Bookmark
		query := db.Where("user_id = ?", userID)

		// Apply text search
		if filters.Query != "" {
			query = query.Where("title ILIKE ? OR description ILIKE ? OR content ILIKE ?",
				"%"+filters.Query+"%", "%"+filters.Query+"%", "%"+filters.Query+"%")
		}

		// Apply filters
		if filters.IsFavorite != nil {
			query = query.Where("is_favorite = ?", *filters.IsFavorite)
		}

		if err := query.Limit(filters.Limit).Offset(filters.Offset).Find(&bookmarks).Error; err != nil {
			return nil, err
		}

		for _, bookmark := range bookmarks {
			result := SearchResult{
				ID:          bookmark.ID,
				Type:        "bookmark",
				Title:       bookmark.Title,
				Description: bookmark.Description,
				Content:     bookmark.Content,
				CreatedAt:   bookmark.CreatedAt,
				UpdatedAt:   bookmark.UpdatedAt,
				URL:         bookmark.URL,
				IsFavorite:  bookmark.IsFavorite,
				IsRead:      bookmark.IsRead,
			}
			results = append(results, result)
		}
	}

	// Search tasks
	if filters.ContentType == "all" || filters.ContentType == "tasks" {
		var tasks []models.Task
		query := db.Where("user_id = ?", userID)

		if filters.Query != "" {
			query = query.Where("title ILIKE ? OR description ILIKE ?",
				"%"+filters.Query+"%", "%"+filters.Query+"%")
		}

		if err := query.Limit(filters.Limit).Offset(filters.Offset).Find(&tasks).Error; err != nil {
			return nil, err
		}

		for _, task := range tasks {
			result := SearchResult{
				ID:          task.ID,
				Type:        "task",
				Title:       task.Title,
				Description: task.Description,
				CreatedAt:   task.CreatedAt,
				UpdatedAt:   task.UpdatedAt,
				Status:      string(task.Status),
				Priority:    string(task.Priority),
				DueDate:     task.DueDate,
			}
			results = append(results, result)
		}
	}

	// Search notes
	if filters.ContentType == "all" || filters.ContentType == "notes" {
		var notes []models.Note
		query := db.Where("user_id = ?", userID)

		if filters.Query != "" {
			query = query.Where("title ILIKE ? OR content ILIKE ?",
				"%"+filters.Query+"%", "%"+filters.Query+"%")
		}

		if err := query.Limit(filters.Limit).Offset(filters.Offset).Find(&notes).Error; err != nil {
			return nil, err
		}

		for _, note := range notes {
			result := SearchResult{
				ID:          note.ID,
				Type:        "note",
				Title:       note.Title,
				Description: note.Content[:min(200, len(note.Content))],
				Content:     note.Content,
				CreatedAt:   note.CreatedAt,
				UpdatedAt:   note.UpdatedAt,
				IsPublic:    note.IsPublic,
			}
			results = append(results, result)
		}
	}

	return results, nil
}

// Helper functions
func getStringValue(m map[string]interface{}, key string) string {
	if val, ok := m[key].(string); ok {
		return val
	}
	return ""
}

func getIntValue(m map[string]interface{}, key string, defaultValue int) int {
	if val, ok := m[key].(float64); ok {
		return int(val)
	}
	return defaultValue
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// Helper function to log search analytics
func logSearchAnalytics(userID uint, query string, filters string, resultsCount int, db *gorm.DB) {
	analytics := models.SearchAnalytics{
		UserID:       userID,
		Query:        query,
		Filters:      filters,
		ResultsCount: resultsCount,
		Took:         0, // Would be measured in actual implementation
		ContentType:  "mixed",
	}

	db.Create(&analytics)
}
