package handlers

import (
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/trackeep/backend/config"
	"github.com/trackeep/backend/models"
	"gorm.io/gorm"
)

// SemanticSearchRequest represents a semantic search request
type SemanticSearchRequest struct {
	Query       string  `json:"query" binding:"required"`
	ContentType string  `json:"content_type"` // all | bookmarks | tasks | notes | files | calendar_events | youtube_videos | learning_paths | chat_messages
	Limit       int     `json:"limit"`
	Threshold   float64 `json:"threshold"` // Similarity threshold (0-1)
}

// SemanticSearchResponse represents semantic search response
type SemanticSearchResponse struct {
	Results []SemanticSearchResult `json:"results"`
	Query   string                 `json:"query"`
	Took    int64                  `json:"took"`
	Model   string                 `json:"model"`
}

// SemanticSearchResult represents a semantic search result
type SemanticSearchResult struct {
	ID          uint         `json:"id"`
	Type        string       `json:"type"`
	Title       string       `json:"title"`
	Description string       `json:"description"`
	Content     string       `json:"content"`
	Similarity  float64      `json:"similarity"`
	Highlights  []string     `json:"highlights"`
	Tags        []models.Tag `json:"tags,omitempty"`
	CreatedAt   time.Time    `json:"created_at"`
	UpdatedAt   time.Time    `json:"updated_at"`
	URL         string       `json:"url,omitempty"`
	Status      string       `json:"status,omitempty"`
	Priority    string       `json:"priority,omitempty"`
}

// GenerateEmbeddingRequest represents request to generate embeddings
type GenerateEmbeddingRequest struct {
	Text        string `json:"text" binding:"required"`
	ContentType string `json:"content_type"`
	ContentID   uint   `json:"content_id"`
}

// GenerateEmbeddingResponse represents embedding generation response
type GenerateEmbeddingResponse struct {
	Embedding  []float64 `json:"embedding"`
	Model      string    `json:"model"`
	Dimensions int       `json:"dimensions"`
	Success    bool      `json:"success"`
	Message    string    `json:"message"`
}

// SemanticSearch handles POST /api/v1/search/semantic
func SemanticSearch(c *gin.Context) {
	var req SemanticSearchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Set defaults
	if req.Limit == 0 {
		req.Limit = 20
	}
	if req.Threshold == 0 {
		req.Threshold = 0.7 // Default similarity threshold
	}

	startTime := time.Now()
	db := config.GetDB()
	userID := c.GetUint("user_id")

	// Generate embedding for the search query
	queryEmbedding, err := generateEmbedding(req.Query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to generate query embedding",
			"details": err.Error(),
		})
		return
	}

	// Search for similar content
	results, err := findSimilarContent(db, userID, queryEmbedding, req.ContentType, req.Limit, req.Threshold)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to search similar content",
			"details": err.Error(),
		})
		return
	}

	took := time.Since(startTime).Milliseconds()

	response := SemanticSearchResponse{
		Results: results,
		Query:   req.Query,
		Took:    took,
		Model:   "text-embedding-ada-002",
	}

	c.JSON(http.StatusOK, response)
}

// GenerateEmbedding handles POST /api/v1/search/embeddings/generate
func GenerateEmbedding(c *gin.Context) {
	var req GenerateEmbeddingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Generate embedding
	embedding, err := generateEmbedding(req.Text)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to generate embedding",
			"details": err.Error(),
		})
		return
	}

	// Store embedding if content reference is provided
	if req.ContentType != "" && req.ContentID > 0 {
		db := config.GetDB()
		userID := c.GetUint("user_id")

		embeddingJSON, _ := json.Marshal(embedding)

		contentEmbedding := models.ContentEmbedding{
			ContentType: req.ContentType,
			ContentID:   req.ContentID,
			Embedding:   string(embeddingJSON),
			Model:       "text-embedding-ada-002",
			Dimensions:  len(embedding),
			TextContent: req.Text,
			UserID:      userID,
		}

		if err := db.Create(&contentEmbedding).Error; err != nil {
			// Log error but don't fail the request
			fmt.Printf("Failed to store embedding: %v\n", err)
		}
	}

	response := GenerateEmbeddingResponse{
		Embedding:  embedding,
		Model:      "text-embedding-ada-002",
		Dimensions: len(embedding),
		Success:    true,
		Message:    "Embedding generated successfully",
	}

	c.JSON(http.StatusOK, response)
}

// ReindexContent handles POST /api/v1/search/reindex
func ReindexContent(c *gin.Context) {
	db := config.GetDB()
	userID := c.GetUint("user_id")

	// Start background job to reindex all content
	go func() {
		reindexUserContent(db, userID)
	}()

	c.JSON(http.StatusOK, gin.H{
		"message": "Content reindexing started in background",
		"status":  "processing",
	})
}

// generateEmbedding generates embedding for text using OpenAI API (mock implementation)
func generateEmbedding(text string) ([]float64, error) {
	// TODO: Replace with actual OpenAI API call
	// For now, return a mock embedding for demonstration
	embedding := make([]float64, 1536) // OpenAI embedding dimensions

	// Generate pseudo-random but deterministic embedding based on text
	hash := simpleHash(text)
	for i := range embedding {
		embedding[i] = math.Sin(float64(hash+i)) * 0.5
	}

	return embedding, nil
}

// simpleHash creates a simple hash from string
func simpleHash(s string) int {
	hash := 0
	for _, char := range s {
		hash = hash*31 + int(char)
	}
	return hash
}

// findSimilarContent finds content similar to the given embedding
func findSimilarContent(db *gorm.DB, userID uint, queryEmbedding []float64, contentType string, limit int, threshold float64) ([]SemanticSearchResult, error) {
	var results []SemanticSearchResult

	// Get all embeddings for the user
	var embeddings []models.ContentEmbedding
	query := db.Where("user_id = ?", userID)

	if contentType != "all" && contentType != "" {
		query = query.Where("content_type = ?", normalizeSemanticContentType(contentType))
	}

	if err := query.Find(&embeddings).Error; err != nil {
		return results, err
	}

	// Calculate similarity scores
	type similarityScore struct {
		embedding models.ContentEmbedding
		score     float64
	}

	var scores []similarityScore

	for _, embedding := range embeddings {
		var storedEmbedding []float64
		if err := json.Unmarshal([]byte(embedding.Embedding), &storedEmbedding); err != nil {
			continue
		}

		similarity := cosineSimilarity(queryEmbedding, storedEmbedding)
		if similarity >= threshold {
			scores = append(scores, similarityScore{
				embedding: embedding,
				score:     similarity,
			})
		}
	}

	// Sort by similarity (descending)
	for i := 0; i < len(scores)-1; i++ {
		for j := i + 1; j < len(scores); j++ {
			if scores[i].score < scores[j].score {
				scores[i], scores[j] = scores[j], scores[i]
			}
		}
	}

	// Limit results
	if len(scores) > limit {
		scores = scores[:limit]
	}

	// Fetch actual content and build results
	for _, score := range scores {
		result, err := buildSemanticSearchResult(db, score.embedding, score.score)
		if err != nil {
			continue
		}
		results = append(results, result)
	}

	return results, nil
}

// cosineSimilarity calculates cosine similarity between two vectors
func cosineSimilarity(a, b []float64) float64 {
	if len(a) != len(b) {
		return 0
	}

	var dotProduct, normA, normB float64

	for i := range a {
		dotProduct += a[i] * b[i]
		normA += a[i] * a[i]
		normB += b[i] * b[i]
	}

	if normA == 0 || normB == 0 {
		return 0
	}

	return dotProduct / (math.Sqrt(normA) * math.Sqrt(normB))
}

// buildSemanticSearchResult builds a search result from embedding and content
func buildSemanticSearchResult(db *gorm.DB, embedding models.ContentEmbedding, similarity float64) (SemanticSearchResult, error) {
	result := SemanticSearchResult{
		Similarity: similarity,
	}

	switch embedding.ContentType {
	case "bookmark":
		var bookmark models.Bookmark
		if err := db.Preload("Tags").First(&bookmark, embedding.ContentID).Error; err != nil {
			return result, err
		}

		result.ID = bookmark.ID
		result.Type = "bookmark"
		result.Title = bookmark.Title
		result.Description = bookmark.Description
		result.Content = bookmark.Content
		result.Tags = bookmark.Tags
		result.CreatedAt = bookmark.CreatedAt
		result.UpdatedAt = bookmark.UpdatedAt
		result.URL = bookmark.URL

	case "task":
		var task models.Task
		if err := db.Preload("Tags").First(&task, embedding.ContentID).Error; err != nil {
			return result, err
		}

		result.ID = task.ID
		result.Type = "task"
		result.Title = task.Title
		result.Description = task.Description
		result.Tags = task.Tags
		result.CreatedAt = task.CreatedAt
		result.UpdatedAt = task.UpdatedAt
		result.Status = string(task.Status)
		result.Priority = string(task.Priority)

	case "note":
		var note models.Note
		if err := db.Preload("Tags").First(&note, embedding.ContentID).Error; err != nil {
			return result, err
		}

		result.ID = note.ID
		result.Type = "note"
		result.Title = note.Title
		result.Description = note.Description
		result.Content = note.Content
		result.Tags = note.Tags
		result.CreatedAt = note.CreatedAt
		result.UpdatedAt = note.UpdatedAt

	case "file":
		var file models.File
		if err := db.Preload("Tags").First(&file, embedding.ContentID).Error; err != nil {
			return result, err
		}

		result.ID = file.ID
		result.Type = "file"
		result.Title = file.OriginalName
		result.Description = file.Description
		result.Content = file.Content
		result.Tags = file.Tags
		result.CreatedAt = file.CreatedAt
		result.UpdatedAt = file.UpdatedAt

	case "calendar_event":
		var event models.CalendarEvent
		if err := db.First(&event, embedding.ContentID).Error; err != nil {
			return result, err
		}

		result.ID = event.ID
		result.Type = "calendar_event"
		result.Title = event.Title
		result.Description = event.Description
		result.Content = event.Description
		result.CreatedAt = event.CreatedAt
		result.UpdatedAt = event.UpdatedAt
		result.Priority = event.Priority

	case "youtube_video":
		var video models.VideoBookmark
		if err := db.First(&video, embedding.ContentID).Error; err != nil {
			return result, err
		}

		result.ID = video.ID
		result.Type = "youtube_video"
		result.Title = video.Title
		result.Description = video.Description
		result.Content = video.Description
		result.CreatedAt = video.CreatedAt
		result.UpdatedAt = video.UpdatedAt
		result.URL = video.URL

	case "learning_path":
		var path models.LearningPath
		if err := db.First(&path, embedding.ContentID).Error; err != nil {
			return result, err
		}

		result.ID = path.ID
		result.Type = "learning_path"
		result.Title = path.Title
		result.Description = path.Description
		result.Content = path.Description
		result.CreatedAt = path.CreatedAt
		result.UpdatedAt = path.UpdatedAt

	case "chat_message":
		var message models.Message
		if err := db.First(&message, embedding.ContentID).Error; err != nil {
			return result, err
		}
		if message.IsSensitive {
			return result, fmt.Errorf("sensitive message excluded from semantic search")
		}

		result.ID = message.ID
		result.Type = "chat_message"
		result.Title = "Chat message"
		result.Description = compactSemanticText(message.Body, 140)
		result.Content = message.Body
		result.CreatedAt = message.CreatedAt
		result.UpdatedAt = message.UpdatedAt
		result.URL = fmt.Sprintf("/app/messages?conversationId=%d&messageId=%d", message.ConversationID, message.ID)
	}

	// Generate highlights (simplified)
	result.Highlights = generateHighlights(embedding.TextContent, 3)

	return result, nil
}

// generateHighlights generates text highlights
func generateHighlights(text string, count int) []string {
	if text == "" {
		return []string{}
	}

	// Simple highlight generation - split into sentences and return first few
	sentences := strings.Split(text, ".")
	if len(sentences) > count {
		sentences = sentences[:count]
	}

	var highlights []string
	for _, sentence := range sentences {
		sentence = strings.TrimSpace(sentence)
		if len(sentence) > 10 {
			highlights = append(highlights, sentence+".")
		}
		if len(highlights) >= count {
			break
		}
	}

	return highlights
}

// reindexUserContent reindexes all content for a user
func reindexUserContent(db *gorm.DB, userID uint) {
	fmt.Printf("Starting reindexing for user %d\n", userID)

	// Reindex bookmarks
	var bookmarks []models.Bookmark
	db.Where("user_id = ?", userID).Find(&bookmarks)

	for _, bookmark := range bookmarks {
		text := bookmark.Title + " " + bookmark.Description + " " + bookmark.Content
		upsertEmbedding(db, userID, "bookmark", bookmark.ID, text)
	}

	// Tasks
	var tasks []models.Task
	db.Where("user_id = ?", userID).Find(&tasks)
	for _, task := range tasks {
		text := task.Title + " " + task.Description
		upsertEmbedding(db, userID, "task", task.ID, text)
	}

	// Notes
	var notes []models.Note
	db.Where("user_id = ?", userID).Find(&notes)
	for _, note := range notes {
		if note.IsEncrypted {
			continue
		}
		text := note.Title + " " + note.Description + " " + note.Content
		upsertEmbedding(db, userID, "note", note.ID, text)
	}

	// Files
	var files []models.File
	db.Where("user_id = ?", userID).Find(&files)
	for _, file := range files {
		text := file.OriginalName + " " + file.Description + " " + file.Content
		upsertEmbedding(db, userID, "file", file.ID, text)
	}

	// Calendar events
	var events []models.CalendarEvent
	db.Where("user_id = ?", userID).Find(&events)
	for _, event := range events {
		text := event.Title + " " + event.Description + " " + event.Type + " " + event.Priority
		upsertEmbedding(db, userID, "calendar_event", event.ID, text)
	}

	// YouTube bookmarks
	var videos []models.VideoBookmark
	db.Where("user_id = ?", userID).Find(&videos)
	for _, video := range videos {
		text := video.Title + " " + video.Description + " " + video.Channel + " " + video.URL
		upsertEmbedding(db, userID, "youtube_video", video.ID, text)
	}

	// Learning paths
	var learningPaths []models.LearningPath
	db.Where("creator_id = ?", userID).Find(&learningPaths)
	for _, path := range learningPaths {
		text := path.Title + " " + path.Description + " " + path.Category + " " + path.Difficulty
		upsertEmbedding(db, userID, "learning_path", path.ID, text)
	}

	// Chat messages (skip sensitive/vault content)
	var messages []models.Message
	db.Model(&models.Message{}).
		Joins("JOIN conversation_members cm ON cm.conversation_id = messages.conversation_id").
		Joins("JOIN conversations ON conversations.id = messages.conversation_id").
		Where("cm.user_id = ?", userID).
		Where("conversations.type <> ?", models.ConversationTypePasswordVault).
		Where("messages.deleted_at IS NULL").
		Find(&messages)
	for _, message := range messages {
		if message.IsSensitive {
			continue
		}
		upsertEmbedding(db, userID, "chat_message", message.ID, message.Body)
	}

	fmt.Printf("Reindexing completed for user %d\n", userID)
}

func upsertEmbedding(db *gorm.DB, userID uint, contentType string, contentID uint, text string) {
	text = strings.TrimSpace(text)
	if text == "" {
		return
	}

	embedding, err := generateEmbedding(text)
	if err != nil {
		return
	}

	embeddingJSON, _ := json.Marshal(embedding)

	contentEmbedding := models.ContentEmbedding{
		ContentType: contentType,
		ContentID:   contentID,
		Embedding:   string(embeddingJSON),
		Model:       "text-embedding-ada-002",
		Dimensions:  len(embedding),
		TextContent: text,
		UserID:      userID,
	}

	db.Where("content_type = ? AND content_id = ? AND user_id = ?", contentType, contentID, userID).Delete(&models.ContentEmbedding{})
	db.Create(&contentEmbedding)
}

func normalizeSemanticContentType(contentType string) string {
	switch strings.ToLower(strings.TrimSpace(contentType)) {
	case "bookmarks":
		return "bookmark"
	case "tasks":
		return "task"
	case "notes":
		return "note"
	case "files":
		return "file"
	case "calendar_events":
		return "calendar_event"
	case "youtube_videos":
		return "youtube_video"
	case "learning_paths":
		return "learning_path"
	case "chat_messages":
		return "chat_message"
	default:
		return strings.ToLower(strings.TrimSpace(contentType))
	}
}

func compactSemanticText(text string, limit int) string {
	text = strings.TrimSpace(text)
	if len(text) <= limit {
		return text
	}
	if limit < 4 {
		return text
	}
	return strings.TrimSpace(text[:limit-3]) + "..."
}
