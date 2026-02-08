package services

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
)

// YouTubeIntegratedService provides all YouTube functionality in one service
type YouTubeIntegratedService struct {
	httpClient *http.Client
}

// NewYouTubeIntegratedService creates a new integrated YouTube service
func NewYouTubeIntegratedService() *YouTubeIntegratedService {
	return &YouTubeIntegratedService{
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// SearchVideosIntegrated performs YouTube video search
func (y *YouTubeIntegratedService) SearchVideosIntegrated(query string, limit int) ([]YouTubeSearchVideo, error) {
	url := fmt.Sprintf(
		"https://www.youtube.com/results?search_query=%s",
		url.QueryEscape(query),
	)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")

	resp, err := y.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	html := string(body)
	videoRe := regexp.MustCompile(`"videoRenderer":{"videoId":"([^"]{11})"`)

	results := []YouTubeSearchVideo{}
	seen := map[string]bool{}

	videoMatches := videoRe.FindAllStringSubmatchIndex(html, -1)

	for _, match := range videoMatches {
		if len(results) >= limit {
			break
		}

		if len(match) < 4 {
			continue
		}

		videoID := html[match[2]:match[3]]
		if _, ok := seen[videoID]; ok {
			continue
		}
		seen[videoID] = true

		// Extract title and channel from surrounding context
		start := match[0]
		if start-2000 > 0 {
			start = start - 2000
		}
		end := match[1] + 2000
		if end > len(html) {
			end = len(html)
		}
		snippet := html[start:end]

		title := ""
		channel := ""

		if m := regexp.MustCompile(`"title":\{"runs":\[\{"text":"([^"]+)"`).FindStringSubmatch(snippet); len(m) >= 2 {
			title = unescapeYT(m[1])
		} else if m := regexp.MustCompile(`"title":\{"simpleText":"([^"]+)"`).FindStringSubmatch(snippet); len(m) >= 2 {
			title = unescapeYT(m[1])
		}

		if m := regexp.MustCompile(`"longBylineText":\{"runs":\[\{"text":"([^"]+)"`).FindStringSubmatch(snippet); len(m) >= 2 {
			channel = unescapeYT(m[1])
		}

		if title == "" {
			title = "Video " + videoID
		}

		results = append(results, YouTubeSearchVideo{
			VideoID:     videoID,
			Title:       title,
			ChannelName: channel,
			Thumbnail:   fmt.Sprintf("https://img.youtube.com/vi/%s/maxresdefault.jpg", videoID),
		})
	}

	return results, nil
}

// ChannelVideosResponse represents the response for channel videos scraping
type ChannelVideosResponse struct {
	Channel         string      `json:"channel"`
	ChannelURL      string      `json:"channel_url"`
	SubscribersText string      `json:"subscribers_text"`
	Subscribers     int64       `json:"subscribers"`
	Videos          []VideoItem `json:"videos"`
}

// GetChannelVideosIntegrated fetches channel videos directly
func (y *YouTubeIntegratedService) GetChannelVideosIntegrated(channelInput string) (ChannelVideosResponse, error) {
	handle, channelURL := normalizeChannelInput(channelInput)

	req, err := http.NewRequest("GET", channelURL, nil)
	if err != nil {
		return ChannelVideosResponse{}, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
	req.Header.Set("Accept-Language", "en-US,en;q=0.9")

	resp, err := y.httpClient.Do(req)
	if err != nil {
		return ChannelVideosResponse{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return ChannelVideosResponse{}, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return ChannelVideosResponse{}, err
	}
	html := string(body)

	// Extract video IDs and metadata
	vidRe := regexp.MustCompile(`"videoRenderer":\{[^}]*?"videoId":"([a-zA-Z0-9_-]{11})"`)
	matches := vidRe.FindAllStringSubmatchIndex(html, -1)
	seen := make(map[string]struct{})
	var videos []VideoItem

	for _, idx := range matches {
		if len(idx) < 4 {
			continue
		}

		videoID := html[idx[2]:idx[3]]
		if _, ok := seen[videoID]; ok {
			continue
		}
		seen[videoID] = struct{}{}

		start := idx[0]
		if start-2000 > 0 {
			start = start - 2000
		}
		end := idx[1] + 8000
		if end > len(html) {
			end = len(html)
		}
		snippet := html[start:end]

		vi := VideoItem{VideoID: videoID}
		vi.ThumbnailURL = fmt.Sprintf("https://img.youtube.com/vi/%s/maxresdefault.jpg", videoID)

		// Extract metadata
		if m := regexp.MustCompile(`"title":\{"runs":\[\{"text":"([^"]+)"`).FindStringSubmatch(snippet); len(m) >= 2 {
			vi.Title = unescapeYT(m[1])
		} else if m := regexp.MustCompile(`"title":\{"simpleText":"([^"]+)"`).FindStringSubmatch(snippet); len(m) >= 2 {
			vi.Title = unescapeYT(m[1])
		}

		if m := regexp.MustCompile(`"lengthText":\{[^}]*"simpleText":"([^"]+)"`).FindStringSubmatch(snippet); len(m) >= 2 {
			vi.Length = m[1]
		}

		if m := regexp.MustCompile(`"publishedTimeText":\{"simpleText":"([^"]+)"`).FindStringSubmatch(snippet); len(m) >= 2 {
			vi.PublishedText = m[1]
			vi.PublishedDate = parseRelativeToISO(m[1])
		}

		if m := regexp.MustCompile(`"viewCountText":\{"simpleText":"([^"]+)"`).FindStringSubmatch(snippet); len(m) >= 2 {
			vi.ViewsText = m[1]
			vi.Views = parseCountText(m[1])
		}

		videos = append(videos, vi)
	}

	// Extract channel info
	channelDisplay := handle
	if m := regexp.MustCompile(`"canonicalBaseUrl":"\\/(@[^\"]+)"`).FindStringSubmatch(html); len(m) >= 2 {
		channelDisplay = m[1]
	}

	subText := ""
	if m := regexp.MustCompile(`"subscriberCountText":\{"simpleText":"([^"]+)"`).FindStringSubmatch(html); len(m) >= 2 {
		subText = m[1]
	}
	subs := parseCountText(subText)

	return ChannelVideosResponse{
		Channel:         channelDisplay,
		ChannelURL:      channelURL,
		SubscribersText: subText,
		Subscribers:     subs,
		Videos:          videos,
	}, nil
}

// IntegratedVideoInfo represents the extracted video information
type IntegratedVideoInfo struct {
	VideoID   string `json:"video_id"`
	Title     string `json:"title"`
	Channel   string `json:"channel"`
	Thumbnail string `json:"thumbnail_url"`
	Success   bool   `json:"success"`
	Error     string `json:"error,omitempty"`
}

// GetVideoDetailsIntegrated scrapes individual video details
func (y *YouTubeIntegratedService) GetVideoDetailsIntegrated(videoURL string) (IntegratedVideoInfo, error) {
	videoID := extractVideoID(videoURL)
	if videoID == "" {
		return IntegratedVideoInfo{
			Success: false,
			Error:   "Invalid YouTube URL",
		}, nil
	}

	url := fmt.Sprintf("https://www.youtube.com/watch?v=%s", videoID)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return IntegratedVideoInfo{
			Success: false,
			Error:   fmt.Sprintf("Failed to create request: %v", err),
		}, nil
	}

	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")

	resp, err := y.httpClient.Do(req)
	if err != nil {
		return IntegratedVideoInfo{
			Success: false,
			Error:   fmt.Sprintf("Failed to fetch page: %v", err),
		}, nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return IntegratedVideoInfo{
			Success: false,
			Error:   fmt.Sprintf("HTTP %d", resp.StatusCode),
		}, nil
	}

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		return IntegratedVideoInfo{
			Success: false,
			Error:   fmt.Sprintf("Failed to parse HTML: %v", err),
		}, nil
	}

	title := ""
	channel := ""

	doc.Find("title").Each(func(i int, s *goquery.Selection) {
		if title == "" {
			title = s.Text()
			title = strings.TrimSuffix(title, " - YouTube")
		}
	})

	doc.Find("a.yt-simple-endpoint.style-scope.yt-formatted-string").Each(func(i int, s *goquery.Selection) {
		if channel == "" && strings.Contains(s.AttrOr("href", ""), "/@") {
			channel = s.Text()
		}
	})

	if title == "" {
		title = "Video " + videoID
	}

	return IntegratedVideoInfo{
		VideoID:   videoID,
		Title:     title,
		Channel:   channel,
		Thumbnail: fmt.Sprintf("https://img.youtube.com/vi/%s/maxresdefault.jpg", videoID),
		Success:   true,
	}, nil
}

// Helper functions

func normalizeChannelInput(input string) (handle string, url string) {
	in := strings.TrimSpace(input)
	lower := strings.ToLower(in)
	isURL := strings.HasPrefix(lower, "http://") || strings.HasPrefix(lower, "https://") || strings.HasPrefix(lower, "www.") || strings.HasPrefix(lower, "youtube.com/")

	if isURL {
		if strings.HasPrefix(lower, "www.") || strings.HasPrefix(lower, "youtube.com/") {
			in = "https://" + strings.TrimPrefix(in, "www.")
			if !strings.HasPrefix(strings.ToLower(in), "https://youtube.com/") && !strings.HasPrefix(strings.ToLower(in), "https://www.youtube.com/") {
				in = "https://www." + strings.TrimPrefix(in, "https://")
			}
		}
		in = strings.ReplaceAll(in, "m.youtube.com", "www.youtube.com")

		reHandle := regexp.MustCompile(`https?://(www\.)?youtube\.com/(@[^/]+)`)
		if m := reHandle.FindStringSubmatch(in); len(m) >= 3 {
			handle = m[2]
		} else {
			rePath := regexp.MustCompile(`https?://(www\.)?youtube\.com/([^/?#]+)`)
			if m2 := rePath.FindStringSubmatch(in); len(m2) >= 3 {
				seg := m2[2]
				if strings.HasPrefix(seg, "@") {
					handle = seg
				} else {
					handle = "@" + seg
				}
			}
		}

		if strings.Contains(strings.ToLower(in), "/videos") || strings.Contains(strings.ToLower(in), "/shorts") || strings.Contains(strings.ToLower(in), "/streams") {
			url = in
		} else {
			if handle == "" {
				url = in
			} else {
				url = fmt.Sprintf("https://www.youtube.com/%s/videos", handle)
			}
		}
	} else {
		if strings.HasPrefix(in, "@") {
			handle = in
		} else {
			handle = "@" + in
		}
		url = fmt.Sprintf("https://www.youtube.com/%s/videos", handle)
	}

	if handle == "" {
		handle = in
		if !strings.HasPrefix(handle, "@") {
			handle = "@" + handle
		}
	}
	return
}

func unescapeYT(s string) string {
	s = strings.ReplaceAll(s, `\/`, `/`)
	s = strings.ReplaceAll(s, `\u0026`, `&`)
	return s
}

func parseRelativeToISO(rel string) string {
	now := time.Now()
	lower := strings.ToLower(rel)
	re := regexp.MustCompile(`(\d+)[\s-]*(second|minute|hour|day|week|month|year)s?\s+ago`)
	if m := re.FindStringSubmatch(lower); len(m) >= 3 {
		n, _ := strconv.Atoi(m[1])
		unit := m[2]
		switch unit {
		case "second":
			return now.Add(-time.Duration(n) * time.Second).Format("2006-01-02")
		case "minute":
			return now.Add(-time.Duration(n) * time.Minute).Format("2006-01-02")
		case "hour":
			return now.Add(-time.Duration(n) * time.Hour).Format("2006-01-02")
		case "day":
			return now.AddDate(0, 0, -n).Format("2006-01-02")
		case "week":
			return now.AddDate(0, 0, -7*n).Format("2006-01-02")
		case "month":
			return now.AddDate(0, -n, 0).Format("2006-01-02")
		case "year":
			return now.AddDate(-n, 0, 0).Format("2006-01-02")
		}
	}
	return ""
}

func parseCountText(s string) int64 {
	t := strings.ToLower(strings.TrimSpace(s))
	re := regexp.MustCompile(`([0-9]+(?:\.[0-9]+)?)([kmb])?`)
	if m := re.FindStringSubmatch(t); len(m) >= 2 {
		numStr := m[1]
		suf := ""
		if len(m) >= 3 {
			suf = m[2]
		}
		f, err := strconv.ParseFloat(numStr, 64)
		if err != nil {
			return 0
		}
		switch suf {
		case "k":
			f *= 1_000
		case "m":
			f *= 1_000_000
		case "b":
			f *= 1_000_000_000
		}
		return int64(f)
	}
	digits := regexp.MustCompile(`[^0-9]`).ReplaceAllString(t, "")
	if digits == "" {
		return 0
	}
	v, _ := strconv.ParseInt(digits, 10, 64)
	return v
}

func extractVideoID(url string) string {
	if strings.Contains(url, "youtu.be/") {
		parts := strings.Split(url, "youtu.be/")
		if len(parts) > 1 {
			return strings.Split(parts[1], "?")[0]
		}
	} else if strings.Contains(url, "youtube.com/watch") {
		parts := strings.Split(url, "v=")
		if len(parts) > 1 {
			return strings.Split(parts[1], "&")[0]
		}
	} else if strings.Contains(url, "youtube.com/embed/") {
		parts := strings.Split(url, "embed/")
		if len(parts) > 1 {
			return strings.Split(parts[1], "?")[0]
		}
	}
	return ""
}

// Global integrated service instance
var integratedYouTubeService = NewYouTubeIntegratedService()

// Integrated service functions for backward compatibility
func SearchYouTubeVideosIntegrated(query string, maxResults int) (*YouTubeSearchResponse, error) {
	// Always use real YouTube search - no more demo mode mock data
	if maxResults <= 0 || maxResults > 9 {
		maxResults = 9
	}

	videos, err := integratedYouTubeService.SearchVideosIntegrated(query, maxResults)
	if err != nil {
		return nil, err
	}

	var ytVideos []YouTubeVideo
	for _, video := range videos {
		ytVideo := YouTubeVideo{
			ID:           video.VideoID,
			Title:        video.Title,
			Thumbnail:    video.Thumbnail,
			ViewCount:    0,
			PublishedAt:  "",
			ChannelTitle: video.ChannelName,
		}
		ytVideos = append(ytVideos, ytVideo)
	}

	return &YouTubeSearchResponse{
		Videos:       ytVideos,
		TotalResults: len(ytVideos),
	}, nil
}

func GetYouTubeChannelVideosIntegrated(channelID string, maxResults int) (*YouTubeSearchResponse, error) {
	// Always use real YouTube channel service - no more demo mode mock data
	response, err := integratedYouTubeService.GetChannelVideosIntegrated(channelID)
	if err != nil {
		return nil, err
	}

	var videos []YouTubeVideo
	for _, video := range response.Videos {
		ytVideo := YouTubeVideo{
			ID:           video.VideoID,
			Title:        video.Title,
			Thumbnail:    video.ThumbnailURL,
			Duration:     video.Length,
			ViewCount:    video.Views,
			PublishedAt:  video.PublishedDate,
			ChannelTitle: response.Channel,
		}
		videos = append(videos, ytVideo)
	}

	if len(videos) > maxResults {
		videos = videos[:maxResults]
	}

	return &YouTubeSearchResponse{
		Videos:       videos,
		TotalResults: len(videos),
	}, nil
}
