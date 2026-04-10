package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/trackeep/backend/models"
	"github.com/trackeep/backend/utils"
	"gorm.io/gorm"
)

var (
	gitHubAuthorizeURL = "https://github.com/login/oauth/authorize"
	gitHubTokenURL     = "https://github.com/login/oauth/access_token"
	gitHubAPIBaseURL   = "https://api.github.com"
)

const (
	gitHubAuthStateCookieName            = "github_auth_state"
	gitHubAuthFrontendRedirectCookieName = "github_auth_frontend_redirect"
	gitHubAuthCookieMaxAgeSeconds        = 600
	gitHubTokenRefreshSkew               = 2 * time.Minute
)

type gitHubUserTokenResponse struct {
	AccessToken           string `json:"access_token"`
	TokenType             string `json:"token_type"`
	Scope                 string `json:"scope"`
	RefreshToken          string `json:"refresh_token"`
	ExpiresIn             int64  `json:"expires_in"`
	RefreshTokenExpiresIn int64  `json:"refresh_token_expires_in"`
	Error                 string `json:"error"`
	ErrorDescription      string `json:"error_description"`
	ErrorURI              string `json:"error_uri"`
}

type gitHubUserEmail struct {
	Email    string `json:"email"`
	Primary  bool   `json:"primary"`
	Verified bool   `json:"verified"`
}

type gitHubUserInstallationsResponse struct {
	Installations []struct {
		ID int64 `json:"id"`
	} `json:"installations"`
}

func getGitHubAppClientID() string {
	return strings.TrimSpace(os.Getenv("GITHUB_APP_CLIENT_ID"))
}

func getGitHubAppClientSecret() string {
	return strings.TrimSpace(os.Getenv("GITHUB_APP_CLIENT_SECRET"))
}

func hasGitHubUserAuthConfig() bool {
	return getGitHubAppClientID() != "" && getGitHubAppClientSecret() != ""
}

func isSecureRequest(r *http.Request) bool {
	if strings.EqualFold(headerValue(r.Header, "X-Forwarded-Proto"), "https") {
		return true
	}
	return r.TLS != nil
}

func setGitHubAuthCookie(c *gin.Context, name, value string, maxAge int) {
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(name, value, maxAge, "/", "", isSecureRequest(c.Request), true)
}

func storeGitHubAuthFlowState(c *gin.Context, state, frontendRedirect string) {
	setGitHubAuthCookie(c, gitHubAuthStateCookieName, state, gitHubAuthCookieMaxAgeSeconds)
	if frontendRedirect != "" {
		setGitHubAuthCookie(c, gitHubAuthFrontendRedirectCookieName, frontendRedirect, gitHubAuthCookieMaxAgeSeconds)
		return
	}
	setGitHubAuthCookie(c, gitHubAuthFrontendRedirectCookieName, "", -1)
}

func clearGitHubAuthFlowState(c *gin.Context) {
	setGitHubAuthCookie(c, gitHubAuthStateCookieName, "", -1)
	setGitHubAuthCookie(c, gitHubAuthFrontendRedirectCookieName, "", -1)
}

func getGitHubFrontendRedirectFromCookie(c *gin.Context) string {
	raw, err := c.Cookie(gitHubAuthFrontendRedirectCookieName)
	if err != nil {
		return ""
	}
	return normalizeFrontendRedirectURL(raw)
}

func postGitHubTokenRequest(ctx context.Context, form url.Values) (*gitHubUserTokenResponse, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, gitHubTokenURL, strings.NewReader(form.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
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
		return nil, fmt.Errorf("GitHub token endpoint returned %d: %s", resp.StatusCode, truncateString(string(body), 220))
	}

	var payload gitHubUserTokenResponse
	if err := json.Unmarshal(body, &payload); err != nil {
		return nil, err
	}
	if payload.Error != "" {
		message := payload.ErrorDescription
		if message == "" {
			message = payload.Error
		}
		return nil, fmt.Errorf("GitHub token exchange failed: %s", message)
	}
	if strings.TrimSpace(payload.AccessToken) == "" {
		return nil, errors.New("GitHub returned an empty access token")
	}

	return &payload, nil
}

func exchangeGitHubAuthorizationCode(ctx context.Context, code, redirectURL string) (*gitHubUserTokenResponse, error) {
	if strings.TrimSpace(code) == "" {
		return nil, errors.New("missing GitHub authorization code")
	}
	if !hasGitHubUserAuthConfig() {
		return nil, errors.New("GitHub App sign-in is not configured")
	}

	form := url.Values{}
	form.Set("client_id", getGitHubAppClientID())
	form.Set("client_secret", getGitHubAppClientSecret())
	form.Set("code", code)
	if redirectURL != "" {
		form.Set("redirect_uri", redirectURL)
	}

	return postGitHubTokenRequest(ctx, form)
}

func refreshGitHubUserAccessToken(ctx context.Context, refreshToken string) (*gitHubUserTokenResponse, error) {
	if strings.TrimSpace(refreshToken) == "" {
		return nil, errors.New("missing GitHub refresh token")
	}
	if !hasGitHubUserAuthConfig() {
		return nil, errors.New("GitHub App sign-in is not configured")
	}

	form := url.Values{}
	form.Set("client_id", getGitHubAppClientID())
	form.Set("client_secret", getGitHubAppClientSecret())
	form.Set("grant_type", "refresh_token")
	form.Set("refresh_token", refreshToken)

	return postGitHubTokenRequest(ctx, form)
}

func tokenExpiryFromSeconds(seconds int64) *time.Time {
	if seconds <= 0 {
		return nil
	}
	expiresAt := time.Now().Add(time.Duration(seconds) * time.Second)
	return &expiresAt
}

func upsertGitHubUserAuth(db *gorm.DB, userID uint, gitHubUser *GitHubUser, tokenResponse *gitHubUserTokenResponse) error {
	if db == nil {
		return errors.New("database not available")
	}
	if gitHubUser == nil {
		return errors.New("GitHub user is required")
	}
	if tokenResponse == nil || strings.TrimSpace(tokenResponse.AccessToken) == "" {
		return errors.New("GitHub access token is required")
	}

	encryptedAccessToken, err := utils.Encrypt(tokenResponse.AccessToken)
	if err != nil {
		return fmt.Errorf("failed to encrypt GitHub access token: %w", err)
	}

	encryptedRefreshToken := ""
	if strings.TrimSpace(tokenResponse.RefreshToken) != "" {
		encryptedRefreshToken, err = utils.Encrypt(tokenResponse.RefreshToken)
		if err != nil {
			return fmt.Errorf("failed to encrypt GitHub refresh token: %w", err)
		}
	}

	now := time.Now()
	var existing models.GitHubUserAuth
	lookupErr := db.Where("user_id = ? OR github_user_id = ?", userID, gitHubUser.ID).First(&existing).Error

	switch {
	case errors.Is(lookupErr, gorm.ErrRecordNotFound):
		record := models.GitHubUserAuth{
			UserID:                userID,
			GitHubUserID:          gitHubUser.ID,
			GitHubLogin:           gitHubUser.Login,
			AccessToken:           encryptedAccessToken,
			RefreshToken:          encryptedRefreshToken,
			AccessTokenExpiresAt:  tokenExpiryFromSeconds(tokenResponse.ExpiresIn),
			RefreshTokenExpiresAt: tokenExpiryFromSeconds(tokenResponse.RefreshTokenExpiresIn),
			LastRefreshedAt:       &now,
		}
		return db.Create(&record).Error
	case lookupErr != nil:
		return lookupErr
	default:
		updates := map[string]interface{}{
			"user_id":                 userID,
			"github_user_id":          gitHubUser.ID,
			"github_login":            gitHubUser.Login,
			"access_token":            encryptedAccessToken,
			"access_token_expires_at": tokenExpiryFromSeconds(tokenResponse.ExpiresIn),
			"last_refreshed_at":       &now,
		}
		if encryptedRefreshToken != "" {
			updates["refresh_token"] = encryptedRefreshToken
			updates["refresh_token_expires_at"] = tokenExpiryFromSeconds(tokenResponse.RefreshTokenExpiresIn)
		}
		return db.Model(&existing).Updates(updates).Error
	}
}

func getGitHubUserAuthRecord(db *gorm.DB, userID uint) (*models.GitHubUserAuth, error) {
	var auth models.GitHubUserAuth
	if err := db.Where("user_id = ?", userID).First(&auth).Error; err != nil {
		return nil, err
	}
	return &auth, nil
}

func decryptGitHubUserToken(ciphertext string) (string, error) {
	plaintext, err := utils.Decrypt(ciphertext)
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(plaintext), nil
}

func getGitHubUserAccessTokenForUser(ctx context.Context, db *gorm.DB, userID uint) (string, *models.GitHubUserAuth, error) {
	authRecord, err := getGitHubUserAuthRecord(db, userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", nil, errors.New("GitHub sign-in is not connected for this user")
		}
		return "", nil, err
	}

	if authRecord.AccessTokenExpiresAt == nil || time.Until(*authRecord.AccessTokenExpiresAt) > gitHubTokenRefreshSkew {
		accessToken, err := decryptGitHubUserToken(authRecord.AccessToken)
		if err != nil {
			return "", nil, fmt.Errorf("failed to decrypt GitHub access token: %w", err)
		}
		if accessToken == "" {
			return "", nil, errors.New("GitHub access token is empty")
		}
		return accessToken, authRecord, nil
	}

	if authRecord.RefreshTokenExpiresAt != nil && time.Now().After(*authRecord.RefreshTokenExpiresAt) {
		return "", nil, errors.New("GitHub session expired. Please sign in with GitHub again")
	}
	if strings.TrimSpace(authRecord.RefreshToken) == "" {
		return "", nil, errors.New("GitHub session expired. Please sign in with GitHub again")
	}

	refreshToken, err := decryptGitHubUserToken(authRecord.RefreshToken)
	if err != nil {
		return "", nil, fmt.Errorf("failed to decrypt GitHub refresh token: %w", err)
	}
	refreshedToken, err := refreshGitHubUserAccessToken(ctx, refreshToken)
	if err != nil {
		return "", nil, err
	}
	if refreshedToken.RefreshToken == "" {
		refreshedToken.RefreshToken = refreshToken
		if authRecord.RefreshTokenExpiresAt != nil {
			remaining := time.Until(*authRecord.RefreshTokenExpiresAt)
			if remaining > 0 {
				refreshedToken.RefreshTokenExpiresIn = int64(remaining.Seconds())
			}
		}
	}

	if err := upsertGitHubUserAuth(db, userID, &GitHubUser{
		ID:    authRecord.GitHubUserID,
		Login: authRecord.GitHubLogin,
	}, refreshedToken); err != nil {
		return "", nil, err
	}

	updatedRecord, err := getGitHubUserAuthRecord(db, userID)
	if err != nil {
		return "", nil, err
	}

	accessToken, err := decryptGitHubUserToken(updatedRecord.AccessToken)
	if err != nil {
		return "", nil, fmt.Errorf("failed to decrypt refreshed GitHub access token: %w", err)
	}
	return accessToken, updatedRecord, nil
}

func fetchGitHubPrimaryVerifiedEmail(accessToken string) (string, error) {
	req, err := http.NewRequest(http.MethodGet, strings.TrimRight(gitHubAPIBaseURL, "/")+"/user/emails", nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")
	req.Header.Set("User-Agent", "Trackeep")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		return "", fmt.Errorf("GitHub email API returned %d: %s", resp.StatusCode, truncateString(string(body), 220))
	}

	var emails []gitHubUserEmail
	if err := json.Unmarshal(body, &emails); err != nil {
		return "", err
	}
	for _, email := range emails {
		if email.Primary && email.Verified {
			return strings.TrimSpace(email.Email), nil
		}
	}
	for _, email := range emails {
		if email.Verified {
			return strings.TrimSpace(email.Email), nil
		}
	}

	return "", errors.New("no verified GitHub email found")
}

func listGitHubUserInstallations(ctx context.Context, accessToken string) ([]int64, error) {
	installations := make([]int64, 0)
	client := &http.Client{Timeout: 30 * time.Second}

	for page := 1; page <= 10; page++ {
		reqURL := fmt.Sprintf("%s/user/installations?per_page=100&page=%d", strings.TrimRight(gitHubAPIBaseURL, "/"), page)
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
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

		body, readErr := io.ReadAll(resp.Body)
		resp.Body.Close()
		if readErr != nil {
			return nil, readErr
		}
		if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
			return nil, fmt.Errorf("GitHub installations API returned %d: %s", resp.StatusCode, truncateString(string(body), 220))
		}

		var payload gitHubUserInstallationsResponse
		if err := json.Unmarshal(body, &payload); err != nil {
			return nil, err
		}
		for _, installation := range payload.Installations {
			installations = append(installations, installation.ID)
		}
		if len(payload.Installations) < 100 {
			break
		}
	}

	return installations, nil
}

func verifyGitHubInstallationAccessForUser(ctx context.Context, db *gorm.DB, userID uint, installationID int64) error {
	accessToken, _, err := getGitHubUserAccessTokenForUser(ctx, db, userID)
	if err != nil {
		return err
	}

	installations, err := listGitHubUserInstallations(ctx, accessToken)
	if err != nil {
		return err
	}
	for _, id := range installations {
		if id == installationID {
			return nil
		}
	}

	return errors.New("the GitHub installation is not accessible to the signed-in GitHub user")
}
