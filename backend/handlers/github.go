package handlers

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"golang.org/x/oauth2"

	"github.com/trackeep/backend/config"
	"github.com/trackeep/backend/models"
)

// GitHub OAuth configuration
var githubOAuthConfig *oauth2.Config

func initGitHubOAuth() {
	githubOAuthConfig = &oauth2.Config{
		ClientID:     os.Getenv("GITHUB_CLIENT_ID"),
		ClientSecret: os.Getenv("GITHUB_CLIENT_SECRET"),
		RedirectURL:  os.Getenv("GITHUB_REDIRECT_URL"),
		Scopes:       []string{"user:email", "repo"},
		Endpoint: oauth2.Endpoint{
			AuthURL:  "https://github.com/login/oauth/authorize",
			TokenURL: "https://github.com/login/oauth/access_token",
		},
	}
}

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

// GitHubLogin initiates the GitHub OAuth flow
func GitHubLogin(c *gin.Context) {
	frontendRedirect := resolveFrontendRedirectURL(c.Request)
	callbackURL := buildOAuthCallbackURL(c.Request, frontendRedirect)
	if oauthServiceURL := getOAuthServiceURL(); oauthServiceURL != "" && callbackURL != "" {
		redirectURL := fmt.Sprintf("%s/auth/github?redirect_uri=%s", oauthServiceURL, url.QueryEscape(callbackURL))
		c.Redirect(http.StatusTemporaryRedirect, redirectURL)
		return
	}

	if githubOAuthConfig == nil {
		initGitHubOAuth()
	}

	// Generate state parameter to prevent CSRF
	state := generateRandomString(32)

	// Store state in session or cookie (simplified here)
	c.SetCookie("oauth_state", state, 3600, "/", "", false, true)

	// Redirect to GitHub for authorization
	authURL := githubOAuthConfig.AuthCodeURL(state, oauth2.AccessTypeOffline)
	c.Redirect(http.StatusTemporaryRedirect, authURL)
}

// GitHubCallback handles the GitHub OAuth callback
func GitHubCallback(c *gin.Context) {
	if githubOAuthConfig == nil {
		initGitHubOAuth()
	}

	// Verify state parameter
	storedState, err := c.Cookie("oauth_state")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "State not found"})
		return
	}

	state := c.Query("state")
	if state != storedState {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid state"})
		return
	}

	// Clear the state cookie
	c.SetCookie("oauth_state", "", -1, "/", "", false, true)

	// Exchange authorization code for access token
	code := c.Query("code")
	token, err := githubOAuthConfig.Exchange(context.Background(), code)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to exchange token"})
		return
	}

	// Get user info from GitHub
	user, err := getGitHubUser(token.AccessToken)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user info"})
		return
	}

	// Get or create user in database
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

	tokenString, err := GenerateJWTWithGitHubAccessToken(*existingUser, token.AccessToken)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	// Redirect to frontend with token
	redirectURL := buildFrontendCallbackRedirectURL("", tokenString)
	if redirectURL == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Frontend redirect URL not configured"})
		return
	}
	c.Redirect(http.StatusTemporaryRedirect, redirectURL)
}

// getGitHubUser fetches user information from GitHub API
func getGitHubUser(accessToken string) (*GitHubUser, error) {
	client := &http.Client{}
	req, err := http.NewRequest("GET", "https://api.github.com/user", nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var user GitHubUser
	if err := json.Unmarshal(body, &user); err != nil {
		return nil, err
	}

	// If email is not public, fetch user emails
	if user.Email == "" {
		email, err := getPrimaryEmail(accessToken)
		if err == nil {
			user.Email = email
		}
	}

	return &user, nil
}

// getPrimaryEmail fetches the primary email for the user
func getPrimaryEmail(accessToken string) (string, error) {
	client := &http.Client{}
	req, err := http.NewRequest("GET", "https://api.github.com/user/emails", nil)
	if err != nil {
		return "", err
	}

	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	var emails []struct {
		Email    string `json:"email"`
		Primary  bool   `json:"primary"`
		Verified bool   `json:"verified"`
	}

	if err := json.Unmarshal(body, &emails); err != nil {
		return "", err
	}

	for _, email := range emails {
		if email.Primary && email.Verified {
			return email.Email, nil
		}
	}

	return "", fmt.Errorf("no primary verified email found")
}

// HandleOAuthCallback handles the callback from the centralized OAuth service
func HandleOAuthCallback(c *gin.Context) {
	// Get the token from the query parameters
	token := c.Query("token")
	if token == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No token provided"})
		return
	}

	validationResponse, err := validateCentralizedOAuthToken(c.Request.Context(), token)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid OAuth token"})
		return
	}

	// Get database
	db := config.GetDB()
	if db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database not available"})
		return
	}
	localUser, err := upsertCentralizedOAuthUser(db, validationResponse.User)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to synchronize user"})
		return
	}

	claims, err := parseOAuthTokenClaimsUnverified(token)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid OAuth token claims"})
		return
	}

	trackeepTokenString, err := GenerateJWTWithGitHubAccessToken(*localUser, getAccessTokenFromOAuthClaims(claims))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	redirectURL := buildFrontendCallbackRedirectURL(c.Query("frontend_redirect"), trackeepTokenString)
	if redirectURL == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Frontend redirect URL not configured"})
		return
	}
	c.Redirect(http.StatusTemporaryRedirect, redirectURL)
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
	userID := c.GetUint("user_id")

	db := config.GetDB()
	if db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database not available"})
		return
	}
	var user models.User
	if err := db.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	if user.GitHubID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "GitHub not connected"})
		return
	}

	// Get the JWT token from the request header
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "No authorization header"})
		return
	}

	// Extract token from "Bearer <token>"
	tokenString := authHeader
	if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
		tokenString = authHeader[7:]
	}

	claims, err := ValidateJWT(tokenString)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
		return
	}

	githubAccessToken := strings.TrimSpace(claims.AccessToken)
	if githubAccessToken == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "GitHub access token not found. Please reconnect GitHub."})
		return
	}

	// Fetch repositories using the GitHub access token
	repos, err := fetchGitHubRepos(githubAccessToken)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch repos: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"repos": repos})
}

// fetchGitHubRepos fetches repositories from GitHub API
func fetchGitHubRepos(accessToken string) ([]GitHubRepo, error) {
	client := &http.Client{}
	req, err := http.NewRequest("GET", "https://api.github.com/user/repos?type=owner&sort=updated&per_page=100", nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var repos []GitHubRepo
	if err := json.Unmarshal(body, &repos); err != nil {
		return nil, err
	}

	return repos, nil
}

// generateRandomString generates a random string for state parameter
func generateRandomString(length int) string {
	bytes := make([]byte, length)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}
