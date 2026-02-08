package handlers

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// UpdateInfo represents information about an available update
type UpdateInfo struct {
	Version      string `json:"version"`
	ReleaseNotes string `json:"releaseNotes"`
	DownloadURL  string `json:"downloadUrl"`
	Mandatory    bool   `json:"mandatory"`
	Size         string `json:"size"`
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

	// In a real implementation, this would check against a remote update server
	// For demo purposes, we'll simulate checking for updates
	latestVersion, updateAvailable := simulateUpdateCheck(currentVersion)

	if updateAvailable {
		currentUpdate = &UpdateInfo{
			Version:      latestVersion,
			ReleaseNotes: "• New AI features added\n• Performance improvements\n• Bug fixes and security patches\n• Enhanced user interface",
			DownloadURL:  "https://github.com/trackeep/trackeep/releases/latest",
			Mandatory:    false,
			Size:         "~25MB",
		}
		updateProgress.Available = true
	} else {
		currentUpdate = nil
		updateProgress.Available = false
	}

	c.JSON(http.StatusOK, gin.H{
		"updateAvailable": updateAvailable,
		"currentVersion":  currentVersion,
		"latestVersion":   latestVersion,
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

// simulateUpdateCheck simulates checking for updates
func simulateUpdateCheck(currentVersion string) (string, bool) {
	// Simulate version check - in reality this would call an update API
	versions := []string{"1.0.1", "1.1.0", "1.2.0"}

	// For demo, always return a newer version
	if len(versions) > 0 {
		return versions[0], true
	}

	return currentVersion, false
}

// performUpdate performs the actual update process
func performUpdate(updateInfo *UpdateInfo) {
	updateMutex.Lock()
	updateProgress.Downloading = true
	updateProgress.Progress = 0
	updateProgress.Error = ""
	updateMutex.Unlock()

	// Broadcast progress update
	log.Printf("Update progress: %.1f%% downloading", updateProgress.Progress)

	// Simulate download
	for i := 0; i <= 100; i += 10 {
		time.Sleep(500 * time.Millisecond)

		updateMutex.Lock()
		updateProgress.Progress = float64(i)
		updateMutex.Unlock()

		log.Printf("Update progress: %.1f%% downloading", updateProgress.Progress)
	}

	// Start installation
	updateMutex.Lock()
	updateProgress.Downloading = false
	updateProgress.Installing = true
	updateProgress.Progress = 0
	updateMutex.Unlock()

	log.Printf("Update progress: %.1f%% downloading", updateProgress.Progress)

	// Backup user data
	if err := backupUserData(); err != nil {
		updateMutex.Lock()
		updateProgress.Installing = false
		updateProgress.Error = fmt.Sprintf("Failed to backup user data: %v", err)
		updateMutex.Unlock()
		log.Printf("Update progress: %.1f%% downloading", updateProgress.Progress)
		return
	}

	// Simulate installation
	for i := 0; i <= 100; i += 20 {
		time.Sleep(1 * time.Second)

		updateMutex.Lock()
		updateProgress.Progress = float64(i)
		updateMutex.Unlock()

		log.Printf("Update progress: %.1f%% downloading", updateProgress.Progress)
	}

	// Perform the actual update
	if err := applyUpdate(updateInfo); err != nil {
		updateMutex.Lock()
		updateProgress.Installing = false
		updateProgress.Error = fmt.Sprintf("Failed to apply update: %v", err)
		updateMutex.Unlock()
		log.Printf("Update progress: %.1f%% downloading", updateProgress.Progress)
		return
	}

	// Mark as completed
	updateMutex.Lock()
	updateProgress.Installing = false
	updateProgress.Completed = true
	updateProgress.Progress = 100
	updateMutex.Unlock()

	log.Printf("Update progress: %.1f%% downloading", updateProgress.Progress)

	// Trigger application restart after a delay
	time.Sleep(2 * time.Second)
	restartApplication()
}

// backupUserData creates a backup of user data
func backupUserData() error {
	backupDir := filepath.Join(os.TempDir(), "trackeep_backup", time.Now().Format("20060102_150405"))

	// Create backup directory
	if err := os.MkdirAll(backupDir, 0755); err != nil {
		return fmt.Errorf("failed to create backup directory: %w", err)
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

// copyFile copies a file from src to dst
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
