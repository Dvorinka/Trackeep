package services

import (
	"net/url"
	"strings"
	"testing"
)

func TestFaviconFetcher(t *testing.T) {
	fetcher := NewFaviconFetcher()

	// Test cases with different types of websites
	testCases := []struct {
		name     string
		url      string
		expected string // We'll just check that we get some result
	}{
		{
			name:     "GitHub",
			url:      "https://github.com",
			expected: "", // We expect to find a favicon
		},
		{
			name:     "Google",
			url:      "https://www.google.com",
			expected: "", // We expect to find a favicon
		},
		{
			name:     "Stack Overflow",
			url:      "https://stackoverflow.com",
			expected: "", // We expect to find a favicon
		},
		{
			name:     "Reddit",
			url:      "https://www.reddit.com",
			expected: "", // We expect to find a favicon
		},
		{
			name:     "Wikipedia",
			url:      "https://en.wikipedia.org",
			expected: "", // We expect to find a favicon
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			favicon, err := fetcher.FetchFavicon(tc.url)

			if err != nil {
				t.Logf("Warning: Could not fetch favicon for %s: %v", tc.name, err)
				// Don't fail the test, as some sites might block requests
				return
			}

			if favicon == "" {
				t.Errorf("Expected to find a favicon for %s, but got empty string", tc.name)
				return
			}

			t.Logf("✓ Found favicon for %s: %s", tc.name, favicon)
		})
	}
}

func TestMultipleFavicons(t *testing.T) {
	fetcher := NewFaviconFetcher()

	testURL := "https://github.com"
	favicons := fetcher.FetchMultipleFavicons(testURL, 5)

	if len(favicons) == 0 {
		t.Error("Expected to find at least one favicon")
	}

	t.Logf("Found %d favicons for %s:", len(favicons), testURL)
	for i, favicon := range favicons {
		t.Logf("  %d. %s", i+1, favicon)
	}
}

func TestMakeAbsoluteURL(t *testing.T) {
	fetcher := NewFaviconFetcher()

	baseURL, _ := url.Parse("https://example.com/path/page.html")

	testCases := []struct {
		input    string
		expected string
	}{
		{
			input:    "/favicon.ico",
			expected: "https://example.com/favicon.ico",
		},
		{
			input:    "favicon.ico",
			expected: "https://example.com/path/favicon.ico",
		},
		{
			input:    "../favicon.ico",
			expected: "https://example.com/favicon.ico",
		},
		{
			input:    "https://cdn.example.com/favicon.ico",
			expected: "https://cdn.example.com/favicon.ico",
		},
		{
			input:    "//cdn.example.com/favicon.ico",
			expected: "https://cdn.example.com/favicon.ico",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.input, func(t *testing.T) {
			result := fetcher.makeAbsoluteURL(tc.input, baseURL)
			if result != tc.expected {
				t.Errorf("Expected %s, got %s", tc.expected, result)
			}
		})
	}
}

func TestExtractHeadSection(t *testing.T) {
	fetcher := NewFaviconFetcher()

	htmlContent := `<!DOCTYPE html>
<html>
<head>
    <title>Test Page</title>
    <link rel="icon" href="/favicon.ico">
    <meta name="description" content="Test description">
</head>
<body>
    <h1>Test Content</h1>
</body>
</html>`

	headContent := fetcher.extractHeadSection(htmlContent)

	// Should contain the favicon link
	if !strings.Contains(headContent, `<link rel="icon" href="/favicon.ico">`) {
		t.Error("Expected to find favicon link in extracted head section")
	}

	// Should not contain body content
	if strings.Contains(headContent, "<h1>Test Content</h1>") {
		t.Error("Expected head section to not contain body content")
	}
}

// Benchmark tests
func BenchmarkFaviconFetch(b *testing.B) {
	fetcher := NewFaviconFetcher()
	url := "https://github.com"

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := fetcher.FetchFavicon(url)
		if err != nil {
			b.Logf("Error fetching favicon: %v", err)
		}
	}
}
