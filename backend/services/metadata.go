package services

import (
	"crypto/md5"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"
)

// WebsiteMetadata represents extracted website information
type WebsiteMetadata struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Favicon     string `json:"favicon"`
	SiteName    string `json:"site_name"`
	Image       string `json:"image"`
	Author      string `json:"author"`
	PublishedAt string `json:"published_at"`
}

// FetchWebsiteMetadata extracts metadata from a URL
func FetchWebsiteMetadata(targetURL string) (*WebsiteMetadata, error) {
	// Parse URL to ensure it's valid
	_, err := url.Parse(targetURL)
	if err != nil {
		return nil, fmt.Errorf("invalid URL: %w", err)
	}

	// Create HTTP client with timeout
	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	// Make request
	req, err := http.NewRequest("GET", targetURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Set user agent to avoid being blocked
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch URL: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("HTTP %d: %s", resp.StatusCode, resp.Status)
	}

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	content := string(body)
	metadata := &WebsiteMetadata{}

	// Extract Open Graph and Twitter Card metadata
	metadata = extractOpenGraphMetadata(content, metadata)
	metadata = extractTwitterMetadata(content, metadata)
	metadata = extractBasicHTMLMetadata(content, metadata)

	// Extract favicon using enhanced fetcher
	if metadata.Favicon == "" {
		if favicon, err := GetFavicon(targetURL); err == nil && favicon != "" {
			metadata.Favicon = favicon
		}
	}

	return metadata, nil
}

// extractOpenGraphMetadata extracts Open Graph meta tags
func extractOpenGraphMetadata(content string, metadata *WebsiteMetadata) *WebsiteMetadata {
	// This is a simple implementation - in production, you might want to use a proper HTML parser
	ogPatterns := map[string]string{
		`<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']`:               "Title",
		`<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']`:         "Description",
		`<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']`:               "Image",
		`<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']`:           "SiteName",
		`<meta[^>]+property=["']article:author["'][^>]+content=["']([^"']+)["']`:         "Author",
		`<meta[^>]+property=["']article:published_time["'][^>]+content=["']([^"']+)["']`: "PublishedAt",
	}

	for pattern, field := range ogPatterns {
		if re := regexp.MustCompile(pattern); re != nil {
			if matches := re.FindStringSubmatch(content); len(matches) > 1 {
				switch field {
				case "Title":
					metadata.Title = matches[1]
				case "Description":
					metadata.Description = matches[1]
				case "Image":
					metadata.Image = matches[1]
				case "SiteName":
					metadata.SiteName = matches[1]
				case "Author":
					metadata.Author = matches[1]
				case "PublishedAt":
					metadata.PublishedAt = matches[1]
				}
			}
		}
	}

	return metadata
}

// extractTwitterMetadata extracts Twitter Card meta tags
func extractTwitterMetadata(content string, metadata *WebsiteMetadata) *WebsiteMetadata {
	twitterPatterns := map[string]string{
		`<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']`:       "Title",
		`<meta[^>]+name=["']twitter:description["'][^>]+content=["']([^"']+)["']`: "Description",
		`<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']`:       "Image",
		`<meta[^>]+name=["']twitter:site["'][^>]+content=["']([^"']+)["']`:        "SiteName",
		`<meta[^>]+name=["']twitter:creator["'][^>]+content=["']([^"']+)["']`:     "Author",
	}

	for pattern, field := range twitterPatterns {
		if re := regexp.MustCompile(pattern); re != nil {
			if matches := re.FindStringSubmatch(content); len(matches) > 1 {
				// Only set if not already set by Open Graph
				switch field {
				case "Title":
					if metadata.Title == "" {
						metadata.Title = matches[1]
					}
				case "Description":
					if metadata.Description == "" {
						metadata.Description = matches[1]
					}
				case "Image":
					if metadata.Image == "" {
						metadata.Image = matches[1]
					}
				case "SiteName":
					if metadata.SiteName == "" {
						metadata.SiteName = matches[1]
					}
				case "Author":
					if metadata.Author == "" {
						metadata.Author = matches[1]
					}
				}
			}
		}
	}

	return metadata
}

// extractBasicHTMLMetadata extracts basic HTML title and description
func extractBasicHTMLMetadata(content string, metadata *WebsiteMetadata) *WebsiteMetadata {
	// Extract title
	if metadata.Title == "" {
		if re := regexp.MustCompile(`<title[^>]*>([^<]+)</title>`); re != nil {
			if matches := re.FindStringSubmatch(content); len(matches) > 1 {
				metadata.Title = strings.TrimSpace(matches[1])
			}
		}
	}

	// Extract description meta tag
	if metadata.Description == "" {
		if re := regexp.MustCompile(`<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']`); re != nil {
			if matches := re.FindStringSubmatch(content); len(matches) > 1 {
				metadata.Description = matches[1]
			}
		}
	}

	return metadata
}

// extractFavicon extracts favicon from HTML with enhanced detection
func extractFavicon(content string, baseURL *url.URL) string {
	// Enhanced patterns for favicon detection
	patterns := []string{
		// Standard favicon link tags
		`<link[^>]+rel=["'](?:icon|shortcut icon)["'][^>]+href=["']([^"']+)["']`,
		`<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:icon|shortcut icon)["']`,

		// Apple touch icons
		`<link[^>]+rel=["']apple-touch-icon["'][^>]+href=["']([^"']+)["']`,
		`<link[^>]+href=["']([^"']+)["'][^>]+rel=["']apple-touch-icon["']`,

		// Apple touch icon precomposed
		`<link[^>]+rel=["']apple-touch-icon-precomposed["'][^>]+href=["']([^"']+)["']`,
		`<link[^>]+href=["']([^"']+)["'][^>]+rel=["']apple-touch-icon-precomposed["']`,

		// Android icons
		`<link[^>]+rel=["']android-chrome-[\w\-\d]+["'][^>]+href=["']([^"']+)["']`,
		`<link[^>]+href=["']([^"']+)["'][^>]+rel=["']android-chrome-[\w\-\d]+["']`,

		// Microsoft tiles
		`<meta[^>]+name=["']msapplication-TileImage["'][^>]+content=["']([^"']+)["']`,

		// Open Graph image (can be used as logo)
		`<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']`,

		// Twitter image
		`<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']`,

		// Logo patterns
		`<link[^>]+rel=["']logo["'][^>]+href=["']([^"']+)["']`,
		`<link[^>]+href=["']([^"']+)["'][^>]+rel=["']logo["']`,
	}

	for _, pattern := range patterns {
		if re := regexp.MustCompile(pattern); re != nil {
			if matches := re.FindStringSubmatch(content); len(matches) > 1 {
				href := matches[1]
				// Convert relative URL to absolute
				if strings.HasPrefix(href, "/") {
					return baseURL.Scheme + "://" + baseURL.Host + href
				} else if !strings.HasPrefix(href, "http") {
					return baseURL.Scheme + "://" + baseURL.Host + "/" + href
				}
				return href
			}
		}
	}

	return ""
}

// getDefaultFavicon tries common favicon locations with enhanced detection
func getDefaultFavicon(baseURL *url.URL) string {
	commonPaths := []string{
		"/favicon.ico",
		"/favicon.png",
		"/favicon.svg",
		"/apple-touch-icon.png",
		"/apple-touch-icon-precomposed.png",
		"/android-chrome-192x192.png",
		"/icon-192x192.png",
		"/touch-icon-192x192.png",
		"/logo.png",
		"/logo.svg",
		"/assets/favicon.ico",
		"/assets/favicon.png",
		"/static/favicon.ico",
		"/static/favicon.png",
		"/images/favicon.ico",
		"/images/favicon.png",
	}

	for _, path := range commonPaths {
		faviconURL := baseURL.Scheme + "://" + baseURL.Host + path

		// Check if favicon exists with a quick HEAD request
		if resp, err := http.Head(faviconURL); err == nil && resp.StatusCode == http.StatusOK {
			// Check content type to ensure it's an image
			contentType := resp.Header.Get("Content-Type")
			if strings.HasPrefix(contentType, "image/") {
				return faviconURL
			}
		}
	}

	// Try to find high-resolution favicons from common CDNs
	host := baseURL.Host
	if !strings.Contains(host, "www.") {
		host = "www." + host
	}

	// Try Google's favicon service with higher resolution
	return fmt.Sprintf("https://www.google.com/s2/favicons?domain=%s&sz=128", baseURL.Host)
}

// CacheService handles caching of metadata
type CacheService struct {
	cache map[string]*WebsiteMetadata
}

func NewCacheService() *CacheService {
	return &CacheService{
		cache: make(map[string]*WebsiteMetadata),
	}
}

func (cs *CacheService) Get(key string) (*WebsiteMetadata, bool) {
	if metadata, exists := cs.cache[key]; exists {
		return metadata, true
	}
	return nil, false
}

func (cs *CacheService) Set(key string, metadata *WebsiteMetadata) {
	cs.cache[key] = metadata
}

// Global cache instance
var metadataCache = NewCacheService()

// GetCachedMetadata fetches metadata with caching
func GetCachedMetadata(url string) (*WebsiteMetadata, error) {
	// Create cache key
	cacheKey := fmt.Sprintf("%x", md5.Sum([]byte(url)))

	// Try to get from cache
	if metadata, exists := metadataCache.Get(cacheKey); exists {
		return metadata, nil
	}

	// Fetch fresh metadata
	metadata, err := FetchWebsiteMetadata(url)
	if err != nil {
		return nil, err
	}

	// Cache the result
	metadataCache.Set(cacheKey, metadata)

	return metadata, nil
}
