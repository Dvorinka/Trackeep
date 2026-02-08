package handlers

import (
	"bytes"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"image/png"
	"io"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/pquerna/otp/totp"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"github.com/trackeep/backend/config"
	"github.com/trackeep/backend/models"
)

// TOTPSetupRequest represents the request to setup TOTP
type TOTPSetupRequest struct {
	Password string `json:"password" binding:"required"`
}

// TOTPSetupResponse represents the response with TOTP setup details
type TOTPSetupResponse struct {
	Secret      string   `json:"secret"`
	QRCode      string   `json:"qr_code"`
	BackupCodes []string `json:"backup_codes"`
}

// TOTPVerifyRequest represents the request to verify TOTP
type TOTPVerifyRequest struct {
	Code string `json:"code" binding:"required"`
}

// TOTPEnableRequest represents the request to enable TOTP
type TOTPEnableRequest struct {
	Code string `json:"code" binding:"required"`
}

// TOTPDisableRequest represents the request to disable TOTP
type TOTPDisableRequest struct {
	Code     string `json:"code" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// TOTPLoginRequest represents the request for login with TOTP
type TOTPLoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
	TOTPCode string `json:"totp_code"`
}

// encrypt encrypts text using AES-GCM
func encrypt(plaintext string) (string, error) {
	key := []byte(os.Getenv("ENCRYPTION_KEY"))
	if len(key) != 32 {
		return "", fmt.Errorf("encryption key must be 32 bytes")
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

// decrypt decrypts text using AES-GCM
func decrypt(ciphertext string) (string, error) {
	key := []byte(os.Getenv("ENCRYPTION_KEY"))
	if len(key) != 32 {
		return "", fmt.Errorf("encryption key must be 32 bytes")
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	data, err := base64.StdEncoding.DecodeString(ciphertext)
	if err != nil {
		return "", err
	}

	nonceSize := gcm.NonceSize()
	if len(data) < nonceSize {
		return "", fmt.Errorf("ciphertext too short")
	}

	nonce, ciphertext_bytes := data[:nonceSize], data[nonceSize:]
	plaintext, err := gcm.Open(nil, nonce, ciphertext_bytes, nil)
	if err != nil {
		return "", err
	}

	return string(plaintext), nil
}

// generateBackupCodes generates backup codes for 2FA
func generateBackupCodes() []string {
	codes := make([]string, 10)
	for i := range codes {
		codes[i] = fmt.Sprintf("%08d", i+10000000)
	}
	return codes
}

// SetupTOTP generates a new TOTP secret and QR code for the user
func SetupTOTP(c *gin.Context) {
	user, exists := c.Get("user")
	if !exists {
		c.JSON(401, gin.H{"error": "User not authenticated"})
		return
	}

	currentUser := user.(models.User)
	var req TOTPSetupRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(currentUser.Password), []byte(req.Password)); err != nil {
		c.JSON(401, gin.H{"error": "Invalid password"})
		return
	}

	// Generate TOTP key
	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      "Trackeep",
		AccountName: currentUser.Email,
		SecretSize:  32,
	})
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to generate TOTP secret"})
		return
	}

	// Generate backup codes
	backupCodes := generateBackupCodes()

	// Encrypt backup codes for storage
	backupCodesJSON, _ := json.Marshal(backupCodes)
	encryptedBackupCodes, err := encrypt(string(backupCodesJSON))
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to encrypt backup codes"})
		return
	}

	// Store encrypted TOTP secret and backup codes temporarily (not enabled yet)
	encryptedSecret, err := encrypt(key.Secret())
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to encrypt TOTP secret"})
		return
	}

	db := config.GetDB()
	updates := map[string]interface{}{
		"totp_secret":  encryptedSecret,
		"backup_codes": encryptedBackupCodes,
	}

	if err := db.Model(&currentUser).Updates(updates).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to store TOTP setup"})
		return
	}

	// Generate QR code
	qrCode, err := key.Image(256, 256)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to generate QR code"})
		return
	}

	// Convert QR code to base64
	var qrBuffer bytes.Buffer
	if err := png.Encode(&qrBuffer, qrCode); err != nil {
		c.JSON(500, gin.H{"error": "Failed to encode QR code"})
		return
	}
	qrCodeBase64 := base64.StdEncoding.EncodeToString(qrBuffer.Bytes())

	c.JSON(200, TOTPSetupResponse{
		Secret:      key.Secret(),
		QRCode:      fmt.Sprintf("data:image/png;base64,%s", qrCodeBase64),
		BackupCodes: backupCodes,
	})
}

// VerifyTOTP verifies a TOTP code during setup
func VerifyTOTP(c *gin.Context) {
	user, exists := c.Get("user")
	if !exists {
		c.JSON(401, gin.H{"error": "User not authenticated"})
		return
	}

	currentUser := user.(models.User)
	var req TOTPVerifyRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	// Get encrypted TOTP secret
	if currentUser.TOTPSecret == "" {
		c.JSON(400, gin.H{"error": "TOTP not set up"})
		return
	}

	secret, err := decrypt(currentUser.TOTPSecret)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to decrypt TOTP secret"})
		return
	}

	// Verify TOTP code
	valid := totp.Validate(req.Code, secret)
	if !valid {
		c.JSON(400, gin.H{"error": "Invalid TOTP code"})
		return
	}

	c.JSON(200, gin.H{"valid": true})
}

// EnableTOTP enables TOTP authentication for the user
func EnableTOTP(c *gin.Context) {
	user, exists := c.Get("user")
	if !exists {
		c.JSON(401, gin.H{"error": "User not authenticated"})
		return
	}

	currentUser := user.(models.User)
	var req TOTPEnableRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	// Get encrypted TOTP secret
	if currentUser.TOTPSecret == "" {
		c.JSON(400, gin.H{"error": "TOTP not set up"})
		return
	}

	secret, err := decrypt(currentUser.TOTPSecret)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to decrypt TOTP secret"})
		return
	}

	// Verify TOTP code
	valid := totp.Validate(req.Code, secret)
	if !valid {
		c.JSON(400, gin.H{"error": "Invalid TOTP code"})
		return
	}

	// Enable TOTP
	db := config.GetDB()
	if err := db.Model(&currentUser).Update("totp_enabled", true).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to enable TOTP"})
		return
	}

	c.JSON(200, gin.H{"message": "TOTP enabled successfully"})
}

// DisableTOTP disables TOTP authentication for the user
func DisableTOTP(c *gin.Context) {
	user, exists := c.Get("user")
	if !exists {
		c.JSON(401, gin.H{"error": "User not authenticated"})
		return
	}

	currentUser := user.(models.User)
	var req TOTPDisableRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(currentUser.Password), []byte(req.Password)); err != nil {
		c.JSON(401, gin.H{"error": "Invalid password"})
		return
	}

	// If TOTP is enabled, verify the code
	if currentUser.TOTPEnabled {
		if currentUser.TOTPSecret == "" {
			c.JSON(400, gin.H{"error": "TOTP not set up"})
			return
		}

		secret, err := decrypt(currentUser.TOTPSecret)
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to decrypt TOTP secret"})
			return
		}

		valid := totp.Validate(req.Code, secret)
		if !valid {
			c.JSON(400, gin.H{"error": "Invalid TOTP code"})
			return
		}
	}

	// Disable TOTP and clear secrets
	db := config.GetDB()
	updates := map[string]interface{}{
		"totp_enabled": false,
		"totp_secret":  "",
		"backup_codes": "",
	}

	if err := db.Model(&currentUser).Updates(updates).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to disable TOTP"})
		return
	}

	c.JSON(200, gin.H{"message": "TOTP disabled successfully"})
}

// GetTOTPStatus returns the current TOTP status for the user
func GetTOTPStatus(c *gin.Context) {
	user, exists := c.Get("user")
	if !exists {
		c.JSON(401, gin.H{"error": "User not authenticated"})
		return
	}

	currentUser := user.(models.User)

	status := gin.H{
		"enabled": currentUser.TOTPEnabled,
		"setup":   currentUser.TOTPSecret != "",
	}

	c.JSON(200, status)
}

// VerifyBackupCode verifies a backup code
func VerifyBackupCode(c *gin.Context) {
	user, exists := c.Get("user")
	if !exists {
		c.JSON(401, gin.H{"error": "User not authenticated"})
		return
	}

	currentUser := user.(models.User)
	var req TOTPVerifyRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	if currentUser.BackupCodes == "" {
		c.JSON(400, gin.H{"error": "No backup codes available"})
		return
	}

	// Decrypt backup codes
	backupCodesJSON, err := decrypt(currentUser.BackupCodes)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to decrypt backup codes"})
		return
	}

	var backupCodes []string
	if err := json.Unmarshal([]byte(backupCodesJSON), &backupCodes); err != nil {
		c.JSON(500, gin.H{"error": "Failed to parse backup codes"})
		return
	}

	// Check if the provided code is valid
	codeIndex := -1
	for i, code := range backupCodes {
		if code == req.Code {
			codeIndex = i
			break
		}
	}

	if codeIndex == -1 {
		c.JSON(400, gin.H{"error": "Invalid backup code"})
		return
	}

	// Remove the used backup code
	backupCodes = append(backupCodes[:codeIndex], backupCodes[codeIndex+1:]...)

	// Re-encrypt and save remaining backup codes
	newBackupCodesJSON, _ := json.Marshal(backupCodes)
	encryptedBackupCodes, err := encrypt(string(newBackupCodesJSON))
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to encrypt backup codes"})
		return
	}

	db := config.GetDB()
	if err := db.Model(&currentUser).Update("backup_codes", encryptedBackupCodes).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to update backup codes"})
		return
	}

	c.JSON(200, gin.H{"valid": true, "remaining_codes": len(backupCodes)})
}

// LoginWithTOTP handles login with TOTP verification
func LoginWithTOTP(c *gin.Context) {
	var req TOTPLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	// Check if demo mode is enabled first
	if os.Getenv("VITE_DEMO_MODE") == "true" && req.Email == "demo@trackeep.com" && req.Password == "demo123" {
		// Create demo user
		demoUser := models.User{
			ID:        1,
			Email:     "demo@trackeep.com",
			Username:  "demo",
			FullName:  "Demo User",
			Theme:     "dark",
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}

		// Generate JWT token for demo user
		token, err := GenerateJWT(demoUser)
		if err != nil {
			c.JSON(500, gin.H{"error": "Failed to generate token"})
			return
		}

		c.JSON(200, AuthResponse{
			Token: token,
			User:  demoUser,
		})
		return
	}

	db := config.GetDB()

	// Find user
	var user models.User
	if err := db.Where("email = ?", req.Email).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(401, gin.H{"error": "Invalid credentials"})
			return
		}
		c.JSON(500, gin.H{"error": "Database error"})
		return
	}

	// Check if account is locked
	if user.LockedUntil != nil && user.LockedUntil.After(time.Now()) {
		c.JSON(423, gin.H{"error": "Account temporarily locked due to too many failed attempts"})
		return
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		// Increment login attempts
		user.LoginAttempts++
		if user.LoginAttempts >= 5 {
			lockDuration := time.Now().Add(time.Duration(user.LoginAttempts) * time.Minute)
			user.LockedUntil = &lockDuration
		}

		db.Model(&user).Updates(map[string]interface{}{
			"login_attempts": user.LoginAttempts,
			"locked_until":   user.LockedUntil,
		})

		c.JSON(401, gin.H{"error": "Invalid credentials"})
		return
	}

	// If TOTP is enabled, verify the code
	if user.TOTPEnabled {
		if req.TOTPCode == "" {
			// Return a special response indicating TOTP is required
			c.JSON(200, gin.H{
				"requires_totp": true,
				"message":       "TOTP code required",
			})
			return
		}

		// Check if it's a backup code first
		if len(req.TOTPCode) == 8 && strings.HasPrefix(req.TOTPCode, "1") {
			// This looks like a backup code
			if user.BackupCodes == "" {
				c.JSON(401, gin.H{"error": "Invalid backup code"})
				return
			}

			backupCodesJSON, err := decrypt(user.BackupCodes)
			if err != nil {
				c.JSON(500, gin.H{"error": "Failed to verify backup code"})
				return
			}

			var backupCodes []string
			if err := json.Unmarshal([]byte(backupCodesJSON), &backupCodes); err != nil {
				c.JSON(500, gin.H{"error": "Failed to verify backup code"})
				return
			}

			// Check if the provided code is valid
			codeIndex := -1
			for i, code := range backupCodes {
				if code == req.TOTPCode {
					codeIndex = i
					break
				}
			}

			if codeIndex == -1 {
				c.JSON(401, gin.H{"error": "Invalid backup code"})
				return
			}

			// Remove the used backup code
			backupCodes = append(backupCodes[:codeIndex], backupCodes[codeIndex+1:]...)
			newBackupCodesJSON, _ := json.Marshal(backupCodes)
			encryptedBackupCodes, _ := encrypt(string(newBackupCodesJSON))
			db.Model(&user).Update("backup_codes", encryptedBackupCodes)
		} else {
			// Verify TOTP code
			if user.TOTPSecret == "" {
				c.JSON(401, gin.H{"error": "TOTP not properly configured"})
				return
			}

			secret, err := decrypt(user.TOTPSecret)
			if err != nil {
				c.JSON(500, gin.H{"error": "Failed to verify TOTP code"})
				return
			}

			valid := totp.Validate(req.TOTPCode, secret)
			if !valid {
				c.JSON(401, gin.H{"error": "Invalid TOTP code"})
				return
			}
		}
	}

	// Reset login attempts on successful login
	now := time.Now()
	db.Model(&user).Updates(map[string]interface{}{
		"login_attempts": 0,
		"locked_until":   nil,
		"last_login_at":  &now,
	})

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

// RegenerateBackupCodes generates new backup codes
func RegenerateBackupCodes(c *gin.Context) {
	user, exists := c.Get("user")
	if !exists {
		c.JSON(401, gin.H{"error": "User not authenticated"})
		return
	}

	currentUser := user.(models.User)
	var req TOTPVerifyRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	if !currentUser.TOTPEnabled {
		c.JSON(400, gin.H{"error": "TOTP is not enabled"})
		return
	}

	// Verify current TOTP code
	if currentUser.TOTPSecret == "" {
		c.JSON(400, gin.H{"error": "TOTP not set up"})
		return
	}

	secret, err := decrypt(currentUser.TOTPSecret)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to decrypt TOTP secret"})
		return
	}

	valid := totp.Validate(req.Code, secret)
	if !valid {
		c.JSON(400, gin.H{"error": "Invalid TOTP code"})
		return
	}

	// Generate new backup codes
	backupCodes := generateBackupCodes()
	backupCodesJSON, _ := json.Marshal(backupCodes)
	encryptedBackupCodes, err := encrypt(string(backupCodesJSON))
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to encrypt backup codes"})
		return
	}

	// Update backup codes
	db := config.GetDB()
	if err := db.Model(&currentUser).Update("backup_codes", encryptedBackupCodes).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to update backup codes"})
		return
	}

	c.JSON(200, gin.H{
		"message":      "Backup codes regenerated successfully",
		"backup_codes": backupCodes,
	})
}
