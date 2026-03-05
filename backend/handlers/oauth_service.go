package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"github.com/trackeep/backend/models"
)

const defaultOAuthServiceURL = "https://oauth.trackeep.org"

type centralizedOAuthUser struct {
	ID        int    `json:"id"`
	GitHubID  int    `json:"github_id"`
	Username  string `json:"username"`
	Email     string `json:"email"`
	Name      string `json:"name"`
	AvatarURL string `json:"avatar_url"`
}

type centralizedOAuthValidationResponse struct {
	Token string               `json:"token"`
	User  centralizedOAuthUser `json:"user"`
}

func getOAuthServiceURL() string {
	value := strings.TrimSpace(os.Getenv("OAUTH_SERVICE_URL"))
	if value == "" {
		value = strings.TrimSpace(os.Getenv("VITE_OAUTH_SERVICE_URL"))
	}
	if value == "" {
		value = defaultOAuthServiceURL
	}
	return strings.TrimRight(value, "/")
}

func headerValue(headers http.Header, key string) string {
	raw := strings.TrimSpace(headers.Get(key))
	if raw == "" {
		return ""
	}

	for _, part := range strings.Split(raw, ",") {
		candidate := strings.TrimSpace(part)
		if candidate != "" {
			return candidate
		}
	}

	return ""
}

func backendPublicBaseURL(r *http.Request) string {
	if baseURL := strings.TrimSpace(os.Getenv("PUBLIC_API_URL")); baseURL != "" {
		return strings.TrimRight(baseURL, "/")
	}
	if baseURL := strings.TrimSpace(os.Getenv("PUBLIC_BASE_URL")); baseURL != "" {
		return strings.TrimRight(baseURL, "/")
	}

	scheme := "http"
	if forwardedProto := headerValue(r.Header, "X-Forwarded-Proto"); forwardedProto != "" {
		scheme = forwardedProto
	} else if r.TLS != nil {
		scheme = "https"
	}

	host := headerValue(r.Header, "X-Forwarded-Host")
	if host == "" {
		host = strings.TrimSpace(r.Host)
	}
	if host == "" {
		return ""
	}

	return fmt.Sprintf("%s://%s", scheme, host)
}

func normalizeFrontendRedirectURL(raw string) string {
	value := strings.TrimSpace(raw)
	if value == "" {
		return ""
	}

	parsed, err := url.Parse(value)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return ""
	}

	if parsed.Path == "" || parsed.Path == "/" {
		parsed.Path = "/auth/callback"
	}

	return parsed.String()
}

func resolveFrontendRedirectURL(r *http.Request) string {
	if value := normalizeFrontendRedirectURL(r.URL.Query().Get("frontend_redirect")); value != "" {
		return value
	}

	if value := normalizeFrontendRedirectURL(os.Getenv("FRONTEND_URL")); value != "" {
		return value
	}

	if origin := normalizeFrontendRedirectURL(r.Header.Get("Origin")); origin != "" {
		return origin
	}

	referer := strings.TrimSpace(r.Header.Get("Referer"))
	if referer != "" {
		if parsed, err := url.Parse(referer); err == nil && parsed.Scheme != "" && parsed.Host != "" {
			return normalizeFrontendRedirectURL((&url.URL{
				Scheme: parsed.Scheme,
				Host:   parsed.Host,
				Path:   "/auth/callback",
			}).String())
		}
	}

	return ""
}

func buildOAuthCallbackURL(r *http.Request, frontendRedirect string) string {
	baseURL := backendPublicBaseURL(r)
	if baseURL == "" {
		return ""
	}

	callbackURL, err := url.Parse(baseURL + "/api/v1/auth/oauth/callback")
	if err != nil {
		return ""
	}

	if frontendRedirect != "" {
		query := callbackURL.Query()
		query.Set("frontend_redirect", frontendRedirect)
		callbackURL.RawQuery = query.Encode()
	}

	return callbackURL.String()
}

func buildFrontendCallbackRedirectURL(frontendRedirect, token string) string {
	redirectTarget := normalizeFrontendRedirectURL(frontendRedirect)
	if redirectTarget == "" {
		redirectTarget = normalizeFrontendRedirectURL(os.Getenv("FRONTEND_URL"))
	}
	if redirectTarget == "" {
		return ""
	}

	parsed, err := url.Parse(redirectTarget)
	if err != nil {
		return ""
	}

	query := parsed.Query()
	query.Set("token", token)
	parsed.RawQuery = query.Encode()

	return parsed.String()
}

func validateCentralizedOAuthToken(ctx context.Context, token string) (*centralizedOAuthValidationResponse, error) {
	serviceURL := getOAuthServiceURL()
	if serviceURL == "" {
		return nil, fmt.Errorf("oauth service url not configured")
	}

	requestBody, err := json.Marshal(map[string]string{"token": token})
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, serviceURL+"/api/v1/auth/oauth/callback", bytes.NewReader(requestBody))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		message := strings.TrimSpace(string(body))
		if message == "" {
			message = resp.Status
		}
		return nil, fmt.Errorf("oauth service validation failed: %s", message)
	}

	var response centralizedOAuthValidationResponse
	if err := json.Unmarshal(body, &response); err != nil {
		return nil, err
	}

	return &response, nil
}

func parseOAuthTokenClaimsUnverified(token string) (jwt.MapClaims, error) {
	parser := jwt.NewParser()
	parsedToken, _, err := parser.ParseUnverified(token, jwt.MapClaims{})
	if err != nil {
		return nil, err
	}

	claims, ok := parsedToken.Claims.(jwt.MapClaims)
	if !ok {
		return nil, fmt.Errorf("invalid token claims")
	}

	return claims, nil
}

func getAccessTokenFromOAuthClaims(claims jwt.MapClaims) string {
	accessToken, _ := claims["access_token"].(string)
	return strings.TrimSpace(accessToken)
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed != "" {
			return trimmed
		}
	}
	return ""
}

func uniqueUsername(base string, db *gorm.DB, excludeUserID uint) string {
	candidate := strings.TrimSpace(base)
	if candidate == "" {
		candidate = "user"
	}

	for suffix := 0; ; suffix++ {
		username := candidate
		if suffix > 0 {
			username = fmt.Sprintf("%s-%d", candidate, suffix+1)
		}

		var existing models.User
		err := db.Where("username = ?", username).First(&existing).Error
		if err == nil {
			if excludeUserID != 0 && existing.ID == excludeUserID {
				return username
			}
			continue
		}
		if err == gorm.ErrRecordNotFound {
			return username
		}
		return username
	}
}

func upsertCentralizedOAuthUser(db *gorm.DB, controllerUser centralizedOAuthUser) (*models.User, error) {
	var user models.User
	var err error

	normalizedEmail := strings.TrimSpace(controllerUser.Email)
	normalizedUsername := firstNonEmpty(controllerUser.Username, strings.Split(normalizedEmail, "@")[0], "user")
	fullName := firstNonEmpty(controllerUser.Name, controllerUser.Username, normalizedEmail)
	provider := "email"
	if controllerUser.GitHubID != 0 {
		provider = "github"
		err = db.Where("github_id = ?", controllerUser.GitHubID).First(&user).Error
	} else {
		err = gorm.ErrRecordNotFound
	}

	if err != nil && normalizedEmail != "" {
		err = db.Where("email = ?", normalizedEmail).First(&user).Error
	}

	if err == nil {
		updates := map[string]interface{}{
			"email":      normalizedEmail,
			"username":   uniqueUsername(normalizedUsername, db, user.ID),
			"full_name":  fullName,
			"avatar_url": controllerUser.AvatarURL,
			"provider":   provider,
		}
		if controllerUser.GitHubID != 0 {
			updates["github_id"] = controllerUser.GitHubID
		}

		now := time.Now()
		updates["last_login_at"] = &now

		if err := db.Model(&user).Updates(updates).Error; err != nil {
			return nil, err
		}
		if err := db.First(&user, user.ID).Error; err != nil {
			return nil, err
		}

		return &user, nil
	}

	if err != gorm.ErrRecordNotFound {
		return nil, err
	}

	var userCount int64
	if err := db.Model(&models.User{}).Count(&userCount).Error; err != nil {
		return nil, err
	}

	randomPassword := generateRandomString(32)
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(randomPassword), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	role := "user"
	if userCount == 0 {
		role = "admin"
	}

	now := time.Now()
	user = models.User{
		Email:       normalizedEmail,
		Username:    uniqueUsername(normalizedUsername, db, 0),
		Password:    string(hashedPassword),
		FullName:    fullName,
		Role:        role,
		Theme:       "dark",
		GitHubID:    controllerUser.GitHubID,
		AvatarURL:   controllerUser.AvatarURL,
		Provider:    provider,
		LastLoginAt: &now,
	}

	if err := db.Create(&user).Error; err != nil {
		return nil, err
	}

	_ = ensureMessagingDefaults(db, user.ID)

	return &user, nil
}
