package handlers

import (
	"archive/zip"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// UpdateInfo represents information about an available update
type UpdateInfo struct {
	Version      string `json:"version"`
	ReleaseNotes string `json:"releaseNotes"`
	DownloadURL  string `json:"downloadUrl"`
	Mandatory    bool   `json:"mandatory"`
	Size         string `json:"size"`
	Checksum     string `json:"checksum"`
	PublishedAt  string `json:"publishedAt"`
	Prerelease   bool   `json:"prerelease"`
}

// UpdateStatus represents the current status of an update
type UpdateStatus struct {
	Available   bool    `json:"available"`
	Downloading bool    `json:"downloading"`
	Installing  bool    `json:"installing"`
	Completed   bool    `json:"completed"`
	Error       string  `json:"error,omitempty"`
	Progress    float64 `json:"progress"`
}

// UpdateRequest represents an update installation request
type UpdateRequest struct {
	Version string `json:"version"`
}

// Global update state
var (
	updateMutex    sync.RWMutex
	currentUpdate  *UpdateInfo
	updateProgress *UpdateStatus
	backupPath     string // Store backup path for rollback
)

func init() {
	updateProgress = &UpdateStatus{
		Available:   false,
		Downloading: false,
		Installing:  false,
		Completed:   false,
		Error:       "",
		Progress:    0,
	}
}

// CheckForUpdates checks if a new version is available
func CheckForUpdates(c *gin.Context) {
	updateMutex.Lock()
	defer updateMutex.Unlock()

	// Get current version from environment or default
	currentVersion := os.Getenv("APP_VERSION")
	if currentVersion == "" {
		currentVersion = "1.0.0"
	}

	// Get GitHub token from OAuth service (required)
	githubToken := getGitHubTokenFromContext(c)
	if githubToken == "" {
		log.Printf("No GitHub token from OAuth service - update check failed")
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error":   "OAuth service not available",
			"message": "Please ensure OAuth service is running and you are authenticated",
		})
		return
	}

	log.Printf("Using GitHub token from OAuth service for update check")

	// Check for updates using GitHub API
	updateInfo, updateAvailable, err := checkForUpdatesWithGitHub(currentVersion, githubToken)
	if err != nil {
		log.Printf("Failed to check for updates: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to check for updates",
			"details": err.Error(),
		})
		return
	}

	if updateAvailable {
		currentUpdate = updateInfo
		updateProgress.Available = true
	} else {
		currentUpdate = nil
		updateProgress.Available = false
	}

	c.JSON(http.StatusOK, gin.H{
		"updateAvailable": updateAvailable,
		"currentVersion":  currentVersion,
		"latestVersion":   updateInfo.Version,
		"updateInfo":      currentUpdate,
	})
}

// InstallUpdate starts the update installation process
func InstallUpdate(c *gin.Context) {
	var req UpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	updateMutex.Lock()
	defer updateMutex.Unlock()

	if currentUpdate == nil || currentUpdate.Version != req.Version {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Update not available"})
		return
	}

	if updateProgress.Downloading || updateProgress.Installing {
		c.JSON(http.StatusConflict, gin.H{"error": "Update already in progress"})
		return
	}

	// Start update process in background
	go performUpdate(currentUpdate)

	c.JSON(http.StatusOK, gin.H{
		"message": "Update started",
		"version": req.Version,
	})
}

// GetUpdateProgress returns the current update progress
func GetUpdateProgress(c *gin.Context) {
	updateMutex.RLock()
	defer updateMutex.RUnlock()

	c.JSON(http.StatusOK, updateProgress)
}

// WebSocket endpoint for real-time update progress
func UpdateProgressWebSocket(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"message":  "WebSocket support not implemented, using polling instead",
		"progress": updateProgress,
	})
}

// checkForUpdatesWithGitHub checks for updates using GitHub API
func checkForUpdatesWithGitHub(currentVersion, githubToken string) (*UpdateInfo, bool, error) {
	// GitHub repository information
	owner := "Dvorinka"
	repo := "Trackeep"

	// Log which token source we're using
	if githubToken != "" {
		log.Printf("Using GitHub token from OAuth service")
	} else {
		log.Printf("No GitHub token available - OAuth service should be running")
		return nil, false, fmt.Errorf("OAuth service not available - please ensure OAuth service is running")
	}

	// Create HTTP request to GitHub API
	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/releases/latest", owner, repo)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, false, fmt.Errorf("failed to create request: %w", err)
	}

	// Add authorization header if token is available
	if githubToken != "" {
		req.Header.Set("Authorization", "token "+githubToken)
	}
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	// Make the request
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, false, fmt.Errorf("failed to fetch releases: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, false, fmt.Errorf("GitHub API returned status %d", resp.StatusCode)
	}

	// Parse the release response
	var release struct {
		TagName     string `json:"tag_name"`
		Name        string `json:"name"`
		Body        string `json:"body"`
		PublishedAt string `json:"published_at"`
		Prerelease  bool   `json:"prerelease"`
		Assets      []struct {
			Name               string `json:"name"`
			Size               int64  `json:"size"`
			BrowserDownloadURL string `json:"browser_download_url"`
		} `json:"assets"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&release); err != nil {
		return nil, false, fmt.Errorf("failed to parse release response: %w", err)
	}

	// Compare versions (simple semantic version comparison)
	if !isNewerVersion(release.TagName, currentVersion) {
		return nil, false, nil
	}

	// Find the appropriate asset for the current platform
	var downloadURL, size, checksum string
	for _, asset := range release.Assets {
		// Look for platform-specific binaries
		if isPlatformAsset(asset.Name) {
			downloadURL = asset.BrowserDownloadURL
			size = formatBytes(asset.Size)
			break
		}
	}

	// If no platform-specific asset found, use the first one
	if downloadURL == "" && len(release.Assets) > 0 {
		downloadURL = release.Assets[0].BrowserDownloadURL
		size = formatBytes(release.Assets[0].Size)
	}

	// Try to get checksum from release notes or assets
	checksum = extractChecksum(release.Body)

	updateInfo := &UpdateInfo{
		Version:      release.TagName,
		ReleaseNotes: release.Body,
		DownloadURL:  downloadURL,
		Mandatory:    false, // Could be determined from release notes or tags
		Size:         size,
		Checksum:     checksum,
		PublishedAt:  release.PublishedAt,
		Prerelease:   release.Prerelease,
	}

	return updateInfo, true, nil
}

// getGitHubTokenFromContext extracts GitHub token from request context
func getGitHubTokenFromContext(c *gin.Context) string {
	// Extract Authorization header
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		return ""
	}

	// Remove "Bearer " prefix
	tokenString := strings.TrimPrefix(authHeader, "Bearer ")
	if tokenString == authHeader {
		// No Bearer prefix found
		return ""
	}

	// Parse JWT token
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(os.Getenv("JWT_SECRET")), nil
	})

	if err != nil || !token.Valid {
		return ""
	}

	// Extract claims
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return ""
	}

	// Get GitHub access token from claims
	githubToken, ok := claims["access_token"]
	if !ok {
		return ""
	}

	// Check if token is still valid
	expiresAt, ok := claims["expires_at"]
	if ok {
		if expTime, ok := expiresAt.(float64); ok {
			if time.Now().Unix() > int64(expTime) {
				return "" // Token expired
			}
		}
	}

	return githubToken.(string)
}

// Helper functions for GitHub update functionality

// getGitHubTokenFromOAuth attempts to get GitHub token from OAuth service
func getGitHubTokenFromOAuth() string {
	// Try to get token from current user session
	// This would typically be extracted from the JWT token in the request context
	// For now, we'll implement a basic version that checks for a logged-in user

	// In a real implementation, this would:
	// 1. Extract the JWT from the current request context
	// 2. Parse the JWT to get the GitHub access token
	// 3. Return the token if valid

	// For now, return empty string to indicate no OAuth token available
	// This will be implemented when we have proper session management
	return ""
}

// isNewerVersion compares semantic versions
func isNewerVersion(latest, current string) bool {
	// Remove 'v' prefix if present
	latest = strings.TrimPrefix(latest, "v")
	current = strings.TrimPrefix(current, "v")

	latestParts := strings.Split(latest, ".")
	currentParts := strings.Split(current, ".")

	for i := 0; i < 3; i++ {
		var latestNum, currentNum int
		var err error

		if i < len(latestParts) {
			latestNum, err = strconv.Atoi(latestParts[i])
			if err != nil {
				latestNum = 0
			}
		}

		if i < len(currentParts) {
			currentNum, err = strconv.Atoi(currentParts[i])
			if err != nil {
				currentNum = 0
			}
		}

		if latestNum > currentNum {
			return true
		}
		if latestNum < currentNum {
			return false
		}
	}

	return false
}

// isPlatformAsset checks if an asset is appropriate for the current platform
func isPlatformAsset(filename string) bool {
	arch := runtime.GOARCH
	os := runtime.GOOS

	filename = strings.ToLower(filename)

	// Check for platform-specific patterns
	switch os {
	case "windows":
		return strings.Contains(filename, "windows") || strings.Contains(filename, "win") || strings.HasSuffix(filename, ".exe")
	case "linux":
		return strings.Contains(filename, "linux") || strings.Contains(filename, "ubuntu") || strings.Contains(filename, "debian")
	case "darwin":
		return strings.Contains(filename, "darwin") || strings.Contains(filename, "macos") || strings.Contains(filename, "mac")
	}

	// Check architecture
	if arch == "amd64" {
		return strings.Contains(filename, "amd64") || strings.Contains(filename, "x86_64")
	}
	if arch == "arm64" {
		return strings.Contains(filename, "arm64") || strings.Contains(filename, "aarch64")
	}

	return false
}

// formatBytes formats bytes into human readable format
func formatBytes(bytes int64) string {
	const unit = 1024
	if bytes < unit {
		return fmt.Sprintf("%d B", bytes)
	}
	div, exp := int64(unit), 0
	for n := bytes / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %cB", float64(bytes)/float64(div), "KMGTPE"[exp])
}

// extractChecksum attempts to extract SHA256 checksum from release notes
func extractChecksum(body string) string {
	lines := strings.Split(body, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "SHA256:") || strings.HasPrefix(line, "Checksum:") {
			parts := strings.Fields(line)
			if len(parts) >= 2 {
				return parts[1]
			}
		}
		// Also look for pattern like "checksum: sha256:..."
		if strings.Contains(line, "sha256:") {
			idx := strings.Index(line, "sha256:")
			if idx != -1 {
				checksum := strings.TrimSpace(line[idx+7:])
				if len(checksum) == 64 { // SHA256 length
					return checksum
				}
			}
		}
	}
	return ""
}

// performUpdate performs the actual update process
func performUpdate(updateInfo *UpdateInfo) {
	updateMutex.Lock()
	updateProgress.Downloading = true
	updateProgress.Progress = 0
	updateProgress.Error = ""
	updateMutex.Unlock()

	log.Printf("Starting update to version %s", updateInfo.Version)

	// Download the update
	tempFile, err := downloadUpdate(updateInfo)
	if err != nil {
		updateMutex.Lock()
		updateProgress.Downloading = false
		updateProgress.Error = fmt.Sprintf("Failed to download update: %v", err)
		updateMutex.Unlock()
		log.Printf("Update download failed: %v", err)
		return
	}
	defer os.Remove(tempFile)

	// Verify checksum if available
	if updateInfo.Checksum != "" {
		if err := verifyChecksum(tempFile, updateInfo.Checksum); err != nil {
			updateMutex.Lock()
			updateProgress.Downloading = false
			updateProgress.Error = fmt.Sprintf("Checksum verification failed: %v", err)
			updateMutex.Unlock()
			log.Printf("Checksum verification failed: %v", err)
			return
		}
		log.Printf("Checksum verification passed")
	}

	// Start installation
	updateMutex.Lock()
	updateProgress.Downloading = false
	updateProgress.Installing = true
	updateProgress.Progress = 0
	updateMutex.Unlock()

	// Backup user data
	if err := backupUserData(); err != nil {
		updateMutex.Lock()
		updateProgress.Installing = false
		updateProgress.Error = fmt.Sprintf("Failed to backup user data: %v", err)
		updateMutex.Unlock()
		log.Printf("Backup failed: %v", err)
		return
	}

	// Extract and install the update
	if err := extractAndInstall(tempFile, updateInfo); err != nil {
		// Attempt rollback on failure
		log.Printf("Installation failed, attempting rollback: %v", err)
		if rollbackErr := rollbackUpdate(); rollbackErr != nil {
			log.Printf("Rollback also failed: %v", rollbackErr)
		} else {
			log.Printf("Rollback completed successfully")
		}

		updateMutex.Lock()
		updateProgress.Installing = false
		updateProgress.Error = fmt.Sprintf("Failed to install update: %v", err)
		updateMutex.Unlock()
		return
	}

	// Mark as completed
	updateMutex.Lock()
	updateProgress.Installing = false
	updateProgress.Completed = true
	updateProgress.Progress = 100
	updateMutex.Unlock()

	log.Printf("Update to version %s completed successfully", updateInfo.Version)

	// Trigger application restart after a delay
	time.Sleep(2 * time.Second)
	restartApplication()
}

// downloadUpdate downloads the update file with progress tracking
func downloadUpdate(updateInfo *UpdateInfo) (string, error) {
	if updateInfo.DownloadURL == "" {
		return "", fmt.Errorf("no download URL available")
	}

	// Create temporary file
	tempFile, err := os.CreateTemp("", "trackeep-update-*.zip")
	if err != nil {
		return "", fmt.Errorf("failed to create temp file: %w", err)
	}
	defer tempFile.Close()

	// Make HTTP request
	req, err := http.NewRequest("GET", updateInfo.DownloadURL, nil)
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to download: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("download failed with status %d", resp.StatusCode)
	}

	// Get content length for progress tracking
	contentLength := resp.ContentLength
	var downloaded int64

	// Create progress reporter
	progress := make(chan int64)
	go func() {
		for {
			bytes, ok := <-progress
			if !ok {
				return
			}
			downloaded += bytes
			if contentLength > 0 {
				percent := float64(downloaded) / float64(contentLength) * 100
				updateMutex.Lock()
				updateProgress.Progress = percent
				updateMutex.Unlock()
				log.Printf("Download progress: %.1f%%", percent)
			}
		}
	}()

	// Download with progress tracking
	writer := &progressWriter{writer: tempFile, progress: progress}
	_, err = io.Copy(writer, resp.Body)
	close(progress)

	if err != nil {
		return "", fmt.Errorf("failed to save download: %w", err)
	}

	return tempFile.Name(), nil
}

// progressWriter tracks download progress
type progressWriter struct {
	writer   io.Writer
	progress chan<- int64
}

func (pw *progressWriter) Write(p []byte) (int, error) {
	n, err := pw.writer.Write(p)
	if err == nil && n > 0 {
		pw.progress <- int64(n)
	}
	return n, err
}

// verifyChecksum verifies the SHA256 checksum of a file
func verifyChecksum(filePath, expectedChecksum string) error {
	file, err := os.Open(filePath)
	if err != nil {
		return fmt.Errorf("failed to open file: %w", err)
	}
	defer file.Close()

	hasher := sha256.New()
	if _, err := io.Copy(hasher, file); err != nil {
		return fmt.Errorf("failed to calculate checksum: %w", err)
	}

	actualChecksum := hex.EncodeToString(hasher.Sum(nil))
	if !strings.EqualFold(actualChecksum, expectedChecksum) {
		return fmt.Errorf("checksum mismatch: expected %s, got %s", expectedChecksum, actualChecksum)
	}

	return nil
}

// extractAndInstall extracts the update and installs it
func extractAndInstall(filePath string, updateInfo *UpdateInfo) error {
	// Get current executable path
	executable, err := os.Executable()
	if err != nil {
		return fmt.Errorf("failed to get executable path: %w", err)
	}

	// Get directory of executable
	installDir := filepath.Dir(executable)

	// Open the zip file
	reader, err := zip.OpenReader(filePath)
	if err != nil {
		return fmt.Errorf("failed to open zip file: %w", err)
	}
	defer reader.Close()

	// Extract files
	totalFiles := len(reader.File)
	extractedFiles := 0

	for _, file := range reader.File {
		// Update progress
		progress := float64(extractedFiles) / float64(totalFiles) * 100
		updateMutex.Lock()
		updateProgress.Progress = progress
		updateMutex.Unlock()

		// Skip directories for now
		if file.FileInfo().IsDir() {
			continue
		}

		// Create file path
		filePath := filepath.Join(installDir, file.Name)

		// Ensure directory exists
		if err := os.MkdirAll(filepath.Dir(filePath), 0755); err != nil {
			return fmt.Errorf("failed to create directory: %w", err)
		}

		// Extract file
		if err := extractFile(file, filePath); err != nil {
			return fmt.Errorf("failed to extract %s: %w", file.Name, err)
		}

		extractedFiles++
		log.Printf("Extracted: %s", file.Name)
	}

	// Update version in environment
	os.Setenv("APP_VERSION", updateInfo.Version)

	return nil
}

// extractFile extracts a single file from zip
func extractFile(file *zip.File, destination string) error {
	// Open file in zip
	rc, err := file.Open()
	if err != nil {
		return err
	}
	defer rc.Close()

	// Create destination file
	destFile, err := os.OpenFile(destination, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, file.FileInfo().Mode())
	if err != nil {
		return err
	}
	defer destFile.Close()

	// Copy file contents
	_, err = io.Copy(destFile, rc)
	return err
}

// backupUserData creates a backup of user data
func backupUserData() error {
	backupDir := filepath.Join(os.TempDir(), "trackeep_backup", time.Now().Format("20060102_150405"))

	// Store backup path globally for potential rollback
	backupPath = backupDir

	// Create backup directory
	if err := os.MkdirAll(backupDir, 0755); err != nil {
		return fmt.Errorf("failed to create backup directory: %w", err)
	}

	// Get current executable path
	executable, err := os.Executable()
	if err != nil {
		return fmt.Errorf("failed to get executable path: %w", err)
	}

	// Backup current executable
	backupExecPath := filepath.Join(backupDir, filepath.Base(executable))
	if err := copyFile(executable, backupExecPath); err != nil {
		return fmt.Errorf("failed to backup executable: %w", err)
	}

	// Backup database
	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "./trackeep.db"
	}

	if _, err := os.Stat(dbPath); err == nil {
		backupDBPath := filepath.Join(backupDir, "trackeep.db")
		if err := copyFile(dbPath, backupDBPath); err != nil {
			return fmt.Errorf("failed to backup database: %w", err)
		}
	}

	// Backup uploads directory
	uploadsDir := "./uploads"
	if _, err := os.Stat(uploadsDir); err == nil {
		backupUploadsDir := filepath.Join(backupDir, "uploads")
		if err := copyDirectory(uploadsDir, backupUploadsDir); err != nil {
			return fmt.Errorf("failed to backup uploads: %w", err)
		}
	}

	// Backup configuration files
	configFiles := []string{".env", "docker-compose.yml"}
	for _, file := range configFiles {
		if _, err := os.Stat(file); err == nil {
			backupFile := filepath.Join(backupDir, file)
			if err := copyFile(file, backupFile); err != nil {
				log.Printf("Warning: failed to backup %s: %v", file, err)
			}
		}
	}

	log.Printf("User data backed up to: %s", backupDir)
	return nil
}

// applyUpdate applies the update
func applyUpdate(updateInfo *UpdateInfo) error {
	// In a real implementation, this would:
	// 1. Download the new version
	// 2. Verify checksums
	// 3. Extract/update files
	// 4. Run database migrations if needed
	// 5. Restore user data if necessary

	log.Printf("Applying update to version %s", updateInfo.Version)

	// Simulate file update
	time.Sleep(2 * time.Second)

	// Update version in environment
	os.Setenv("APP_VERSION", updateInfo.Version)

	return nil
}

// restartApplication restarts the application
func restartApplication() {
	log.Println("Restarting application to complete update...")

	// Create a new process to replace the current one
	executable, err := os.Executable()
	if err != nil {
		log.Printf("Failed to get executable path: %v", err)
		return
	}

	// Use different commands based on OS
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("powershell", "-Command", "Start-Sleep 2; "+executable)
	default:
		cmd = exec.Command("sh", "-c", fmt.Sprintf("sleep 2 && %s", executable))
	}

	// Start the new process
	if err := cmd.Start(); err != nil {
		log.Printf("Failed to start new process: %v", err)
		return
	}

	// Exit the current process
	os.Exit(0)
}

// broadcastProgress broadcasts update progress to all WebSocket clients (simplified version)
func broadcastProgress() {
	updateMutex.RLock()
	progress := *updateProgress
	updateMutex.RUnlock()

	log.Printf("Update progress: %.1f%% - Status: %v", progress.Progress, getUpdateStatusString(progress))
}

// getUpdateStatusString returns a human-readable status string
func getUpdateStatusString(status UpdateStatus) string {
	if status.Completed {
		return "Completed"
	}
	if status.Error != "" {
		return "Error: " + status.Error
	}
	if status.Installing {
		return "Installing"
	}
	if status.Downloading {
		return "Downloading"
	}
	if status.Available {
		return "Available"
	}
	return "Not Available"
}

// rollbackUpdate restores the application from backup
func rollbackUpdate() error {
	if backupPath == "" {
		return fmt.Errorf("no backup path available for rollback")
	}

	log.Printf("Starting rollback from backup: %s", backupPath)

	// Get current executable path
	executable, err := os.Executable()
	if err != nil {
		return fmt.Errorf("failed to get executable path: %w", err)
	}

	// Restore executable
	backupExecPath := filepath.Join(backupPath, filepath.Base(executable))
	if _, err := os.Stat(backupExecPath); err == nil {
		if err := copyFile(backupExecPath, executable); err != nil {
			return fmt.Errorf("failed to restore executable: %w", err)
		}
		log.Printf("Restored executable from backup")
	}

	// Restore database
	backupDBPath := filepath.Join(backupPath, "trackeep.db")
	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "./trackeep.db"
	}

	if _, err := os.Stat(backupDBPath); err == nil {
		if err := copyFile(backupDBPath, dbPath); err != nil {
			return fmt.Errorf("failed to restore database: %w", err)
		}
		log.Printf("Restored database from backup")
	}

	// Restore uploads directory
	backupUploadsDir := filepath.Join(backupPath, "uploads")
	uploadsDir := "./uploads"

	if _, err := os.Stat(backupUploadsDir); err == nil {
		// Remove current uploads directory and restore from backup
		if err := os.RemoveAll(uploadsDir); err != nil {
			log.Printf("Warning: failed to remove uploads directory: %v", err)
		}
		if err := copyDirectory(backupUploadsDir, uploadsDir); err != nil {
			return fmt.Errorf("failed to restore uploads: %w", err)
		}
		log.Printf("Restored uploads from backup")
	}

	// Restore configuration files
	configFiles := []string{".env", "docker-compose.yml"}
	for _, file := range configFiles {
		backupFile := filepath.Join(backupPath, file)
		if _, err := os.Stat(backupFile); err == nil {
			if err := copyFile(backupFile, file); err != nil {
				log.Printf("Warning: failed to restore %s: %v", file, err)
			} else {
				log.Printf("Restored %s from backup", file)
			}
		}
	}

	log.Printf("Rollback completed successfully")
	return nil
}
func copyFile(src, dst string) error {
	sourceFile, err := os.Open(src)
	if err != nil {
		return err
	}
	defer sourceFile.Close()

	destFile, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer destFile.Close()

	_, err = io.Copy(destFile, sourceFile)
	return err
}

// copyDirectory copies a directory recursively
func copyDirectory(src, dst string) error {
	return filepath.Walk(src, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		relPath, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}

		dstPath := filepath.Join(dst, relPath)

		if info.IsDir() {
			return os.MkdirAll(dstPath, info.Mode())
		}

		return copyFile(path, dstPath)
	})
}
