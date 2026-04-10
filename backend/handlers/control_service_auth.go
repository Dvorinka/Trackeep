package handlers

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/trackeep/backend/config"
	"github.com/trackeep/backend/models"
	"github.com/trackeep/backend/utils"
	"gorm.io/gorm"
)

const (
	controlServiceFrontendRedirectCookieName = "control_auth_frontend_redirect"
	controlServiceSessionTokenHeader         = "X-Trackeep-Controller-Token"
	controlServiceRequestTimeout             = 30 * time.Second
)

var controlServiceBaseURL = config.ControlServiceURL

type controlServiceTokenValidationResponse struct {
	Token string               `json:"token"`
	User  centralizedOAuthUser `json:"user"`
}

type controlServiceErrorResponse struct {
	Error string `json:"error"`
}

type controlServiceGitHubAppInfo struct {
	AppSlug               string `json:"app_slug"`
	InstallEnabled        bool   `json:"install_enabled"`
	SignInConfigured      bool   `json:"sign_in_configured"`
	CredentialsConfigured bool   `json:"credentials_configured"`
}

type controlServiceInstallationVerification struct {
	Verified       bool   `json:"verified"`
	InstallationID int64  `json:"installation_id"`
	AccountLogin   string `json:"account_login"`
	AccountType    string `json:"account_type"`
	AppSlug        string `json:"app_slug"`
}

type controlServiceAccessTokenPayload struct {
	AccessToken    string `json:"access_token"`
	Source         string `json:"source"`
	InstallationID int64  `json:"installation_id,omitempty"`
	ExpiresAt      string `json:"expires_at,omitempty"`
}

func storeControlServiceAuthFlowState(c *gin.Context, frontendRedirect string) {
	if frontendRedirect == "" {
		setGitHubAuthCookie(c, controlServiceFrontendRedirectCookieName, "", -1)
		return
	}
	setGitHubAuthCookie(c, controlServiceFrontendRedirectCookieName, frontendRedirect, gitHubAuthCookieMaxAgeSeconds)
}

func clearControlServiceAuthFlowState(c *gin.Context) {
	setGitHubAuthCookie(c, controlServiceFrontendRedirectCookieName, "", -1)
}

func getControlServiceFrontendRedirectFromCookie(c *gin.Context) string {
	raw, err := c.Cookie(controlServiceFrontendRedirectCookieName)
	if err != nil {
		return ""
	}
	return normalizeFrontendRedirectURL(raw)
}

func buildControlServiceCallbackURL(r *http.Request) string {
	baseURL := backendPublicBaseURL(r)
	if baseURL == "" {
		return ""
	}
	return strings.TrimRight(baseURL, "/") + "/api/v1/auth/control/callback"
}

func buildGitHubAppInstallCallbackURL(r *http.Request, state string) string {
	baseURL := backendPublicBaseURL(r)
	if baseURL == "" {
		return ""
	}

	callbackURL, err := url.Parse(strings.TrimRight(baseURL, "/") + "/api/v1/github/app/callback")
	if err != nil {
		return ""
	}

	query := callbackURL.Query()
	query.Set("state", state)
	callbackURL.RawQuery = query.Encode()
	return callbackURL.String()
}

func buildControlServiceGitHubStartURL(r *http.Request) (string, error) {
	callbackURL := buildControlServiceCallbackURL(r)
	if callbackURL == "" {
		return "", errors.New("unable to determine local OAuth callback URL")
	}

	parsed, err := url.Parse(strings.TrimRight(controlServiceBaseURL, "/") + "/auth/github")
	if err != nil {
		return "", err
	}

	query := parsed.Query()
	query.Set("redirect_uri", callbackURL)
	parsed.RawQuery = query.Encode()
	return parsed.String(), nil
}

func controlServiceClient() *http.Client {
	return &http.Client{Timeout: controlServiceRequestTimeout}
}

func parseControlServiceError(statusCode int, body []byte) error {
	var payload controlServiceErrorResponse
	if err := json.Unmarshal(body, &payload); err == nil && strings.TrimSpace(payload.Error) != "" {
		return fmt.Errorf("control service returned %d: %s", statusCode, payload.Error)
	}
	message := strings.TrimSpace(string(body))
	if message == "" {
		message = http.StatusText(statusCode)
	}
	return fmt.Errorf("control service returned %d: %s", statusCode, truncateString(message, 220))
}

func validateControlServiceToken(ctx context.Context, token string) (*controlServiceTokenValidationResponse, error) {
	token = strings.TrimSpace(token)
	if token == "" {
		return nil, errors.New("controller token is required")
	}

	payload, err := json.Marshal(map[string]string{"token": token})
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		strings.TrimRight(controlServiceBaseURL, "/")+"/api/v1/auth/control/callback",
		bytes.NewReader(payload),
	)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "Trackeep")

	resp, err := controlServiceClient().Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		return nil, parseControlServiceError(resp.StatusCode, body)
	}

	var parsed controlServiceTokenValidationResponse
	if err := json.Unmarshal(body, &parsed); err != nil {
		return nil, err
	}
	if strings.TrimSpace(parsed.Token) == "" {
		parsed.Token = token
	}
	return &parsed, nil
}

func upsertControlServiceSession(db *gorm.DB, userID uint, controllerUser centralizedOAuthUser, token string) error {
	if db == nil {
		return errors.New("database not available")
	}
	if strings.TrimSpace(token) == "" {
		return errors.New("controller token is required")
	}

	encryptedToken, err := utils.Encrypt(token)
	if err != nil {
		return fmt.Errorf("failed to encrypt controller token: %w", err)
	}

	now := time.Now()
	var existing models.ControlServiceSession
	lookupErr := db.Where("user_id = ?", userID).First(&existing).Error

	switch {
	case errors.Is(lookupErr, gorm.ErrRecordNotFound):
		record := models.ControlServiceSession{
			UserID:           userID,
			ControllerUserID: controllerUser.ID,
			GitHubID:         controllerUser.GitHubID,
			Username:         controllerUser.Username,
			Email:            controllerUser.Email,
			Token:            encryptedToken,
			LastValidatedAt:  &now,
		}
		return db.Create(&record).Error
	case lookupErr != nil:
		return lookupErr
	default:
		return db.Model(&existing).Updates(map[string]interface{}{
			"controller_user_id": controllerUser.ID,
			"github_id":          controllerUser.GitHubID,
			"username":           controllerUser.Username,
			"email":              controllerUser.Email,
			"token":              encryptedToken,
			"last_validated_at":  &now,
		}).Error
	}
}

func getControlServiceSessionRecord(db *gorm.DB, userID uint) (*models.ControlServiceSession, error) {
	var session models.ControlServiceSession
	if err := db.Where("user_id = ?", userID).First(&session).Error; err != nil {
		return nil, err
	}
	return &session, nil
}

func getControlServiceTokenForUser(db *gorm.DB, userID uint) (string, error) {
	session, err := getControlServiceSessionRecord(db, userID)
	if err != nil {
		return "", err
	}
	token, err := utils.Decrypt(session.Token)
	if err != nil {
		return "", fmt.Errorf("failed to decrypt controller token: %w", err)
	}
	token = strings.TrimSpace(token)
	if token == "" {
		return "", errors.New("controller token is empty")
	}
	return token, nil
}

func persistControlServiceToken(db *gorm.DB, userID uint, token string) error {
	token = strings.TrimSpace(token)
	if token == "" {
		return nil
	}

	encryptedToken, err := utils.Encrypt(token)
	if err != nil {
		return fmt.Errorf("failed to encrypt refreshed controller token: %w", err)
	}
	now := time.Now()
	return db.Model(&models.ControlServiceSession{}).
		Where("user_id = ?", userID).
		Updates(map[string]interface{}{
			"token":             encryptedToken,
			"last_validated_at": &now,
		}).Error
}

func performControlServiceRequest(
	ctx context.Context,
	db *gorm.DB,
	userID uint,
	method string,
	path string,
	body io.Reader,
	contentType string,
) ([]byte, http.Header, error) {
	token, err := getControlServiceTokenForUser(db, userID)
	if err != nil {
		return nil, nil, err
	}

	req, err := http.NewRequestWithContext(ctx, method, strings.TrimRight(controlServiceBaseURL, "/")+path, body)
	if err != nil {
		return nil, nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "Trackeep")
	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}

	resp, err := controlServiceClient().Do(req)
	if err != nil {
		return nil, nil, err
	}
	defer resp.Body.Close()

	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, nil, err
	}

	if refreshedToken := strings.TrimSpace(resp.Header.Get(controlServiceSessionTokenHeader)); refreshedToken != "" {
		_ = persistControlServiceToken(db, userID, refreshedToken)
	}

	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		return nil, resp.Header, parseControlServiceError(resp.StatusCode, responseBody)
	}

	return responseBody, resp.Header, nil
}

func fetchControlServiceGitHubRepos(ctx context.Context, db *gorm.DB, userID uint) ([]GitHubRepo, error) {
	body, _, err := performControlServiceRequest(ctx, db, userID, http.MethodGet, "/api/v1/github/repos", nil, "")
	if err != nil {
		return nil, err
	}

	var payload struct {
		Repos []GitHubRepo `json:"repos"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		return nil, err
	}
	return payload.Repos, nil
}

func fetchControlServiceGitHubAppInfo(ctx context.Context, db *gorm.DB, userID uint) (*controlServiceGitHubAppInfo, error) {
	body, _, err := performControlServiceRequest(ctx, db, userID, http.MethodGet, "/api/v1/github/app/info", nil, "")
	if err != nil {
		return nil, err
	}

	var payload controlServiceGitHubAppInfo
	if err := json.Unmarshal(body, &payload); err != nil {
		return nil, err
	}
	return &payload, nil
}

func fetchControlServiceGitHubAppInstallURL(ctx context.Context, db *gorm.DB, userID uint, redirectURL string) (string, error) {
	parsed, err := url.Parse(strings.TrimRight(controlServiceBaseURL, "/") + "/api/v1/github/app/install-url")
	if err != nil {
		return "", err
	}

	query := parsed.Query()
	query.Set("redirect_uri", redirectURL)
	parsed.RawQuery = query.Encode()

	body, _, err := performControlServiceRequest(ctx, db, userID, http.MethodGet, strings.TrimPrefix(parsed.String(), strings.TrimRight(controlServiceBaseURL, "/")), nil, "")
	if err != nil {
		return "", err
	}

	var payload struct {
		InstallURL string `json:"install_url"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		return "", err
	}
	if strings.TrimSpace(payload.InstallURL) == "" {
		return "", errors.New("control service did not return an install URL")
	}
	return payload.InstallURL, nil
}

func verifyControlServiceGitHubInstallation(ctx context.Context, db *gorm.DB, userID uint, installationID int64) (*controlServiceInstallationVerification, error) {
	body, _, err := performControlServiceRequest(
		ctx,
		db,
		userID,
		http.MethodGet,
		fmt.Sprintf("/api/v1/github/app/installations/%d/verify", installationID),
		nil,
		"",
	)
	if err != nil {
		return nil, err
	}

	var payload controlServiceInstallationVerification
	if err := json.Unmarshal(body, &payload); err != nil {
		return nil, err
	}
	if !payload.Verified {
		return nil, errors.New("control service could not verify the GitHub installation")
	}
	return &payload, nil
}

func fetchControlServiceGitHubAppRepos(ctx context.Context, db *gorm.DB, userID uint, installationID int64) ([]GitHubRepo, error) {
	body, _, err := performControlServiceRequest(
		ctx,
		db,
		userID,
		http.MethodGet,
		fmt.Sprintf("/api/v1/github/app/installations/%d/repos", installationID),
		nil,
		"",
	)
	if err != nil {
		return nil, err
	}

	var payload struct {
		Repositories []GitHubRepo `json:"repositories"`
		Repos        []GitHubRepo `json:"repos"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		return nil, err
	}
	if len(payload.Repositories) > 0 {
		return payload.Repositories, nil
	}
	return payload.Repos, nil
}

func fetchControlServiceGitHubUserAccessToken(ctx context.Context, db *gorm.DB, userID uint) (*controlServiceAccessTokenPayload, error) {
	body, _, err := performControlServiceRequest(ctx, db, userID, http.MethodGet, "/api/v1/github/user/access-token", nil, "")
	if err != nil {
		return nil, err
	}

	var payload controlServiceAccessTokenPayload
	if err := json.Unmarshal(body, &payload); err != nil {
		return nil, err
	}
	if strings.TrimSpace(payload.AccessToken) == "" {
		return nil, errors.New("control service returned an empty GitHub user token")
	}
	return &payload, nil
}

func fetchControlServiceGitHubInstallationAccessToken(ctx context.Context, db *gorm.DB, userID uint, installationID int64) (*controlServiceAccessTokenPayload, error) {
	body, _, err := performControlServiceRequest(
		ctx,
		db,
		userID,
		http.MethodGet,
		fmt.Sprintf("/api/v1/github/app/installations/%d/access-token", installationID),
		nil,
		"",
	)
	if err != nil {
		return nil, err
	}

	var payload controlServiceAccessTokenPayload
	if err := json.Unmarshal(body, &payload); err != nil {
		return nil, err
	}
	if strings.TrimSpace(payload.AccessToken) == "" {
		return nil, errors.New("control service returned an empty GitHub installation token")
	}
	return &payload, nil
}

// HandleOAuthCallback exchanges a hq.trackeep.org token for a local Trackeep session.
func HandleOAuthCallback(c *gin.Context) {
	frontendRedirect := getControlServiceFrontendRedirectFromCookie(c)
	clearControlServiceAuthFlowState(c)

	token := strings.TrimSpace(c.Query("token"))
	if token == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Controller token is required"})
		return
	}

	validation, err := validateControlServiceToken(c.Request.Context(), token)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	db := config.GetDB()
	if db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database not available"})
		return
	}

	user, err := upsertCentralizedOAuthUser(db, validation.User)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to synchronize user"})
		return
	}

	if err := upsertControlServiceSession(db, user.ID, validation.User, validation.Token); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to store controller session"})
		return
	}

	localToken, err := GenerateJWT(*user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate Trackeep token"})
		return
	}

	redirectURL := buildFrontendCallbackRedirectURL(frontendRedirect, localToken)
	if redirectURL == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Frontend redirect URL not configured"})
		return
	}

	c.Redirect(http.StatusTemporaryRedirect, redirectURL)
}

func generateRandomString(length int) string {
	bytes := make([]byte, length)
	_, _ = rand.Read(bytes)
	return hex.EncodeToString(bytes)
}
