package services

import "testing"

func TestDetectMessageContent_URLsAndSuggestions(t *testing.T) {
	body := "Check this out https://github.com/trackeep/backend and video https://youtu.be/dQw4w9WgXcQ"

	suggestions, attachments, isSensitive := DetectMessageContent(body)
	if isSensitive {
		t.Fatalf("expected non-sensitive message")
	}

	if len(attachments) < 2 {
		t.Fatalf("expected at least 2 attachments, got %d", len(attachments))
	}

	hasGitHub := false
	hasYouTube := false
	for _, s := range suggestions {
		if s.Type == "link_github" {
			hasGitHub = true
		}
		if s.Type == "save_youtube" {
			hasYouTube = true
		}
	}

	if !hasGitHub {
		t.Fatalf("expected link_github suggestion")
	}
	if !hasYouTube {
		t.Fatalf("expected save_youtube suggestion")
	}
}

func TestDetectMessageContent_TaskAndEventIntents(t *testing.T) {
	body := "TODO: schedule meeting tomorrow at 10am to review the release plan"
	suggestions, _, _ := DetectMessageContent(body)

	hasTask := false
	hasEvent := false
	for _, s := range suggestions {
		if s.Type == "create_task" {
			hasTask = true
		}
		if s.Type == "create_event" {
			hasEvent = true
		}
	}

	if !hasTask {
		t.Fatalf("expected create_task suggestion")
	}
	if !hasEvent {
		t.Fatalf("expected create_event suggestion")
	}
}

func TestDetectMessageContent_PasswordWarning(t *testing.T) {
	body := "password: SuperSecret123!"
	suggestions, _, isSensitive := DetectMessageContent(body)
	if !isSensitive {
		t.Fatalf("expected sensitive message")
	}

	hasWarning := false
	hasVaultMove := false
	for _, s := range suggestions {
		if s.Type == "password_warning" {
			hasWarning = true
		}
		if s.Type == "move_to_password_vault" {
			hasVaultMove = true
		}
	}

	if !hasWarning {
		t.Fatalf("expected password_warning suggestion")
	}
	if !hasVaultMove {
		t.Fatalf("expected move_to_password_vault suggestion")
	}
}
