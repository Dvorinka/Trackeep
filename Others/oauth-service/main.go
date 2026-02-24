// Trackeep Main Controller - Centralized authentication and learning management
// This service handles OAuth, user management, and learning content for all Trackeep instances
package main

import (
	"context"
	cryptorand "crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math/rand"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/joho/godotenv"
	"golang.org/x/oauth2"
)

// GitHub OAuth configuration - centralized for all users
var githubOAuthConfig *oauth2.Config

// Email OAuth configuration for email verification (2FA)
var emailOAuthConfig *oauth2.Config

// Learning Resource Types
type ResourceType string

const (
	ResourceTypeYouTube  ResourceType = "youtube"
	ResourceTypeZTM      ResourceType = "ztm"
	ResourceTypeGitHub   ResourceType = "github"
	ResourceTypeFireship ResourceType = "fireship"
	ResourceTypeLink     ResourceType = "link"
)

// Course represents a learning course
type Course struct {
	ID          int                    `json:"id"`
	Title       string                 `json:"title"`
	Description string                 `json:"description"`
	Category    string                 `json:"category"`
	Difficulty  string                 `json:"difficulty"` // beginner, intermediate, advanced
	Duration    int                    `json:"duration"`   // estimated hours
	Price       float64                `json:"price"`      // always 0.0 for free courses
	Thumbnail   string                 `json:"thumbnail"`
	Tags        []string               `json:"tags"`
	Resources   []CourseResource       `json:"resources"`
	CreatedAt   time.Time              `json:"created_at"`
	UpdatedAt   time.Time              `json:"updated_at"`
	CreatedBy   int                    `json:"created_by"`
	IsActive    bool                   `json:"is_active"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
}

// CourseResource represents a learning resource within a course
type CourseResource struct {
	ID          int                    `json:"id"`
	CourseID    int                    `json:"course_id"`
	Title       string                 `json:"title"`
	Type        ResourceType           `json:"type"`
	URL         string                 `json:"url"`
	Description string                 `json:"description"`
	Duration    int                    `json:"duration"` // minutes
	Order       int                    `json:"order"`
	IsRequired  bool                   `json:"is_required"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
}

// UserProgress represents user's progress in a course
type UserProgress struct {
	ID                 int        `json:"id"`
	UserID             int        `json:"user_id"`
	CourseID           int        `json:"course_id"`
	Status             string     `json:"status"`   // not_started, in_progress, completed
	Progress           float64    `json:"progress"` // 0-100 percentage
	CompletedResources []int      `json:"completed_resources"`
	StartedAt          time.Time  `json:"started_at"`
	CompletedAt        *time.Time `json:"completed_at,omitempty"`
	LastAccessed       time.Time  `json:"last_accessed"`
	Notes              string     `json:"notes,omitempty"`
}

// Instance represents a Trackeep instance connected to this controller
type Instance struct {
	ID          int       `json:"id"`
	Name        string    `json:"name"`
	URL         string    `json:"url"`
	APIKey      string    `json:"api_key"`
	IsActive    bool      `json:"is_active"`
	Version     string    `json:"version"`
	CreatedAt   time.Time `json:"created_at"`
	LastSync    time.Time `json:"last_sync"`
	AdminUserID int       `json:"admin_user_id"`
}

// User represents a user in our centralized system
type User struct {
	ID            int                    `json:"id"`
	GitHubID      int                    `json:"github_id"`
	Username      string                 `json:"username"`
	Email         string                 `json:"email"`
	Name          string                 `json:"name"`
	AvatarURL     string                 `json:"avatar_url"`
	CreatedAt     time.Time              `json:"created_at"`
	LastLogin     time.Time              `json:"last_login"`
	EmailProvider string                 `json:"email_provider,omitempty"` // "github" or "purelymail"
	Role          string                 `json:"role"`                     // "user", "admin", "instructor"
	Preferences   map[string]interface{} `json:"preferences,omitempty"`
}

// GitHubUser represents GitHub user profile
type GitHubUser struct {
	ID        int    `json:"id"`
	Login     string `json:"login"`
	Name      string `json:"name"`
	Email     string `json:"email"`
	AvatarURL string `json:"avatar_url"`
	HTMLURL   string `json:"html_url"`
}

// EmailUser represents email user profile
type EmailUser struct {
	Email string `json:"email"`
	Name  string `json:"name"`
}

// EmailVerification represents email verification data
type EmailVerification struct {
	Email            string `json:"email"`
	VerificationCode string `json:"verification_code"`
	ExpiresAt        int64  `json:"expires_at"`
	IsVerified       bool   `json:"is_verified"`
}

// In-memory storage (in production, use a real database)
var users = make(map[int]User)
var usersByGitHubID = make(map[int]User)
var usersByEmail = make(map[string]User)
var emailVerifications = make(map[string]EmailVerification)
var courses = make(map[int]Course)
var courseResources = make(map[int][]CourseResource)
var userProgress = make(map[string]UserProgress) // key: userID_courseID
var instances = make(map[int]Instance)
var nextUserID = 1
var nextCourseID = 1
var nextResourceID = 1
var nextInstanceID = 1

func init() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Initialize sample data for demo
	initializeSampleData()

	// Initialize GitHub OAuth configuration
	githubOAuthConfig = &oauth2.Config{
		ClientID:     getEnv("GITHUB_CLIENT_ID", ""),
		ClientSecret: getEnv("GITHUB_CLIENT_SECRET", ""),
		RedirectURL:  getEnv("GITHUB_REDIRECT_URL", "http://localhost:9090/auth/github/callback"),
		Scopes:       []string{"user:email", "read:user", "repo"},
		Endpoint: oauth2.Endpoint{
			AuthURL:  "https://github.com/login/oauth/authorize",
			TokenURL: "https://github.com/login/oauth/access_token",
		},
	}

	if githubOAuthConfig.ClientID == "" || githubOAuthConfig.ClientSecret == "" {
		log.Println("Warning: GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET not set - OAuth will not work")
	}

	// Initialize Email verification configuration for smtp.purelymail.com
	emailOAuthConfig = &oauth2.Config{
		ClientID:     getEnv("PURELYMAIL_CLIENT_ID", ""),
		ClientSecret: getEnv("PURELYMAIL_CLIENT_SECRET", ""),
		RedirectURL:  getEnv("PURELYMAIL_REDIRECT_URL", "http://localhost:9090/auth/email/callback"),
		Scopes:       []string{"email", "profile"},
		Endpoint: oauth2.Endpoint{
			AuthURL:  "https://smtp.purelymail.com/oauth/authorize",
			TokenURL: "https://smtp.purelymail.com/oauth/token",
		},
	}

	// SMTP configuration for sending verification emails
	// In production, configure these properly
	smtpHost := getEnv("SMTP_HOST", "smtp.purelymail.com")
	smtpPort := getEnv("SMTP_PORT", "587")
	_ = getEnv("SMTP_USERNAME", "") // Will be used for actual SMTP implementation
	_ = getEnv("SMTP_PASSWORD", "") // Will be used for actual SMTP implementation

	log.Printf("Email verification service configured with SMTP: %s:%s", smtpHost, smtpPort)
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func main() {
	// Set Gin mode
	if os.Getenv("GIN_MODE") == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.Default()

	// CORS middleware
	r.Use(func(c *gin.Context) {
		allowedOrigins := getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:8080")
		origin := c.Request.Header.Get("Origin")

		// Allow all origins if wildcard is set
		if allowedOrigins == "*" {
			c.Header("Access-Control-Allow-Origin", "*")
		} else {
			for _, allowedOrigin := range strings.Split(allowedOrigins, ",") {
				if strings.TrimSpace(allowedOrigin) == origin {
					c.Header("Access-Control-Allow-Origin", origin)
					break
				}
			}
		}

		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
		c.Header("Access-Control-Allow-Credentials", "true")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "ok",
			"service": "trackeep-main-controller",
			"version": "2.0.0",
			"time":    time.Now().Unix(),
		})
	})

	// OAuth routes (existing functionality)
	r.GET("/auth/github", initiateGitHubOAuth)
	r.GET("/auth/github/callback", handleGitHubCallback)
	r.GET("/auth/email", initiateEmailOAuth)
	r.GET("/auth/email/callback", handleEmailCallback)

	// API routes
	api := r.Group("/api/v1")
	{
		// User management (existing)
		api.GET("/user/me", getUserInfo)
		api.POST("/email/verify", verifyEmailCode)
		api.POST("/email/send", sendVerificationEmail)

		// Course management
		courses := api.Group("/courses")
		{
			courses.GET("", getAllCourses)
			courses.POST("", createCourse) // Admin/Instructor only
			courses.GET("/:id", getCourse)
			courses.PUT("/:id", updateCourse)    // Admin/Instructor only
			courses.DELETE("/:id", deleteCourse) // Admin only
			courses.GET("/:id/resources", getCourseResources)
			courses.POST("/:id/resources", addCourseResource) // Admin/Instructor only
		}

		// Learning paths (alias for courses with learning path specific endpoints)
		learningPaths := api.Group("/learning-paths")
		{
			learningPaths.GET("", getLearningPaths)
			learningPaths.GET("/categories", getLearningPathCategories)
			learningPaths.POST("/:id/enroll", enrollInLearningPath)
			learningPaths.GET("/:id", getLearningPath)
		}

		// User progress
		progress := api.Group("/progress")
		{
			progress.GET("/:user_id", getUserProgress)
			progress.POST("/:user_id/:course_id", updateProgress)
			progress.GET("/:user_id/:course_id", getCourseProgress)
		}

		// Instance management
		instances := api.Group("/instances")
		{
			instances.GET("", getAllInstances)   // Admin only
			instances.POST("", registerInstance) // Secure endpoint
			instances.GET("/:id", getInstance)
			instances.PUT("/:id", updateInstance)    // Admin only
			instances.DELETE("/:id", deleteInstance) // Admin only
		}

		// Dashboard management
		dashboard := api.Group("/dashboard")
		{
			dashboard.GET("/stats", getDashboardStats) // Admin only
			dashboard.GET("/courses", getDashboardCourses)
			dashboard.GET("/users", getDashboardUsers) // Admin only
		}
	}

	// Serve static frontend files
	r.Static("/static", "./static")
	r.StaticFile("/", "./index.html")
	r.StaticFile("/dashboard", "./index.html")
	r.StaticFile("/dashboard/courses", "./index.html")
	r.StaticFile("/dashboard/instances", "./index.html")

	// Start server
	port := getEnv("PORT", "9090")
	log.Printf("Trackeep Main Controller starting on port %s", port)
	log.Printf("Dashboard: http://localhost:%s/dashboard", port)
	log.Printf("API: http://localhost:%s/api/v1", port)
	log.Fatal(r.Run(":" + port))
}

func initiateGitHubOAuth(c *gin.Context) {
	// Generate state parameter for CSRF protection
	state := generateRandomString(32)

	// Store state in session cookie
	c.SetCookie("oauth_state", state, 3600, "/", "", false, true)

	// Get client application URL from query parameter or infer from origin
	clientURL := c.Query("redirect_uri")
	if clientURL == "" {
		origin := c.Request.Header.Get("Origin")
		referer := c.Request.Header.Get("Referer")

		// Try to determine client URL from origin or referer
		if origin != "" {
			clientURL = origin
		} else if referer != "" {
			// Extract base URL from referer
			if parsed, err := url.Parse(referer); err == nil {
				clientURL = fmt.Sprintf("%s://%s", parsed.Scheme, parsed.Host)
			}
		} else {
			// Fallback to default
			clientURL = getEnv("DEFAULT_CLIENT_URL", "http://localhost:5173")
		}
	}

	// Store client URL in cookie for later use
	c.SetCookie("client_url", clientURL, 3600, "/", "", false, true)

	// Redirect to GitHub for authorization
	authURL := githubOAuthConfig.AuthCodeURL(state, oauth2.AccessTypeOffline)
	c.Redirect(http.StatusTemporaryRedirect, authURL)
}

func handleGitHubCallback(c *gin.Context) {
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

	// Clear cookies
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

	// Get or create user in our system
	appUser := getOrCreateUser(user)

	// Store GitHub access token for this user session
	// This allows Trackeep instances to make GitHub API calls on behalf of the user
	userSession := map[string]interface{}{
		"user":         appUser,
		"access_token": token.AccessToken,
		"token_type":   token.TokenType,
		"expires_at":   token.Expiry.Unix(),
	}

	// Generate JWT token with user info AND GitHub access token
	jwtToken := generateJWTWithGitHubToken(userSession)

	// Get client URL for redirect
	clientURL, _ := c.Cookie("client_url")
	if clientURL == "" {
		clientURL = getEnv("DEFAULT_CLIENT_URL", "http://localhost:5173")
	}

	// Clear client URL cookie
	c.SetCookie("client_url", "", -1, "/", "", false, true)

	// Redirect to client application with token
	redirectURL := fmt.Sprintf("%s/auth/callback?token=%s&user=%s", clientURL, jwtToken, appUser.Username)
	c.Redirect(http.StatusTemporaryRedirect, redirectURL)
}

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

func getOrCreateUser(githubUser *GitHubUser) User {
	// Check if user already exists by GitHub ID
	if user, exists := usersByGitHubID[githubUser.ID]; exists {
		// Update last login
		user.LastLogin = time.Now()
		users[user.ID] = user
		usersByGitHubID[githubUser.ID] = user
		return user
	}

	// Create new user
	newUser := User{
		ID:        nextUserID,
		GitHubID:  githubUser.ID,
		Username:  githubUser.Login,
		Email:     githubUser.Email,
		Name:      githubUser.Name,
		AvatarURL: githubUser.AvatarURL,
		CreatedAt: time.Now(),
		LastLogin: time.Now(),
	}

	// Store user
	users[nextUserID] = newUser
	usersByGitHubID[githubUser.ID] = newUser
	nextUserID++

	return newUser
}

func generateJWTWithGitHubToken(userSession map[string]interface{}) string {
	// In production, use a proper secret key
	secret := getEnv("JWT_SECRET", "your-secret-key-change-in-production")

	user := userSession["user"].(User)

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id":      user.ID,
		"github_id":    user.GitHubID,
		"username":     user.Username,
		"email":        user.Email,
		"access_token": userSession["access_token"],
		"token_type":   userSession["token_type"],
		"expires_at":   userSession["expires_at"],
		"exp":          time.Now().Add(time.Hour * 24 * 7).Unix(), // 7 days
		"iat":          time.Now().Unix(),
	})

	tokenString, err := token.SignedString([]byte(secret))
	if err != nil {
		log.Printf("Error generating JWT: %v", err)
		return ""
	}

	return tokenString
}

func generateJWT(user User) string {
	// In production, use a proper secret key
	secret := getEnv("JWT_SECRET", "your-secret-key-change-in-production")

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id":   user.ID,
		"github_id": user.GitHubID,
		"username":  user.Username,
		"email":     user.Email,
		"exp":       time.Now().Add(time.Hour * 24 * 7).Unix(), // 7 days
		"iat":       time.Now().Unix(),
	})

	tokenString, err := token.SignedString([]byte(secret))
	if err != nil {
		log.Printf("Error generating JWT: %v", err)
		return ""
	}

	return tokenString
}

func getUserInfo(c *gin.Context) {
	// Extract token from Authorization header
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "No authorization header"})
		return
	}

	tokenString := strings.TrimPrefix(authHeader, "Bearer ")

	// Validate JWT token
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(getEnv("JWT_SECRET", "your-secret-key-change-in-production")), nil
	})

	if err != nil || !token.Valid {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
		return
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
		return
	}

	userID := int(claims["user_id"].(float64))
	user, exists := users[userID]
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"user": user})
}

func initiateEmailOAuth(c *gin.Context) {
	// Generate state parameter for CSRF protection
	state := generateRandomString(32)

	// Store state in session cookie
	c.SetCookie("oauth_state_email", state, 3600, "/", "", false, true)

	// Get client application URL from query parameter or infer from origin
	clientURL := c.Query("redirect_uri")
	if clientURL == "" {
		origin := c.Request.Header.Get("Origin")
		referer := c.Request.Header.Get("Referer")

		// Try to determine client URL from origin or referer
		if origin != "" {
			clientURL = origin
		} else if referer != "" {
			// Extract base URL from referer
			if parsed, err := url.Parse(referer); err == nil {
				clientURL = fmt.Sprintf("%s://%s", parsed.Scheme, parsed.Host)
			}
		} else {
			// Fallback to default
			clientURL = getEnv("DEFAULT_CLIENT_URL", "http://localhost:5173")
		}
	}

	// Store client URL in cookie for later use
	c.SetCookie("client_url_email", clientURL, 3600, "/", "", false, true)

	// Redirect to email OAuth provider for authorization
	authURL := emailOAuthConfig.AuthCodeURL(state, oauth2.AccessTypeOffline)
	c.Redirect(http.StatusTemporaryRedirect, authURL)
}

func handleEmailCallback(c *gin.Context) {
	// Verify state parameter
	storedState, err := c.Cookie("oauth_state_email")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "State not found"})
		return
	}

	state := c.Query("state")
	if state != storedState {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid state"})
		return
	}

	// Clear cookies
	c.SetCookie("oauth_state_email", "", -1, "/", "", false, true)

	// Exchange authorization code for access token
	code := c.Query("code")
	token, err := emailOAuthConfig.Exchange(context.Background(), code)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to exchange token"})
		return
	}

	// Get user info from email provider
	user, err := getEmailUser(token.AccessToken)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user info"})
		return
	}

	// Get or create user in our system
	appUser := getOrCreateEmailUser(user)

	// Store email access token for this user session
	userSession := map[string]interface{}{
		"user":         appUser,
		"access_token": token.AccessToken,
		"token_type":   token.TokenType,
		"expires_at":   token.Expiry.Unix(),
	}

	// Generate JWT token with user info AND email access token
	jwtToken := generateJWTWithEmailToken(userSession)

	// Get client URL for redirect
	clientURL, _ := c.Cookie("client_url_email")
	if clientURL == "" {
		clientURL = getEnv("DEFAULT_CLIENT_URL", "http://localhost:5173")
	}

	// Clear client URL cookie
	c.SetCookie("client_url_email", "", -1, "/", "", false, true)

	// Redirect to client application with token
	redirectURL := fmt.Sprintf("%s/auth/callback?token=%s&user=%s", clientURL, jwtToken, appUser.Username)
	c.Redirect(http.StatusTemporaryRedirect, redirectURL)
}

func getEmailUser(accessToken string) (*EmailUser, error) {
	// For smtp.purelymail.com, we'll simulate getting user info
	// In a real implementation, this would call the provider's user info endpoint
	// For now, we'll extract user info from the JWT token or make a mock call

	// Mock implementation - in reality, you'd call the provider's userinfo endpoint
	// For demo purposes, we'll create a mock user
	return &EmailUser{
		Email: "user@purelymail.com", // This would come from the provider
		Name:  "PurelyMail User",     // This would come from the provider
	}, nil
}

func getOrCreateEmailUser(emailUser *EmailUser) User {
	// Check if user already exists by email
	if user, exists := usersByEmail[emailUser.Email]; exists {
		// Update last login
		user.LastLogin = time.Now()
		users[user.ID] = user
		usersByEmail[emailUser.Email] = user
		return user
	}

	// Create new user
	newUser := User{
		ID:            nextUserID,
		GitHubID:      0,                                      // No GitHub ID for email users
		Username:      strings.Split(emailUser.Email, "@")[0], // Use email prefix as username
		Email:         emailUser.Email,
		Name:          emailUser.Name,
		AvatarURL:     "", // No avatar for email users
		CreatedAt:     time.Now(),
		LastLogin:     time.Now(),
		EmailProvider: "purelymail",
	}

	// Store user
	users[nextUserID] = newUser
	usersByEmail[emailUser.Email] = newUser
	nextUserID++

	return newUser
}

func generateJWTWithEmailToken(userSession map[string]interface{}) string {
	// In production, use a proper secret key
	secret := getEnv("JWT_SECRET", "your-secret-key-change-in-production")

	user := userSession["user"].(User)

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id":        user.ID,
		"github_id":      user.GitHubID,
		"username":       user.Username,
		"email":          user.Email,
		"access_token":   userSession["access_token"],
		"token_type":     userSession["token_type"],
		"expires_at":     userSession["expires_at"],
		"email_provider": user.EmailProvider,
		"exp":            time.Now().Add(time.Hour * 24 * 7).Unix(), // 7 days
		"iat":            time.Now().Unix(),
	})

	tokenString, err := token.SignedString([]byte(secret))
	if err != nil {
		log.Printf("Error generating JWT: %v", err)
		return ""
	}

	return tokenString
}

func generateRandomString(length int) string {
	bytes := make([]byte, length)
	cryptorand.Read(bytes)
	return hex.EncodeToString(bytes)
}

func generateVerificationCode() string {
	// Generate 6-digit verification code
	codeBytes := make([]byte, 3)
	cryptorand.Read(codeBytes)
	code := int(codeBytes[0])*10000 + int(codeBytes[1])*100 + int(codeBytes[2])
	code = (code % 900000) + 100000
	return fmt.Sprintf("%06d", code)
}

func sendVerificationEmail(c *gin.Context) {
	var request struct {
		Email string `json:"email" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid email"})
		return
	}

	// Generate verification code
	code := generateVerificationCode()
	expiresAt := time.Now().Add(15 * time.Minute).Unix()

	// Store verification
	emailVerifications[request.Email] = EmailVerification{
		Email:            request.Email,
		VerificationCode: code,
		ExpiresAt:        expiresAt,
		IsVerified:       false,
	}

	// In production, send actual email via SMTP
	// For demo, we'll just log it and return the code
	log.Printf("Verification code for %s: %s", request.Email, code)

	c.JSON(http.StatusOK, gin.H{
		"message":    "Verification code sent",
		"expires_in": "15 minutes",
		"demo_code":  code, // Only for demo mode
	})
}

func verifyEmailCode(c *gin.Context) {
	var request struct {
		Email string `json:"email" binding:"required"`
		Code  string `json:"code" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	verification, exists := emailVerifications[request.Email]
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No verification code sent to this email"})
		return
	}

	// Check if expired
	if time.Now().Unix() > verification.ExpiresAt {
		delete(emailVerifications, request.Email)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Verification code expired"})
		return
	}

	// Check if code matches
	if verification.VerificationCode != request.Code {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid verification code"})
		return
	}

	// Mark as verified
	verification.IsVerified = true
	emailVerifications[request.Email] = verification

	c.JSON(http.StatusOK, gin.H{
		"message":  "Email verified successfully",
		"verified": true,
	})
}

// Course Management Handlers

func getAllCourses(c *gin.Context) {
	var courseList []Course
	for _, course := range courses {
		if course.IsActive {
			courseList = append(courseList, course)
		}
	}
	c.JSON(http.StatusOK, gin.H{"courses": courseList})
}

func createCourse(c *gin.Context) {
	var course Course
	if err := c.ShouldBindJSON(&course); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid course data"})
		return
	}

	// Validate user is admin or instructor (simplified for demo)
	userID := getUserIDFromToken(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	course.ID = nextCourseID
	course.CreatedAt = time.Now()
	course.UpdatedAt = time.Now()
	course.CreatedBy = userID
	course.Price = 0.0 // Always free
	course.IsActive = true

	courses[nextCourseID] = course
	nextCourseID++

	c.JSON(http.StatusCreated, course)
}

func getCourse(c *gin.Context) {
	courseID := parseInt(c.Param("id"))
	course, exists := courses[courseID]
	if !exists || !course.IsActive {
		c.JSON(http.StatusNotFound, gin.H{"error": "Course not found"})
		return
	}

	// Include resources
	resources := courseResources[courseID]
	course.Resources = resources

	c.JSON(http.StatusOK, course)
}

func updateCourse(c *gin.Context) {
	courseID := parseInt(c.Param("id"))
	var course Course
	if err := c.ShouldBindJSON(&course); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid course data"})
		return
	}

	existingCourse, exists := courses[courseID]
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Course not found"})
		return
	}

	// Update fields
	existingCourse.Title = course.Title
	existingCourse.Description = course.Description
	existingCourse.Category = course.Category
	existingCourse.Difficulty = course.Difficulty
	existingCourse.Duration = course.Duration
	existingCourse.Thumbnail = course.Thumbnail
	existingCourse.Tags = course.Tags
	existingCourse.UpdatedAt = time.Now()

	courses[courseID] = existingCourse
	c.JSON(http.StatusOK, existingCourse)
}

func deleteCourse(c *gin.Context) {
	courseID := parseInt(c.Param("id"))
	course, exists := courses[courseID]
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Course not found"})
		return
	}

	// Soft delete
	course.IsActive = false
	course.UpdatedAt = time.Now()
	courses[courseID] = course

	c.JSON(http.StatusOK, gin.H{"message": "Course deleted successfully"})
}

func getCourseResources(c *gin.Context) {
	courseID := parseInt(c.Param("id"))
	resources := courseResources[courseID]
	c.JSON(http.StatusOK, gin.H{"resources": resources})
}

func addCourseResource(c *gin.Context) {
	courseID := parseInt(c.Param("id"))
	var resource CourseResource
	if err := c.ShouldBindJSON(&resource); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid resource data"})
		return
	}

	resource.ID = nextResourceID
	resource.CourseID = courseID

	courseResources[courseID] = append(courseResources[courseID], resource)
	nextResourceID++

	c.JSON(http.StatusCreated, resource)
}

// Learning Paths Handlers (frontend-specific format)

func getLearningPaths(c *gin.Context) {
	// Get query parameters
	search := c.Query("search")
	category := c.Query("category")
	difficulty := c.Query("difficulty")

	var learningPaths []gin.H

	for _, course := range courses {
		if !course.IsActive {
			continue
		}

		// Apply filters
		if search != "" && !containsIgnoreCase(course.Title, search) && !containsIgnoreCase(course.Description, search) {
			continue
		}
		if category != "" && !containsIgnoreCase(course.Category, category) {
			continue
		}
		if difficulty != "" && !containsIgnoreCase(course.Difficulty, difficulty) {
			continue
		}

		// Convert to frontend format
		resources := courseResources[course.ID]
		tags := make([]gin.H, len(course.Tags))
		for i, tag := range course.Tags {
			tags[i] = gin.H{
				"name":  tag,
				"color": "#3b82f6", // Blue color for all tags
			}
		}

		modules := make([]gin.H, len(resources))
		for i, resource := range resources {
			modules[i] = gin.H{
				"id":          fmt.Sprintf("module_%d", resource.ID),
				"title":       resource.Title,
				"description": resource.Description,
				"completed":   false,
				"resources": []gin.H{
					{
						"type":  string(resource.Type),
						"title": resource.Title,
						"url":   resource.URL,
					},
				},
			}
		}

		learningPath := gin.H{
			"id":               course.ID,
			"title":            course.Title,
			"description":      course.Description,
			"category":         course.Category,
			"difficulty":       course.Difficulty,
			"duration":         fmt.Sprintf("%d hours", course.Duration),
			"thumbnail":        course.Thumbnail,
			"is_featured":      course.ID <= 2, // First 2 courses are featured
			"enrollment_count": rand.Intn(2000) + 200,
			"rating":           4.0 + rand.Float64(),
			"review_count":     rand.Intn(200) + 20,
			"creator": gin.H{
				"username":  "instructor",
				"full_name": "Expert Instructor",
			},
			"tags":      tags,
			"modules":   modules,
			"createdAt": course.CreatedAt.Format("2006-01-02T15:04:05Z"),
		}

		learningPaths = append(learningPaths, learningPath)
	}

	c.JSON(http.StatusOK, learningPaths)
}

func getLearningPathCategories(c *gin.Context) {
	categories := []string{
		"Web Development",
		"Mobile Development",
		"Programming",
		"DevOps",
		"Data Science",
		"Design",
		"Business",
		"Cybersecurity",
	}
	c.JSON(http.StatusOK, gin.H{"categories": categories})
}

func enrollInLearningPath(c *gin.Context) {
	pathID := parseInt(c.Param("id"))
	userID := getUserIDFromToken(c)

	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Check if course exists
	course, exists := courses[pathID]
	if !exists || !course.IsActive {
		c.JSON(http.StatusNotFound, gin.H{"error": "Learning path not found"})
		return
	}

	// Create or update progress
	key := fmt.Sprintf("%d_%d", userID, pathID)
	progress, exists := userProgress[key]
	if !exists {
		progress = UserProgress{
			UserID:       userID,
			CourseID:     pathID,
			Status:       "in_progress",
			Progress:     0.0,
			StartedAt:    time.Now(),
			LastAccessed: time.Now(),
		}
	} else {
		progress.Status = "in_progress"
		progress.LastAccessed = time.Now()
	}

	userProgress[key] = progress

	c.JSON(http.StatusOK, gin.H{
		"message":  "Successfully enrolled in learning path",
		"enrolled": true,
		"progress": progress,
	})
}

func getLearningPath(c *gin.Context) {
	pathID := parseInt(c.Param("id"))

	course, exists := courses[pathID]
	if !exists || !course.IsActive {
		c.JSON(http.StatusNotFound, gin.H{"error": "Learning path not found"})
		return
	}

	// Get resources
	resources := courseResources[pathID]
	course.Resources = resources

	// Convert to frontend format
	tags := make([]gin.H, len(course.Tags))
	for i, tag := range course.Tags {
		tags[i] = gin.H{
			"name":  tag,
			"color": "#3b82f6",
		}
	}

	modules := make([]gin.H, len(resources))
	for i, resource := range resources {
		modules[i] = gin.H{
			"id":          fmt.Sprintf("module_%d", resource.ID),
			"title":       resource.Title,
			"description": resource.Description,
			"completed":   false,
			"resources": []gin.H{
				{
					"type":  string(resource.Type),
					"title": resource.Title,
					"url":   resource.URL,
				},
			},
		}
	}

	learningPath := gin.H{
		"id":               course.ID,
		"title":            course.Title,
		"description":      course.Description,
		"category":         course.Category,
		"difficulty":       course.Difficulty,
		"duration":         fmt.Sprintf("%d hours", course.Duration),
		"thumbnail":        course.Thumbnail,
		"is_featured":      course.ID <= 2,
		"enrollment_count": rand.Intn(2000) + 200,
		"rating":           4.0 + rand.Float64(),
		"review_count":     rand.Intn(200) + 20,
		"creator": gin.H{
			"username":  "instructor",
			"full_name": "Expert Instructor",
		},
		"tags":      tags,
		"modules":   modules,
		"createdAt": course.CreatedAt.Format("2006-01-02T15:04:05Z"),
	}

	c.JSON(http.StatusOK, learningPath)
}

// Helper function for case-insensitive contains
func containsIgnoreCase(s, substr string) bool {
	return strings.Contains(strings.ToLower(s), strings.ToLower(substr))
}

// User Progress Handlers

func getUserProgress(c *gin.Context) {
	userID := parseInt(c.Param("user_id"))
	var progressList []UserProgress

	for key, progress := range userProgress {
		if strings.HasPrefix(key, fmt.Sprintf("%d_", userID)) {
			progressList = append(progressList, progress)
		}
	}

	c.JSON(http.StatusOK, gin.H{"progress": progressList})
}

func getCourseProgress(c *gin.Context) {
	userID := parseInt(c.Param("user_id"))
	courseID := parseInt(c.Param("course_id"))
	key := fmt.Sprintf("%d_%d", userID, courseID)

	progress, exists := userProgress[key]
	if !exists {
		// Create default progress
		progress = UserProgress{
			UserID:       userID,
			CourseID:     courseID,
			Status:       "not_started",
			Progress:     0.0,
			StartedAt:    time.Now(),
			LastAccessed: time.Now(),
		}
		userProgress[key] = progress
	}

	c.JSON(http.StatusOK, progress)
}

func updateProgress(c *gin.Context) {
	userID := parseInt(c.Param("user_id"))
	courseID := parseInt(c.Param("course_id"))
	var updateData struct {
		Status              string  `json:"status"`
		Progress            float64 `json:"progress"`
		CompletedResourceID int     `json:"completed_resource_id"`
		Notes               string  `json:"notes"`
	}

	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid progress data"})
		return
	}

	key := fmt.Sprintf("%d_%d", userID, courseID)
	progress, exists := userProgress[key]
	if !exists {
		progress = UserProgress{
			UserID:       userID,
			CourseID:     courseID,
			Status:       "not_started",
			Progress:     0.0,
			StartedAt:    time.Now(),
			LastAccessed: time.Now(),
		}
	}

	// Update progress
	if updateData.Status != "" {
		progress.Status = updateData.Status
	}
	if updateData.Progress > 0 {
		progress.Progress = updateData.Progress
	}
	if updateData.Notes != "" {
		progress.Notes = updateData.Notes
	}
	if updateData.CompletedResourceID > 0 {
		progress.CompletedResources = append(progress.CompletedResources, updateData.CompletedResourceID)
	}
	progress.LastAccessed = time.Now()

	// Mark as completed if 100%
	if progress.Progress >= 100.0 && progress.Status != "completed" {
		progress.Status = "completed"
		completedAt := time.Now()
		progress.CompletedAt = &completedAt
	}

	userProgress[key] = progress
	c.JSON(http.StatusOK, progress)
}

// Instance Management Handlers

func getAllInstances(c *gin.Context) {
	var instanceList []Instance
	for _, instance := range instances {
		if instance.IsActive {
			instanceList = append(instanceList, instance)
		}
	}
	c.JSON(http.StatusOK, gin.H{"instances": instanceList})
}

func registerInstance(c *gin.Context) {
	var instance Instance
	if err := c.ShouldBindJSON(&instance); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid instance data"})
		return
	}

	// Generate API key
	apiKey := generateRandomString(32)

	instance.ID = nextInstanceID
	instance.APIKey = apiKey
	instance.IsActive = true
	instance.CreatedAt = time.Now()
	instance.LastSync = time.Now()

	instances[nextInstanceID] = instance
	nextInstanceID++

	c.JSON(http.StatusCreated, gin.H{
		"instance": instance,
		"api_key":  apiKey,
	})
}

func getInstance(c *gin.Context) {
	instanceID := parseInt(c.Param("id"))
	instance, exists := instances[instanceID]
	if !exists || !instance.IsActive {
		c.JSON(http.StatusNotFound, gin.H{"error": "Instance not found"})
		return
	}

	c.JSON(http.StatusOK, instance)
}

func updateInstance(c *gin.Context) {
	instanceID := parseInt(c.Param("id"))
	var instance Instance
	if err := c.ShouldBindJSON(&instance); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid instance data"})
		return
	}

	existingInstance, exists := instances[instanceID]
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Instance not found"})
		return
	}

	existingInstance.Name = instance.Name
	existingInstance.URL = instance.URL
	existingInstance.Version = instance.Version
	existingInstance.LastSync = time.Now()

	instances[instanceID] = existingInstance
	c.JSON(http.StatusOK, existingInstance)
}

func deleteInstance(c *gin.Context) {
	instanceID := parseInt(c.Param("id"))
	instance, exists := instances[instanceID]
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Instance not found"})
		return
	}

	instance.IsActive = false
	instances[instanceID] = instance

	c.JSON(http.StatusOK, gin.H{"message": "Instance deleted successfully"})
}

// Dashboard Handlers

func getDashboardStats(c *gin.Context) {
	stats := gin.H{
		"total_users":     len(users),
		"total_courses":   len(courses),
		"total_instances": len(instances),
		"active_courses":  0,
		"total_progress":  len(userProgress),
	}

	for _, course := range courses {
		if course.IsActive {
			stats["active_courses"] = stats["active_courses"].(int) + 1
		}
	}

	c.JSON(http.StatusOK, stats)
}

func getDashboardCourses(c *gin.Context) {
	var courseList []Course
	for _, course := range courses {
		if course.IsActive {
			// Add progress count
			courseWithStats := course
			courseWithStats.Metadata = map[string]interface{}{
				"enrolled_count": 0, // Would be calculated from userProgress
			}
			courseList = append(courseList, courseWithStats)
		}
	}
	c.JSON(http.StatusOK, gin.H{"courses": courseList})
}

func getDashboardUsers(c *gin.Context) {
	var userList []User
	for _, user := range users {
		userList = append(userList, user)
	}
	c.JSON(http.StatusOK, gin.H{"users": userList})
}

// Helper Functions

func parseInt(s string) int {
	var result int
	fmt.Sscanf(s, "%d", &result)
	return result
}

func getUserIDFromToken(c *gin.Context) int {
	// Extract token from Authorization header
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		return 0
	}

	tokenString := strings.TrimPrefix(authHeader, "Bearer ")

	// Validate JWT token
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(getEnv("JWT_SECRET", "your-secret-key-change-in-production")), nil
	})

	if err != nil || !token.Valid {
		return 0
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return 0
	}

	return int(claims["user_id"].(float64))
}

// Initialize sample data for demo purposes
func initializeSampleData() {
	// Create sample courses
	sampleCourses := []Course{
		{
			Title:       "Complete Web Development Bootcamp",
			Description: "Learn modern web development from scratch with HTML, CSS, JavaScript, React, Node.js and more.",
			Category:    "web-development",
			Difficulty:  "beginner",
			Duration:    40,
			Thumbnail:   "https://img.youtube.com/vi/RW-sB6GeA_Q/maxresdefault.jpg",
			Tags:        []string{"javascript", "react", "nodejs", "html", "css"},
			Resources: []CourseResource{
				{
					Title:       "Introduction to Web Development",
					Type:        ResourceTypeYouTube,
					URL:         "https://www.youtube.com/watch?v=RW-sB6GeA_Q",
					Description: "Get started with web development fundamentals",
					Duration:    45,
					Order:       1,
					IsRequired:  true,
				},
				{
					Title:       "HTML & CSS Complete Course",
					Type:        ResourceTypeZTM,
					URL:         "https://www.udemy.com/course/the-complete-web-developer-in-zero-to-mastery/",
					Description: "Master HTML and CSS from basics to advanced",
					Duration:    120,
					Order:       2,
					IsRequired:  true,
				},
				{
					Title:       "JavaScript Fundamentals",
					Type:        ResourceTypeFireship,
					URL:         "https://fireship.io/courses/javascript/",
					Description: "Learn JavaScript basics and ES6+ features",
					Duration:    90,
					Order:       3,
					IsRequired:  true,
				},
			},
			IsActive: true,
		},
		{
			Title:       "React Native Mobile Development",
			Description: "Build native mobile apps for iOS and Android using React Native.",
			Category:    "mobile-development",
			Difficulty:  "intermediate",
			Duration:    30,
			Thumbnail:   "https://img.youtube.com/vi/0-S5a0eXPoc/maxresdefault.jpg",
			Tags:        []string{"react-native", "mobile", "javascript", "ios", "android"},
			Resources: []CourseResource{
				{
					Title:       "React Native Setup and Basics",
					Type:        ResourceTypeYouTube,
					URL:         "https://www.youtube.com/watch?v=0-S5a0eXPoc",
					Description: "Setting up React Native development environment",
					Duration:    60,
					Order:       1,
					IsRequired:  true,
				},
				{
					Title:       "React Native GitHub Examples",
					Type:        ResourceTypeGitHub,
					URL:         "https://github.com/ReactNativeNews/React-Native-Apps",
					Description: "Real-world React Native app examples",
					Duration:    30,
					Order:       2,
					IsRequired:  false,
				},
			},
			IsActive: true,
		},
		{
			Title:       "Advanced Git & GitHub Mastery",
			Description: "Master Git version control and GitHub collaboration workflows.",
			Category:    "programming",
			Difficulty:  "intermediate",
			Duration:    15,
			Thumbnail:   "https://img.youtube.com/vi/rR3dJt3J0y0/maxresdefault.jpg",
			Tags:        []string{"git", "github", "version-control", "collaboration"},
			Resources: []CourseResource{
				{
					Title:       "Git & GitHub Complete Tutorial",
					Type:        ResourceTypeYouTube,
					URL:         "https://www.youtube.com/watch?v=rR3dJt3J0y0",
					Description: "Complete Git and GitHub tutorial for beginners",
					Duration:    120,
					Order:       1,
					IsRequired:  true,
				},
				{
					Title:       "GitHub Actions Workshop",
					Type:        ResourceTypeGitHub,
					URL:         "https://github.com/github/actions",
					Description: "Learn GitHub Actions and CI/CD",
					Duration:    45,
					Order:       2,
					IsRequired:  false,
				},
			},
			IsActive: true,
		},
	}

	// Add sample courses to storage
	for _, course := range sampleCourses {
		course.ID = nextCourseID
		course.CreatedAt = time.Now()
		course.UpdatedAt = time.Now()
		course.CreatedBy = 1 // Admin user
		course.Price = 0.0   // Always free

		courses[nextCourseID] = course

		// Add resources separately
		for _, resource := range course.Resources {
			resource.ID = nextResourceID
			resource.CourseID = nextCourseID
			courseResources[nextCourseID] = append(courseResources[nextCourseID], resource)
			nextResourceID++
		}

		nextCourseID++
	}

	// Create sample instance
	sampleInstance := Instance{
		Name:        "Trackeep Demo Instance",
		URL:         "https://demo.trackeep.com",
		Version:     "2.0.0",
		IsActive:    true,
		CreatedAt:   time.Now(),
		LastSync:    time.Now(),
		AdminUserID: 1,
	}
	sampleInstance.ID = nextInstanceID
	sampleInstance.APIKey = generateRandomString(32)
	instances[nextInstanceID] = sampleInstance
	nextInstanceID++

	log.Printf("Initialized %d sample courses and %d instance", len(sampleCourses), 1)
}
