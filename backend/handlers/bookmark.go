package handlers

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/chromedp/chromedp"
	"github.com/gin-gonic/gin"
	"github.com/trackeep/backend/config"
	"github.com/trackeep/backend/models"
	"github.com/trackeep/backend/services"
)

// GetBookmarks handles GET /api/v1/bookmarks
func GetBookmarks(c *gin.Context) {
	// Check if demo mode is enabled
	if os.Getenv("VITE_DEMO_MODE") == "true" {
		// Return mock bookmarks for demo mode
		mockBookmarks := []models.Bookmark{
			{
				ID:          1,
				Title:       "React Documentation",
				URL:         "https://react.dev",
				Description: "The official React documentation",
				UserID:      1,
				CreatedAt:   time.Now(),
				UpdatedAt:   time.Now(),
			},
			{
				ID:          2,
				Title:       "YouTube - Introduction to React Programming",
				URL:         "https://www.youtube.com/watch?v=hTWKbfoikeg",
				Description: "Video from Programming Tutorials",
				UserID:      1,
				CreatedAt:   time.Now(),
				UpdatedAt:   time.Now(),
			},
			{
				ID:          3,
				Title:       "Docker Documentation",
				URL:         "https://docs.docker.com",
				Description: "Official Docker documentation",
				UserID:      1,
				CreatedAt:   time.Now(),
				UpdatedAt:   time.Now(),
			},
		}
		c.JSON(http.StatusOK, mockBookmarks)
		return
	}

	db := config.GetDB()
	var bookmarks []models.Bookmark

	// Get user ID from context (set by auth middleware)
	userID := c.GetUint("userID")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Preload tags for the bookmarks
	if err := db.Where("user_id = ?", userID).Preload("Tags").Find(&bookmarks).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch bookmarks"})
		return
	}

	c.JSON(http.StatusOK, bookmarks)
}

// CreateBookmark handles POST /api/v1/bookmarks
func CreateBookmark(c *gin.Context) {
	db := config.GetDB()
	var bookmark models.Bookmark

	if err := c.ShouldBindJSON(&bookmark); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Set user ID from auth middleware
	userID := c.GetUint("userID")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	bookmark.UserID = userID

	// Fetch website metadata if URL is provided
	if bookmark.URL != "" {
		// Use basic metadata fetching
		if metadata, err := services.GetCachedMetadata(bookmark.URL); err == nil {
			// Update bookmark with fetched metadata
			if bookmark.Title == "" && metadata.Title != "" {
				bookmark.Title = metadata.Title
			}
			if bookmark.Description == "" && metadata.Description != "" {
				bookmark.Description = metadata.Description
			}
			if metadata.Favicon != "" {
				bookmark.Favicon = metadata.Favicon
			}
			if metadata.Author != "" {
				bookmark.Author = metadata.Author
			}
			// Parse published date if available
			if metadata.PublishedAt != "" {
				if publishedAt, err := time.Parse(time.RFC3339, metadata.PublishedAt); err == nil {
					bookmark.PublishedAt = &publishedAt
				}
			}
		}
	}

	// Create bookmark
	if err := db.Create(&bookmark).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create bookmark"})
		return
	}

	// Preload tags for response
	db.Preload("Tags").First(&bookmark, bookmark.ID)

	c.JSON(http.StatusCreated, bookmark)
}

// GetBookmark handles GET /api/v1/bookmarks/:id
func GetBookmark(c *gin.Context) {
	db := config.GetDB()
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid bookmark ID"})
		return
	}

	var bookmark models.Bookmark
	userID := c.GetUint("userID")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Find bookmark with tags
	if err := db.Where("id = ? AND user_id = ?", id, userID).Preload("Tags").First(&bookmark).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Bookmark not found"})
		return
	}

	c.JSON(http.StatusOK, bookmark)
}

// UpdateBookmark handles PUT /api/v1/bookmarks/:id
func UpdateBookmark(c *gin.Context) {
	db := config.GetDB()
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid bookmark ID"})
		return
	}

	var bookmark models.Bookmark
	userID := c.GetUint("userID")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Find existing bookmark
	if err := db.Where("id = ? AND user_id = ?", id, userID).First(&bookmark).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Bookmark not found"})
		return
	}

	// Update fields
	var updateData models.Bookmark
	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update bookmark
	if err := db.Model(&bookmark).Updates(updateData).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update bookmark"})
		return
	}

	// Get updated bookmark with tags
	db.Preload("Tags").First(&bookmark, bookmark.ID)

	c.JSON(http.StatusOK, bookmark)
}

// DeleteBookmark handles DELETE /api/v1/bookmarks/:id
func DeleteBookmark(c *gin.Context) {
	db := config.GetDB()
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid bookmark ID"})
		return
	}

	var bookmark models.Bookmark
	userID := c.GetUint("userID")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Find and delete bookmark
	if err := db.Where("id = ? AND user_id = ?", id, userID).First(&bookmark).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Bookmark not found"})
		return
	}

	if err := db.Delete(&bookmark).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete bookmark"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Bookmark deleted successfully"})
}

// RefreshBookmarkMetadata handles POST /api/v1/bookmarks/:id/refresh-metadata
func RefreshBookmarkMetadata(c *gin.Context) {
	db := config.GetDB()
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid bookmark ID"})
		return
	}

	var bookmark models.Bookmark
	userID := c.GetUint("userID")
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Find existing bookmark
	if err := db.Where("id = ? AND user_id = ?", id, userID).First(&bookmark).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Bookmark not found"})
		return
	}

	// Fetch fresh metadata
	if metadata, err := services.GetCachedMetadata(bookmark.URL); err == nil {
		// Update bookmark with basic metadata
		bookmark.Title = metadata.Title
		bookmark.Description = metadata.Description
		bookmark.Favicon = metadata.Favicon
		bookmark.Author = metadata.Author

		// Parse published date if available
		if metadata.PublishedAt != "" {
			if publishedAt, err := time.Parse(time.RFC3339, metadata.PublishedAt); err == nil {
				bookmark.PublishedAt = &publishedAt
			}
		}

		// Save updated bookmark
		if err := db.Save(&bookmark).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update bookmark"})
			return
		}

		// Get updated bookmark with tags
		db.Preload("Tags").First(&bookmark, bookmark.ID)

		c.JSON(http.StatusOK, gin.H{
			"message":  "Metadata refreshed successfully",
			"bookmark": bookmark,
		})
	} else {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Failed to fetch metadata: %s", err.Error())})
	}
}

// GetBookmarkMetadata handles POST /api/v1/bookmarks/metadata
func GetBookmarkMetadata(c *gin.Context) {
	var request struct {
		URL string `json:"url" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Fetch metadata using basic service
	if metadata, err := services.GetCachedMetadata(request.URL); err == nil {
		// Return metadata from basic fetching
		response := gin.H{
			"title":       metadata.Title,
			"description": metadata.Description,
			"favicon":     metadata.Favicon,
			"metadata": gin.H{
				"siteName":    metadata.SiteName,
				"description": metadata.Description,
				"image":       metadata.Image,
				"author":      metadata.Author,
			},
		}
		c.JSON(http.StatusOK, response)
	} else {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Failed to fetch metadata: %s", err.Error())})
	}
}

// GetBookmarkContent handles POST /api/v1/bookmarks/content
func GetBookmarkContent(c *gin.Context) {
	var request struct {
		URL string `json:"url" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Fetch full page content with screenshot
	content, err := fetchPageContentWithScreenshot(request.URL)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Failed to fetch content: %s", err.Error())})
		return
	}

	// Return content as HTML
	c.Header("Content-Type", "text/html")
	c.String(http.StatusOK, content)
}

// fetchPageContentWithScreenshot fetches page content and generates a screenshot
func fetchPageContentWithScreenshot(targetURL string) (string, error) {
	// Parse URL to ensure it's valid
	parsedURL, err := url.Parse(targetURL)
	if err != nil {
		return "", fmt.Errorf("invalid URL: %w", err)
	}

	// Create HTTP client with timeout for content fetching
	client := &http.Client{
		Timeout: 15 * time.Second,
	}

	// Make request for basic content
	req, err := http.NewRequest("GET", targetURL, nil)
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	// Set user agent to avoid being blocked
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8")

	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to fetch URL: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("HTTP %d: %s", resp.StatusCode, resp.Status)
	}

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response body: %w", err)
	}

	content := string(body)

	// Extract metadata for preview
	metadata, err := services.FetchWebsiteMetadata(targetURL)
	if err != nil {
		// Continue without metadata if it fails
		metadata = &services.WebsiteMetadata{
			Title: parsedURL.Hostname(),
		}
	}

	// Try to capture screenshot
	var screenshotData []byte
	screenshotErr := captureScreenshot(targetURL, &screenshotData)

	// Generate preview HTML with screenshot if available
	previewHTML := generateEnhancedPreviewHTML(content, metadata, parsedURL, screenshotData, screenshotErr)

	return previewHTML, nil
}

// captureScreenshot captures a screenshot of the given URL using ChromeDP
func captureScreenshot(targetURL string, screenshotData *[]byte) error {
	// Create a new Chrome context
	ctx, cancel := chromedp.NewContext(context.Background())
	defer cancel()

	// Set a timeout for the entire operation
	ctx, cancel = context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	// Navigate to the URL and capture screenshot
	var buf []byte
	err := chromedp.Run(ctx,
		chromedp.Navigate(targetURL),
		chromedp.WaitReady("body"),          // Wait for body to be ready
		chromedp.EmulateViewport(1200, 800), // Set viewport size
		chromedp.CaptureScreenshot(&buf),
	)

	if err != nil {
		return fmt.Errorf("failed to capture screenshot: %w", err)
	}

	*screenshotData = buf
	return nil
}

// generateEnhancedPreviewHTML creates a clean preview with screenshot
func generateEnhancedPreviewHTML(content string, metadata *services.WebsiteMetadata, parsedURL *url.URL, screenshotData []byte, screenshotErr error) string {
	// Extract main content
	title := metadata.Title
	if title == "" {
		title = parsedURL.Hostname()
	}

	description := metadata.Description
	if description == "" {
		// Try to extract a snippet from the content
		content = strings.ToLower(content)
		// Remove script and style tags
		re := regexp.MustCompile(`(?i)<(script|style)[^>]*>.*?</\1>`)
		content = re.ReplaceAllString(content, "")

		// Extract text content
		re = regexp.MustCompile(`<[^>]+>`)
		textContent := re.ReplaceAllString(content, " ")
		textContent = strings.TrimSpace(textContent)

		if len(textContent) > 200 {
			description = textContent[:200] + "..."
		} else {
			description = textContent
		}
	}

	favicon := metadata.Favicon
	if favicon == "" {
		favicon = fmt.Sprintf("https://www.google.com/s2/favicons?domain=%s&sz=128", parsedURL.Host)
	}

	// Convert screenshot to base64 if available
	var screenshotHTML string
	if screenshotErr == nil && len(screenshotData) > 0 {
		// In a real implementation, you'd encode to base64 and store/display it
		// For now, we'll add a placeholder
		screenshotHTML = `
		<div class="screenshot-container">
			<h3>Page Screenshot</h3>
			<div class="screenshot-placeholder">
				<p>Screenshot captured successfully (${len(screenshotData)} bytes)</p>
				<p><em>(Screenshot display would be implemented here)</em></p>
			</div>
		</div>`
	} else {
		screenshotHTML = `
		<div class="screenshot-container">
			<h3>Page Screenshot</h3>
			<div class="screenshot-error">
				<p>Could not capture screenshot: ` + screenshotErr.Error() + `</p>
				<p><em>(Screenshot requires Chrome/Chromium to be installed)</em></p>
			</div>
		</div>`
	}

	// Generate enhanced preview HTML
	previewHTML := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Preview: %s</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #f9f9f9;
        }
        .preview-header {
            background: white;
            padding: 24px;
            border-radius: 12px;
            margin-bottom: 20px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            display: flex;
            align-items: center;
            gap: 16px;
        }
        .favicon-container {
            width: 48px;
            height: 48px;
            background: #f0f0f0;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            flex-shrink: 0;
        }
        .favicon {
            width: 32px;
            height: 32px;
            object-fit: contain;
        }
        .header-content {
            flex: 1;
            min-width: 0;
        }
        .preview-header h1 {
            margin: 0 0 8px 0;
            font-size: 24px;
            color: #1a1a1a;
            font-weight: 600;
        }
        .preview-url {
            color: #666;
            font-size: 14px;
            word-break: break-all;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            background: #f5f5f5;
            padding: 4px 8px;
            border-radius: 4px;
        }
        .screenshot-container {
            background: white;
            padding: 24px;
            border-radius: 12px;
            margin-bottom: 20px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .screenshot-container h3 {
            margin: 0 0 16px 0;
            color: #333;
            font-size: 18px;
        }
        .screenshot-placeholder, .screenshot-error {
            background: #f8f9fa;
            border: 2px dashed #dee2e6;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            color: #6c757d;
        }
        .preview-meta {
            background: white;
            padding: 24px;
            border-radius: 12px;
            margin-bottom: 20px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .preview-meta p {
            margin: 8px 0;
        }
        .preview-meta strong {
            color: #333;
            font-weight: 600;
        }
        .preview-actions {
            background: white;
            padding: 24px;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            text-align: center;
        }
        .visit-site {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: #007bff;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 500;
            transition: background-color 0.2s;
        }
        .visit-site:hover {
            background: #0056b3;
        }
        .site-info {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 16px;
        }
        .site-info img {
            width: 16px;
            height: 16px;
        }
    </style>
</head>
<body>
    <div class="preview-header">
        <div class="favicon-container">
            <img src="%s" alt="Site favicon" class="favicon" 
                 onerror="this.style.display='none'; this.parentElement.innerHTML='<span style=\'font-size: 18px; font-weight: 600; color: #666;\'>%s</span>'" />
        </div>
        <div class="header-content">
            <h1>%s</h1>
            <div class="preview-url">%s</div>
        </div>
    </div>
    
    %s
    
    <div class="preview-meta">
        <div class="site-info">
            <img src="%s" alt="Site favicon" style="width: 16px; height: 16px;" 
                 onerror="this.style.display='none'" />
            <strong>Site:</strong> %s
        </div>
        <p><strong>Description:</strong> %s</p>
        <p><strong>Author:</strong> %s</p>
    </div>
    
    <div class="preview-actions">
        <a href="%s" target="_blank" rel="noopener noreferrer" class="visit-site">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15,3 21,3 21,9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
            Visit Original Site
        </a>
    </div>
</body>
</html>`,
		title,
		favicon,
		title[:1], // First letter for fallback
		title,
		parsedURL.String(),
		screenshotHTML,
		favicon,
		metadata.SiteName,
		description,
		metadata.Author,
		parsedURL.String(),
	)

	return previewHTML
}
