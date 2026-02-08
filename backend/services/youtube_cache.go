package services

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/trackeep/backend/models"
	"gorm.io/gorm"
)

// YouTubeCacheService handles caching YouTube channel data
type YouTubeCacheService struct {
	db    *gorm.DB
	cache map[string]*CacheEntry
	mutex sync.RWMutex
}

// CacheEntry represents an in-memory cache entry
type CacheEntry struct {
	Videos      string    `json:"videos"`
	LastUpdated time.Time `json:"last_updated"`
}

// NewYouTubeCacheService creates a new YouTube cache service
func NewYouTubeCacheService(db *gorm.DB) *YouTubeCacheService {
	return &YouTubeCacheService{
		db:    db,
		cache: make(map[string]*CacheEntry),
	}
}

// GetCachedChannelVideos retrieves cached channel videos or fetches fresh data
func (y *YouTubeCacheService) GetCachedChannelVideos(channelID string, maxResults int) (*YouTubeSearchResponse, error) {
	// Always use real YouTube data - no more demo mode

	// Try to get from database cache first
	var cache models.YouTubeChannelCache
	if err := y.db.Where("channel_id = ?", channelID).First(&cache); err == nil {
		// Check if cache is still valid
		if !cache.IsExpired() {
			// Return cached data
			var videos []YouTubeVideo
			if err := json.Unmarshal([]byte(cache.Videos), &videos); err == nil {
				// Limit results if needed
				if len(videos) > maxResults {
					videos = videos[:maxResults]
				}
				return &YouTubeSearchResponse{
					Videos:       videos,
					TotalResults: len(videos),
				}, nil
			}
		}
	}

	// Cache is expired or doesn't exist, fetch fresh data
	return y.fetchAndCacheVideos(channelID, maxResults)
}

// getInMemoryCachedVideos retrieves cached videos from memory (for demo mode)
func (y *YouTubeCacheService) getInMemoryCachedVideos(channelID string, maxResults int) (*YouTubeSearchResponse, error) {
	y.mutex.RLock()
	defer y.mutex.RUnlock()

	if entry, exists := y.cache[channelID]; exists {
		// Check if cache is still valid (2 hours)
		if time.Since(entry.LastUpdated) < 2*time.Hour {
			// Return cached data
			var videos []YouTubeVideo
			if err := json.Unmarshal([]byte(entry.Videos), &videos); err == nil {
				// Limit results if needed
				if len(videos) > maxResults {
					videos = videos[:maxResults]
				}
				return &YouTubeSearchResponse{
					Videos:       videos,
					TotalResults: len(videos),
				}, nil
			}
		}
	}

	// Cache is expired or doesn't exist, fetch fresh data
	return y.fetchAndCacheVideos(channelID, maxResults)
}

// fetchAndCacheVideos fetches fresh data and caches it
func (y *YouTubeCacheService) fetchAndCacheVideos(channelID string, maxResults int) (*YouTubeSearchResponse, error) {
	// Fetch from YouTube scraper service
	resp, err := http.Get(fmt.Sprintf("http://youtube-scraper:7857/channel_videos?channel=%s", channelID))
	if err != nil {
		return nil, fmt.Errorf("failed to fetch channel videos: %w", err)
	}
	defer resp.Body.Close()

	// Check for rate limiting
	if resp.StatusCode == 429 {
		return nil, fmt.Errorf("YouTube is rate limiting us. Please try again later.")
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("YouTube scraper service returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("error reading response body: %w", err)
	}

	fmt.Printf("DEBUG: fetchAndCacheVideos response for %s: %s\n", channelID, string(body[:min(500, len(body))]))

	// Parse the scraper service response
	var scraperResponse struct {
		Channel    string `json:"channel"`
		ChannelURL string `json:"channel_url"`
		Videos     []struct {
			VideoID       string `json:"video_id"`
			Title         string `json:"title"`
			ThumbnailURL  string `json:"thumbnail_url"`
			Views         int    `json:"views"`
			ViewsText     string `json:"views_text"`
			PublishedText string `json:"published_text"`
			PublishedDate string `json:"published_date"`
		} `json:"videos"`
	}

	if err := json.Unmarshal(body, &scraperResponse); err != nil {
		return nil, fmt.Errorf("error parsing scraper response: %w", err)
	}

	fmt.Printf("DEBUG: Parsed %d videos for channel %s\n", len(scraperResponse.Videos), channelID)

	// Convert to YouTubeVideo format
	var videos []YouTubeVideo
	for i, video := range scraperResponse.Videos {
		if i >= maxResults {
			break
		}

		ytVideo := YouTubeVideo{
			ID:           video.VideoID,
			Title:        video.Title,
			Thumbnail:    video.ThumbnailURL,
			ViewCount:    int64(video.Views),
			PublishedAt:  video.PublishedDate,
			ChannelTitle: scraperResponse.Channel,
		}
		videos = append(videos, ytVideo)
	}

	fmt.Printf("DEBUG: Converted %d videos for channel %s\n", len(videos), channelID)

	// Cache the results
	videosJSON, err := json.Marshal(videos)
	if err != nil {
		log.Printf("Error marshaling videos for cache: %v", err)
	} else {
		// Save to database cache
		cache := models.YouTubeChannelCache{
			ChannelID:   channelID,
			ChannelName: scraperResponse.Channel,
			ChannelURL:  scraperResponse.ChannelURL,
			Videos:      string(videosJSON),
			LastUpdated: time.Now(),
		}

		// Use upsert to handle both create and update
		y.db.Where("channel_id = ?", channelID).Assign(&cache).FirstOrCreate(&cache)
		fmt.Printf("DEBUG: Cached %d videos in database for channel %s\n", len(videos), channelID)
	}

	return &YouTubeSearchResponse{
		Videos:       videos,
		TotalResults: len(videos),
	}, nil
}

// ClearExpiredCache removes expired cache entries
func (y *YouTubeCacheService) ClearExpiredCache() error {
	// Always use database cache - no more demo mode

	// Clear database cache
	expiredTime := time.Now().Add(-2 * time.Hour)
	return y.db.Where("last_updated < ?", expiredTime).Delete(&models.YouTubeChannelCache{}).Error
}
