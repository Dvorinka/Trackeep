package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/trackeep/backend/services"
)

// YouTubeSearchRequest represents the request for YouTube search
type YouTubeSearchRequest struct {
	Query      string `json:"query" binding:"required"`
	MaxResults int    `json:"max_results"`
	PageToken  string `json:"page_token"`
}

// YouTubeVideoDetailsRequest represents the request for video details
type YouTubeVideoDetailsRequest struct {
	VideoID string `json:"video_id" binding:"required"`
}

// YouTubeChannelVideosRequest represents the request for channel videos
type YouTubeChannelVideosRequest struct {
	ChannelID  string `json:"channel_id" binding:"required"`
	MaxResults int    `json:"max_results"`
	PageToken  string `json:"page_token"`
}

// SearchYouTube handles POST /api/v1/youtube/search
func SearchYouTube(c *gin.Context) {
	var req YouTubeSearchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Set default max results and enforce an upper limit of 9 per request
	if req.MaxResults <= 0 || req.MaxResults > 9 {
		req.MaxResults = 9
	}

	// Search videos using the YouTube service
	response, err := services.SearchYouTubeVideos(req.Query, req.MaxResults, req.PageToken)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to search YouTube videos",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, response)
}

// GetYouTubeVideoDetails handles POST /api/v1/youtube/video-details
func GetYouTubeVideoDetails(c *gin.Context) {
	var req YouTubeVideoDetailsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get video details using the YouTube service
	video, err := services.GetYouTubeVideoDetails(req.VideoID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get video details",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, video)
}

// YouTubeChannelURLRequest represents the request for channel videos from URL
type YouTubeChannelURLRequest struct {
	ChannelURL string `json:"channel_url" binding:"required"`
	MaxResults int    `json:"max_results"`
}

// GetYouTubeChannelVideosFromURL handles POST /api/v1/youtube/channel-from-url
func GetYouTubeChannelVideosFromURL(c *gin.Context) {
	var req YouTubeChannelURLRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Set default max results if not provided
	if req.MaxResults <= 0 {
		req.MaxResults = 20
	}
	if req.MaxResults > 50 {
		req.MaxResults = 50
	}

	// Get channel videos using the new service method
	youtubeService := services.NewYouTubeService()
	response, err := youtubeService.GetChannelVideosFromURL(req.ChannelURL, req.MaxResults)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to fetch channel videos from URL",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, response)
}

// GetYouTubeChannelVideos handles POST /api/v1/youtube/channel-videos (legacy)
func GetYouTubeChannelVideos(c *gin.Context) {
	var req YouTubeChannelVideosRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Set default max results if not provided
	if req.MaxResults == 0 {
		req.MaxResults = 10
	}

	// Validate max results
	if req.MaxResults < 1 || req.MaxResults > 50 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "max_results must be between 1 and 50"})
		return
	}

	// Get channel videos using the YouTube service
	response, err := services.GetYouTubeChannelVideos(req.ChannelID, req.MaxResults, req.PageToken)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get channel videos",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, response)
}

// GetYouTubeTrending handles GET /api/v1/youtube/trending
func GetYouTubeTrending(c *gin.Context) {
	// Get query parameters
	category := c.Query("category") // Optional: music, gaming, news, etc.
	maxResults, _ := strconv.Atoi(c.DefaultQuery("max_results", "9"))

	// Enforce 1-9 range
	if maxResults < 1 || maxResults > 9 {
		maxResults = 9
	}

	// Search for trending videos with category-specific queries
	query := "trending videos"
	if category != "" {
		query = "trending " + category + " videos"
	}

	response, err := services.SearchYouTubeVideos(query, maxResults, "")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get trending videos",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, response)
}

func GetPredefinedChannelVideos(c *gin.Context) {
	maxResults, _ := strconv.Atoi(c.DefaultQuery("max_results", "5"))

	if maxResults < 1 || maxResults > 20 {
		maxResults = 10
	}

	response, err := services.GetPredefinedChannelVideos(maxResults)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get predefined channel videos",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, response)
}

func YouTubeSearchTest(c *gin.Context) {
	var req struct {
		Query      string `json:"query" binding:"required"`
		MaxResults int    `json:"max_results"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.MaxResults <= 0 {
		req.MaxResults = 5
	}

	response, err := services.SearchYouTubeVideos(req.Query, req.MaxResults, "")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to search YouTube videos",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    response,
	})
}
