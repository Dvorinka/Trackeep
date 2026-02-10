package services

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"
)

// FaviconFetcher handles comprehensive favicon detection and fetching
type FaviconFetcher struct {
	client *http.Client
}

// NewFaviconFetcher creates a new favicon fetcher instance
func NewFaviconFetcher() *FaviconFetcher {
	return &FaviconFetcher{
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// FetchFavicon fetches the best available favicon for a given URL
func (ff *FaviconFetcher) FetchFavicon(targetURL string) (string, error) {
	parsedURL, err := url.Parse(targetURL)
	if err != nil {
		return "", fmt.Errorf("invalid URL: %w", err)
	}

	// Try to extract favicon from HTML head first
	faviconURL, err := ff.extractFromHTML(targetURL, parsedURL)
	if err == nil && faviconURL != "" {
		// Verify the favicon exists
		if ff.verifyFaviconExists(faviconURL) {
			return faviconURL, nil
		}
	}

	// Try common favicon locations
	faviconURL = ff.tryCommonLocations(parsedURL)
	if faviconURL != "" {
		return faviconURL, nil
	}

	// Fallback to Google's favicon service
	return ff.getGoogleFavicon(parsedURL.Host), nil
}

// extractFromHTML fetches HTML content and extracts favicon URLs from head section
func (ff *FaviconFetcher) extractFromHTML(targetURL string, baseURL *url.URL) (string, error) {
	req, err := http.NewRequest("GET", targetURL, nil)
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers to mimic a real browser
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8")
	req.Header.Set("Accept-Language", "en-US,en;q=0.9")
	req.Header.Set("Accept-Encoding", "gzip, deflate, br")
	req.Header.Set("Cache-Control", "no-cache")
	req.Header.Set("Pragma", "no-cache")

	resp, err := ff.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to fetch HTML: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("HTTP %d: %s", resp.StatusCode, resp.Status)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response body: %w", err)
	}

	content := string(body)

	// Extract head section for faster processing
	headContent := ff.extractHeadSection(content)

	// Try to find favicon in head section
	return ff.findFaviconInHead(headContent, baseURL), nil
}

// extractHeadSection extracts the <head> section from HTML content
func (ff *FaviconFetcher) extractHeadSection(content string) string {
	// Find head section with a more robust regex
	headRegex := regexp.MustCompile(`(?is)<head[^>]*>(.*?)</head>`)
	matches := headRegex.FindStringSubmatch(content)
	if len(matches) > 1 {
		return matches[1]
	}

	// Fallback: try to find from beginning to <body>
	bodyRegex := regexp.MustCompile(`(?is)^.*?<body[^>]*>`)
	matches = bodyRegex.FindStringSubmatch(content)
	if len(matches) > 0 {
		return matches[0]
	}

	// Last resort: return first 2000 characters
	if len(content) > 2000 {
		return content[:2000]
	}
	return content
}

// findFaviconInHead searches for favicon URLs in head section content
func (ff *FaviconFetcher) findFaviconInHead(headContent string, baseURL *url.URL) string {
	// Comprehensive favicon patterns in order of preference
	patterns := []struct {
		pattern  string
		priority int
	}{
		// High priority: explicit favicon declarations
		{`<link[^>]+rel=["'](?:icon|shortcut icon)["'][^>]+href=["']([^"']+)["']`, 1},
		{`<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:icon|shortcut icon)["']`, 1},

		// Medium priority: Apple touch icons (usually higher quality)
		{`<link[^>]+rel=["']apple-touch-icon["'][^>]+href=["']([^"']+)["']`, 2},
		{`<link[^>]+href=["']([^"']+)["'][^>]+rel=["']apple-touch-icon["']`, 2},
		{`<link[^>]+rel=["']apple-touch-icon-precomposed["'][^>]+href=["']([^"']+)["']`, 2},
		{`<link[^>]+href=["']([^"']+)["'][^>]+rel=["']apple-touch-icon-precomposed["']`, 2},

		// Lower priority: other icon types
		{`<link[^>]+rel=["']android-chrome-[\w\-\d]+["'][^>]+href=["']([^"']+)["']`, 3},
		{`<link[^>]+href=["']([^"']+)["'][^>]+rel=["']android-chrome-[\w\-\d]+["']`, 3},
		{`<link[^>]+rel=["']mask-icon["'][^>]+href=["']([^"']+)["']`, 3},
		{`<link[^>]+href=["']([^"']+)["'][^>]+rel=["']mask-icon["']`, 3},
		{`<link[^>]+rel=["']fluid-icon["'][^>]+href=["']([^"']+)["']`, 3},
		{`<link[^>]+href=["']([^"']+)["'][^>]+rel=["']fluid-icon["']`, 3},

		// Meta tags that might contain icons
		{`<meta[^>]+name=["']msapplication-TileImage["'][^>]+content=["']([^"']+)["']`, 4},

		// Open Graph and Twitter images (can be used as fallback)
		{`<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']`, 5},
		{`<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']`, 5},

		// Logo patterns
		{`<link[^>]+rel=["']logo["'][^>]+href=["']([^"']+)["']`, 6},
		{`<link[^>]+href=["']([^"']+)["'][^>]+rel=["']logo["']`, 6},

		// Generic icon rel
		{`<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["']([^"']+)["']`, 7},
		{`<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*icon[^"']*["']`, 7},
	}

	var candidates []struct {
		url      string
		priority int
	}

	for _, p := range patterns {
		re := regexp.MustCompile(p.pattern)
		matches := re.FindAllStringSubmatch(headContent, -1)

		for _, match := range matches {
			if len(match) > 1 {
				href := strings.TrimSpace(match[1])
				if href != "" {
					absoluteURL := ff.makeAbsoluteURL(href, baseURL)
					candidates = append(candidates, struct {
						url      string
						priority int
					}{url: absoluteURL, priority: p.priority})
				}
			}
		}
	}

	// Return the highest priority candidate
	if len(candidates) > 0 {
		best := candidates[0]
		for _, candidate := range candidates {
			if candidate.priority < best.priority {
				best = candidate
			}
		}
		return best.url
	}

	return ""
}

// makeAbsoluteURL converts relative URLs to absolute URLs
func (ff *FaviconFetcher) makeAbsoluteURL(href string, baseURL *url.URL) string {
	// Remove any fragments
	if idx := strings.Index(href, "#"); idx != -1 {
		href = href[:idx]
	}

	// Handle different URL types
	if strings.HasPrefix(href, "http://") || strings.HasPrefix(href, "https://") {
		return href
	}

	if strings.HasPrefix(href, "//") {
		return baseURL.Scheme + ":" + href
	}

	if strings.HasPrefix(href, "/") {
		return baseURL.Scheme + "://" + baseURL.Host + href
	}

	// Relative path - construct proper URL
	if baseURL.Path == "" || baseURL.Path == "/" {
		return baseURL.Scheme + "://" + baseURL.Host + "/" + href
	}

	// Remove filename from base path
	basePath := baseURL.Path
	if lastSlash := strings.LastIndex(basePath, "/"); lastSlash != -1 {
		basePath = basePath[:lastSlash+1]
	}

	return baseURL.Scheme + "://" + baseURL.Host + basePath + href
}

// tryCommonLocations tries common favicon file paths
func (ff *FaviconFetcher) tryCommonLocations(baseURL *url.URL) string {
	// Common favicon locations, ordered by likelihood
	locations := []string{
		"/favicon.ico",
		"/favicon.png",
		"/favicon.svg",
		"/apple-touch-icon.png",
		"/apple-touch-icon-precomposed.png",
		"/android-chrome-192x192.png",
		"/icon.png",
		"/icon.svg",
		"/logo.png",
		"/logo.svg",
		"/assets/favicon.ico",
		"/assets/favicon.png",
		"/assets/icon.png",
		"/static/favicon.ico",
		"/static/favicon.png",
		"/static/icon.png",
		"/images/favicon.ico",
		"/images/favicon.png",
		"/img/favicon.ico",
		"/img/favicon.png",
		"/favicon-32x32.png",
		"/favicon-16x16.png",
		"/icon-192x192.png",
		"/icon-512x512.png",
	}

	for _, path := range locations {
		faviconURL := baseURL.Scheme + "://" + baseURL.Host + path

		if ff.verifyFaviconExists(faviconURL) {
			return faviconURL
		}
	}

	return ""
}

// verifyFaviconExists checks if a favicon URL exists and is accessible
func (ff *FaviconFetcher) verifyFaviconExists(faviconURL string) bool {
	req, err := http.NewRequest("HEAD", faviconURL, nil)
	if err != nil {
		return false
	}

	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")

	resp, err := ff.client.Do(req)
	if err != nil {
		return false
	}
	defer resp.Body.Close()

	// Check if the response is successful and contains an image
	if resp.StatusCode == http.StatusOK {
		contentType := resp.Header.Get("Content-Type")
		return strings.HasPrefix(contentType, "image/") ||
			strings.HasSuffix(faviconURL, ".ico") ||
			strings.HasSuffix(faviconURL, ".png") ||
			strings.HasSuffix(faviconURL, ".svg") ||
			strings.HasSuffix(faviconURL, ".jpg") ||
			strings.HasSuffix(faviconURL, ".jpeg") ||
			strings.HasSuffix(faviconURL, ".gif") ||
			strings.HasSuffix(faviconURL, ".webp")
	}

	return false
}

// getGoogleFavicon returns Google's favicon service URL as fallback
func (ff *FaviconFetcher) getGoogleFavicon(domain string) string {
	// Try different sizes for better quality
	return fmt.Sprintf("https://www.google.com/s2/favicons?domain=%s&sz=128", domain)
}

// FetchMultipleFavicons fetches multiple favicon candidates for a URL
func (ff *FaviconFetcher) FetchMultipleFavicons(targetURL string, maxResults int) []string {
	parsedURL, err := url.Parse(targetURL)
	if err != nil {
		return []string{ff.getGoogleFavicon("example.com")}
	}

	var favicons []string

	// Try HTML extraction
	if htmlFavicon, err := ff.extractFromHTML(targetURL, parsedURL); err == nil && htmlFavicon != "" {
		if ff.verifyFaviconExists(htmlFavicon) {
			favicons = append(favicons, htmlFavicon)
		}
	}

	// Try common locations
	locations := []string{
		"/favicon.ico", "/favicon.png", "/favicon.svg",
		"/apple-touch-icon.png", "/icon.png", "/logo.png",
		"/assets/favicon.ico", "/static/favicon.ico", "/images/favicon.ico",
	}

	for _, path := range locations {
		faviconURL := parsedURL.Scheme + "://" + parsedURL.Host + path
		if ff.verifyFaviconExists(faviconURL) && !containsString(favicons, faviconURL) {
			favicons = append(favicons, faviconURL)
			if len(favicons) >= maxResults {
				break
			}
		}
	}

	// Add Google fallback if no favicons found or if we want more results
	if len(favicons) == 0 || len(favicons) < maxResults {
		googleFavicon := ff.getGoogleFavicon(parsedURL.Host)
		if !containsString(favicons, googleFavicon) {
			favicons = append(favicons, googleFavicon)
		}
	}

	return favicons
}

// containsString checks if a string slice contains a specific string
func containsString(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

// Global instance
var faviconFetcher = NewFaviconFetcher()

// GetFavicon fetches the best favicon for a URL (convenience function)
func GetFavicon(url string) (string, error) {
	return faviconFetcher.FetchFavicon(url)
}

// GetAllFavicons fetches multiple favicon candidates for a URL
func GetAllFavicons(url string, maxResults int) []string {
	return faviconFetcher.FetchMultipleFavicons(url, maxResults)
}
