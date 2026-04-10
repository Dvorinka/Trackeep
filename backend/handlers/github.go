package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/trackeep/backend/config"
	"github.com/trackeep/backend/models"
)

// GitHubUser represents the GitHub user profile
type GitHubUser struct {
	ID        int    `json:"id"`
	Login     string `json:"login"`
	Name      string `json:"name"`
	Email     string `json:"email"`
	AvatarURL string `json:"avatar_url"`
	HTMLURL   string `json:"html_url"`
}

// GitHubRepo represents a GitHub repository
type GitHubRepo struct {
	ID            int    `json:"id"`
	Name          string `json:"name"`
	FullName      string `json:"full_name"`
	Description   string `json:"description"`
	HTMLURL       string `json:"html_url"`
	CloneURL      string `json:"clone_url"`
	Private       bool   `json:"private"`
	Stargazers    int    `json:"stargazers_count"`
	Forks         int    `json:"forks_count"`
	Watchers      int    `json:"watchers_count"`
	Language      string `json:"language"`
	UpdatedAt     string `json:"updated_at"`
	CreatedAt     string `json:"created_at"`
	Size          int    `json:"size"`
	OpenIssues    int    `json:"open_issues_count"`
	DefaultBranch string `json:"default_branch"`
}

// GitHubLogin initiates the GitHub App user sign-in flow.
func GitHubLogin(c *gin.Context) {
	storeControlServiceAuthFlowState(c, resolveFrontendRedirectURL(c.Request))

	redirectURL, err := buildControlServiceGitHubStartURL(c.Request)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Redirect(http.StatusTemporaryRedirect, redirectURL)
}

// GitHubCallback handles the GitHub App sign-in callback.
func GitHubCallback(c *gin.Context) {
	frontendRedirect := getGitHubFrontendRedirectFromCookie(c)
	storedState, err := c.Cookie(gitHubAuthStateCookieName)
	clearGitHubAuthFlowState(c)
	if err != nil || strings.TrimSpace(storedState) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "GitHub sign-in state not found"})
		return
	}

	if callbackError := strings.TrimSpace(c.Query("error")); callbackError != "" {
		description := strings.TrimSpace(c.Query("error_description"))
		if description == "" {
			description = callbackError
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": "GitHub sign-in failed: " + description})
		return
	}

	if strings.TrimSpace(c.Query("state")) != storedState {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid state"})
		return
	}

	callbackURL := buildGitHubUserCallbackURL(c.Request)
	if callbackURL == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Unable to determine GitHub callback URL"})
		return
	}

	code := strings.TrimSpace(c.Query("code"))
	tokenResponse, err := exchangeGitHubAuthorizationCode(c.Request.Context(), code, callbackURL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to exchange GitHub code: " + err.Error()})
		return
	}
	if strings.TrimSpace(tokenResponse.RefreshToken) == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "GitHub did not return a refresh token. Enable user token expiration for the GitHub App."})
		return
	}

	user, err := getGitHubUser(tokenResponse.AccessToken)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "Failed to fetch GitHub user profile: " + err.Error()})
		return
	}

	db := config.GetDB()
	if db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database not available"})
		return
	}
	existingUser, err := upsertCentralizedOAuthUser(db, centralizedOAuthUser{
		GitHubID:  user.ID,
		Username:  user.Login,
		Email:     user.Email,
		Name:      user.Name,
		AvatarURL: user.AvatarURL,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to synchronize user"})
		return
	}

	if err := upsertGitHubUserAuth(db, existingUser.ID, user, tokenResponse); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to store GitHub session: " + err.Error()})
		return
	}

	tokenString, err := GenerateJWT(*existingUser)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	redirectURL := buildFrontendCallbackRedirectURL(frontendRedirect, tokenString)
	if redirectURL == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Frontend redirect URL not configured"})
		return
	}
	c.Redirect(http.StatusTemporaryRedirect, redirectURL)
}

// getGitHubUser fetches user information from GitHub API
func getGitHubUser(accessToken string) (*GitHubUser, error) {
	client := &http.Client{}
	req, err := http.NewRequest("GET", strings.TrimRight(gitHubAPIBaseURL, "/")+"/user", nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")
	req.Header.Set("User-Agent", "Trackeep")

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		return nil, fmt.Errorf("GitHub user API returned %d: %s", resp.StatusCode, truncateString(string(body), 220))
	}

	var user GitHubUser
	if err := json.Unmarshal(body, &user); err != nil {
		return nil, err
	}

	email, err := getPrimaryEmail(accessToken)
	if err != nil {
		return nil, err
	}
	user.Email = email

	return &user, nil
}

// getPrimaryEmail fetches the primary email for the user
func getPrimaryEmail(accessToken string) (string, error) {
	return fetchGitHubPrimaryVerifiedEmail(accessToken)
}

// GetCurrentUser returns the current authenticated user with GitHub info
func GetCurrentUserWithGitHub(c *gin.Context) {
	user, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	currentUser := user.(models.User)

	// Remove sensitive data
	currentUser.Password = ""

	c.JSON(http.StatusOK, gin.H{"user": currentUser})
}
func GetGitHubRepos(c *gin.Context) {
	userID := getGitHubRequestUserID(c)

	db := config.GetDB()
	if db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database not available"})
		return
	}

	if _, err := getControlServiceSessionRecord(db, userID); err == nil {
		repos, err := fetchControlServiceGitHubRepos(c.Request.Context(), db, userID)
		if err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": "Failed to fetch repos from control service: " + err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"repos": repos})
		return
	}

	var user models.User
	if err := db.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	if user.GitHubID == 0 {
		if _, err := getGitHubUserAuthRecord(db, userID); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "GitHub sign-in is not connected"})
			return
		}
	}

	githubAccessToken, _, err := getGitHubUserAccessTokenForUser(c.Request.Context(), db, userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	repos, err := fetchGitHubRepos(githubAccessToken)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch repos: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"repos": repos})
}

// GitHubContribution represents a day's contribution data
type GitHubContribution struct {
	Date  string `json:"date"`
	Count int    `json:"count"`
	Level int    `json:"level"` // 0-5 intensity level
}

// GitHubActivityResponse represents the response structure for GitHub activity
type GitHubActivityResponse struct {
	Contributions []GitHubContribution `json:"contributions"`
	WeeklyData    []int                `json:"weekly_data"`
	TotalCount    int                  `json:"total_count"`
}

// fetchGitHubRepos fetches repositories from GitHub API
func fetchGitHubRepos(accessToken string) ([]GitHubRepo, error) {
	client := &http.Client{}
	req, err := http.NewRequest("GET", strings.TrimRight(gitHubAPIBaseURL, "/")+"/user/repos?type=owner&sort=updated&per_page=100", nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")
	req.Header.Set("User-Agent", "Trackeep")

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		return nil, fmt.Errorf("GitHub repos API returned %d: %s", resp.StatusCode, truncateString(string(body), 220))
	}

	var repos []GitHubRepo
	if err := json.Unmarshal(body, &repos); err != nil {
		return nil, err
	}

	return repos, nil
}

// fetchGitHubContributions fetches contribution data from GitHub API
func fetchGitHubContributions(accessToken string) (*GitHubActivityResponse, error) {
	client := &http.Client{}

	// Fetch contribution data for the last year
	req, err := http.NewRequest("GET", strings.TrimRight(gitHubAPIBaseURL, "/")+"/search/issues?q=author:@me+created:>=2025-03-13&per_page=100", nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")
	req.Header.Set("User-Agent", "Trackeep")

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		return nil, fmt.Errorf("GitHub contributions API returned %d: %s", resp.StatusCode, truncateString(string(body), 220))
	}

	// Parse the response to get activity data
	var issueResponse struct {
		Items []struct {
			CreatedAt string `json:"created_at"`
		} `json:"items"`
	}

	if err := json.Unmarshal(body, &issueResponse); err != nil {
		return nil, err
	}

	// Generate contribution data for the last year
	contributions := make([]GitHubContribution, 0)
	weeklyData := make([]int, 7)
	today := time.Now()

	// Initialize contribution map
	contributionMap := make(map[string]int)

	// Count contributions by date
	for _, item := range issueResponse.Items {
		date := item.CreatedAt[:10] // Extract date part
		contributionMap[date]++
	}

	// Generate daily contribution data for the last year
	for i := 364; i >= 0; i-- {
		date := today.AddDate(0, 0, -i)
		dateStr := date.Format("2006-01-02")
		count := contributionMap[dateStr]

		// Calculate level (0-5 intensity)
		level := 0
		if count > 0 {
			if count <= 1 {
				level = 1
			} else if count <= 3 {
				level = 2
			} else if count <= 5 {
				level = 3
			} else if count <= 8 {
				level = 4
			} else {
				level = 5
			}
		}

		contributions = append(contributions, GitHubContribution{
			Date:  dateStr,
			Count: count,
			Level: level,
		})

		// Calculate weekly data (last 7 days)
		if i < 7 {
			weeklyData[6-i] = count
		}
	}

	totalCount := len(issueResponse.Items)

	return &GitHubActivityResponse{
		Contributions: contributions,
		WeeklyData:    weeklyData,
		TotalCount:    totalCount,
	}, nil
}

// GetGitHubActivity fetches GitHub contribution activity
func GetGitHubActivity(c *gin.Context) {
	userID := getGitHubRequestUserID(c)

	db := config.GetDB()
	if db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database not available"})
		return
	}

	var githubAccessToken string
	var err error

	// Try to get access token from control service first
	if _, err := getControlServiceSessionRecord(db, userID); err == nil {
		// Use control service token if available
		tokenPayload, err := fetchControlServiceGitHubUserAccessToken(c.Request.Context(), db, userID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to get GitHub access token from control service: " + err.Error()})
			return
		}
		githubAccessToken = tokenPayload.AccessToken
	} else {
		// Fall back to user auth token
		githubAccessToken, _, err = getGitHubUserAccessTokenForUser(c.Request.Context(), db, userID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
	}

	activity, err := fetchGitHubContributions(githubAccessToken)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch GitHub activity: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, activity)
}
