package handlers

import (
	"crypto/rand"
	"errors"
	"fmt"
	"net/smtp"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"github.com/trackeep/backend/config"
	"github.com/trackeep/backend/models"
)

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type RegisterRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Username string `json:"username" binding:"required,min=3,max=50"`
	Password string `json:"password" binding:"required,min=6"`
	FullName string `json:"fullName" binding:"required,min=1,max=100"`
}

type AuthResponse struct {
	Token string      `json:"token"`
	User  models.User `json:"user"`
}

type PasswordResetRequest struct {
	Email string `json:"email" binding:"required,email"`
}

type PasswordResetConfirm struct {
	Code     string `json:"code" binding:"required"`
	Password string `json:"password" binding:"required,min=6"`
}

type PasswordResetCode struct {
	ID        uint      `json:"id"`
	Email     string    `json:"email"`
	Code      string    `json:"code"`
	ExpiresAt time.Time `json:"expires_at"`
	Used      bool      `json:"used"`
	CreatedAt time.Time `json:"created_at"`
}

// JWT Claims structure
type Claims struct {
	UserID   uint   `json:"user_id"`
	Email    string `json:"email"`
	Username string `json:"username"`
	jwt.RegisteredClaims
}

// GenerateJWT creates a new JWT token for a user
func GenerateJWT(user models.User) (string, error) {
	claims := &Claims{
		UserID:   user.ID,
		Email:    user.Email,
		Username: user.Username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "trackeep",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(os.Getenv("JWT_SECRET")))
}

// ValidateJWT validates a JWT token and returns the claims
func ValidateJWT(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		return []byte(os.Getenv("JWT_SECRET")), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid token")
}

// AuthMiddleware validates JWT tokens
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Check if demo mode is enabled
		if os.Getenv("VITE_DEMO_MODE") == "true" {
			path := c.Request.URL.Path
			// Set a demo user for specific routes in demo mode
			if strings.Contains(path, "/youtube") ||
				strings.Contains(path, "/learning-paths") ||
				strings.Contains(path, "/bookmarks") ||
				strings.Contains(path, "/tasks") ||
				strings.Contains(path, "/notes") ||
				strings.Contains(path, "/files") ||
				strings.Contains(path, "/time-entries") ||
				strings.Contains(path, "/calendar") ||
				strings.Contains(path, "/ai/settings") ||
				strings.Contains(path, "/ai/providers") ||
				strings.Contains(path, "/ai/test-connection") ||
				strings.Contains(path, "/search") ||
				strings.Contains(path, "/dashboard/stats") {
				// Set a demo user for these routes in demo mode
				c.Set("user", models.User{
					ID:       1,
					Username: "demo",
					Email:    "demo@trackeep.com",
				})
				c.Set("user_id", uint(1))
				c.Set("userID", uint(1)) // Add this for compatibility with handlers
				c.Next()
				return
			}
		}

		// Skip auth for AI settings in demo mode for testing
		if os.Getenv("VITE_DEMO_MODE") == "true" && strings.Contains(c.Request.URL.Path, "/ai/settings") {
			c.Set("user_id", uint(1))
			c.Set("userID", uint(1))
			c.Next()
			return
		}

		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(401, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		// Extract token from "Bearer <token>"
		tokenString := authHeader
		if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
			tokenString = authHeader[7:]
		}

		claims, err := ValidateJWT(tokenString)
		if err != nil {
			c.JSON(401, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		// Get user from database
		var user models.User
		if err := config.GetDB().First(&user, claims.UserID).Error; err != nil {
			c.JSON(401, gin.H{"error": "User not found"})
			c.Abort()
			return
		}

		c.Set("user", user)
		c.Set("user_id", user.ID)
		c.Set("userID", user.ID) // Add this for compatibility with handlers
		c.Next()
	}
}

// CheckUsers checks if any users exist in the system
func CheckUsers(c *gin.Context) {
	db := config.GetDB()

	var count int64
	if err := db.Model(&models.User{}).Count(&count).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to check users"})
		return
	}

	c.JSON(200, gin.H{
		"hasUsers": count > 0,
		"count":    count,
	})
}

// Register handles user registration
func Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	db := config.GetDB()

	// Check if user already exists
	var existingUser models.User
	if err := db.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
		c.JSON(400, gin.H{"error": "User with this email already exists"})
		return
	}

	if err := db.Where("username = ?", req.Username).First(&existingUser).Error; err == nil {
		c.JSON(400, gin.H{"error": "Username already taken"})
		return
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to hash password"})
		return
	}

	// Create user
	user := models.User{
		Email:    req.Email,
		Username: req.Username,
		Password: string(hashedPassword),
		FullName: req.FullName,
		Theme:    "dark",
	}

	if err := db.Create(&user).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to create user"})
		return
	}

	// Generate JWT token
	token, err := GenerateJWT(user)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to generate token"})
		return
	}

	// Remove password from response
	user.Password = ""

	c.JSON(201, AuthResponse{
		Token: token,
		User:  user,
	})
}

// Login handles user authentication
func Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	db := config.GetDB()

	// Find user
	var user models.User
	if err := db.Where("email = ?", req.Email).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(401, gin.H{"error": "Invalid credentials"})
			return
		}
		c.JSON(500, gin.H{"error": "Database error"})
		return
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		c.JSON(401, gin.H{"error": "Invalid credentials"})
		return
	}

	// Generate JWT token
	token, err := GenerateJWT(user)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to generate token"})
		return
	}

	// Remove password from response
	user.Password = ""

	c.JSON(200, AuthResponse{
		Token: token,
		User:  user,
	})
}

// GetCurrentUser returns the current authenticated user
func GetCurrentUser(c *gin.Context) {
	user, exists := c.Get("user")
	if !exists {
		c.JSON(401, gin.H{"error": "User not authenticated"})
		return
	}

	c.JSON(200, gin.H{"user": user})
}

// UpdateProfile updates the current user's profile
func UpdateProfile(c *gin.Context) {
	user, exists := c.Get("user")
	if !exists {
		c.JSON(401, gin.H{"error": "User not authenticated"})
		return
	}

	currentUser := user.(models.User)
	db := config.GetDB()

	var req struct {
		FullName string `json:"fullName"`
		Theme    string `json:"theme"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	// Update user
	updates := make(map[string]interface{})
	if req.FullName != "" {
		updates["full_name"] = req.FullName
	}
	if req.Theme != "" {
		updates["theme"] = req.Theme
	}

	if err := db.Model(&currentUser).Updates(updates).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to update profile"})
		return
	}

	// Refresh user data
	if err := db.First(&currentUser, currentUser.ID).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to refresh user data"})
		return
	}

	// Remove password from response
	currentUser.Password = ""

	c.JSON(200, gin.H{"user": currentUser})
}

// ChangePassword changes the current user's password
func ChangePassword(c *gin.Context) {
	user, exists := c.Get("user")
	if !exists {
		c.JSON(401, gin.H{"error": "User not authenticated"})
		return
	}

	currentUser := user.(models.User)

	var req struct {
		CurrentPassword string `json:"currentPassword" binding:"required"`
		NewPassword     string `json:"newPassword" binding:"required,min=6"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	// Verify current password
	if err := bcrypt.CompareHashAndPassword([]byte(currentUser.Password), []byte(req.CurrentPassword)); err != nil {
		c.JSON(401, gin.H{"error": "Current password is incorrect"})
		return
	}

	// Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to hash password"})
		return
	}

	// Update password
	db := config.GetDB()
	if err := db.Model(&currentUser).Update("password", string(hashedPassword)).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to update password"})
		return
	}

	c.JSON(200, gin.H{"message": "Password updated successfully"})
}

// Logout handles user logout (client-side token removal)
func Logout(c *gin.Context) {
	c.JSON(200, gin.H{"message": "Logged out successfully"})
}

// generateResetCode generates a cryptographically secure 8-character reset code
func generateResetCode() (string, error) {
	const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	bytes := make([]byte, 8)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	for i, b := range bytes {
		bytes[i] = charset[b%byte(len(charset))]
	}
	return string(bytes), nil
}

// sendResetEmail sends a password reset email
func sendResetEmail(email, code string) error {
	smtpHost := os.Getenv("SMTP_HOST")
	smtpPort := os.Getenv("SMTP_PORT")
	smtpUsername := os.Getenv("SMTP_USERNAME")
	smtpPassword := os.Getenv("SMTP_PASSWORD")
	fromEmail := os.Getenv("SMTP_FROM_EMAIL")
	fromName := os.Getenv("SMTP_FROM_NAME")

	if smtpHost == "" || smtpUsername == "" || smtpPassword == "" || fromEmail == "" {
		return errors.New("SMTP configuration not complete")
	}

	// Create auth
	auth := smtp.PlainAuth("", smtpUsername, smtpPassword, smtpHost)

	// Compose message
	subject := "Password Reset - Trackeep"
	body := fmt.Sprintf(`
Hello,

You requested a password reset for your Trackeep account.

Your reset code is: %s

This code will expire in 15 minutes.

If you didn't request this, please ignore this email.

Best regards,
%s
`, code, fromName)

	msg := fmt.Sprintf("From: %s <%s>\r\nTo: %s\r\nSubject: %s\r\n\r\n%s",
		fromName, fromEmail, email, subject, body)

	// Send email
	addr := fmt.Sprintf("%s:%s", smtpHost, smtpPort)
	return smtp.SendMail(addr, auth, fromEmail, []string{email}, []byte(msg))
}

// RequestPasswordReset handles password reset requests
func RequestPasswordReset(c *gin.Context) {
	var req PasswordResetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	db := config.GetDB()

	// Check if user exists
	var user models.User
	if err := db.Where("email = ?", req.Email).First(&user).Error; err != nil {
		// Don't reveal if user exists or not
		c.JSON(200, gin.H{"message": "If an account with this email exists, a reset code has been sent"})
		return
	}

	// Generate reset code
	code, err := generateResetCode()
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to generate reset code"})
		return
	}

	// Store reset code in database (you might want to create a separate table for this)
	resetCode := PasswordResetCode{
		Email:     req.Email,
		Code:      code,
		ExpiresAt: time.Now().Add(15 * time.Minute),
		Used:      false,
	}

	// For now, we'll use a simple approach - in production, you'd want a proper table
	// Create the reset_codes table if it doesn't exist
	db.Exec(`
		CREATE TABLE IF NOT EXISTS password_reset_codes (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			email TEXT NOT NULL,
			code TEXT NOT NULL,
			expires_at DATETIME NOT NULL,
			used BOOLEAN DEFAULT FALSE,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)
	`)

	if err := db.Create(&resetCode).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to store reset code"})
		return
	}

	// Send email
	if err := sendResetEmail(req.Email, code); err != nil {
		c.JSON(500, gin.H{"error": "Failed to send reset email: " + err.Error()})
		return
	}

	c.JSON(200, gin.H{"message": "Reset code sent to your email"})
}

// ConfirmPasswordReset handles password reset confirmation
func ConfirmPasswordReset(c *gin.Context) {
	var req PasswordResetConfirm
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	db := config.GetDB()

	// Find valid reset code
	var resetCode PasswordResetCode
	if err := db.Where("code = ? AND used = ? AND expires_at > ?", req.Code, false, time.Now()).First(&resetCode).Error; err != nil {
		c.JSON(400, gin.H{"error": "Invalid or expired reset code"})
		return
	}

	// Find user
	var user models.User
	if err := db.Where("email = ?", resetCode.Email).First(&user).Error; err != nil {
		c.JSON(400, gin.H{"error": "User not found"})
		return
	}

	// Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to hash password"})
		return
	}

	// Update password
	if err := db.Model(&user).Update("password", string(hashedPassword)).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to update password"})
		return
	}

	// Mark reset code as used
	db.Model(&resetCode).Update("used", true)

	c.JSON(200, gin.H{"message": "Password reset successfully"})
}

// GetDashboardStats returns dashboard statistics for the current user
func GetDashboardStats(c *gin.Context) {
	// Check if demo mode is enabled
	if os.Getenv("VITE_DEMO_MODE") == "true" {
		// Return mock dashboard stats for demo mode
		stats := gin.H{
			"totalBookmarks": 156,
			"totalTasks":     42,
			"totalFiles":     234,
			"totalNotes":     89,
			"recentActivity": []map[string]interface{}{
				{
					"id":        1,
					"type":      "task",
					"title":     "Complete project documentation",
					"timestamp": "1 hour ago",
				},
				{
					"id":        2,
					"type":      "bookmark",
					"title":     "SolidJS Documentation",
					"timestamp": "2 hours ago",
				},
				{
					"id":        3,
					"type":      "note",
					"title":     "Meeting notes - Q1 planning",
					"timestamp": "3 hours ago",
				},
				{
					"id":        4,
					"type":      "file",
					"title":     "project-roadmap.pdf",
					"timestamp": "4 hours ago",
				},
				{
					"id":        5,
					"type":      "task",
					"title":     "Review pull requests",
					"timestamp": "5 hours ago",
				},
			},
		}
		c.JSON(200, stats)
		return
	}

	user, exists := c.Get("user")
	if !exists {
		c.JSON(401, gin.H{"error": "User not authenticated"})
		return
	}

	currentUser := user.(models.User)
	db := config.GetDB()

	// Get counts for each entity type
	var bookmarkCount, taskCount, fileCount, noteCount int64

	// Count bookmarks
	db.Model(&models.Bookmark{}).Where("user_id = ?", currentUser.ID).Count(&bookmarkCount)

	// Count tasks
	db.Model(&models.Task{}).Where("user_id = ?", currentUser.ID).Count(&taskCount)

	// Count files
	db.Model(&models.File{}).Where("user_id = ?", currentUser.ID).Count(&fileCount)

	// Count notes
	db.Model(&models.Note{}).Where("user_id = ?", currentUser.ID).Count(&noteCount)

	// Get recent activity
	type RecentActivity struct {
		ID        uint   `json:"id"`
		Type      string `json:"type"`
		Title     string `json:"title"`
		Timestamp string `json:"timestamp"`
	}

	var activities []RecentActivity

	// Get recent bookmarks
	var bookmarks []models.Bookmark
	db.Where("user_id = ?", currentUser.ID).Order("created_at DESC").Limit(3).Find(&bookmarks)
	for _, bookmark := range bookmarks {
		activities = append(activities, RecentActivity{
			ID:        bookmark.ID,
			Type:      "bookmark",
			Title:     bookmark.Title,
			Timestamp: formatTimeAgo(bookmark.CreatedAt),
		})
	}

	// Get recent tasks
	var tasks []models.Task
	db.Where("user_id = ?", currentUser.ID).Order("created_at DESC").Limit(3).Find(&tasks)
	for _, task := range tasks {
		activities = append(activities, RecentActivity{
			ID:        task.ID,
			Type:      "task",
			Title:     task.Title,
			Timestamp: formatTimeAgo(task.CreatedAt),
		})
	}

	// Get recent notes
	var notes []models.Note
	db.Where("user_id = ?", currentUser.ID).Order("created_at DESC").Limit(3).Find(&notes)
	for _, note := range notes {
		activities = append(activities, RecentActivity{
			ID:        note.ID,
			Type:      "note",
			Title:     note.Title,
			Timestamp: formatTimeAgo(note.CreatedAt),
		})
	}

	// Sort activities by timestamp (most recent first)
	// For simplicity, we'll just take the first 5
	if len(activities) > 5 {
		activities = activities[:5]
	}

	stats := gin.H{
		"totalBookmarks": bookmarkCount,
		"totalTasks":     taskCount,
		"totalFiles":     fileCount,
		"totalNotes":     noteCount,
		"recentActivity": activities,
	}

	c.JSON(200, stats)
}

// formatTimeAgo formats a time as a relative "time ago" string
func formatTimeAgo(t time.Time) string {
	duration := time.Since(t)

	if duration < time.Hour {
		minutes := int(duration.Minutes())
		if minutes == 1 {
			return "1 minute ago"
		}
		return fmt.Sprintf("%d minutes ago", minutes)
	} else if duration < 24*time.Hour {
		hours := int(duration.Hours())
		if hours == 1 {
			return "1 hour ago"
		}
		return fmt.Sprintf("%d hours ago", hours)
	} else if duration < 7*24*time.Hour {
		days := int(duration.Hours() / 24)
		if days == 1 {
			return "1 day ago"
		}
		return fmt.Sprintf("%d days ago", days)
	} else {
		return t.Format("Jan 2, 2006")
	}
}
