package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	"github.com/golang-jwt/jwt/v5"
)

func TestValidateCentralizedOAuthToken(t *testing.T) {
	t.Helper()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Fatalf("expected POST request, got %s", r.Method)
		}
		if r.URL.Path != "/api/v1/auth/oauth/callback" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}

		var body map[string]string
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Fatalf("failed to decode request body: %v", err)
		}
		if body["token"] != "controller-token" {
			t.Fatalf("unexpected token payload: %#v", body)
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(centralizedOAuthValidationResponse{
			Token: "controller-token",
			User: centralizedOAuthUser{
				ID:       42,
				GitHubID: 99,
				Username: "octocat",
				Email:    "octocat@example.com",
			},
		})
	}))
	defer server.Close()

	t.Setenv("OAUTH_SERVICE_URL", server.URL)
	t.Setenv("VITE_OAUTH_SERVICE_URL", "")

	response, err := validateCentralizedOAuthToken(context.Background(), "controller-token")
	if err != nil {
		t.Fatalf("validateCentralizedOAuthToken returned error: %v", err)
	}

	if response.User.Username != "octocat" {
		t.Fatalf("unexpected user returned: %#v", response.User)
	}
}

func TestBuildOAuthCallbackURLPreservesFrontendRedirect(t *testing.T) {
	frontendRedirect := "https://app.example.com/auth/callback?next=%2Fapp"
	req := httptest.NewRequest(http.MethodGet, "http://internal/api/v1/auth/github?frontend_redirect="+url.QueryEscape(frontendRedirect), nil)
	req.Host = "api.example.com"
	req.Header.Set("X-Forwarded-Proto", "https")
	req.Header.Set("X-Forwarded-Host", "api.example.com")

	resolvedFrontendRedirect := resolveFrontendRedirectURL(req)
	if resolvedFrontendRedirect != frontendRedirect {
		t.Fatalf("unexpected frontend redirect: %s", resolvedFrontendRedirect)
	}

	callbackURL := buildOAuthCallbackURL(req, resolvedFrontendRedirect)
	expected := "https://api.example.com/api/v1/auth/oauth/callback?frontend_redirect=" + url.QueryEscape(frontendRedirect)
	if callbackURL != expected {
		t.Fatalf("unexpected callback URL: got %s want %s", callbackURL, expected)
	}
}

func TestParseOAuthTokenClaimsUnverified(t *testing.T) {
	signedToken, err := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id":      1,
		"access_token": "gho_test_token",
	}).SignedString([]byte("test-secret"))
	if err != nil {
		t.Fatalf("failed to sign token: %v", err)
	}

	claims, err := parseOAuthTokenClaimsUnverified(signedToken)
	if err != nil {
		t.Fatalf("parseOAuthTokenClaimsUnverified returned error: %v", err)
	}

	if accessToken := getAccessTokenFromOAuthClaims(claims); accessToken != "gho_test_token" {
		t.Fatalf("unexpected access token: %s", accessToken)
	}
}
