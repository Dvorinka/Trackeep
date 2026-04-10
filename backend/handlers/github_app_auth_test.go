package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/trackeep/backend/config"
	"github.com/trackeep/backend/models"
	"github.com/trackeep/backend/utils"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupGitHubAuthTestDB(t *testing.T, migrate ...interface{}) *gorm.DB {
	t.Helper()

	dsn := "file:" + url.PathEscape(t.Name()) + "?mode=memory&cache=shared"
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open sqlite database: %v", err)
	}
	if err := db.AutoMigrate(migrate...); err != nil {
		t.Fatalf("failed to migrate test database: %v", err)
	}

	previousDB := config.DB
	config.DB = db
	t.Cleanup(func() {
		config.DB = previousDB
	})

	t.Setenv("VITE_DEMO_MODE", "false")
	t.Setenv("JWT_SECRET", strings.Repeat("a", 64))
	t.Setenv("ENCRYPTION_KEY", "test-encryption-key")

	return db
}

func withControlServiceBaseURL(t *testing.T, value string) {
	t.Helper()

	previous := controlServiceBaseURL
	controlServiceBaseURL = value
	t.Cleanup(func() {
		controlServiceBaseURL = previous
	})
}

func TestGitHubLoginRedirectsToControlService(t *testing.T) {
	gin.SetMode(gin.TestMode)
	withControlServiceBaseURL(t, "https://control.example.com")
	t.Setenv("PUBLIC_API_URL", "https://api.example.com")

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/github?frontend_redirect="+url.QueryEscape("https://app.example.com/auth/callback"), nil)
	rec := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(rec)
	ctx.Request = req

	GitHubLogin(ctx)

	if rec.Code != http.StatusTemporaryRedirect {
		t.Fatalf("unexpected status: %d", rec.Code)
	}

	location := rec.Header().Get("Location")
	parsed, err := url.Parse(location)
	if err != nil {
		t.Fatalf("failed to parse redirect location: %v", err)
	}
	if parsed.Scheme != "https" || parsed.Host != "control.example.com" || parsed.Path != "/auth/github" {
		t.Fatalf("unexpected redirect location: %s", location)
	}
	if got := parsed.Query().Get("redirect_uri"); got != "https://api.example.com/api/v1/auth/control/callback" {
		t.Fatalf("unexpected redirect_uri: %s", got)
	}
}

func TestHandleOAuthCallbackStoresControllerSessionAndRedirects(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupGitHubAuthTestDB(t, &models.User{}, &models.ControlServiceSession{})

	controller := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/v1/auth/control/callback" {
			http.NotFound(w, r)
			return
		}

		_ = json.NewEncoder(w).Encode(controlServiceTokenValidationResponse{
			Token: "controller-token-fresh",
			User: centralizedOAuthUser{
				ID:        77,
				GitHubID:  99,
				Username:  "octocat",
				Email:     "octo@example.com",
				Name:      "The Octocat",
				AvatarURL: "https://example.com/octocat.png",
			},
		})
	}))
	defer controller.Close()
	withControlServiceBaseURL(t, controller.URL)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/control/callback?token=controller-token-old", nil)
	req.AddCookie(&http.Cookie{Name: controlServiceFrontendRedirectCookieName, Value: "https://app.example.com/auth/callback"})
	rec := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(rec)
	ctx.Request = req

	HandleOAuthCallback(ctx)

	if rec.Code != http.StatusTemporaryRedirect {
		t.Fatalf("unexpected status: %d body=%s", rec.Code, rec.Body.String())
	}

	location := rec.Header().Get("Location")
	if !strings.HasPrefix(location, "https://app.example.com/auth/callback?token=") {
		t.Fatalf("unexpected redirect location: %s", location)
	}

	var user models.User
	if err := db.Where("github_id = ?", 99).First(&user).Error; err != nil {
		t.Fatalf("failed to load local user: %v", err)
	}

	var session models.ControlServiceSession
	if err := db.Where("user_id = ?", user.ID).First(&session).Error; err != nil {
		t.Fatalf("failed to load controller session: %v", err)
	}
	decryptedToken, err := utils.Decrypt(session.Token)
	if err != nil {
		t.Fatalf("failed to decrypt controller token: %v", err)
	}
	if decryptedToken != "controller-token-fresh" {
		t.Fatalf("unexpected stored controller token: %s", decryptedToken)
	}
}

func TestGetGitHubReposUsesControlServiceAndPersistsRefreshedToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupGitHubAuthTestDB(t, &models.User{}, &models.ControlServiceSession{})

	user := models.User{
		Email:    "octo@example.com",
		Username: "octocat",
		Password: "hashed-password",
		FullName: "Octocat",
		GitHubID: 99,
	}
	if err := db.Create(&user).Error; err != nil {
		t.Fatalf("failed to create user: %v", err)
	}

	encryptedToken, err := utils.Encrypt("controller-token-old")
	if err != nil {
		t.Fatalf("failed to encrypt controller token: %v", err)
	}
	if err := db.Create(&models.ControlServiceSession{
		UserID:           user.ID,
		ControllerUserID: 77,
		GitHubID:         99,
		Username:         "octocat",
		Email:            "octo@example.com",
		Token:            encryptedToken,
	}).Error; err != nil {
		t.Fatalf("failed to create controller session: %v", err)
	}

	controller := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/v1/github/repos" {
			http.NotFound(w, r)
			return
		}
		if got := r.Header.Get("Authorization"); got != "Bearer controller-token-old" {
			t.Fatalf("unexpected authorization header: %s", got)
		}
		w.Header().Set(controlServiceSessionTokenHeader, "controller-token-new")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"repos": []GitHubRepo{{
				ID:       1,
				Name:     "trackeep",
				FullName: "octocat/trackeep",
			}},
		})
	}))
	defer controller.Close()
	withControlServiceBaseURL(t, controller.URL)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/github/repos", nil)
	rec := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(rec)
	ctx.Request = req
	ctx.Set("user_id", user.ID)

	GetGitHubRepos(ctx)

	if rec.Code != http.StatusOK {
		t.Fatalf("unexpected status: %d body=%s", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), "octocat/trackeep") {
		t.Fatalf("unexpected response body: %s", rec.Body.String())
	}

	var updated models.ControlServiceSession
	if err := db.Where("user_id = ?", user.ID).First(&updated).Error; err != nil {
		t.Fatalf("failed to reload controller session: %v", err)
	}
	decryptedToken, err := utils.Decrypt(updated.Token)
	if err != nil {
		t.Fatalf("failed to decrypt refreshed controller token: %v", err)
	}
	if decryptedToken != "controller-token-new" {
		t.Fatalf("unexpected refreshed controller token: %s", decryptedToken)
	}
}

func TestGitHubAppInstallCallbackRejectsInaccessibleInstallationViaControlService(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := setupGitHubAuthTestDB(t, &models.User{}, &models.ControlServiceSession{}, &models.GitHubAppInstallState{})
	t.Setenv("FRONTEND_URL", "https://app.example.com")

	user := models.User{
		Email:    "octo@example.com",
		Username: "octocat",
		Password: "hashed-password",
		FullName: "Octocat",
		GitHubID: 99,
	}
	if err := db.Create(&user).Error; err != nil {
		t.Fatalf("failed to create user: %v", err)
	}

	encryptedToken, err := utils.Encrypt("controller-token-old")
	if err != nil {
		t.Fatalf("failed to encrypt controller token: %v", err)
	}
	if err := db.Create(&models.ControlServiceSession{
		UserID:           user.ID,
		ControllerUserID: 77,
		GitHubID:         99,
		Username:         "octocat",
		Email:            "octo@example.com",
		Token:            encryptedToken,
	}).Error; err != nil {
		t.Fatalf("failed to create controller session: %v", err)
	}

	if err := db.Create(&models.GitHubAppInstallState{
		UserID:    user.ID,
		State:     "install-state",
		ExpiresAt: time.Now().Add(10 * time.Minute),
	}).Error; err != nil {
		t.Fatalf("failed to create install state: %v", err)
	}

	controller := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/v1/github/app/installations/999/verify" {
			http.NotFound(w, r)
			return
		}
		w.WriteHeader(http.StatusForbidden)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "installation_not_accessible"})
	}))
	defer controller.Close()
	withControlServiceBaseURL(t, controller.URL)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/github/app/callback?state=install-state&installation_id=999&setup_action=install", nil)
	rec := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(rec)
	ctx.Request = req

	GitHubAppInstallCallback(ctx)

	if rec.Code != http.StatusTemporaryRedirect {
		t.Fatalf("unexpected status: %d body=%s", rec.Code, rec.Body.String())
	}
	location := rec.Header().Get("Location")
	if !strings.Contains(location, "github_app_error=installation_not_accessible") {
		t.Fatalf("unexpected redirect location: %s", location)
	}
}
