package handlers

import (
	"fmt"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gocolly/colly/v2"
	"github.com/trackeep/backend/models"
	"gorm.io/gorm"
)

// WebScrapingHandler handles web scraping operations
type WebScrapingHandler struct {
	db *gorm.DB
}

// NewWebScrapingHandler creates a new web scraping handler
func NewWebScrapingHandler(db *gorm.DB) *WebScrapingHandler {
	return &WebScrapingHandler{db: db}
}

// CreateScrapingJob creates a new web scraping job
func (h *WebScrapingHandler) CreateScrapingJob(c *gin.Context) {
	userID := c.GetUint("user_id")

	var req struct {
		URL             string `json:"url" binding:"required"`
		JobType         string `json:"job_type"`
		Priority        string `json:"priority"`
		ExtractImages   bool   `json:"extract_images"`
		ExtractLinks    bool   `json:"extract_links"`
		ExtractVideos   bool   `json:"extract_videos"`
		GenerateSummary bool   `json:"generate_summary"`
		DownloadImages  bool   `json:"download_images"`
		ExtractMetadata bool   `json:"extract_metadata"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate URL
	if _, err := url.ParseRequestURI(req.URL); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid URL format"})
		return
	}

	// Set defaults
	if req.JobType == "" {
		req.JobType = "full_scrape"
	}
	if req.Priority == "" {
		req.Priority = "normal"
	}

	job := models.ScrapingJob{
		UserID:          userID,
		URL:             req.URL,
		JobType:         req.JobType,
		Priority:        req.Priority,
		ExtractImages:   req.ExtractImages,
		ExtractLinks:    req.ExtractLinks,
		ExtractVideos:   req.ExtractVideos,
		GenerateSummary: req.GenerateSummary,
		DownloadImages:  req.DownloadImages,
		ExtractMetadata: req.ExtractMetadata,
		Status:          "pending",
	}

	if err := h.db.Create(&job).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create scraping job"})
		return
	}

	// Start processing the job asynchronously
	go h.processScrapingJob(job.ID)

	c.JSON(http.StatusCreated, job)
}

// GetScrapingJobs returns user's scraping jobs
func (h *WebScrapingHandler) GetScrapingJobs(c *gin.Context) {
	userID := c.GetUint("user_id")

	status := c.Query("status")
	limit := 20
	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 100 {
			limit = parsed
		}
	}

	query := h.db.Where("user_id = ?", userID)
	if status != "" {
		query = query.Where("status = ?", status)
	}

	var jobs []models.ScrapingJob
	if err := query.Order("created_at DESC").Limit(limit).Find(&jobs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch scraping jobs"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"jobs":  jobs,
		"limit": limit,
	})
}

// GetScrapingJob returns a specific scraping job
func (h *WebScrapingHandler) GetScrapingJob(c *gin.Context) {
	userID := c.GetUint("user_id")
	jobID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid job ID"})
		return
	}

	var job models.ScrapingJob
	if err := h.db.Where("id = ? AND user_id = ?", jobID, userID).
		Preload("ScrapedContent").
		First(&job).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Scraping job not found"})
		return
	}

	c.JSON(http.StatusOK, job)
}

// GetScrapedContent returns scraped content
func (h *WebScrapingHandler) GetScrapedContent(c *gin.Context) {
	userID := c.GetUint("user_id")
	contentID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid content ID"})
		return
	}

	var content models.ScrapedContent
	if err := h.db.Where("id = ? AND user_id = ?", contentID, userID).
		Preload("Images").
		Preload("Links").
		Preload("Videos").
		Preload("Tags").
		First(&content).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Scraped content not found"})
		return
	}

	c.JSON(http.StatusOK, content)
}

// GetScrapedContentList returns user's scraped content
func (h *WebScrapingHandler) GetScrapedContentList(c *gin.Context) {
	userID := c.GetUint("user_id")

	contentType := c.Query("content_type")
	domain := c.Query("domain")
	limit := 20
	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 100 {
			limit = parsed
		}
	}

	query := h.db.Where("user_id = ?", userID)
	if contentType != "" {
		query = query.Where("content_type = ?", contentType)
	}
	if domain != "" {
		query = query.Where("domain = ?", domain)
	}

	var content []models.ScrapedContent
	if err := query.Order("last_scraped DESC").Limit(limit).Find(&content).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch scraped content"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"content": content,
		"limit":   limit,
	})
}

// DeleteScrapingJob deletes a scraping job
func (h *WebScrapingHandler) DeleteScrapingJob(c *gin.Context) {
	userID := c.GetUint("user_id")
	jobID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid job ID"})
		return
	}

	var job models.ScrapingJob
	if err := h.db.Where("id = ? AND user_id = ?", jobID, userID).First(&job).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Scraping job not found"})
		return
	}

	// Only allow deletion of pending, completed, or failed jobs
	if job.Status == "processing" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot delete job that is currently processing"})
		return
	}

	if err := h.db.Delete(&job).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete scraping job"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Scraping job deleted successfully"})
}

// DeleteScrapedContent deletes scraped content
func (h *WebScrapingHandler) DeleteScrapedContent(c *gin.Context) {
	userID := c.GetUint("user_id")
	contentID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid content ID"})
		return
	}

	var content models.ScrapedContent
	if err := h.db.Where("id = ? AND user_id = ?", contentID, userID).First(&content).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Scraped content not found"})
		return
	}

	if err := h.db.Delete(&content).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete scraped content"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Scraped content deleted successfully"})
}

// SearchScrapedContent searches within scraped content
func (h *WebScrapingHandler) SearchScrapedContent(c *gin.Context) {
	userID := c.GetUint("user_id")

	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Search query is required"})
		return
	}

	contentType := c.Query("content_type")
	domain := c.Query("domain")
	limit := 20
	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 100 {
			limit = parsed
		}
	}

	// Build search query
	dbQuery := h.db.Where("user_id = ?", userID)

	// Search in title, content, and description
	searchCondition := h.db.Where("title ILIKE ?", "%"+query+"%").
		Or("content ILIKE ?", "%"+query+"%").
		Or("description ILIKE ?", "%"+query+"%")

	dbQuery = dbQuery.Where(searchCondition)

	if contentType != "" {
		dbQuery = dbQuery.Where("content_type = ?", contentType)
	}
	if domain != "" {
		dbQuery = dbQuery.Where("domain = ?", domain)
	}

	var content []models.ScrapedContent
	if err := dbQuery.Order("last_scraped DESC").Limit(limit).Find(&content).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to search scraped content"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"content": content,
		"query":   query,
		"limit":   limit,
	})
}

// Helper functions

// processScrapingJob processes a scraping job asynchronously
func (h *WebScrapingHandler) processScrapingJob(jobID uint) {
	var job models.ScrapingJob
	if err := h.db.First(&job, jobID).Error; err != nil {
		return
	}

	// Update job status to processing
	now := time.Now()
	job.Status = "processing"
	job.StartedAt = &now
	h.db.Save(&job)

	// Perform the scraping
	scrapedContent, err := h.scrapeWebPage(job.URL, job)
	if err != nil {
		job.Status = "failed"
		job.ErrorMessage = err.Error()
		completedAt := time.Now()
		job.CompletedAt = &completedAt
		h.db.Save(&job)
		return
	}

	// Update job with results
	job.Status = "completed"
	job.ScrapedContentID = &scrapedContent.ID
	job.Progress = 100
	completedAt := time.Now()
	job.CompletedAt = &completedAt
	h.db.Save(&job)
}

// scrapeWebPage scrapes a web page and extracts content
func (h *WebScrapingHandler) scrapeWebPage(pageURL string, job models.ScrapingJob) (*models.ScrapedContent, error) {
	parsedURL, err := url.Parse(pageURL)
	if err != nil {
		return nil, fmt.Errorf("invalid URL: %w", err)
	}

	// Create a new collector
	c := colly.NewCollector(
		colly.AllowURLRevisit(),
		colly.Async(true),
	)

	// Set up content extraction variables
	var title, description, content string
	var keywords []string
	var images []models.ScrapedImage
	var links []models.ScrapedLink
	var videos []models.ScrapedVideo

	// Extract title
	c.OnHTML("title", func(e *colly.HTMLElement) {
		title = strings.TrimSpace(e.Text)
	})

	// Extract meta description
	c.OnHTML("meta[name='description']", func(e *colly.HTMLElement) {
		if description == "" {
			description = e.Attr("content")
		}
	})

	// Extract meta keywords
	c.OnHTML("meta[name='keywords']", func(e *colly.HTMLElement) {
		if len(keywords) == 0 {
			keywordsStr := e.Attr("content")
			if keywordsStr != "" {
				keywords = strings.Split(keywordsStr, ",")
				for i, kw := range keywords {
					keywords[i] = strings.TrimSpace(kw)
				}
			}
		}
	})

	// Extract main content
	c.OnHTML("article, main, .content, .post-content, .entry-content", func(e *colly.HTMLElement) {
		content = strings.TrimSpace(e.Text)
	})

	// Fallback to body content if no specific content found
	c.OnHTML("body", func(e *colly.HTMLElement) {
		if content == "" {
			content = strings.TrimSpace(e.Text)
		}
	})

	// Extract images if requested
	if job.ExtractImages {
		c.OnHTML("img", func(e *colly.HTMLElement) {
			src := e.Attr("src")
			alt := e.Attr("alt")

			// Convert relative URLs to absolute
			if src != "" {
				if strings.HasPrefix(src, "/") {
					src = parsedURL.Scheme + "://" + parsedURL.Host + src
				} else if !strings.HasPrefix(src, "http") {
					src = parsedURL.Scheme + "://" + parsedURL.Host + "/" + src
				}

				images = append(images, models.ScrapedImage{
					URL:         src,
					AltText:     alt,
					Format:      h.getImageFormat(src),
					IsMainImage: false,
				})
			}
		})
	}

	// Extract links if requested
	if job.ExtractLinks {
		c.OnHTML("a[href]", func(e *colly.HTMLElement) {
			href := e.Attr("href")
			text := strings.TrimSpace(e.Text)

			if href != "" && text != "" {
				// Convert relative URLs to absolute
				if strings.HasPrefix(href, "/") {
					href = parsedURL.Scheme + "://" + parsedURL.Host + href
				}

				linkType := "external"
				if strings.Contains(href, parsedURL.Host) {
					linkType = "internal"
				}

				links = append(links, models.ScrapedLink{
					URL:      href,
					Text:     text,
					LinkType: linkType,
					Domain:   h.getDomainFromURL(href),
				})
			}
		})
	}

	// Extract videos if requested
	if job.ExtractVideos {
		c.OnHTML("iframe[src], video source", func(e *colly.HTMLElement) {
			src := e.Attr("src")
			title := e.Attr("title")

			if src != "" {
				platform := h.getVideoPlatform(src)
				videos = append(videos, models.ScrapedVideo{
					URL:      src,
					Title:    title,
					Platform: platform,
					VideoID:  h.getVideoID(src, platform),
				})
			}
		})
	}

	// Set error handler
	c.OnError(func(r *colly.Response, err error) {
		fmt.Printf("Error scraping %s: %v\n", r.Request.URL, err)
	})

	// Start scraping
	err = c.Visit(pageURL)
	if err != nil {
		return nil, fmt.Errorf("failed to visit page: %w", err)
	}

	c.Wait()

	// Clean and process content
	if content == "" {
		content = "No content could be extracted from this page."
	}

	if description == "" {
		description = content
		if len(description) > 200 {
			description = description[:200] + "..."
		}
	}

	// Generate keywords if none found
	if len(keywords) == 0 && job.ExtractMetadata {
		keywords = h.extractKeywordsFromContent(content)
	}

	// Create the scraped content
	scrapedContent := models.ScrapedContent{
		UserID:       job.UserID,
		URL:          pageURL,
		Domain:       parsedURL.Hostname(),
		Title:        title,
		Description:  description,
		Content:      content,
		Keywords:     keywords,
		ContentType:  h.detectContentType(title, content),
		WordCount:    len(strings.Fields(content)),
		ReadingTime:  h.estimateReadingTime(len(strings.Fields(content))),
		QualityScore: 0, // Will be calculated below
		Status:       "completed",
		LastScraped:  time.Now(),
	}

	// Generate summary if requested
	if job.GenerateSummary {
		scrapedContent.Summary = h.generateSummary(content)
	}

	// Create the content in database
	if err := h.db.Create(&scrapedContent).Error; err != nil {
		return nil, fmt.Errorf("failed to save scraped content: %w", err)
	}

	// Save related content
	if len(images) > 0 {
		for i := range images {
			images[i].ScrapedContentID = scrapedContent.ID
		}
		h.db.Create(&images)
	}

	if len(links) > 0 {
		for i := range links {
			links[i].ScrapedContentID = scrapedContent.ID
		}
		h.db.Create(&links)
	}

	if len(videos) > 0 {
		for i := range videos {
			videos[i].ScrapedContentID = scrapedContent.ID
		}
		h.db.Create(&videos)
	}

	// Calculate and save quality score
	scrapedContent.QualityScore = h.calculateQualityScore(scrapedContent)
	h.db.Save(&scrapedContent)

	return &scrapedContent, nil
}

// extractTextFromHTML extracts text content from HTML
func (h *WebScrapingHandler) extractTextFromHTML(html string) string {
	// Remove HTML tags
	re := regexp.MustCompile(`<[^>]*>`)
	text := re.ReplaceAllString(html, "")

	// Clean up whitespace
	text = strings.TrimSpace(text)
	text = regexp.MustCompile(`\s+`).ReplaceAllString(text, " ")

	return text
}

// estimateReadingTime estimates reading time in minutes
func (h *WebScrapingHandler) estimateReadingTime(wordCount int) int {
	// Average reading speed: 200-250 words per minute
	readingSpeed := 225
	readingTime := wordCount / readingSpeed
	if readingTime < 1 {
		readingTime = 1
	}
	return readingTime
}

// calculateQualityScore calculates a quality score for the content
func (h *WebScrapingHandler) calculateQualityScore(content models.ScrapedContent) float64 {
	score := 50.0 // Base score

	// Add points for having title
	if content.Title != "" {
		score += 10
	}

	// Add points for content length
	if content.WordCount > 100 {
		score += 10
	}
	if content.WordCount > 500 {
		score += 10
	}

	// Add points for having description
	if content.Description != "" {
		score += 10
	}

	// Add points for having images
	if len(content.Images) > 0 {
		score += 5
	}

	// Add points for having keywords
	if len(content.Keywords) > 0 {
		score += 5
	}

	// Cap at 100
	if score > 100 {
		score = 100
	}

	return score
}

// Helper methods for web scraping

// getImageFormat extracts image format from URL
func (h *WebScrapingHandler) getImageFormat(url string) string {
	lower := strings.ToLower(url)
	if strings.HasSuffix(lower, ".jpg") || strings.HasSuffix(lower, ".jpeg") {
		return "jpg"
	} else if strings.HasSuffix(lower, ".png") {
		return "png"
	} else if strings.HasSuffix(lower, ".gif") {
		return "gif"
	} else if strings.HasSuffix(lower, ".svg") {
		return "svg"
	} else if strings.HasSuffix(lower, ".webp") {
		return "webp"
	}
	return "unknown"
}

// getDomainFromURL extracts domain from URL
func (h *WebScrapingHandler) getDomainFromURL(urlStr string) string {
	if parsedURL, err := url.Parse(urlStr); err == nil {
		return parsedURL.Hostname()
	}
	return ""
}

// getVideoPlatform detects video platform from URL
func (h *WebScrapingHandler) getVideoPlatform(urlStr string) string {
	lower := strings.ToLower(urlStr)
	if strings.Contains(lower, "youtube.com") || strings.Contains(lower, "youtu.be") {
		return "youtube"
	} else if strings.Contains(lower, "vimeo.com") {
		return "vimeo"
	} else if strings.Contains(lower, "twitch.tv") {
		return "twitch"
	}
	return "unknown"
}

// getVideoID extracts video ID from URL
func (h *WebScrapingHandler) getVideoID(urlStr, platform string) string {
	switch platform {
	case "youtube":
		if strings.Contains(urlStr, "youtube.com/watch?v=") {
			parts := strings.Split(urlStr, "v=")
			if len(parts) > 1 {
				id := strings.Split(parts[1], "&")[0]
				return id
			}
		} else if strings.Contains(urlStr, "youtu.be/") {
			parts := strings.Split(urlStr, "youtu.be/")
			if len(parts) > 1 {
				return strings.Split(parts[1], "?")[0]
			}
		}
	case "vimeo":
		parts := strings.Split(urlStr, "vimeo.com/")
		if len(parts) > 1 {
			return strings.Split(parts[1], "?")[0]
		}
	}
	return ""
}

// extractKeywordsFromContent extracts keywords from content
func (h *WebScrapingHandler) extractKeywordsFromContent(content string) []string {
	// Simple keyword extraction - in production, you'd use more sophisticated NLP
	words := strings.Fields(strings.ToLower(content))
	wordCount := make(map[string]int)

	// Count word frequency
	for _, word := range words {
		// Filter out common words
		if len(word) > 3 && !h.isCommonWord(word) {
			wordCount[word]++
		}
	}

	// Get top keywords
	type wordFreq struct {
		word  string
		count int
	}

	var sortedWords []wordFreq
	for word, count := range wordCount {
		if count > 1 { // Only include words that appear more than once
			sortedWords = append(sortedWords, wordFreq{word, count})
		}
	}

	// Sort by frequency
	for i := 0; i < len(sortedWords)-1; i++ {
		for j := i + 1; j < len(sortedWords); j++ {
			if sortedWords[j].count > sortedWords[i].count {
				sortedWords[i], sortedWords[j] = sortedWords[j], sortedWords[i]
			}
		}
	}

	// Return top 10 keywords
	var keywords []string
	for i := 0; i < len(sortedWords) && i < 10; i++ {
		keywords = append(keywords, sortedWords[i].word)
	}

	return keywords
}

// isCommonWord checks if a word is too common to be a keyword
func (h *WebScrapingHandler) isCommonWord(word string) bool {
	commonWords := []string{
		"the", "and", "for", "are", "but", "not", "you", "all", "can", "had", "her", "was", "one", "our", "out", "day", "get", "has", "him", "his", "how", "man", "new", "now", "old", "see", "two", "way", "who", "boy", "did", "its", "let", "put", "say", "she", "too", "use", "with", "have", "this", "that", "from", "they", "been", "call", "come", "each", "find", "give", "hand", "keep", "know", "last", "leave", "life", "long", "made", "many", "move", "must", "name", "need", "only", "over", "part", "said", "same", "show", "tell", "time", "turn", "well", "went", "were", "what", "will", "your", "about", "after", "again", "before", "being", "below", "could", "every", "first", "found", "great", "house", "large", "never", "other", "place", "right", "small", "sound", "still", "their", "there", "think", "under", "water", "where", "which", "world", "would", "write", "years",
	}

	for _, common := range commonWords {
		if word == common {
			return true
		}
	}
	return false
}

// detectContentType detects the type of content
func (h *WebScrapingHandler) detectContentType(title, content string) string {
	titleLower := strings.ToLower(title)
	contentLower := strings.ToLower(content)

	// Check for tutorial
	if strings.Contains(titleLower, "tutorial") || strings.Contains(titleLower, "how to") || strings.Contains(contentLower, "step by step") {
		return "tutorial"
	}

	// Check for documentation
	if strings.Contains(titleLower, "documentation") || strings.Contains(titleLower, "api") || strings.Contains(contentLower, "function") {
		return "documentation"
	}

	// Check for news
	if strings.Contains(titleLower, "news") || strings.Contains(contentLower, "breaking") || strings.Contains(contentLower, "report") {
		return "news"
	}

	// Check for blog
	if strings.Contains(titleLower, "blog") || strings.Contains(contentLower, "posted") || strings.Contains(contentLower, "opinion") {
		return "blog"
	}

	// Default to article
	return "article"
}

// generateSummary generates a simple summary
func (h *WebScrapingHandler) generateSummary(content string) string {
	sentences := strings.Split(content, ".")
	if len(sentences) == 0 {
		return ""
	}

	// Take first 2-3 sentences as summary
	summaryLength := 2
	if len(sentences) < 2 {
		summaryLength = len(sentences)
	} else if len(sentences) > 3 {
		summaryLength = 3
	}

	var summary string
	for i := 0; i < summaryLength; i++ {
		sentence := strings.TrimSpace(sentences[i])
		if sentence != "" {
			summary += sentence + ". "
		}
	}

	return strings.TrimSpace(summary)
}
