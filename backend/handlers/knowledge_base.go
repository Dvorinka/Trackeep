package handlers

import (
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/trackeep/backend/models"
	"gorm.io/gorm"
)

// KnowledgeBaseHandler handles knowledge base and wiki operations
type KnowledgeBaseHandler struct {
	db *gorm.DB
}

// NewKnowledgeBaseHandler creates a new knowledge base handler
func NewKnowledgeBaseHandler(db *gorm.DB) *KnowledgeBaseHandler {
	return &KnowledgeBaseHandler{db: db}
}

// Wiki Page Handlers

// CreateWikiPage creates a new wiki page
func (h *KnowledgeBaseHandler) CreateWikiPage(c *gin.Context) {
	userID := c.GetUint("user_id")

	var req struct {
		Title           string   `json:"title" binding:"required"`
		Content         string   `json:"content"`
		Summary         string   `json:"summary"`
		CategoryID      *uint    `json:"category_id"`
		ParentID        *uint    `json:"parent_id"`
		Tags            []string `json:"tags"`
		Keywords        []string `json:"keywords"`
		IsPublic        bool     `json:"is_public"`
		IsTemplate      bool     `json:"is_template"`
		TemplateID      *uint    `json:"template_id"`
		IsCollaborative bool     `json:"is_collaborative"`
		CollaboratorIDs []uint   `json:"collaborator_ids"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Generate slug from title
	slug := generateSlug(req.Title)

	// Check if slug already exists
	var existingPage models.WikiPage
	if err := h.db.Where("slug = ? AND user_id = ?", slug, userID).First(&existingPage).Error; err == nil {
		// Slug exists, append timestamp
		slug = slug + "-" + strconv.FormatInt(time.Now().Unix(), 10)
	}

	page := models.WikiPage{
		UserID:          userID,
		Title:           req.Title,
		Slug:            slug,
		Content:         req.Content,
		Summary:         req.Summary,
		CategoryID:      req.CategoryID,
		ParentID:        req.ParentID,
		Keywords:        req.Keywords,
		IsPublic:        req.IsPublic,
		IsTemplate:      req.IsTemplate,
		TemplateID:      req.TemplateID,
		IsCollaborative: req.IsCollaborative,
		Status:          "draft",
	}

	// Calculate word count and reading time
	if req.Content != "" {
		page.WordCount = len(strings.Fields(req.Content))
		page.ReadingTime = estimateReadingTime(page.WordCount)
	}

	// Create page
	if err := h.db.Create(&page).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create wiki page"})
		return
	}

	// Handle tags
	if len(req.Tags) > 0 {
		h.addTagsToWikiPage(page.ID, req.Tags, userID)
	}

	// Handle collaborators
	if len(req.CollaboratorIDs) > 0 {
		h.addCollaboratorsToWikiPage(page.ID, req.CollaboratorIDs)
	}

	// Create initial version
	h.createWikiVersion(page.ID, 1, userID, "Initial version")

	// Process content for backlinks
	go h.processBacklinks(page.ID, req.Content)

	c.JSON(http.StatusCreated, page)
}

// GetWikiPages retrieves user's wiki pages
func (h *KnowledgeBaseHandler) GetWikiPages(c *gin.Context) {
	userID := c.GetUint("user_id")

	categoryID := c.Query("category_id")
	status := c.Query("status")
	search := c.Query("search")
	isPublic := c.Query("is_public")
	limit := 20
	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 100 {
			limit = parsed
		}
	}

	query := h.db.Where("user_id = ?", userID)

	if categoryID != "" {
		query = query.Where("category_id = ?", categoryID)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if search != "" {
		query = query.Where("title ILIKE ? OR content ILIKE ?", "%"+search+"%", "%"+search+"%")
	}
	if isPublic == "true" {
		query = query.Where("is_public = ?", true)
	}

	var pages []models.WikiPage
	if err := query.Preload("Category").Preload("Tags").Order("updated_at DESC").Limit(limit).Find(&pages).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch wiki pages"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"pages": pages,
		"limit": limit,
	})
}

// GetWikiPage retrieves a specific wiki page
func (h *KnowledgeBaseHandler) GetWikiPage(c *gin.Context) {
	userID := c.GetUint("user_id")
	pageID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid page ID"})
		return
	}

	var page models.WikiPage
	if err := h.db.Where("id = ? AND user_id = ?", pageID, userID).
		Preload("Category").
		Preload("Tags").
		Preload("Collaborators").
		Preload("LastEditedUser").
		First(&page).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Wiki page not found"})
		return
	}

	// Increment view count
	h.db.Model(&page).UpdateColumn("view_count", gorm.Expr("view_count + ?", 1))
	h.db.Model(&page).Update("last_viewed_at", time.Now())

	c.JSON(http.StatusOK, page)
}

// UpdateWikiPage updates a wiki page
func (h *KnowledgeBaseHandler) UpdateWikiPage(c *gin.Context) {
	userID := c.GetUint("user_id")
	pageID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid page ID"})
		return
	}

	var page models.WikiPage
	if err := h.db.Where("id = ? AND user_id = ?", pageID, userID).First(&page).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Wiki page not found"})
		return
	}

	var req struct {
		Title         string   `json:"title"`
		Content       string   `json:"content"`
		Summary       string   `json:"summary"`
		CategoryID    *uint    `json:"category_id"`
		Tags          []string `json:"tags"`
		Keywords      []string `json:"keywords"`
		IsPublic      bool     `json:"is_public"`
		Status        string   `json:"status"`
		ChangeLog     string   `json:"change_log"`
		IsMinorChange bool     `json:"is_minor_change"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Store old content for version tracking
	oldContent := page.Content

	// Update fields
	if req.Title != "" {
		page.Title = req.Title
		page.Slug = generateSlug(req.Title)
	}
	if req.Content != "" {
		page.Content = req.Content
	}
	if req.Summary != "" {
		page.Summary = req.Summary
	}
	if req.CategoryID != nil {
		page.CategoryID = req.CategoryID
	}
	if req.Keywords != nil {
		page.Keywords = req.Keywords
	}
	page.IsPublic = req.IsPublic
	if req.Status != "" {
		page.Status = req.Status
	}

	// Update metadata
	page.LastEditedBy = &userID
	page.EditCount++

	// Calculate word count and reading time
	if req.Content != "" {
		page.WordCount = len(strings.Fields(req.Content))
		page.ReadingTime = estimateReadingTime(page.WordCount)
	}

	if err := h.db.Save(&page).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update wiki page"})
		return
	}

	// Update tags
	if req.Tags != nil {
		h.updateWikiPageTags(page.ID, req.Tags, userID)
	}

	// Create new version if content changed
	if req.Content != "" && req.Content != oldContent {
		lastVersion := h.getLastWikiVersion(page.ID)
		newVersion := lastVersion + 1
		h.createWikiVersion(page.ID, newVersion, userID, req.ChangeLog)
	}

	// Process backlinks if content changed
	if req.Content != "" && req.Content != oldContent {
		go h.processBacklinks(page.ID, req.Content)
	}

	c.JSON(http.StatusOK, page)
}

// DeleteWikiPage deletes a wiki page
func (h *KnowledgeBaseHandler) DeleteWikiPage(c *gin.Context) {
	userID := c.GetUint("user_id")
	pageID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid page ID"})
		return
	}

	var page models.WikiPage
	if err := h.db.Where("id = ? AND user_id = ?", pageID, userID).First(&page).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Wiki page not found"})
		return
	}

	if err := h.db.Delete(&page).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete wiki page"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Wiki page deleted successfully"})
}

// Category Handlers

// CreateCategory creates a new category
func (h *KnowledgeBaseHandler) CreateCategory(c *gin.Context) {
	userID := c.GetUint("user_id")

	var req struct {
		Name        string `json:"name" binding:"required"`
		Description string `json:"description"`
		Color       string `json:"color"`
		Icon        string `json:"icon"`
		ParentID    *uint  `json:"parent_id"`
		IsPublic    bool   `json:"is_public"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	slug := generateSlug(req.Name)

	// Check if slug already exists
	var existingCategory models.Category
	if err := h.db.Where("slug = ? AND user_id = ?", slug, userID).First(&existingCategory).Error; err == nil {
		slug = slug + "-" + strconv.FormatInt(time.Now().Unix(), 10)
	}

	category := models.Category{
		UserID:      userID,
		Name:        req.Name,
		Slug:        slug,
		Description: req.Description,
		Color:       req.Color,
		Icon:        req.Icon,
		ParentID:    req.ParentID,
		IsPublic:    req.IsPublic,
	}

	if req.Color == "" {
		category.Color = "#6366f1"
	}

	if err := h.db.Create(&category).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create category"})
		return
	}

	c.JSON(http.StatusCreated, category)
}

// GetCategories retrieves user's categories
func (h *KnowledgeBaseHandler) GetCategories(c *gin.Context) {
	userID := c.GetUint("user_id")

	var categories []models.Category
	if err := h.db.Where("user_id = ?", userID).
		Preload("Children").
		Order("sort_order ASC, name ASC").
		Find(&categories).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch categories"})
		return
	}

	c.JSON(http.StatusOK, categories)
}

// SearchWikiPages searches within wiki pages
func (h *KnowledgeBaseHandler) SearchWikiPages(c *gin.Context) {
	userID := c.GetUint("user_id")

	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Search query is required"})
		return
	}

	contentType := c.Query("content_type")
	categoryID := c.Query("category_id")
	limit := 20
	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 100 {
			limit = parsed
		}
	}

	// Build search query
	dbQuery := h.db.Where("user_id = ?", userID)

	// Search in title, content, and summary
	searchCondition := h.db.Where("title ILIKE ?", "%"+query+"%").
		Or("content ILIKE ?", "%"+query+"%").
		Or("summary ILIKE ?", "%"+query+"%")

	dbQuery = dbQuery.Where(searchCondition)

	if contentType != "" {
		dbQuery = dbQuery.Where("content_type = ?", contentType)
	}
	if categoryID != "" {
		dbQuery = dbQuery.Where("category_id = ?", categoryID)
	}

	var pages []models.WikiPage
	if err := dbQuery.Preload("Category").Preload("Tags").
		Order("updated_at DESC").Limit(limit).Find(&pages).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to search wiki pages"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"pages": pages,
		"query": query,
		"limit": limit,
	})
}

// Helper functions

func generateSlug(title string) string {
	slug := strings.ToLower(title)
	slug = strings.ReplaceAll(slug, " ", "-")
	slug = regexp.MustCompile(`[^a-z0-9-]`).ReplaceAllString(slug, "")
	slug = regexp.MustCompile(`-+`).ReplaceAllString(slug, "-")
	slug = strings.Trim(slug, "-")
	return slug
}

func estimateReadingTime(wordCount int) int {
	readingSpeed := 225
	readingTime := wordCount / readingSpeed
	if readingTime < 1 {
		readingTime = 1
	}
	return readingTime
}

func (h *KnowledgeBaseHandler) addTagsToWikiPage(pageID uint, tags []string, userID uint) {
	for _, tagName := range tags {
		var tag models.Tag
		if err := h.db.Where("name = ? AND user_id = ?", tagName, userID).First(&tag).Error; err != nil {
			// Create new tag
			tag = models.Tag{
				UserID: userID,
				Name:   tagName,
				Color:  "#6366f1",
			}
			h.db.Create(&tag)
		}

		// Associate tag with page
		h.db.Exec("INSERT INTO wiki_page_tags (wiki_page_id, tag_id) VALUES (?, ?) ON CONFLICT DO NOTHING", pageID, tag.ID)
	}
}

func (h *KnowledgeBaseHandler) updateWikiPageTags(pageID uint, tags []string, userID uint) {
	// Remove existing tags
	h.db.Exec("DELETE FROM wiki_page_tags WHERE wiki_page_id = ?", pageID)

	// Add new tags
	h.addTagsToWikiPage(pageID, tags, userID)
}

func (h *KnowledgeBaseHandler) addCollaboratorsToWikiPage(pageID uint, collaboratorIDs []uint) {
	for _, collaboratorID := range collaboratorIDs {
		h.db.Exec("INSERT INTO wiki_collaborators (wiki_page_id, user_id) VALUES (?, ?) ON CONFLICT DO NOTHING", pageID, collaboratorID)
	}
}

func (h *KnowledgeBaseHandler) createWikiVersion(pageID uint, versionNumber int, authorID uint, changeLog string) {
	var page models.WikiPage
	h.db.First(&page, pageID)

	version := models.WikiVersion{
		WikiPageID:    pageID,
		VersionNumber: versionNumber,
		Title:         page.Title,
		Content:       page.Content,
		Summary:       page.Summary,
		ChangeLog:     changeLog,
		AuthorID:      authorID,
		WordCount:     page.WordCount,
		IsMinorChange: changeLog == "" || strings.Contains(strings.ToLower(changeLog), "minor"),
	}

	h.db.Create(&version)
}

func (h *KnowledgeBaseHandler) getLastWikiVersion(pageID uint) int {
	var version models.WikiVersion
	h.db.Where("wiki_page_id = ?", pageID).Order("version_number DESC").First(&version)
	return version.VersionNumber
}

func (h *KnowledgeBaseHandler) processBacklinks(pageID uint, content string) {
	// Extract wiki links from content (e.g., [[Page Name]])
	re := regexp.MustCompile(`\[\[([^\]]+)\]\]`)
	matches := re.FindAllStringSubmatch(content, -1)

	for _, match := range matches {
		if len(match) > 1 {
			linkText := match[1]
			// Find target page
			var targetPage models.WikiPage
			if err := h.db.Where("title = ? OR slug = ?", linkText, linkText).First(&targetPage).Error; err == nil {
				// Create backlink
				backlink := models.WikiBacklink{
					SourcePageID: pageID,
					TargetPageID: targetPage.ID,
					LinkText:     linkText,
				}
				h.db.Create(&backlink)
			}
		}
	}
}
