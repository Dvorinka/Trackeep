package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"regexp"
	"strings"
)

type VideoResponse struct {
	VideoID     string `json:"video_id"`
	Title       string `json:"title"`
	ChannelName string `json:"channel_name"`
	Description string `json:"description"`
	Thumbnail   string `json:"thumbnail"`
}

func fetchYouTubeVideos(query string, limit int) ([]VideoResponse, error) {
	url := fmt.Sprintf(
		"https://www.youtube.com/results?search_query=%s",
		query,
	)

	resp, err := http.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	html := string(body)

	// Updated regex patterns based on actual YouTube HTML structure
	videoRe := regexp.MustCompile(`"videoRenderer":{"videoId":"([^"]{11})"`)

	results := []VideoResponse{}
	seen := map[string]bool{}

	// Find all video renderers
	videoMatches := videoRe.FindAllStringSubmatchIndex(html, -1)

	for _, match := range videoMatches {
		if len(results) >= limit {
			break
		}

		if len(match) < 4 {
			continue
		}

		videoID := html[match[2]:match[3]]
		if seen[videoID] {
			continue
		}
		seen[videoID] = true

		// Extract a window around the video renderer to find associated data
		start := match[0]
		if start-3000 > 0 {
			start = start - 3000
		}
		end := match[1] + 5000
		if end > len(html) {
			end = len(html)
		}
		snippet := html[start:end]

		// Extract title from video renderer
		title := ""
		titleRe1 := regexp.MustCompile(`"title":\{"runs":\[\{"text":"([^"]+)"`)
		titleRe2 := regexp.MustCompile(`"title":\{"simpleText":"([^"]+)"`)
		titleRe3 := regexp.MustCompile(`<yt-formatted-string[^>]*aria-label="([^"]+)"`)

		if m := titleRe1.FindStringSubmatch(snippet); len(m) >= 2 {
			title = htmlUnescape(m[1])
		} else if m := titleRe2.FindStringSubmatch(snippet); len(m) >= 2 {
			title = htmlUnescape(m[1])
		} else if m := titleRe3.FindStringSubmatch(snippet); len(m) >= 2 {
			title = htmlUnescape(m[1])
		}

		// Extract channel name
		channel := ""
		channelRe1 := regexp.MustCompile(`"longBylineText":{"runs":\[\{"text":"([^"]+)"`)
		channelRe2 := regexp.MustCompile(`"ownerText":{"runs":\[\{"text":"([^"]+)"`)
		channelRe3 := regexp.MustCompile(`"shortBylineText":{"runs":\[\{"text":"([^"]+)"`)

		if m := channelRe1.FindStringSubmatch(snippet); len(m) >= 2 {
			channel = htmlUnescape(m[1])
		} else if m := channelRe2.FindStringSubmatch(snippet); len(m) >= 2 {
			channel = htmlUnescape(m[1])
		} else if m := channelRe3.FindStringSubmatch(snippet); len(m) >= 2 {
			channel = htmlUnescape(m[1])
		}

		// Extract description from the broader HTML context
		description := ""

		// Look for description in the broader context (expand search window)
		broaderStart := match[0]
		if broaderStart-5000 > 0 {
			broaderStart = broaderStart - 5000
		}
		broaderEnd := match[1] + 8000
		if broaderEnd > len(html) {
			broaderEnd = len(html)
		}
		broaderSnippet := html[broaderStart:broaderEnd]

		// Try to find the metadata snippet container in the broader context
		descContainerRe := regexp.MustCompile(`<div class="metadata-snippet-container[^>]*>.*?</div>`)
		if containerMatch := descContainerRe.FindStringSubmatch(broaderSnippet); len(containerMatch) >= 2 {
			containerContent := containerMatch[1]

			// Extract all text from yt-formatted-string elements (these contain the actual description text)
			descTextRe := regexp.MustCompile(`<yt-formatted-string[^>]*>([^<]+)</yt-formatted-string>`)
			if descTextMatches := descTextRe.FindAllStringSubmatch(containerContent, -1); len(descTextMatches) > 0 {
				var descParts []string
				for _, descTextMatch := range descTextMatches {
					if len(descTextMatch) >= 2 {
						part := strings.TrimSpace(htmlUnescape(descTextMatch[1]))
						// Filter out very short parts and common patterns
						if len(part) > 1 && !regexp.MustCompile(`^(yt-|style-scope|dir=|class=)`).MatchString(part) {
							descParts = append(descParts, part)
						}
					}
				}
				if len(descParts) > 0 {
					description = strings.Join(descParts, "")
					description = regexp.MustCompile(`\s+`).ReplaceAllString(description, " ")
					description = strings.TrimSpace(description)
					// Limit description length
					if len(description) > 200 {
						description = description[:200] + "..."
					}
				}
			}
		}

		// Fallback: try simple patterns
		if description == "" {
			fallbackPatterns := []string{
				`"descriptionSnippet":\{"runs":\[\{"text":"([^"]+)"`,
				`"detailedMetadataSnippets":\[\{"snippetText":\{"runs":\[\{"text":"([^"]+)"`,
			}

			for _, pattern := range fallbackPatterns {
				re := regexp.MustCompile(pattern)
				if matches := re.FindAllStringSubmatch(broaderSnippet, -1); len(matches) > 0 {
					for _, match := range matches {
						if len(match) >= 2 {
							desc := strings.TrimSpace(htmlUnescape(match[1]))
							if desc != "" {
								description = desc
								break
							}
						}
					}
					if description != "" {
						break
					}
				}
			}
		}

		results = append(results, VideoResponse{
			VideoID:     videoID,
			Title:       title,
			ChannelName: channel,
			Description: description,
			Thumbnail:   fmt.Sprintf("https://img.youtube.com/vi/%s/maxresdefault.jpg", videoID),
		})
	}

	if len(results) == 0 {
		return nil, fmt.Errorf("no videos found")
	}

	return results, nil
}

func htmlUnescape(s string) string {
	replacer := strings.NewReplacer(
		"&nbsp;", " ",
		"&amp;", "&",
		"&quot;", `"`,
		"&#39;", "'",
	)
	return replacer.Replace(s)
}

func youtubeHandler(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	if query == "" {
		http.Error(w, "missing query parameter", http.StatusBadRequest)
		return
	}

	query = strings.ReplaceAll(query, " ", "+")

	videos, err := fetchYouTubeVideos(query, 9)
	if err != nil {
		http.Error(w, "failed to fetch videos", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(videos)
}

// CORS
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/youtube", youtubeHandler)

	log.Println("YouTube Search Server running on :8090")
	log.Fatal(http.ListenAndServe(":8090", corsMiddleware(mux)))
}
