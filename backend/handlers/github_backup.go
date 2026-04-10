package handlers

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/trackeep/backend/config"
	"github.com/trackeep/backend/models"
	"gorm.io/gorm"
)

var githubRepoFullNamePattern = regexp.MustCompile(`^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$`)

type gitHubInstallationReposResponse struct {
	Repositories []GitHubRepo `json:"repositories"`
}

type gitHubAppInstallationDetails struct {
	ID      int64 `json:"id"`
	Account struct {
		Login string `json:"login"`
		Type  string `json:"type"`
	} `json:"account"`
}

type gitHubInstallationTokenResponse struct {
	Token     string `json:"token"`
	ExpiresAt string `json:"expires_at"`
}

type gitHubBackupRequest struct {
	Repositories []string `json:"repositories"`
	Source       string   `json:"source"`
}

type gitHubBackupResult struct {
	Repository string `json:"repository"`
	Status     string `json:"status"`
	LocalPath  string `json:"local_path"`
	Source     string `json:"source"`
	SizeBytes  int64  `json:"size_bytes,omitempty"`
	Error      string `json:"error,omitempty"`
}

// GetGitHubAppStatus returns install/configuration status for GitHub App integration.
func GetGitHubAppStatus(c *gin.Context) {
	userID := getGitHubRequestUserID(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	db := config.GetDB()
	response := gin.H{
		"app_slug":               getGitHubAppSlug(),
		"install_enabled":        isGitHubAppInstallEnabled(),
		"sign_in_configured":     hasGitHubUserAuthConfig(),
		"credentials_configured": hasGitHubAppCredentials(),
		"installed":              false,
	}

	if db == nil {
		c.JSON(http.StatusOK, response)
		return
	}

	if _, err := getControlServiceSessionRecord(db, userID); err == nil {
		if info, infoErr := fetchControlServiceGitHubAppInfo(c.Request.Context(), db, userID); infoErr == nil && info != nil {
			response["app_slug"] = info.AppSlug
			response["install_enabled"] = info.InstallEnabled
			response["sign_in_configured"] = info.SignInConfigured
			response["credentials_configured"] = info.CredentialsConfigured
		} else {
			response["sign_in_configured"] = true
			response["credentials_configured"] = true
		}
	}

	installation, err := getUserGitHubInstallation(db, userID)
	if err == nil {
		response["installed"] = true
		response["installation"] = installation
	}

	c.JSON(http.StatusOK, response)
}

// GetGitHubAppInstallURL creates a one-time state and returns an install URL for the configured GitHub App.
func GetGitHubAppInstallURL(c *gin.Context) {
	userID := getGitHubRequestUserID(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	db := config.GetDB()
	if db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database not available"})
		return
	}

	state := generateRandomString(24)
	expiresAt := time.Now().Add(15 * time.Minute)
	stateRecord := models.GitHubAppInstallState{
		UserID:    userID,
		State:     state,
		ExpiresAt: expiresAt,
	}
	if err := db.Create(&stateRecord).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create install state"})
		return
	}

	if _, err := getControlServiceSessionRecord(db, userID); err == nil {
		callbackURL := buildGitHubAppInstallCallbackURL(c.Request, state)
		if callbackURL == "" {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Unable to determine local install callback URL"})
			return
		}

		installURL, err := fetchControlServiceGitHubAppInstallURL(c.Request.Context(), db, userID, callbackURL)
		if err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": "Failed to create unified GitHub App install URL: " + err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"install_url": installURL,
			"expires_at":  expiresAt,
		})
		return
	}

	if !isGitHubAppInstallEnabled() {
		c.JSON(http.StatusBadRequest, gin.H{"error": "GitHub App slug is not configured"})
		return
	}
	if _, _, err := getGitHubUserAccessTokenForUser(c.Request.Context(), db, userID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Sign in with GitHub before installing the GitHub App"})
		return
	}

	installURL := fmt.Sprintf(
		"https://github.com/apps/%s/installations/new?state=%s",
		url.PathEscape(getGitHubAppSlug()),
		url.QueryEscape(state),
	)

	c.JSON(http.StatusOK, gin.H{
		"install_url": installURL,
		"expires_at":  expiresAt,
	})
}

// GitHubAppInstallCallback handles GitHub App setup callback and links installation to a Trackeep user.
func GitHubAppInstallCallback(c *gin.Context) {
	state := strings.TrimSpace(c.Query("state"))
	installationRaw := strings.TrimSpace(c.Query("installation_id"))
	setupAction := strings.TrimSpace(c.Query("setup_action"))

	if state == "" || installationRaw == "" {
		redirectToGitHubIntegrationPage(c, false, 0, setupAction, "missing_state_or_installation")
		return
	}

	installationID, err := strconv.ParseInt(installationRaw, 10, 64)
	if err != nil || installationID <= 0 {
		redirectToGitHubIntegrationPage(c, false, 0, setupAction, "invalid_installation_id")
		return
	}

	db := config.GetDB()
	if db == nil {
		redirectToGitHubIntegrationPage(c, false, installationID, setupAction, "database_unavailable")
		return
	}

	var stateRecord models.GitHubAppInstallState
	if err := db.Where("state = ?", state).First(&stateRecord).Error; err != nil {
		redirectToGitHubIntegrationPage(c, false, installationID, setupAction, "invalid_state")
		return
	}

	if stateRecord.UsedAt != nil {
		redirectToGitHubIntegrationPage(c, false, installationID, setupAction, "state_already_used")
		return
	}
	if time.Now().After(stateRecord.ExpiresAt) {
		redirectToGitHubIntegrationPage(c, false, installationID, setupAction, "state_expired")
		return
	}

	accountLogin := ""
	accountType := ""
	lastValidated := (*time.Time)(nil)
	if _, err := getControlServiceSessionRecord(db, stateRecord.UserID); err == nil {
		verification, verifyErr := verifyControlServiceGitHubInstallation(c.Request.Context(), db, stateRecord.UserID, installationID)
		if verifyErr != nil {
			redirectToGitHubIntegrationPage(c, false, installationID, setupAction, "installation_not_accessible")
			return
		}
		accountLogin = verification.AccountLogin
		accountType = verification.AccountType
		if verification.AppSlug != "" {
			lastValidatedNow := time.Now()
			lastValidated = &lastValidatedNow
		}
	} else {
		if err := verifyGitHubInstallationAccessForUser(c.Request.Context(), db, stateRecord.UserID, installationID); err != nil {
			redirectToGitHubIntegrationPage(c, false, installationID, setupAction, "installation_not_accessible")
			return
		}

		if hasGitHubAppCredentials() {
			details, detailsErr := fetchGitHubAppInstallationDetails(c.Request.Context(), installationID)
			if detailsErr == nil && details != nil {
				accountLogin = details.Account.Login
				accountType = details.Account.Type
				now := time.Now()
				lastValidated = &now
			}
		}
	}

	var installation models.GitHubAppInstallation
	lookupErr := db.Where("installation_id = ?", installationID).First(&installation).Error
	switch {
	case errors.Is(lookupErr, gorm.ErrRecordNotFound):
		appSlug := getGitHubAppSlug()
		if accountLogin == "" && accountType == "" {
			if info, infoErr := fetchControlServiceGitHubAppInfo(c.Request.Context(), db, stateRecord.UserID); infoErr == nil && info != nil && info.AppSlug != "" {
				appSlug = info.AppSlug
			}
		}
		installation = models.GitHubAppInstallation{
			UserID:         stateRecord.UserID,
			InstallationID: installationID,
			AppSlug:        appSlug,
			AccountLogin:   accountLogin,
			AccountType:    accountType,
			LastValidated:  lastValidated,
		}
		if err := db.Create(&installation).Error; err != nil {
			redirectToGitHubIntegrationPage(c, false, installationID, setupAction, "failed_to_store_installation")
			return
		}
	case lookupErr != nil:
		redirectToGitHubIntegrationPage(c, false, installationID, setupAction, "installation_lookup_failed")
		return
	default:
		appSlug := getGitHubAppSlug()
		if info, infoErr := fetchControlServiceGitHubAppInfo(c.Request.Context(), db, stateRecord.UserID); infoErr == nil && info != nil && info.AppSlug != "" {
			appSlug = info.AppSlug
		}
		updates := map[string]interface{}{
			"user_id":       stateRecord.UserID,
			"app_slug":      appSlug,
			"account_login": accountLogin,
			"account_type":  accountType,
		}
		if lastValidated != nil {
			updates["last_validated"] = lastValidated
		}
		if err := db.Model(&installation).Updates(updates).Error; err != nil {
			redirectToGitHubIntegrationPage(c, false, installationID, setupAction, "failed_to_update_installation")
			return
		}
	}

	usedAt := time.Now()
	if err := db.Model(&stateRecord).Update("used_at", usedAt).Error; err != nil {
		redirectToGitHubIntegrationPage(c, false, installationID, setupAction, "failed_to_finalize_state")
		return
	}

	redirectToGitHubIntegrationPage(c, true, installationID, setupAction, "")
}

// GetGitHubAppRepos returns repositories available through the user's GitHub App installation.
func GetGitHubAppRepos(c *gin.Context) {
	userID := getGitHubRequestUserID(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	db := config.GetDB()
	if db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database not available"})
		return
	}

	installation, err := getUserGitHubInstallation(db, userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "GitHub App is not installed for this user"})
		return
	}

	if _, err := getControlServiceSessionRecord(db, userID); err == nil {
		repos, fetchErr := fetchControlServiceGitHubAppRepos(c.Request.Context(), db, userID, installation.InstallationID)
		if fetchErr != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": "Failed to fetch installation repos from control service: " + fetchErr.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"source":          "github_app",
			"installation_id": installation.InstallationID,
			"repos":           repos,
		})
		return
	}

	accessToken, _, err := createGitHubInstallationAccessToken(c.Request.Context(), installation.InstallationID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to create GitHub App installation token: " + err.Error()})
		return
	}

	repos, err := fetchGitHubInstallationRepos(accessToken)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch installation repos: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"source":          "github_app",
		"installation_id": installation.InstallationID,
		"repos":           repos,
	})
}

// GetGitHubBackups lists local GitHub repository backups for the authenticated user.
func GetGitHubBackups(c *gin.Context) {
	userID := getGitHubRequestUserID(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	db := config.GetDB()
	if db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database not available"})
		return
	}

	var backups []models.GitHubRepoBackup
	if err := db.Where("user_id = ?", userID).Order("updated_at DESC").Find(&backups).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch repository backups"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"backup_root": getGitHubBackupRoot(),
		"backups":     backups,
	})
}

// BackupGitHubRepositories clones or updates selected repositories in local mirror storage.
func BackupGitHubRepositories(c *gin.Context) {
	userID := getGitHubRequestUserID(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	db := config.GetDB()
	if db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database not available"})
		return
	}

	var req gitHubBackupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}
	if len(req.Repositories) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "At least one repository must be provided"})
		return
	}

	accessToken, source, installationID, err := resolveGitHubBackupToken(c, db, userID, req.Source)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := os.MkdirAll(getGitHubBackupRoot(), 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to prepare backup directory"})
		return
	}

	knownRepos := make(map[string]GitHubRepo)
	switch source {
	case "github_user":
		repos, reposErr := fetchGitHubRepos(accessToken)
		if reposErr == nil {
			for _, repo := range repos {
				knownRepos[strings.ToLower(repo.FullName)] = repo
			}
		}
	case "github_app":
		repos, reposErr := fetchGitHubInstallationRepos(accessToken)
		if reposErr == nil {
			for _, repo := range repos {
				knownRepos[strings.ToLower(repo.FullName)] = repo
			}
		}
	}

	results := make([]gitHubBackupResult, 0, len(req.Repositories))
	successCount := 0
	failedCount := 0

	seen := make(map[string]struct{})
	for _, rawRepo := range req.Repositories {
		repoFullName, normalizeErr := normalizeGitHubRepoFullName(rawRepo)
		if normalizeErr != nil {
			failedCount++
			results = append(results, gitHubBackupResult{
				Repository: strings.TrimSpace(rawRepo),
				Status:     "error",
				Source:     source,
				Error:      normalizeErr.Error(),
			})
			continue
		}
		if _, exists := seen[repoFullName]; exists {
			continue
		}
		seen[repoFullName] = struct{}{}

		repoInfo, hasInfo := knownRepos[strings.ToLower(repoFullName)]
		if !hasInfo {
			repoDetails, fetchErr := fetchGitHubRepoByFullName(accessToken, repoFullName)
			if fetchErr == nil && repoDetails != nil {
				repoInfo = *repoDetails
			}
		}
		if repoInfo.FullName == "" {
			repoInfo.FullName = repoFullName
			parts := strings.SplitN(repoFullName, "/", 2)
			if len(parts) == 2 {
				repoInfo.Name = parts[1]
			}
			repoInfo.CloneURL = fmt.Sprintf("https://github.com/%s.git", repoFullName)
		}

		localPath := buildGitHubBackupPath(userID, repoFullName)

		repoCtx, cancel := context.WithTimeout(c.Request.Context(), getGitHubBackupTimeout())
		sizeBytes, backupErr := backupGitHubRepositoryMirror(repoCtx, accessToken, repoFullName, localPath)
		cancel()

		result := gitHubBackupResult{
			Repository: repoFullName,
			LocalPath:  localPath,
			Source:     source,
		}

		now := time.Now()
		record := models.GitHubRepoBackup{
			UserID:             userID,
			RepositoryID:       int64(repoInfo.ID),
			RepositoryName:     repoInfo.Name,
			RepositoryFullName: repoFullName,
			DefaultBranch:      repoInfo.DefaultBranch,
			CloneURL:           repoInfo.CloneURL,
			LocalPath:          localPath,
			Source:             source,
			InstallationID:     installationID,
			LastBackupAt:       &now,
		}

		if backupErr != nil {
			failedCount++
			result.Status = "error"
			result.Error = backupErr.Error()
			record.LastBackupStatus = "error"
			record.LastBackupError = backupErr.Error()
			record.LastBackupSize = 0
		} else {
			successCount++
			result.Status = "success"
			result.SizeBytes = sizeBytes
			record.LastBackupStatus = "success"
			record.LastBackupError = ""
			record.LastBackupSize = sizeBytes
		}

		if upsertErr := upsertGitHubBackupRecord(db, record); upsertErr != nil {
			if result.Status == "success" {
				result.Status = "error"
				result.Error = "backup persisted but metadata update failed: " + upsertErr.Error()
				successCount--
				failedCount++
			}
		}

		results = append(results, result)
	}

	c.JSON(http.StatusOK, gin.H{
		"source":          source,
		"installation_id": installationID,
		"backed_up":       successCount,
		"failed":          failedCount,
		"results":         results,
	})
}

func getGitHubRequestUserID(c *gin.Context) uint {
	userID := c.GetUint("user_id")
	if userID == 0 {
		userID = c.GetUint("userID")
	}
	return userID
}

func getUserGitHubInstallation(db *gorm.DB, userID uint) (*models.GitHubAppInstallation, error) {
	var installation models.GitHubAppInstallation
	if err := db.Where("user_id = ?", userID).Order("updated_at DESC").First(&installation).Error; err != nil {
		return nil, err
	}
	return &installation, nil
}

func resolveGitHubBackupToken(c *gin.Context, db *gorm.DB, userID uint, requestedSource string) (string, string, *int64, error) {
	if _, err := getControlServiceSessionRecord(db, userID); err == nil {
		if token, source, installationID, brokerErr := resolveCentralizedGitHubBackupToken(c.Request.Context(), db, userID, requestedSource); brokerErr == nil {
			return token, source, installationID, nil
		} else if strings.TrimSpace(requestedSource) != "" {
			return "", "", nil, brokerErr
		}
	}

	source := strings.ToLower(strings.TrimSpace(requestedSource))
	switch source {
	case "", "oauth", "github_user", "user":
		accessToken, _, err := getGitHubUserAccessTokenForUser(c.Request.Context(), db, userID)
		if err == nil {
			return accessToken, "github_user", nil, nil
		}
		if source != "" {
			return "", "", nil, err
		}

		accessToken, installationID, appErr := getGitHubAppAccessTokenForUser(c.Request.Context(), db, userID)
		if appErr == nil {
			return accessToken, "github_app", &installationID, nil
		}
		return "", "", nil, fmt.Errorf("no usable GitHub sign-in token and GitHub App fallback failed")
	case "github_app", "app":
		accessToken, installationID, err := getGitHubAppAccessTokenForUser(c.Request.Context(), db, userID)
		if err != nil {
			return "", "", nil, err
		}
		return accessToken, "github_app", &installationID, nil
	default:
		return "", "", nil, fmt.Errorf("unsupported source '%s'", requestedSource)
	}
}

func resolveCentralizedGitHubBackupToken(ctx context.Context, db *gorm.DB, userID uint, requestedSource string) (string, string, *int64, error) {
	source := strings.ToLower(strings.TrimSpace(requestedSource))
	switch source {
	case "", "oauth", "github_user", "user":
		accessToken, err := fetchControlServiceGitHubUserAccessToken(ctx, db, userID)
		if err == nil {
			return accessToken.AccessToken, "github_user", nil, nil
		}
		if source != "" {
			return "", "", nil, err
		}

		installation, installErr := getUserGitHubInstallation(db, userID)
		if installErr != nil {
			return "", "", nil, fmt.Errorf("no usable GitHub sign-in token and GitHub App fallback failed")
		}
		appToken, appErr := fetchControlServiceGitHubInstallationAccessToken(ctx, db, userID, installation.InstallationID)
		if appErr != nil {
			return "", "", nil, fmt.Errorf("no usable GitHub sign-in token and GitHub App fallback failed")
		}
		return appToken.AccessToken, "github_app", &installation.InstallationID, nil
	case "github_app", "app":
		installation, err := getUserGitHubInstallation(db, userID)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return "", "", nil, errors.New("GitHub App not installed for this user")
			}
			return "", "", nil, err
		}

		appToken, err := fetchControlServiceGitHubInstallationAccessToken(ctx, db, userID, installation.InstallationID)
		if err != nil {
			return "", "", nil, err
		}
		return appToken.AccessToken, "github_app", &installation.InstallationID, nil
	default:
		return "", "", nil, fmt.Errorf("unsupported source '%s'", requestedSource)
	}
}

func getGitHubAppAccessTokenForUser(ctx context.Context, db *gorm.DB, userID uint) (string, int64, error) {
	installation, err := getUserGitHubInstallation(db, userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", 0, errors.New("GitHub App not installed for this user")
		}
		return "", 0, err
	}

	accessToken, _, err := createGitHubInstallationAccessToken(ctx, installation.InstallationID)
	if err != nil {
		return "", 0, err
	}

	return accessToken, installation.InstallationID, nil
}

func upsertGitHubBackupRecord(db *gorm.DB, record models.GitHubRepoBackup) error {
	var existing models.GitHubRepoBackup
	err := db.Where("user_id = ? AND repository_full_name = ?", record.UserID, record.RepositoryFullName).First(&existing).Error
	switch {
	case errors.Is(err, gorm.ErrRecordNotFound):
		return db.Create(&record).Error
	case err != nil:
		return err
	default:
		updates := map[string]interface{}{
			"repository_id":      record.RepositoryID,
			"repository_name":    record.RepositoryName,
			"default_branch":     record.DefaultBranch,
			"clone_url":          record.CloneURL,
			"local_path":         record.LocalPath,
			"source":             record.Source,
			"installation_id":    record.InstallationID,
			"last_backup_at":     record.LastBackupAt,
			"last_backup_status": record.LastBackupStatus,
			"last_backup_error":  record.LastBackupError,
			"last_backup_size":   record.LastBackupSize,
		}
		return db.Model(&existing).Updates(updates).Error
	}
}

func normalizeGitHubRepoFullName(raw string) (string, error) {
	normalized := strings.TrimSpace(raw)
	normalized = strings.TrimSuffix(normalized, ".git")
	normalized = strings.TrimPrefix(normalized, "https://github.com/")
	normalized = strings.TrimPrefix(normalized, "http://github.com/")
	normalized = strings.TrimPrefix(normalized, "github.com/")
	normalized = strings.Trim(normalized, "/")
	if !githubRepoFullNamePattern.MatchString(normalized) {
		return "", fmt.Errorf("invalid repository '%s', expected owner/repo", raw)
	}
	return normalized, nil
}

func buildGitHubBackupPath(userID uint, repoFullName string) string {
	parts := strings.SplitN(repoFullName, "/", 2)
	owner := "unknown"
	repo := repoFullName
	if len(parts) == 2 {
		owner = parts[0]
		repo = parts[1]
	}
	return filepath.Join(getGitHubBackupRoot(), fmt.Sprintf("user-%d", userID), owner, repo+".git")
}

func getGitHubBackupRoot() string {
	root := strings.TrimSpace(os.Getenv("GITHUB_BACKUP_ROOT"))
	if root == "" {
		root = filepath.Join("data", "github-backups")
	}
	absolutePath, err := filepath.Abs(root)
	if err != nil {
		return root
	}
	return absolutePath
}

func getGitHubBackupTimeout() time.Duration {
	timeoutRaw := strings.TrimSpace(os.Getenv("GITHUB_BACKUP_TIMEOUT"))
	if timeoutRaw == "" {
		return 10 * time.Minute
	}
	parsed, err := time.ParseDuration(timeoutRaw)
	if err != nil || parsed <= 0 {
		return 10 * time.Minute
	}
	return parsed
}

func backupGitHubRepositoryMirror(ctx context.Context, accessToken, repoFullName, localPath string) (int64, error) {
	if err := os.MkdirAll(filepath.Dir(localPath), 0755); err != nil {
		return 0, fmt.Errorf("failed to create backup parent directory: %w", err)
	}

	repoURL := fmt.Sprintf("https://github.com/%s.git", repoFullName)
	gitAuthHeader := "http.extraHeader=Authorization: Bearer " + accessToken
	cloneRequired := true

	if info, err := os.Stat(localPath); err == nil {
		if !info.IsDir() {
			return 0, fmt.Errorf("backup path exists and is not a directory: %s", localPath)
		}
		if _, configErr := os.Stat(filepath.Join(localPath, "config")); configErr == nil {
			cloneRequired = false
		} else if errors.Is(configErr, os.ErrNotExist) {
			if removeErr := os.RemoveAll(localPath); removeErr != nil {
				return 0, fmt.Errorf("failed to reset invalid backup directory: %w", removeErr)
			}
		} else {
			return 0, fmt.Errorf("failed to inspect existing backup directory: %w", configErr)
		}
	} else if !errors.Is(err, os.ErrNotExist) {
		return 0, fmt.Errorf("failed to access backup path: %w", err)
	}

	var cmd *exec.Cmd
	if cloneRequired {
		cmd = exec.CommandContext(ctx, "git", "-c", gitAuthHeader, "clone", "--mirror", repoURL, localPath)
	} else {
		cmd = exec.CommandContext(ctx, "git", "-C", localPath, "-c", gitAuthHeader, "remote", "update", "--prune")
	}

	output, err := cmd.CombinedOutput()
	if err != nil {
		commandOutput := strings.TrimSpace(string(output))
		if commandOutput == "" {
			commandOutput = err.Error()
		}
		return 0, fmt.Errorf("git backup failed: %s", commandOutput)
	}

	sizeBytes, err := calculateDirectorySize(localPath)
	if err != nil {
		return 0, fmt.Errorf("backup completed but failed to calculate size: %w", err)
	}

	return sizeBytes, nil
}

func calculateDirectorySize(root string) (int64, error) {
	var totalSize int64
	err := filepath.WalkDir(root, func(path string, d fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if d.IsDir() {
			return nil
		}
		info, err := d.Info()
		if err != nil {
			return err
		}
		totalSize += info.Size()
		return nil
	})
	if err != nil {
		return 0, err
	}
	return totalSize, nil
}

func fetchGitHubInstallationRepos(accessToken string) ([]GitHubRepo, error) {
	req, err := http.NewRequest("GET", "https://api.github.com/installation/repositories?per_page=100", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")
	req.Header.Set("User-Agent", "Trackeep")

	client := &http.Client{Timeout: 30 * time.Second}
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
		return nil, fmt.Errorf("GitHub API returned %d: %s", resp.StatusCode, truncateString(string(body), 220))
	}

	var response gitHubInstallationReposResponse
	if err := json.Unmarshal(body, &response); err != nil {
		return nil, err
	}
	return response.Repositories, nil
}

func fetchGitHubRepoByFullName(accessToken, repoFullName string) (*GitHubRepo, error) {
	parts := strings.SplitN(repoFullName, "/", 2)
	if len(parts) != 2 {
		return nil, errors.New("invalid repository full name")
	}
	repoURL := fmt.Sprintf(
		"https://api.github.com/repos/%s/%s",
		url.PathEscape(parts[0]),
		url.PathEscape(parts[1]),
	)

	req, err := http.NewRequest("GET", repoURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")
	req.Header.Set("User-Agent", "Trackeep")

	client := &http.Client{Timeout: 30 * time.Second}
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
		return nil, fmt.Errorf("GitHub API returned %d: %s", resp.StatusCode, truncateString(string(body), 220))
	}

	var repo GitHubRepo
	if err := json.Unmarshal(body, &repo); err != nil {
		return nil, err
	}
	return &repo, nil
}

func isGitHubAppInstallEnabled() bool {
	return getGitHubAppSlug() != ""
}

func hasGitHubAppCredentials() bool {
	return strings.TrimSpace(os.Getenv("GITHUB_APP_ID")) != "" &&
		strings.TrimSpace(os.Getenv("GITHUB_APP_PRIVATE_KEY")) != ""
}

func getGitHubAppSlug() string {
	return strings.TrimSpace(os.Getenv("GITHUB_APP_SLUG"))
}

func createGitHubInstallationAccessToken(ctx context.Context, installationID int64) (string, time.Time, error) {
	if !hasGitHubAppCredentials() {
		return "", time.Time{}, errors.New("GitHub App credentials are not fully configured")
	}

	appJWT, err := createGitHubAppJWT()
	if err != nil {
		return "", time.Time{}, err
	}

	endpoint := fmt.Sprintf("https://api.github.com/app/installations/%d/access_tokens", installationID)
	req, err := http.NewRequestWithContext(ctx, "POST", endpoint, nil)
	if err != nil {
		return "", time.Time{}, err
	}
	req.Header.Set("Authorization", "Bearer "+appJWT)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")
	req.Header.Set("User-Agent", "Trackeep")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", time.Time{}, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", time.Time{}, err
	}
	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		return "", time.Time{}, fmt.Errorf("GitHub token endpoint returned %d: %s", resp.StatusCode, truncateString(string(body), 220))
	}

	var payload gitHubInstallationTokenResponse
	if err := json.Unmarshal(body, &payload); err != nil {
		return "", time.Time{}, err
	}
	if strings.TrimSpace(payload.Token) == "" {
		return "", time.Time{}, errors.New("GitHub returned an empty installation token")
	}

	var expiresAt time.Time
	if payload.ExpiresAt != "" {
		parsed, parseErr := time.Parse(time.RFC3339, payload.ExpiresAt)
		if parseErr == nil {
			expiresAt = parsed
		}
	}

	return payload.Token, expiresAt, nil
}

func fetchGitHubAppInstallationDetails(ctx context.Context, installationID int64) (*gitHubAppInstallationDetails, error) {
	if !hasGitHubAppCredentials() {
		return nil, errors.New("GitHub App credentials are not configured")
	}

	appJWT, err := createGitHubAppJWT()
	if err != nil {
		return nil, err
	}

	endpoint := fmt.Sprintf("https://api.github.com/app/installations/%d", installationID)
	req, err := http.NewRequestWithContext(ctx, "GET", endpoint, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+appJWT)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")
	req.Header.Set("User-Agent", "Trackeep")

	client := &http.Client{Timeout: 30 * time.Second}
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
		return nil, fmt.Errorf("GitHub installation endpoint returned %d: %s", resp.StatusCode, truncateString(string(body), 220))
	}

	var details gitHubAppInstallationDetails
	if err := json.Unmarshal(body, &details); err != nil {
		return nil, err
	}
	return &details, nil
}

func createGitHubAppJWT() (string, error) {
	appID := strings.TrimSpace(os.Getenv("GITHUB_APP_ID"))
	if appID == "" {
		return "", errors.New("GITHUB_APP_ID is not configured")
	}

	privateKeyPEM, err := loadGitHubAppPrivateKey()
	if err != nil {
		return "", err
	}

	privateKey, err := jwt.ParseRSAPrivateKeyFromPEM(privateKeyPEM)
	if err != nil {
		return "", fmt.Errorf("failed to parse GitHub App private key: %w", err)
	}

	now := time.Now()
	claims := jwt.RegisteredClaims{
		Issuer:    appID,
		IssuedAt:  jwt.NewNumericDate(now.Add(-1 * time.Minute)),
		ExpiresAt: jwt.NewNumericDate(now.Add(9 * time.Minute)),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	signedToken, err := token.SignedString(privateKey)
	if err != nil {
		return "", fmt.Errorf("failed to sign GitHub App JWT: %w", err)
	}
	return signedToken, nil
}

func loadGitHubAppPrivateKey() ([]byte, error) {
	raw := strings.TrimSpace(os.Getenv("GITHUB_APP_PRIVATE_KEY"))
	if raw == "" {
		return nil, errors.New("GITHUB_APP_PRIVATE_KEY is not configured")
	}

	normalized := strings.ReplaceAll(raw, "\\n", "\n")
	if strings.Contains(normalized, "BEGIN ") {
		return []byte(normalized), nil
	}

	decoded, err := base64.StdEncoding.DecodeString(normalized)
	if err != nil {
		return nil, errors.New("GITHUB_APP_PRIVATE_KEY is neither PEM nor base64-encoded PEM")
	}
	return decoded, nil
}

func redirectToGitHubIntegrationPage(c *gin.Context, success bool, installationID int64, setupAction, errorCode string) {
	frontendURL := strings.TrimSpace(os.Getenv("FRONTEND_URL"))
	if frontendURL == "" {
		frontendURL = "http://localhost:3000"
	}
	frontendURL = strings.TrimRight(frontendURL, "/")

	params := url.Values{}
	if success {
		params.Set("github_app_installed", "1")
		params.Set("installation_id", strconv.FormatInt(installationID, 10))
		if setupAction != "" {
			params.Set("setup_action", setupAction)
		}
	} else {
		params.Set("github_app_error", errorCode)
		if installationID > 0 {
			params.Set("installation_id", strconv.FormatInt(installationID, 10))
		}
	}

	redirectURL := fmt.Sprintf("%s/app/github?%s", frontendURL, params.Encode())
	c.Redirect(http.StatusTemporaryRedirect, redirectURL)
}

func truncateString(value string, limit int) string {
	if len(value) <= limit {
		return value
	}
	if limit < 4 {
		return value[:limit]
	}
	return value[:limit-3] + "..."
}
