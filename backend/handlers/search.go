package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"

	"github.com/gin-gonic/gin"
)

// BraveSearchResponse represents the response from Brave Search API
type BraveSearchResponse struct {
	Mixed struct {
		Results []map[string]interface{} `json:"results"`
	} `json:"mixed"`
	Web struct {
		Results []map[string]interface{} `json:"results"`
	} `json:"web"`
	Query struct {
		Original string `json:"original"`
		Display  string `json:"display"`
	} `json:"query"`
}

type BraveNewsResponse struct {
	Results []map[string]interface{} `json:"results"`
	Query   struct {
		Original string `json:"original"`
		Display  string `json:"display"`
	} `json:"query"`
}

// BraveSearchResult represents a normalized search result returned to the frontend
// Note: Brave's API uses fields like "page_age"; we normalize this to "published_date"
// to match the BrowserSearch UI expectations.
type BraveSearchResult struct {
	Title         string `json:"title"`
	URL           string `json:"url"`
	Description   string `json:"description"`
	PublishedDate string `json:"published_date,omitempty"`
	Language      string `json:"language,omitempty"`
}

// SearchWeb handles POST /api/v1/search/web
func SearchWeb(c *gin.Context) {
	fmt.Printf("DEBUG: SearchWeb function called\n")
	var req struct {
		Query string `json:"query" binding:"required"`
		Count int    `json:"count"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Set default count if not provided
	if req.Count == 0 {
		req.Count = 10
	}

	apiKey := os.Getenv("BRAVE_API_KEY")
	if apiKey == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Brave API key not configured"})
		return
	}

	// Build Brave Search API request
	baseURL := "https://api.search.brave.com/res/v1/web/search"
	q := url.Values{}
	q.Set("q", req.Query)
	q.Set("count", fmt.Sprint(req.Count))
	endpoint := fmt.Sprintf("%s?%s", baseURL, q.Encode())

	reqHTTP, err := http.NewRequest(http.MethodGet, endpoint, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create Brave request"})
		return
	}
	reqHTTP.Header.Set("Accept", "application/json")
	reqHTTP.Header.Set("X-Subscription-Token", apiKey)

	resp, err := http.DefaultClient.Do(reqHTTP)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "Failed to contact Brave Search API"})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		c.JSON(http.StatusBadGateway, gin.H{"error": fmt.Sprintf("Brave API error: %d", resp.StatusCode)})
		return
	}

	var braveResp BraveSearchResponse
	if err := json.NewDecoder(resp.Body).Decode(&braveResp); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode Brave response"})
		return
	}

	// Prefer web.results, fall back to mixed.results
	resultsRaw := braveResp.Web.Results
	if len(resultsRaw) == 0 {
		resultsRaw = braveResp.Mixed.Results
	}

	results := make([]BraveSearchResult, 0, len(resultsRaw))
	for _, r := range resultsRaw {
		title, _ := r["title"].(string)
		urlStr, _ := r["url"].(string)
		desc, _ := r["description"].(string)
		lang, _ := r["language"].(string)
		pageAge, _ := r["page_age"].(string)

		results = append(results, BraveSearchResult{
			Title:         title,
			URL:           urlStr,
			Description:   desc,
			PublishedDate: pageAge,
			Language:      lang,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"results": results,
		"query": gin.H{
			"original": braveResp.Query.Original,
			"display":  braveResp.Query.Display,
		},
		"count": len(results),
	})
}

func SearchNews(c *gin.Context) {
	fmt.Printf("DEBUG: SearchNews function called\n")
	var req struct {
		Query string `json:"query" binding:"required"`
		Count int    `json:"count"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Count == 0 {
		req.Count = 10
	}

	apiKey := os.Getenv("BRAVE_API_KEY")
	if apiKey == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Brave API key not configured"})
		return
	}

	baseURL := "https://api.search.brave.com/res/v1/news/search"
	q := url.Values{}
	q.Set("q", req.Query)
	q.Set("count", fmt.Sprint(req.Count))
	endpoint := fmt.Sprintf("%s?%s", baseURL, q.Encode())

	reqHTTP, err := http.NewRequest(http.MethodGet, endpoint, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create Brave request"})
		return
	}
	reqHTTP.Header.Set("Accept", "application/json")
	reqHTTP.Header.Set("X-Subscription-Token", apiKey)

	resp, err := http.DefaultClient.Do(reqHTTP)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "Failed to contact Brave News API"})
		return
	}

	if resp.StatusCode != http.StatusOK {
		resp.Body.Close()
		c.JSON(http.StatusBadGateway, gin.H{"error": fmt.Sprintf("Brave News API error: %d", resp.StatusCode)})
		return
	}

	// Read the response body for debugging
	bodyBytes, err := io.ReadAll(resp.Body)
	resp.Body.Close()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read response body"})
		return
	}

	fmt.Printf("DEBUG: Raw Brave News API response: %s\n", string(bodyBytes))

	var braveResp BraveNewsResponse
	if err := json.NewDecoder(bytes.NewReader(bodyBytes)).Decode(&braveResp); err != nil {
		fmt.Printf("DEBUG: JSON decode error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode Brave news response"})
		return
	}

	// Debug logging
	fmt.Printf("DEBUG: Parsed BraveNewsResponse: %+v\n", braveResp)
	fmt.Printf("DEBUG: Number of results: %d\n", len(braveResp.Results))

	resultsRaw := braveResp.Results
	results := make([]BraveSearchResult, 0, len(resultsRaw))
	for _, r := range resultsRaw {
		title, _ := r["title"].(string)
		urlStr, _ := r["url"].(string)
		desc, _ := r["description"].(string)
		lang, _ := r["language"].(string)
		pubDate, _ := r["published_date"].(string)
		if pubDate == "" {
			pubDate, _ = r["page_age"].(string)
		}

		results = append(results, BraveSearchResult{
			Title:         title,
			URL:           urlStr,
			Description:   desc,
			PublishedDate: pubDate,
			Language:      lang,
		})
	}

	original := braveResp.Query.Original
	display := braveResp.Query.Display
	if original == "" {
		original = req.Query
	}
	if display == "" {
		display = req.Query
	}

	c.JSON(http.StatusOK, gin.H{
		"results": results,
		"query": gin.H{
			"original": original,
			"display":  display,
		},
		"count": len(results),
	})
}

// GetSearchSuggestions handles GET /api/v1/search/suggestions
func GetSearchSuggestions(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Query parameter 'q' is required"})
		return
	}

	// For now, return empty suggestions
	// In a real implementation, you might want to implement autocomplete
	// using Brave's autocomplete API or your own suggestion engine
	c.JSON(http.StatusOK, gin.H{
		"suggestions": []string{},
		"query":       query,
	})
}
