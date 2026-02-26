package services

import (
	"net/url"
	"regexp"
	"strings"
)

// DetectedSuggestion represents a suggestion detected from message text.
type DetectedSuggestion struct {
	Type    string                 `json:"type"`
	Payload map[string]interface{} `json:"payload"`
}

// DetectedAttachment is an inferred attachment from message content.
type DetectedAttachment struct {
	Kind       string                 `json:"kind"`
	URL        string                 `json:"url"`
	Title      string                 `json:"title"`
	PreviewMap map[string]interface{} `json:"preview_map"`
}

var (
	urlRegex          = regexp.MustCompile(`https?://[^\s]+`)
	passwordRegex     = regexp.MustCompile(`(?i)(password|pass:|pwd|api[_-]?key|access[_-]?token|secret|bearer\s+[a-z0-9\-_\.]+)`)
	taskIntentRegex   = regexp.MustCompile(`(?i)(todo|to do|task|need to|should|must|remember to|follow up)`)
	eventIntentRegex  = regexp.MustCompile(`(?i)(meeting|calendar|event|schedule|tomorrow|next week|deadline|at [0-9]{1,2}(:[0-9]{2})?\s?(am|pm)?)`)
	searchIntentRegex = regexp.MustCompile(`(?i)(search for|track query|alert me for|watch for|monitor query)`)
)

// DetectMessageContent inspects a message and returns suggestions, inferred attachments,
// and whether the message appears sensitive.
func DetectMessageContent(body string) ([]DetectedSuggestion, []DetectedAttachment, bool) {
	trimmed := strings.TrimSpace(body)
	if trimmed == "" {
		return nil, nil, false
	}

	suggestions := make([]DetectedSuggestion, 0, 8)
	attachments := make([]DetectedAttachment, 0, 8)
	seenSuggestion := map[string]bool{}

	// URL and service detections
	for _, rawURL := range urlRegex.FindAllString(trimmed, -1) {
		u, err := url.Parse(rawURL)
		if err != nil {
			continue
		}
		host := strings.ToLower(u.Host)
		kind := "website"
		sType := "save_bookmark"
		title := rawURL

		switch {
		case strings.Contains(host, "youtube.com") || strings.Contains(host, "youtu.be"):
			kind = "youtube"
			sType = "save_youtube"
		case strings.Contains(host, "github.com"):
			kind = "github"
			sType = "link_github"
		}

		attachments = append(attachments, DetectedAttachment{
			Kind:  kind,
			URL:   rawURL,
			Title: title,
			PreviewMap: map[string]interface{}{
				"host": host,
			},
		})

		key := sType + ":" + rawURL
		if !seenSuggestion[key] {
			seenSuggestion[key] = true
			suggestions = append(suggestions, DetectedSuggestion{
				Type: sType,
				Payload: map[string]interface{}{
					"url":   rawURL,
					"title": title,
				},
			})
		}
	}

	if taskIntentRegex.MatchString(trimmed) {
		suggestions = append(suggestions, DetectedSuggestion{
			Type: "create_task",
			Payload: map[string]interface{}{
				"title":     buildCompactTitle(trimmed, 80),
				"from_text": trimmed,
			},
		})
	}

	if eventIntentRegex.MatchString(trimmed) {
		suggestions = append(suggestions, DetectedSuggestion{
			Type: "create_event",
			Payload: map[string]interface{}{
				"title":     buildCompactTitle(trimmed, 80),
				"from_text": trimmed,
			},
		})
	}

	if searchIntentRegex.MatchString(trimmed) {
		suggestions = append(suggestions, DetectedSuggestion{
			Type: "save_search",
			Payload: map[string]interface{}{
				"query": trimmed,
			},
		})
	}

	isSensitive := passwordRegex.MatchString(trimmed)
	if isSensitive {
		suggestions = append(suggestions, DetectedSuggestion{
			Type: "password_warning",
			Payload: map[string]interface{}{
				"message": "Sensitive data detected. We recommend a dedicated password manager like Proton Pass (not affiliated).",
			},
		})
		suggestions = append(suggestions, DetectedSuggestion{
			Type: "move_to_password_vault",
			Payload: map[string]interface{}{
				"message": "Move this message to your encrypted password vault.",
			},
		})
	}

	return suggestions, attachments, isSensitive
}

func buildCompactTitle(input string, limit int) string {
	s := strings.TrimSpace(input)
	if len(s) <= limit {
		return s
	}
	return strings.TrimSpace(s[:limit-3]) + "..."
}
