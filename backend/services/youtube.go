package services

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strings"
	"time"
)

// YouTubeVideo represents a YouTube video
type YouTubeVideo struct {
	ID           string `json:"id"`
	Title        string `json:"title"`
	Description  string `json:"description"`
	Thumbnail    string `json:"thumbnail"`
	Duration     string `json:"duration"`
	ViewCount    int64  `json:"view_count"`
	PublishedAt  string `json:"published_at"`
	ChannelTitle string `json:"channel_title"`
	ChannelID    string `json:"channel_id"`
}

// VideoItem represents a video item from the youtube scraping service
type VideoItem struct {
	VideoID       string `json:"video_id"`
	Title         string `json:"title,omitempty"`
	Length        string `json:"length,omitempty"`
	ThumbnailURL  string `json:"thumbnail_url,omitempty"`
	ViewsText     string `json:"views_text,omitempty"`
	Views         int64  `json:"views"`
	PublishedText string `json:"published_text,omitempty"`
	PublishedDate string `json:"published_date,omitempty"`
	ChannelName   string `json:"channel_name,omitempty"`
}

// YouTubeSearchResponse represents the response from YouTube search API
type YouTubeSearchResponse struct {
	Videos        []YouTubeVideo `json:"videos"`
	NextPageToken string         `json:"next_page_token,omitempty"`
	TotalResults  int            `json:"total_results"`
}

// YouTubeService handles YouTube API interactions
type YouTubeService struct {
	httpClient *http.Client
}

// NewYouTubeService creates a new YouTube service instance
func NewYouTubeService() *YouTubeService {
	return &YouTubeService{
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// SearchVideos searches for YouTube videos using direct scraping
func (ys *YouTubeService) SearchVideos(query string, maxResults int, pageToken string) (*YouTubeSearchResponse, error) {
	// For new implementation, we always return 1 result as requested
	videoID, channelName, err := ys.fetchYouTubeVideoIDAndChannel(query)
	if err != nil {
		return nil, fmt.Errorf("failed to search YouTube: %w", err)
	}

	// Create response with single video
	video := YouTubeVideo{
		ID:           videoID,
		Title:        fmt.Sprintf("Video: %s", query),
		ChannelTitle: channelName,
		Thumbnail:    fmt.Sprintf("https://img.youtube.com/vi/%s/maxresdefault.jpg", videoID),
	}

	return &YouTubeSearchResponse{
		Videos:       []YouTubeVideo{video},
		TotalResults: 1,
	}, nil
}

// fetchYouTubeVideoIDAndChannel scrapes YouTube to get video ID and channel name
func (ys *YouTubeService) fetchYouTubeVideoIDAndChannel(query string) (string, string, error) {
	youtubeSearchURL := fmt.Sprintf("https://www.youtube.com/results?search_query=%s", strings.ReplaceAll(query, " ", "+"))

	resp, err := ys.httpClient.Get(youtubeSearchURL)
	if err != nil {
		return "", "", fmt.Errorf("error fetching YouTube search results: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", "", fmt.Errorf("error reading response body: %w", err)
	}

	// Extract video ID using regex
	videoRe := regexp.MustCompile(`"videoRenderer":{"videoId":"([^"]{11})"`)
	videoMatches := videoRe.FindStringSubmatch(string(body))
	if len(videoMatches) < 2 {
		return "", "", fmt.Errorf("no video found for query: %s", query)
	}
	videoID := videoMatches[1]

	// Extract channel name using regex
	channelRe := regexp.MustCompile(`"longBylineText":{"runs":\[{"text":"([^"]+)"`)
	channelMatches := channelRe.FindStringSubmatch(string(body))
	channelName := ""
	if len(channelMatches) >= 2 {
		channelName = channelMatches[1]
	}

	return videoID, channelName, nil
}

// GetChannelVideosFromURL extracts videos from a YouTube channel URL
func (ys *YouTubeService) GetChannelVideosFromURL(channelURL string, maxResults int) (*YouTubeSearchResponse, error) {
	// Extract channel handle from URL
	channelHandle, err := ys.extractChannelHandle(channelURL)
	if err != nil {
		return nil, fmt.Errorf("invalid channel URL: %w", err)
	}

	// Fetch channel videos
	videos, err := ys.fetchChannelVideos(channelHandle, maxResults)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch channel videos: %w", err)
	}

	return &YouTubeSearchResponse{
		Videos:       videos,
		TotalResults: len(videos),
	}, nil
}

// extractChannelHandle extracts channel handle from YouTube URL
func (ys *YouTubeService) extractChannelHandle(channelURL string) (string, error) {
	// Handle different URL formats
	if strings.Contains(channelURL, "/@") {
		// Extract handle from @username format
		re := regexp.MustCompile(`/@([^/?]+)`)
		matches := re.FindStringSubmatch(channelURL)
		if len(matches) >= 2 {
			return "@" + matches[1], nil
		}
	} else if strings.Contains(channelURL, "/channel/") {
		// Extract channel ID from /channel/ID format
		re := regexp.MustCompile(`/channel/([^/?]+)`)
		matches := re.FindStringSubmatch(channelURL)
		if len(matches) >= 2 {
			return matches[1], nil
		}
	} else if strings.Contains(channelURL, "/c/") {
		// Extract custom handle from /c/handle format
		re := regexp.MustCompile(`/c/([^/?]+)`)
		matches := re.FindStringSubmatch(channelURL)
		if len(matches) >= 2 {
			return matches[1], nil
		}
	}

	return "", fmt.Errorf("unable to extract channel handle from URL: %s", channelURL)
}

// fetchChannelVideos calls the YouTube scraper service for channel videos
func (ys *YouTubeService) fetchChannelVideos(channelHandle string, maxResults int) ([]YouTubeVideo, error) {
	// Call the YouTube scraper service
	resp, err := http.Get(fmt.Sprintf("http://youtube-scraper:7857/channel_videos?channel=%s", channelHandle))
	if err != nil {
		return nil, fmt.Errorf("error calling scraper service: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("error reading response body: %w", err)
	}

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

	return videos, nil
}

// GetVideoDetails retrieves basic information about a specific video
func (ys *YouTubeService) GetVideoDetails(videoID string) (*YouTubeVideo, error) {
	// For simplicity, return basic video info
	video := YouTubeVideo{
		ID:          videoID,
		Title:       fmt.Sprintf("Video %s", videoID),
		Thumbnail:   fmt.Sprintf("https://img.youtube.com/vi/%s/maxresdefault.jpg", videoID),
		Description: "Video details not available in this implementation",
	}

	return &video, nil
}

// GetChannelVideos retrieves videos from a specific channel (legacy method)
func (ys *YouTubeService) GetChannelVideos(channelID string, maxResults int, pageToken string) (*YouTubeSearchResponse, error) {
	// Always use integrated YouTube channel service - no more external service calls
	return GetYouTubeChannelVideosIntegrated(channelID, maxResults)
}

// Global YouTube service instance
var youtubeService = NewYouTubeService()

// SearchYouTubeVideos is a convenience function for searching videos
func SearchYouTubeVideos(query string, maxResults int, pageToken string) (*YouTubeSearchResponse, error) {
	// Always use integrated YouTube search - no more mock data
	return SearchYouTubeVideosIntegrated(query, maxResults)
}

// YouTubeSearchVideo represents a YouTube video from search
type YouTubeSearchVideo struct {
	VideoID     string `json:"video_id"`
	Title       string `json:"title"`
	ChannelName string `json:"channel_name"`
	Description string `json:"description"`
	Thumbnail   string `json:"thumbnail"`
}

// fetchYouTubeVideosReal calls the working search service on port 7857
func fetchYouTubeVideosReal(query string, limit int) ([]YouTubeSearchVideo, error) {
	// URL encode the query to handle spaces properly
	encodedQuery := url.QueryEscape(query)
	// Use localhost for development or Docker service name for container-to-container communication
	youtubeServiceURL := os.Getenv("YOUTUBE_SERVICE_URL")
	if youtubeServiceURL == "" {
		youtubeServiceURL = "http://localhost:7857"
	}
	url := fmt.Sprintf("%s/youtube?q=%s", youtubeServiceURL, encodedQuery)

	resp, err := http.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	// Check for rate limiting
	if resp.StatusCode == 429 {
		return nil, fmt.Errorf("YouTube is rate limiting us. Please try again later.")
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("YouTube search service returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	// Parse the JSON response from the search service (it returns an array)
	var videos []YouTubeSearchVideo
	if err := json.Unmarshal(body, &videos); err != nil {
		return nil, fmt.Errorf("failed to parse search service response: %v", err)
	}

	// Limit results if needed
	if len(videos) > limit {
		videos = videos[:limit]
	}

	return videos, nil
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// htmlUnescape fixes escaped sequences in HTML strings
func htmlUnescape(s string) string {
	replacer := strings.NewReplacer(
		"&nbsp;", " ",
		"&amp;", "&",
		"&quot;", `"`,
		"&#39;", "'",
	)
	return replacer.Replace(s)
}

// searchYouTubeVideosReal calls the real YouTube search scraper
func searchYouTubeVideosReal(query string, maxResults int) (*YouTubeSearchResponse, error) {
	// Perform real YouTube search scraping
	videos, err := fetchYouTubeVideosReal(query, maxResults)
	if err != nil {
		return nil, err
	}

	// Convert search results to YouTubeVideo format
	var ytVideos []YouTubeVideo
	for _, video := range videos {
		ytVideo := YouTubeVideo{
			ID:           video.VideoID,
			Title:        video.Title,
			Thumbnail:    video.Thumbnail,
			ViewCount:    0,  // Not available from search
			PublishedAt:  "", // Not available from search
			ChannelTitle: video.ChannelName,
		}
		ytVideos = append(ytVideos, ytVideo)
	}

	return &YouTubeSearchResponse{
		Videos:       ytVideos,
		TotalResults: len(ytVideos),
	}, nil
}

// GetYouTubeVideoDetails is a convenience function for getting video details
func GetYouTubeVideoDetails(videoID string) (*YouTubeVideo, error) {
	return youtubeService.GetVideoDetails(videoID)
}

// GetYouTubeChannelVideos is a convenience function for getting channel videos
func GetYouTubeChannelVideos(channelID string, maxResults int, pageToken string) (*YouTubeSearchResponse, error) {
	// Always use integrated YouTube channel service - no more mock data
	return GetYouTubeChannelVideosIntegrated(channelID, maxResults)
}

// getYouTubeChannelVideosReal calls the YouTube scraper service
func getYouTubeChannelVideosReal(channelID string, maxResults int) (*YouTubeSearchResponse, error) {
	// Call the YouTube scraper service using Docker service name
	resp, err := http.Get(fmt.Sprintf("http://youtube-scraper:7857/channel_videos?channel=%s", channelID))
	if err != nil {
		return nil, fmt.Errorf("failed to call YouTube scraper service: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("YouTube scraper service returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	// Parse the response from the scraper service
	var scraperResponse struct {
		Channel string `json:"channel"`
		Videos  []struct {
			VideoID       string `json:"video_id"`
			Title         string `json:"title"`
			Length        string `json:"length"`
			ThumbnailURL  string `json:"thumbnail_url"`
			Views         int64  `json:"views"`
			PublishedText string `json:"published_text"`
			PublishedDate string `json:"published_date"`
		} `json:"videos"`
	}

	if err := json.Unmarshal(body, &scraperResponse); err != nil {
		return nil, fmt.Errorf("failed to parse scraper response: %w", err)
	}

	// Convert to our YouTubeVideo format
	var videos []YouTubeVideo
	for _, video := range scraperResponse.Videos {
		ytVideo := YouTubeVideo{
			ID:           video.VideoID,
			Title:        video.Title,
			Thumbnail:    video.ThumbnailURL,
			Duration:     video.Length,
			ViewCount:    video.Views,
			PublishedAt:  video.PublishedDate,
			ChannelTitle: scraperResponse.Channel,
		}
		videos = append(videos, ytVideo)
	}

	// Limit results if needed
	if len(videos) > maxResults {
		videos = videos[:maxResults]
	}

	return &YouTubeSearchResponse{
		Videos:       videos,
		TotalResults: len(videos),
	}, nil
}

// PredefinedChannel represents a predefined YouTube channel
type PredefinedChannel struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Handle string `json:"handle"`
}

// GetPredefinedChannelVideos gets the latest videos from predefined channels
func GetPredefinedChannelVideos(maxResults int) (*YouTubeSearchResponse, error) {
	// Always use real YouTube channel service - no more demo mode mock data
	// Use the predefined channels from youtube_channels.go
	channels := []PredefinedChannel{
		{ID: "UC9x0YY7RmP2x0v_yEUE0rLA", Name: "NetworkChuck", Handle: "@NetworkChuck"},
		{ID: "UCsBjURrPoezykLs9EqH2YWw", Name: "Fireship", Handle: "@Fireship"},
		{ID: "UCaBHI8xMtM5I4p3tAH_eW5Q", Name: "Beyond Fireship", Handle: "@beyondfireship"},
		{ID: "UC_x5XG1OV2P6uZZ5FSM9Ttw", Name: "Traversy Media", Handle: "@traversy_media"},
		{ID: "UC8butISFwT-Wl7EV0hUK0BQ", Name: "Tyler McGinnis", Handle: "@tylermcginnis"},
	}
	var allVideos []YouTubeVideo

	// Get videos from each channel
	for _, channel := range channels {
		response, err := GetYouTubeChannelVideos(channel.Handle, maxResults, "")
		if err != nil {
			// Continue with other channels if one fails
			continue
		}
		allVideos = append(allVideos, response.Videos...)
	}

	// Return combined response
	return &YouTubeSearchResponse{
		Videos:       allVideos,
		TotalResults: len(allVideos),
	}, nil
}

// getMockVideoDetails returns mock video data for demo mode
func (ys *YouTubeService) getMockVideoDetails(videoID string) *YouTubeVideo {
	// Generate some mock data based on video ID
	mockTitles := []string{
		"Amazing Tech Tutorial",
		"Web Development Tips",
		"Programming Best Practices",
		"JavaScript Framework Comparison",
		"Building Modern Web Apps",
	}

	mockChannels := []string{
		"Fireship",
		"NetworkChuck",
		"Beyond Fireship",
		"Tech With Tim",
		"Programming with Mosh",
	}

	// Use video ID to deterministically select mock data
	titleIndex := len(videoID) % len(mockTitles)
	channelIndex := (len(videoID) + 1) % len(mockChannels)

	return &YouTubeVideo{
		ID:           videoID,
		Title:        mockTitles[titleIndex],
		Description:  "This is a mock video description for demo mode. The original video details could not be fetched, but this demonstrates the functionality.",
		Thumbnail:    fmt.Sprintf("https://img.youtube.com/vi/%s/maxresdefault.jpg", videoID),
		Duration:     "10:24",
		ViewCount:    int64(1000 + (len(videoID) * 100)),
		PublishedAt:  "2024-01-15",
		ChannelTitle: mockChannels[channelIndex],
		ChannelID:    "mock_channel_id",
	}
}

// getMockYouTubeVideos returns mock YouTube videos for demo mode
func getMockYouTubeVideos(query string, maxResults int) (*YouTubeSearchResponse, error) {
	// Mock video data
	mockVideos := []YouTubeVideo{
		{
			ID:           "MOCK-VIDEO-1",
			Title:        "MOCK: Never Gonna Give You Up - Rick Astley",
			Description:  "The official video for 'Never Gonna Give You Up' by Rick Astley",
			Thumbnail:    "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
			Duration:     "3:33",
			ViewCount:    1500000000,
			PublishedAt:  "2009-10-25",
			ChannelTitle: "Rick Astley",
			ChannelID:    "UCuAXFkgsw1L7xaCfnd5CJOA",
		},
		{
			ID:           "MOCK-VIDEO-2",
			Title:        "MOCK: Me at the zoo - The first YouTube video",
			Description:  "The first video on YouTube, uploaded by Jawed Karim",
			Thumbnail:    "https://img.youtube.com/vi/jNQXAC9IVRw/maxresdefault.jpg",
			Duration:     "0:19",
			ViewCount:    300000000,
			PublishedAt:  "2005-04-23",
			ChannelTitle: "Jawed Karim",
			ChannelID:    "UC4QobL6k2pFkE-vtCS5wZTA",
		},
		{
			ID:           "MOCK-VIDEO-3",
			Title:        "MOCK: PSY - GANGNAM STYLE (강남스타일) M/V",
			Description:  "Psy's official music video for 'Gangnam Style'",
			Thumbnail:    "https://img.youtube.com/vi/9bZkp7q19f0/maxresdefault.jpg",
			Duration:     "4:13",
			ViewCount:    5000000000,
			PublishedAt:  "2012-07-15",
			ChannelTitle: "officialpsy",
			ChannelID:    "UCrEw2n_aDR1I7k2kI2L2tJA",
		},
		{
			ID:           "MOCK-VIDEO-4",
			Title:        "MOCK: Luis Fonsi - Despacito ft. Daddy Yankee",
			Description:  "Official music video for 'Despacito' by Luis Fonsi",
			Thumbnail:    "https://img.youtube.com/vi/kJQP7kiw5Fk/maxresdefault.jpg",
			Duration:     "4:41",
			ViewCount:    8000000000,
			PublishedAt:  "2017-01-12",
			ChannelTitle: "Luis Fonsi",
			ChannelID:    "UCrgInDaT3M4n1qZ6-xJbR9A",
		},
		{
			ID:           "MOCK-VIDEO-5",
			Title:        "MOCK: Introduction to React Programming",
			Description:  "Learn the basics of React programming in this comprehensive tutorial",
			Thumbnail:    "https://img.youtube.com/vi/hTWKbfoikeg/maxresdefault.jpg",
			Duration:     "15:30",
			ViewCount:    250000,
			PublishedAt:  "2024-01-15",
			ChannelTitle: "Programming Tutorials",
			ChannelID:    "UC1234567890",
		},
		{
			ID:           "MOCK-VIDEO-6",
			Title:        "MOCK: Docker Containerization Explained",
			Description:  "Complete guide to Docker containers and orchestration",
			Thumbnail:    "https://img.youtube.com/vi/abc123def456/maxresdefault.jpg",
			Duration:     "22:15",
			ViewCount:    180000,
			PublishedAt:  "2024-01-10",
			ChannelTitle: "DevOps Simplified",
			ChannelID:    "UC0987654321",
		},
		{
			ID:           "MOCK-VIDEO-7",
			Title:        "MOCK: Machine Learning Fundamentals",
			Description:  "Introduction to machine learning algorithms and concepts",
			Thumbnail:    "https://img.youtube.com/vi/xyz789uvw012/maxresdefault.jpg",
			Duration:     "18:45",
			ViewCount:    320000,
			PublishedAt:  "2024-01-08",
			ChannelTitle: "AI Education",
			ChannelID:    "UC1122334455",
		},
		{
			ID:           "MOCK-VIDEO-8",
			Title:        "MOCK: Web Development Best Practices 2024",
			Description:  "Modern web development techniques and best practices",
			Thumbnail:    "https://img.youtube.com/vi/def456ghi789/maxresdefault.jpg",
			Duration:     "25:10",
			ViewCount:    145000,
			PublishedAt:  "2024-01-12",
			ChannelTitle: "Web Dev Weekly",
			ChannelID:    "UC5566778899",
		},
		{
			ID:           "MOCK-VIDEO-9",
			Title:        "MOCK: JavaScript Advanced Concepts",
			Description:  "Deep dive into JavaScript advanced features and patterns",
			Thumbnail:    "https://img.youtube.com/vi/ghi789jkl012/maxresdefault.jpg",
			Duration:     "32:20",
			ViewCount:    425000,
			PublishedAt:  "2024-01-05",
			ChannelTitle: "JS Masters",
			ChannelID:    "UC9988776655",
		},
	}

	// For demo mode, return all videos (up to maxResults) regardless of query
	var filteredVideos []YouTubeVideo
	for i, video := range mockVideos {
		if i >= maxResults {
			break
		}
		filteredVideos = append(filteredVideos, video)
	}

	return &YouTubeSearchResponse{
		Videos:       filteredVideos,
		TotalResults: len(filteredVideos),
	}, nil
}
