package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/trackeep/backend/config"
	"github.com/trackeep/backend/services"
	"gorm.io/gorm"
)

// YouTubeChannelRequest represents the request for channel videos
type YouTubeChannelRequest struct {
	ChannelID  string `json:"channel_id"`
	MaxResults int    `json:"max_results"`
}

// GetFireshipVideos fetches latest videos from Fireship channel
func GetFireshipVideos(c *gin.Context) {
	// Get max results from query parameter (default: 20)
	maxResults := 20
	if maxResultsStr := c.Query("max_results"); maxResultsStr != "" {
		if parsed, err := strconv.Atoi(maxResultsStr); err == nil && parsed > 0 && parsed <= 50 {
			maxResults = parsed
		}
	}

	// Create YouTube channel service with cache
	var db *gorm.DB
	if config.GetDB() != nil {
		db = config.GetDB()
	}
	youtubeService := services.NewYouTubeService()
	cacheService := services.NewYouTubeCacheService(db)
	channelService := services.NewYouTubeChannelService(youtubeService, cacheService)

	// Fetch Fireship videos
	videos, err := channelService.GetFireshipVideos(maxResults)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to fetch Fireship videos",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"channel": "Fireship",
		"videos":  videos,
		"count":   len(videos),
	})
}

// GetNetworkChuckVideos fetches latest videos from Network Chuck channel
func GetNetworkChuckVideos(c *gin.Context) {
	// Get max results from query parameter (default: 20)
	maxResults := 20
	if maxResultsStr := c.Query("max_results"); maxResultsStr != "" {
		if parsed, err := strconv.Atoi(maxResultsStr); err == nil && parsed > 0 && parsed <= 50 {
			maxResults = parsed
		}
	}

	// Create YouTube channel service with cache
	var db *gorm.DB
	if config.GetDB() != nil {
		db = config.GetDB()
	}
	youtubeService := services.NewYouTubeService()
	cacheService := services.NewYouTubeCacheService(db)
	channelService := services.NewYouTubeChannelService(youtubeService, cacheService)

	// Fetch Network Chuck videos
	videos, err := channelService.GetNetworkChuckVideos(maxResults)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to fetch Network Chuck videos",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"channel": "Network Chuck",
		"videos":  videos,
		"count":   len(videos),
	})
}

// GetChannelVideos fetches videos from a specific channel
func GetChannelVideos(c *gin.Context) {
	var req YouTubeChannelRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	// Set default max results if not provided
	if req.MaxResults <= 0 {
		req.MaxResults = 20
	}
	if req.MaxResults > 50 {
		req.MaxResults = 50
	}

	// Create YouTube channel service with cache
	var db *gorm.DB
	if config.GetDB() != nil {
		db = config.GetDB()
	}
	youtubeService := services.NewYouTubeService()
	cacheService := services.NewYouTubeCacheService(db)
	channelService := services.NewYouTubeChannelService(youtubeService, cacheService)

	// Get channel info first
	channelInfo, err := channelService.GetChannelInfo(req.ChannelID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "Channel not found",
			"details": err.Error(),
		})
		return
	}

	// Fetch channel videos
	response, err := channelService.YouTubeService.GetChannelVideos(req.ChannelID, req.MaxResults, "")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to fetch channel videos",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"channel":         channelInfo,
		"videos":          response.Videos,
		"count":           len(response.Videos),
		"next_page_token": response.NextPageToken,
	})
}
