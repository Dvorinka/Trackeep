package services

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/trackeep/backend/models"
	"gorm.io/gorm"
)

// VideoBookmarkService handles video bookmark operations
type VideoBookmarkService struct {
	db *gorm.DB
}

// NewVideoBookmarkService creates a new video bookmark service
func NewVideoBookmarkService(db *gorm.DB) *VideoBookmarkService {
	return &VideoBookmarkService{db: db}
}

// VideoInfo represents video information from scraper
type VideoInfo struct {
	VideoID   string `json:"video_id"`
	Title     string `json:"title"`
	Channel   string `json:"channel"`
	Thumbnail string `json:"thumbnail_url"`
	Success   bool   `json:"success"`
	Error     string `json:"error,omitempty"`
}

// SaveVideoRequest represents the request to save a video
type SaveVideoRequest struct {
	URL         string `json:"url" binding:"required"`
	Description string `json:"description"`
	Tags        string `json:"tags"`
	IsFavorite  bool   `json:"is_favorite"`
}

// SaveVideoBookmark saves a video bookmark
func (vbs *VideoBookmarkService) SaveVideoBookmark(userID uint, req SaveVideoRequest) (*models.VideoBookmark, error) {
	// Extract video info using scraper
	videoInfo, err := vbs.extractVideoInfo(req.URL)
	if err != nil {
		return nil, fmt.Errorf("failed to extract video info: %w", err)
	}

	if !videoInfo.Success {
		return nil, fmt.Errorf("scraper error: %s", videoInfo.Error)
	}

	// Check if video already bookmarked by this user
	var existingBookmark models.VideoBookmark
	if err := vbs.db.Where("user_id = ? AND video_id = ?", userID, videoInfo.VideoID).First(&existingBookmark).Error; err == nil {
		return nil, fmt.Errorf("video already bookmarked")
	}

	// Create bookmark
	bookmark := models.VideoBookmark{
		VideoID:     videoInfo.VideoID,
		Title:       videoInfo.Title,
		Channel:     videoInfo.Channel,
		Thumbnail:   videoInfo.Thumbnail,
		URL:         req.URL,
		UserID:      userID,
		Description: req.Description,
		Tags:        req.Tags,
		IsFavorite:  req.IsFavorite,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if err := vbs.db.Create(&bookmark).Error; err != nil {
		return nil, fmt.Errorf("failed to save bookmark: %w", err)
	}

	return &bookmark, nil
}

// GetUserBookmarks gets all bookmarks for a user
func (vbs *VideoBookmarkService) GetUserBookmarks(userID uint, limit int, offset int) ([]models.VideoBookmark, error) {
	var bookmarks []models.VideoBookmark

	query := vbs.db.Where("user_id = ?", userID).Order("created_at DESC")

	if limit > 0 {
		query = query.Limit(limit)
	}

	if offset > 0 {
		query = query.Offset(offset)
	}

	if err := query.Find(&bookmarks).Error; err != nil {
		return nil, fmt.Errorf("failed to get bookmarks: %w", err)
	}

	return bookmarks, nil
}

// GetBookmarkByID gets a bookmark by ID
func (vbs *VideoBookmarkService) GetBookmarkByID(userID uint, bookmarkID uint) (*models.VideoBookmark, error) {
	var bookmark models.VideoBookmark
	if err := vbs.db.Where("id = ? AND user_id = ?", bookmarkID, userID).First(&bookmark).Error; err != nil {
		return nil, fmt.Errorf("bookmark not found: %w", err)
	}
	return &bookmark, nil
}

// UpdateBookmark updates a bookmark
func (vbs *VideoBookmarkService) UpdateBookmark(userID uint, bookmarkID uint, req SaveVideoRequest) (*models.VideoBookmark, error) {
	bookmark, err := vbs.GetBookmarkByID(userID, bookmarkID)
	if err != nil {
		return nil, err
	}

	// Update fields
	bookmark.Description = req.Description
	bookmark.Tags = req.Tags
	bookmark.IsFavorite = req.IsFavorite
	bookmark.UpdatedAt = time.Now()

	if err := vbs.db.Save(bookmark).Error; err != nil {
		return nil, fmt.Errorf("failed to update bookmark: %w", err)
	}

	return bookmark, nil
}

// DeleteBookmark deletes a bookmark
func (vbs *VideoBookmarkService) DeleteBookmark(userID uint, bookmarkID uint) error {
	result := vbs.db.Where("id = ? AND user_id = ?", bookmarkID, userID).Delete(&models.VideoBookmark{})
	if result.Error != nil {
		return fmt.Errorf("failed to delete bookmark: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("bookmark not found")
	}
	return nil
}

// ToggleWatched toggles the watched status of a bookmark
func (vbs *VideoBookmarkService) ToggleWatched(userID uint, bookmarkID uint) (*models.VideoBookmark, error) {
	bookmark, err := vbs.GetBookmarkByID(userID, bookmarkID)
	if err != nil {
		return nil, err
	}

	bookmark.IsWatched = !bookmark.IsWatched
	bookmark.UpdatedAt = time.Now()

	if err := vbs.db.Save(bookmark).Error; err != nil {
		return nil, fmt.Errorf("failed to update bookmark: %w", err)
	}

	return bookmark, nil
}

// ToggleFavorite toggles the favorite status of a bookmark
func (vbs *VideoBookmarkService) ToggleFavorite(userID uint, bookmarkID uint) (*models.VideoBookmark, error) {
	bookmark, err := vbs.GetBookmarkByID(userID, bookmarkID)
	if err != nil {
		return nil, err
	}

	bookmark.IsFavorite = !bookmark.IsFavorite
	bookmark.UpdatedAt = time.Now()

	if err := vbs.db.Save(bookmark).Error; err != nil {
		return nil, fmt.Errorf("failed to update bookmark: %w", err)
	}

	return bookmark, nil
}

// SearchBookmarks searches bookmarks by title, channel, or tags
func (vbs *VideoBookmarkService) SearchBookmarks(userID uint, query string, limit int, offset int) ([]models.VideoBookmark, error) {
	var bookmarks []models.VideoBookmark

	searchQuery := "%" + query + "%"
	dbQuery := vbs.db.Where("user_id = ? AND (title LIKE ? OR channel LIKE ? OR tags LIKE ?)",
		userID, searchQuery, searchQuery, searchQuery).Order("created_at DESC")

	if limit > 0 {
		dbQuery = dbQuery.Limit(limit)
	}

	if offset > 0 {
		dbQuery = dbQuery.Offset(offset)
	}

	if err := dbQuery.Find(&bookmarks).Error; err != nil {
		return nil, fmt.Errorf("failed to search bookmarks: %w", err)
	}

	return bookmarks, nil
}

// GetBookmarkStats gets statistics about user's bookmarks
func (vbs *VideoBookmarkService) GetBookmarkStats(userID uint) (map[string]interface{}, error) {
	stats := make(map[string]interface{})

	// Total bookmarks
	var total int64
	if err := vbs.db.Model(&models.VideoBookmark{}).Where("user_id = ?", userID).Count(&total).Error; err != nil {
		return nil, fmt.Errorf("failed to get total count: %w", err)
	}
	stats["total"] = total

	// Watched bookmarks
	var watched int64
	if err := vbs.db.Model(&models.VideoBookmark{}).Where("user_id = ? AND is_watched = ?", userID, true).Count(&watched).Error; err != nil {
		return nil, fmt.Errorf("failed to get watched count: %w", err)
	}
	stats["watched"] = watched

	// Favorite bookmarks
	var favorites int64
	if err := vbs.db.Model(&models.VideoBookmark{}).Where("user_id = ? AND is_favorite = ?", userID, true).Count(&favorites).Error; err != nil {
		return nil, fmt.Errorf("failed to get favorites count: %w", err)
	}
	stats["favorites"] = favorites

	// Unwatched bookmarks
	stats["unwatched"] = total - watched

	return stats, nil
}

// extractVideoInfo extracts video information using the scraper service
func (vbs *VideoBookmarkService) extractVideoInfo(url string) (*VideoInfo, error) {
	// In demo mode, create mock data
	if os.Getenv("VITE_DEMO_MODE") == "true" {
		return &VideoInfo{
			VideoID:   "demo123",
			Title:     "Demo Video Title",
			Channel:   "Demo Channel",
			Thumbnail: "https://i.ytimg.com/vi/demo123/hqdefault.jpg",
			Success:   true,
		}, nil
	}

	// Call the scraper service
	scraperURL := fmt.Sprintf("http://youtube-video-scraper:7858/video")

	req, err := http.NewRequest("POST", scraperURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	// Create request body
	reqBody := fmt.Sprintf(`{"url": "%s"}`, url)
	req.Body = nil // Will be set below

	client := &http.Client{}
	resp, err := client.Post(scraperURL, "application/json", strings.NewReader(reqBody))
	if err != nil {
		return nil, fmt.Errorf("failed to call scraper service: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("scraper service returned status %d", resp.StatusCode)
	}

	var videoInfo VideoInfo
	if err := json.NewDecoder(resp.Body).Decode(&videoInfo); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &videoInfo, nil
}
