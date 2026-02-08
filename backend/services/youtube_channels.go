package services

import (
	"fmt"
	"time"
)

// YouTubeChannelService handles specific channel integrations
type YouTubeChannelService struct {
	YouTubeService *YouTubeService
	CacheService   *YouTubeCacheService
}

// NewYouTubeChannelService creates a new instance of YouTubeChannelService
func NewYouTubeChannelService(youtubeService *YouTubeService, cacheService *YouTubeCacheService) *YouTubeChannelService {
	return &YouTubeChannelService{
		YouTubeService: youtubeService,
		CacheService:   cacheService,
	}
}

// GetPredefinedChannels returns the list of predefined channels
func GetPredefinedChannels() []Channel {
	return []Channel{
		{
			ID:          "fireship",
			Name:        "Fireship",
			Description: "Rapid web development tutorials and courses",
			Thumbnail:   "https://img.youtube.com/vi/UCsBjURrPoezykLs9EqgAJVQ/mqdefault.jpg",
		},
		{
			ID:          "networkchuck",
			Name:        "NetworkChuck",
			Description: "Cybersecurity and networking tutorials",
			Thumbnail:   "https://img.youtube.com/vi/UCNlz1cb4DvEx7rTnT2s7B3A/mqdefault.jpg",
		},
		{
			ID:          "programmingwithmosh",
			Name:        "Programming with Mosh",
			Description: "Comprehensive programming tutorials",
			Thumbnail:   "https://img.youtube.com/vi/UC8butUNob-8kuy47X7vH6ws/mqdefault.jpg",
		},
		{
			ID:          "traversymedia",
			Name:        "Traversy Media",
			Description: "Web development and design tutorials",
			Thumbnail:   "https://img.youtube.com/vi/UC29J8QxEQ7QmM0TJ_8Jt_gQ/mqdefault.jpg",
		},
		{
			ID:          "thenewboston",
			Name:        "The New Boston",
			Description: "Computer science and programming courses",
			Thumbnail:   "https://img.youtube.com/vi/UCrwkHaJ-9Sd74Kx1n-9Qjg/mqdefault.jpg",
		},
	}
}

// Channel represents a YouTube channel
type Channel struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Thumbnail   string `json:"thumbnail"`
}

// GetFireshipVideos fetches latest videos from Fireship channel
func (ycs *YouTubeChannelService) GetFireshipVideos(limit int) ([]YouTubeVideo, error) {
	// Use cached data to avoid rate limiting
	response, err := ycs.CacheService.GetCachedChannelVideos("fireship", limit)
	if err != nil {
		if err.Error() == "YouTube is rate limiting us. Please try again later." {
			// Return rate limiting error
			return nil, fmt.Errorf("YouTube is rate limiting us. Please try again later.")
		}
		return nil, fmt.Errorf("failed to fetch Fireship videos: %w", err)
	}

	// Return all videos without filtering
	return response.Videos, nil
}

// GetNetworkChuckVideos fetches latest videos from Network Chuck channel
func (ycs *YouTubeChannelService) GetNetworkChuckVideos(limit int) ([]YouTubeVideo, error) {
	// Use cached data to avoid rate limiting
	response, err := ycs.CacheService.GetCachedChannelVideos("networkchuck", limit)
	if err != nil {
		if err.Error() == "YouTube is rate limiting us. Please try again later." {
			// Return rate limiting error
			return nil, fmt.Errorf("YouTube is rate limiting us. Please try again later.")
		}
		return nil, fmt.Errorf("failed to fetch Network Chuck videos: %w", err)
	}

	// Return all videos without filtering
	return response.Videos, nil
}

// GetChannelInfo fetches basic information about a channel
func (ycs *YouTubeChannelService) GetChannelInfo(channelID string) (*ChannelInfo, error) {
	// For now, return basic info from predefined channels
	channels := GetPredefinedChannels()
	for _, channel := range channels {
		if channel.ID == channelID {
			return &ChannelInfo{
				ID:          channel.ID,
				Title:       channel.Name,
				Description: channel.Description,
				Thumbnail:   channel.Thumbnail,
			}, nil
		}
	}

	return nil, fmt.Errorf("channel not found")
}

// ChannelInfo represents basic channel information
type ChannelInfo struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Thumbnail   string `json:"thumbnail"`
}

// Helper functions

// parseYouTubeDuration converts ISO 8601 duration string to seconds
func parseYouTubeDuration(duration string) int {
	// YouTube duration format: PT4M13S (4 minutes 13 seconds)
	// Simple parser for common formats
	seconds := 0
	current := 0

	for _, char := range duration {
		switch char {
		case 'H', 'h':
			seconds += current * 3600
			current = 0
		case 'M', 'm':
			seconds += current * 60
			current = 0
		case 'S', 's':
			seconds += current
			current = 0
		case '0', '1', '2', '3', '4', '5', '6', '7', '8', '9':
			current = current*10 + int(char-'0')
		}
	}

	return seconds
}

func containsIgnoreCase(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr ||
		(len(s) > len(substr) &&
			(s[:len(substr)] == substr ||
				s[len(s)-len(substr):] == substr ||
				containsSubstringIgnoreCase(s, substr))))
}

func containsSubstringIgnoreCase(s, substr string) bool {
	s = toLower(s)
	substr = toLower(substr)
	return contains(s, substr)
}

func toLower(s string) string {
	result := make([]rune, len([]rune(s)))
	for i, r := range []rune(s) {
		if r >= 'A' && r <= 'Z' {
			result[i] = r + ('a' - 'A')
		} else {
			result[i] = r
		}
	}
	return string(result)
}

func contains(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

func isRecentVideo(publishedAt string, months int) bool {
	// Parse the published date (ISO 8601 format)
	layout := "2006-01-02T15:04:05Z"
	publishedTime, err := time.Parse(layout, publishedAt)
	if err != nil {
		return false
	}

	// Check if the video is within the specified months
	cutoffTime := time.Now().AddDate(0, -months, 0)
	return publishedTime.After(cutoffTime)
}
