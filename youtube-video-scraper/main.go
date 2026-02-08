package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/PuerkitoBio/goquery"
	"github.com/gin-gonic/gin"
)

// VideoInfo represents the extracted video information
type VideoInfo struct {
	VideoID   string `json:"video_id"`
	Title     string `json:"title"`
	Channel   string `json:"channel"`
	Thumbnail string `json:"thumbnail_url"`
	Success   bool   `json:"success"`
	Error     string `json:"error,omitempty"`
}

// ExtractVideoID extracts video ID from YouTube URL
func ExtractVideoID(url string) string {
	// Handle various YouTube URL formats
	if strings.Contains(url, "youtu.be/") {
		// https://youtu.be/VIDEO_ID
		parts := strings.Split(url, "youtu.be/")
		if len(parts) > 1 {
			return strings.Split(parts[1], "?")[0]
		}
	} else if strings.Contains(url, "youtube.com/watch") {
		// https://www.youtube.com/watch?v=VIDEO_ID
		parts := strings.Split(url, "v=")
		if len(parts) > 1 {
			return strings.Split(parts[1], "&")[0]
		}
	} else if strings.Contains(url, "youtube.com/embed/") {
		// https://www.youtube.com/embed/VIDEO_ID
		parts := strings.Split(url, "embed/")
		if len(parts) > 1 {
			return strings.Split(parts[1], "?")[0]
		}
	}
	return ""
}

// ScrapeVideoInfo scrapes video information from YouTube URL
func ScrapeVideoInfo(url string) VideoInfo {
	videoID := ExtractVideoID(url)
	fmt.Printf("Extracted video ID: '%s' from URL: %s\n", videoID, url)

	if videoID == "" {
		return VideoInfo{
			Success: false,
			Error:   "Invalid YouTube URL",
		}
	}

	// Create HTTP client with user agent
	client := &http.Client{}
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return VideoInfo{
			Success: false,
			Error:   fmt.Sprintf("Failed to create request: %v", err),
		}
	}

	// Set user agent to mimic browser
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")

	resp, err := client.Do(req)
	if err != nil {
		return VideoInfo{
			Success: false,
			Error:   fmt.Sprintf("Failed to fetch page: %v", err),
		}
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return VideoInfo{
			Success: false,
			Error:   fmt.Sprintf("HTTP %d: %s", resp.StatusCode, resp.Status),
		}
	}

	// Parse HTML
	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		return VideoInfo{
			Success: false,
			Error:   fmt.Sprintf("Failed to parse HTML: %v", err),
		}
	}

	// Extract title
	title := ""
	doc.Find("h1.ytd-watch-metadata yt-formatted-string").Each(func(i int, s *goquery.Selection) {
		title = strings.TrimSpace(s.Text())
	})

	// Fallback for title extraction - try multiple selectors
	if title == "" {
		doc.Find("h1").Each(func(i int, s *goquery.Selection) {
			text := strings.TrimSpace(s.Text())
			if text != "" && !strings.Contains(text, "YouTube") {
				title = text
			}
		})
	}

	// Another fallback - try title tag
	if title == "" {
		doc.Find("title").Each(func(i int, s *goquery.Selection) {
			text := strings.TrimSpace(s.Text())
			if strings.Contains(text, " - YouTube") {
				title = strings.Replace(text, " - YouTube", "", 1)
			} else if !strings.Contains(text, "YouTube") {
				title = text
			}
		})
	}

	// Extract channel name
	channel := ""
	doc.Find("ytd-video-owner-renderer yt-formatted-string a").Each(func(i int, s *goquery.Selection) {
		channel = strings.TrimSpace(s.Text())
	})

	// Fallback for channel extraction - try multiple selectors
	if channel == "" {
		doc.Find("ytd-channel-name yt-formatted-string a").Each(func(i int, s *goquery.Selection) {
			channel = strings.TrimSpace(s.Text())
		})
	}

	// Another fallback - try channel link
	if channel == "" {
		doc.Find("a[href*='/@']").Each(func(i int, s *goquery.Selection) {
			text := strings.TrimSpace(s.Text())
			if text != "" && !strings.Contains(text, " ") {
				channel = text
			}
		})
	}

	// Generate thumbnail URL
	thumbnail := fmt.Sprintf("https://i.ytimg.com/vi/%s/hqdefault.jpg", videoID)

	if title == "" || channel == "" {
		return VideoInfo{
			Success: false,
			Error:   "Could not extract title or channel",
		}
	}

	return VideoInfo{
		VideoID:   videoID,
		Title:     title,
		Channel:   channel,
		Thumbnail: thumbnail,
		Success:   true,
	}
}

// VideoHandler handles video scraping requests
func VideoHandler(c *gin.Context) {
	var request struct {
		URL string `json:"url" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		fmt.Printf("Error binding request: %v\n", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request format",
		})
		return
	}

	fmt.Printf("Received request for URL: %s\n", request.URL)

	info := ScrapeVideoInfo(request.URL)
	c.JSON(http.StatusOK, info)
}

func main() {
	port := "7858"
	if p := os.Getenv("PORT"); p != "" {
		port = p
	}

	r := gin.Default()

	// Enable CORS for all origins
	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// Routes
	r.POST("/video", VideoHandler)
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "healthy"})
	})
	r.GET("/test", func(c *gin.Context) {
		testURL := "https://www.youtube.com/watch?v=WKXh4Z6SYMs"
		videoID := ExtractVideoID(testURL)
		c.JSON(http.StatusOK, gin.H{
			"url":      testURL,
			"video_id": videoID,
		})
	})

	log.Printf("YouTube video scraper starting on port %s", port)
	log.Fatal(r.Run(":" + port))
}
