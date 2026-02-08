package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"
)

type VideoResponse struct {
	VideoID     string `json:"video_id"`
	ChannelName string `json:"channel_name"`
}

var ctx = context.Background()

// ChannelVideosResponse represents the response for channel videos scraping
type ChannelVideosResponse struct {
	Channel         string      `json:"channel"`
	ChannelURL      string      `json:"channel_url"`
	SubscribersText string      `json:"subscribers_text"`
	Subscribers     int64       `json:"subscribers"`
	Videos          []VideoItem `json:"videos"`
}

// VideoItem holds per-video metadata extracted from the /videos page
type VideoItem struct {
	VideoID       string `json:"video_id"`
	Title         string `json:"title,omitempty"`
	Length        string `json:"length,omitempty"`
	ThumbnailURL  string `json:"thumbnail_url,omitempty"`
	ViewsText     string `json:"views_text,omitempty"`
	Views         int64  `json:"views"`
	PublishedText string `json:"published_text,omitempty"`
	PublishedDate string `json:"published_date,omitempty"` // ISO 8601 date
}

// normalizeChannelInput accepts a handle like "@FCBizoniUH" or "FCBizoniUH" or a full URL
// and returns the canonical handle (with leading @) and the corresponding /videos URL.
func normalizeChannelInput(input string) (handle string, url string) {
	in := strings.TrimSpace(input)
	lower := strings.ToLower(in)
	isURL := strings.HasPrefix(lower, "http://") || strings.HasPrefix(lower, "https://") || strings.HasPrefix(lower, "www.") || strings.HasPrefix(lower, "youtube.com/")
	if isURL {
		// Ensure scheme
		if strings.HasPrefix(lower, "www.") || strings.HasPrefix(lower, "youtube.com/") {
			in = "https://" + strings.TrimPrefix(in, "www.")
			if !strings.HasPrefix(strings.ToLower(in), "https://youtube.com/") && !strings.HasPrefix(strings.ToLower(in), "https://www.youtube.com/") {
				in = "https://www." + strings.TrimPrefix(in, "https://")
			}
		}
		// Normalize m.youtube.com -> www.youtube.com
		in = strings.ReplaceAll(in, "m.youtube.com", "www.youtube.com")

		// Extract handle if present
		reHandle := regexp.MustCompile(`https?://(www\.)?youtube\.com/(@[^/]+)`) // group with @
		if m := reHandle.FindStringSubmatch(in); len(m) >= 3 {
			handle = m[2]
		} else {
			// Try path segment after domain
			rePath := regexp.MustCompile(`https?://(www\.)?youtube\.com/([^/?#]+)`) // capture after domain
			if m2 := rePath.FindStringSubmatch(in); len(m2) >= 3 {
				seg := m2[2]
				if strings.HasPrefix(seg, "@") {
					handle = seg
				} else {
					handle = "@" + seg
				}
			}
		}

		// Respect provided tab if present: /videos, /shorts, /streams; default to /videos
		if strings.Contains(strings.ToLower(in), "/videos") || strings.Contains(strings.ToLower(in), "/shorts") || strings.Contains(strings.ToLower(in), "/streams") {
			url = in
		} else {
			// Build a /videos URL from detected handle
			if handle == "" {
				// If we couldn't find a handle, just use the original URL
				url = in
			} else {
				url = fmt.Sprintf("https://www.youtube.com/%s/videos", handle)
			}
		}
	} else {
		// Not a URL; treat as handle or bare identifier
		if strings.HasPrefix(in, "@") {
			handle = in
		} else {
			handle = "@" + in
		}
		url = fmt.Sprintf("https://www.youtube.com/%s/videos", handle)
	}
	if handle == "" {
		// As a final fallback from given input
		handle = in
		if !strings.HasPrefix(handle, "@") {
			handle = "@" + handle
		}
	}
	return
}

// fetchChannelVideos scrapes the channel's /videos page and extracts video IDs present
func fetchChannelVideos(channelInput string) (ChannelVideosResponse, error) {
	handle, channelURL := normalizeChannelInput(channelInput)
	log.Printf("Fetching channel videos: handle=%s url=%s", handle, channelURL)

	// Craft request with a desktop UA to improve likelihood of getting full HTML payload
	req, err := http.NewRequest("GET", channelURL, nil)
	if err != nil {
		return ChannelVideosResponse{}, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
	req.Header.Set("Accept-Language", "en-US,en;q=0.9")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return ChannelVideosResponse{}, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return ChannelVideosResponse{}, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return ChannelVideosResponse{}, err
	}
	html := string(body)

	// Regex to capture all 11-char YouTube video IDs from initial data payload
	// Standard videos
	vidRe := regexp.MustCompile(`"videoRenderer":\{[^}]*?"videoId":"([a-zA-Z0-9_-]{11})"`)
	matches := vidRe.FindAllStringSubmatchIndex(html, -1)
	seen := make(map[string]struct{})
	var videos []VideoItem
	for _, idx := range matches {
		if len(idx) < 4 { // need at least match start/end and group start/end
			continue
		}
		// Extract ID
		id := html[idx[2]:idx[3]]
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}

		// Build a local window around the match to parse related fields
		start := idx[0]
		if start-2000 > 0 {
			start = start - 2000
		}
		end := idx[1] + 8000
		if end > len(html) {
			end = len(html)
		}
		snippet := html[start:end]

		vi := VideoItem{VideoID: id}
		// Prefer deterministic thumbnail URL derived from video ID
		vi.ThumbnailURL = fmt.Sprintf("https://img.youtube.com/vi/%s/maxresdefault.jpg", id)

		// Title (may appear as simpleText or runs)
		if m := regexp.MustCompile(`"title":\{"runs":\[\{"text":"([^"]+)"`).FindStringSubmatch(snippet); len(m) >= 2 {
			vi.Title = unescapeYT(m[1])
		} else if m := regexp.MustCompile(`"title":\{"simpleText":"([^"]+)"`).FindStringSubmatch(snippet); len(m) >= 2 {
			vi.Title = unescapeYT(m[1])
		}

		// Length
		if m := regexp.MustCompile(`"lengthText":\{[^}]*"simpleText":"([^"]+)"`).FindStringSubmatch(snippet); len(m) >= 2 {
			// Generic lengthText.simpleText (with or without accessibility block)
			vi.Length = m[1]
		} else if m := regexp.MustCompile(`"lengthText":\{[^}]*"runs":\[\{"text":"([^"]+)"`).FindStringSubmatch(snippet); len(m) >= 2 {
			// lengthText.runs[0].text
			vi.Length = m[1]
		} else if m := regexp.MustCompile(`"thumbnailOverlays":\[[^\]]*?"thumbnailOverlayTimeStatusRenderer":\{"text":\{"simpleText":"([^"]+)"`).FindStringSubmatch(snippet); len(m) >= 2 {
			// Overlay badge duration
			vi.Length = m[1]
		} else if m := regexp.MustCompile(`yt-badge-shape__text">([^<]+)<`).FindStringSubmatch(snippet); len(m) >= 2 {
			// Fallback: raw HTML badge text seen in thumbnails
			vi.Length = strings.TrimSpace(m[1])
		}

		// Extra fallback: search the global HTML near the video anchor for DOM-based duration
		if vi.Length == "" {
			anchorRe := regexp.MustCompile(fmt.Sprintf(`<a[^>]+href="/watch\?v=%s[^\"]*"`, regexp.QuoteMeta(id)))
			if loc := anchorRe.FindStringIndex(html); loc != nil {
				// Search a forward window after the anchor for duration elements
				start2 := loc[1]
				end2 := start2 + 4000
				if end2 > len(html) {
					end2 = len(html)
				}
				chunk := html[start2:end2]
				// Try yt-formatted-string id="length" inner text like 5:59
				if m := regexp.MustCompile(`yt-formatted-string[^>]*id="length"[^>]*>([0-9]{1,2}:[0-9]{2}(?::[0-9]{2})?)<`).FindStringSubmatch(chunk); len(m) >= 2 {
					vi.Length = strings.TrimSpace(m[1])
				} else if m := regexp.MustCompile(`yt-formatted-string[^>]*id="length"[^>]*aria-label="([^"]+)"`).FindStringSubmatch(chunk); len(m) >= 2 {
					if parsed := parseLocalizedDuration(unescapeYT(m[1])); parsed != "" {
						vi.Length = parsed
					}
				} else if m := regexp.MustCompile(`yt-badge-shape__text">([^<]+)<`).FindStringSubmatch(chunk); len(m) >= 2 {
					vi.Length = strings.TrimSpace(m[1])
				}
			}
		}

		// Thumbnail URL (first in thumbnails array) as a fallback only if not set
		if vi.ThumbnailURL == "" {
			if m := regexp.MustCompile(`"thumbnail":\{"thumbnails":\[\{"url":"([^"]+)"`).FindStringSubmatch(snippet); len(m) >= 2 {
				vi.ThumbnailURL = normalizeThumbURL(unescapeYT(m[1]))
			}
		}

		// Published time text (e.g., "3 days ago")
		if m := regexp.MustCompile(`"publishedTimeText":\{"simpleText":"([^"]+)"`).FindStringSubmatch(snippet); len(m) >= 2 {
			vi.PublishedText = m[1]
			vi.PublishedDate = parseRelativeToISO(m[1])
		}

		// Views
		if m := regexp.MustCompile(`"viewCountText":\{"simpleText":"([^"]+)"`).FindStringSubmatch(snippet); len(m) >= 2 {
			vi.ViewsText = m[1]
			vi.Views = parseCountText(m[1])
		} else if m := regexp.MustCompile(`"viewCountText":\{"runs":\[\{"text":"([^"]+)"`).FindStringSubmatch(snippet); len(m) >= 2 {
			vi.ViewsText = m[1] + " views"
			vi.Views = parseCountText(m[1])
		}

		videos = append(videos, vi)
	}

	// Attempt to derive a displayable channel handle/name
	channelDisplay := handle
	// Try to extract canonicalBaseUrl if present
	canRe := regexp.MustCompile(`"canonicalBaseUrl":"\\/(@[^\"]+)"`)
	if m := canRe.FindStringSubmatch(html); len(m) >= 2 {
		channelDisplay = m[1]
	}

	// Extract subscribers (header section)
	subText := ""
	// Try simpleText first
	if m := regexp.MustCompile(`"subscriberCountText":\{"simpleText":"([^"]+)"`).FindStringSubmatch(html); len(m) >= 2 {
		subText = m[1]
	} else {
		// Try runs: join all text segments inside subscriberCountText.runs
		if loc := regexp.MustCompile(`"subscriberCountText":\{"runs":\[`).FindStringIndex(html); loc != nil {
			// Take a slice starting at runs and limited length
			slice := html[loc[1]:]
			// Find the closing ]
			if endIdx := strings.Index(slice, "]}"); endIdx != -1 {
				runsChunk := slice[:endIdx]
				// Collect all text fields inside runs
				texts := regexp.MustCompile(`"text":"([^"]+)"`).FindAllStringSubmatch(runsChunk, -1)
				var parts []string
				for _, t := range texts {
					if len(t) >= 2 {
						parts = append(parts, unescapeYT(t[1]))
					}
				}
				subText = strings.Join(parts, "")
			}
		}
	}
	// Fallbacks: approximateSubscriberCount or localized patterns like "131 odběratelů"
	if subText == "" {
		if m := regexp.MustCompile(`"approximateSubscriberCount":"([^"]+)"`).FindStringSubmatch(html); len(m) >= 2 {
			subText = m[1]
		}
	}
	if subText == "" {
		// Case-insensitive; match digits with optional spaces/commas/dots before localized label
		if m := regexp.MustCompile(`(?i)([0-9][0-9\s\.,]*)\s*(odběratel(?:é|ů)?|subscribers?)`).FindStringSubmatch(html); len(m) >= 2 {
			subText = strings.TrimSpace(m[0])
		}
	}
	subs := parseCountText(subText)

	res := ChannelVideosResponse{
		Channel:         channelDisplay,
		ChannelURL:      channelURL,
		SubscribersText: subText,
		Subscribers:     subs,
		Videos:          videos,
	}
	return res, nil
}

// unescapeYT fixes escaped sequences in YouTube HTML JSON strings
func unescapeYT(s string) string {
	s = strings.ReplaceAll(s, `\/`, `/`)
	s = strings.ReplaceAll(s, `\u0026`, `&`)
	return s
}

// normalizeThumbURL ensures thumbnails use https and removes query artifacts if needed
func normalizeThumbURL(u string) string {
	u = unescapeYT(u)
	if strings.HasPrefix(u, "//") {
		u = "https:" + u
	}
	return u
}

// parseRelativeToISO converts strings like "3 days ago", "2 weeks ago", "1 year ago" to ISO date (yyyy-mm-dd)
func parseRelativeToISO(rel string) string {
	now := time.Now()
	lower := strings.ToLower(rel)
	re := regexp.MustCompile(`(\d+)[\s-]*(second|minute|hour|day|week|month|year)s?\s+ago`)
	if m := re.FindStringSubmatch(lower); len(m) >= 3 {
		n, _ := strconv.Atoi(m[1])
		unit := m[2]
		dur := time.Duration(0)
		switch unit {
		case "second":
			dur = time.Duration(n) * time.Second
			return now.Add(-dur).Format("2006-01-02")
		case "minute":
			dur = time.Duration(n) * time.Minute
			return now.Add(-dur).Format("2006-01-02")
		case "hour":
			dur = time.Duration(n) * time.Hour
			return now.Add(-dur).Format("2006-01-02")
		case "day":
			return now.AddDate(0, 0, -n).Format("2006-01-02")
		case "week":
			return now.AddDate(0, 0, -7*n).Format("2006-01-02")
		case "month":
			return now.AddDate(0, -n, 0).Format("2006-01-02")
		case "year":
			return now.AddDate(-n, 0, 0).Format("2006-01-02")
		}
	}
	// Sometimes YouTube uses "Streamed X days ago" or "Premiered ..."
	re2 := regexp.MustCompile(`(streamed|premiered|started|live)\s+(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago`)
	if m := re2.FindStringSubmatch(lower); len(m) >= 4 {
		n, _ := strconv.Atoi(m[2])
		unit := m[3]
		switch unit {
		case "second":
			return now.Add(-time.Duration(n) * time.Second).Format("2006-01-02")
		case "minute":
			return now.Add(-time.Duration(n) * time.Minute).Format("2006-01-02")
		case "hour":
			return now.Add(-time.Duration(n) * time.Hour).Format("2006-01-02")
		case "day":
			return now.AddDate(0, 0, -n).Format("2006-01-02")
		case "week":
			return now.AddDate(0, 0, -7*n).Format("2006-01-02")
		case "month":
			return now.AddDate(0, -n, 0).Format("2006-01-02")
		case "year":
			return now.AddDate(-n, 0, 0).Format("2006-01-02")
		}
	}
	return ""
}

// parseLocalizedDuration converts localized duration phrases (e.g., "5 minut a 59 sekund")
// into a mm:ss or hh:mm:ss string. Supports English and basic Czech variants.
func parseLocalizedDuration(s string) string {
	t := strings.ToLower(strings.TrimSpace(s))
	// Replace HTML entities and non-breaking spaces
	t = strings.ReplaceAll(t, "&nbsp;", " ")
	t = strings.ReplaceAll(t, "\u00a0", " ")
	t = strings.TrimSpace(t)

	// If already in 00:00 or 0:00:00 form, return as-is trimmed
	if m := regexp.MustCompile(`^\d{1,2}:\d{2}(?::\d{2})?$`).FindString(t); m != "" {
		return m
	}

	// Patterns like: 1 hour 2 minutes 3 seconds (EN)
	// or Czech: 1 hodina/hodiny/hodin, 2 minuty/minut, 3 sekundy/sekund
	// We'll extract numbers for h/m/s separately.
	var h, m, sec int

	// English capture
	if mm := regexp.MustCompile(`(\d+)\s*hour`).FindStringSubmatch(t); len(mm) >= 2 {
		h, _ = strconv.Atoi(mm[1])
	}
	if mm := regexp.MustCompile(`(\d+)\s*minute`).FindStringSubmatch(t); len(mm) >= 2 {
		m, _ = strconv.Atoi(mm[1])
	}
	if mm := regexp.MustCompile(`(\d+)\s*second`).FindStringSubmatch(t); len(mm) >= 2 {
		sec, _ = strconv.Atoi(mm[1])
	}

	// Czech capture
	if mm := regexp.MustCompile(`(\d+)\s*hodin(?:a|y)?`).FindStringSubmatch(t); len(mm) >= 2 {
		if h == 0 {
			h, _ = strconv.Atoi(mm[1])
		}
	}
	if mm := regexp.MustCompile(`(\d+)\s*minut(?:a|y)?`).FindStringSubmatch(t); len(mm) >= 2 {
		if m == 0 {
			m, _ = strconv.Atoi(mm[1])
		}
	}
	if mm := regexp.MustCompile(`(\d+)\s*sekund(?:a|y)?`).FindStringSubmatch(t); len(mm) >= 2 {
		if sec == 0 {
			sec, _ = strconv.Atoi(mm[1])
		}
	}

	// If we still didn't parse anything but string contains a plain number like "5 minutes",
	// ensure we at least capture minutes.
	if h == 0 && m == 0 && sec == 0 {
		if mm := regexp.MustCompile(`^(\d+)$`).FindStringSubmatch(t); len(mm) >= 2 {
			m, _ = strconv.Atoi(mm[1])
		}
	}

	// Build the time string
	if h > 0 {
		return fmt.Sprintf("%d:%02d:%02d", h, m, sec)
	}
	if m > 0 || sec > 0 {
		return fmt.Sprintf("%d:%02d", m, sec)
	}
	return ""
}

// parseCountText handles strings like "1,234 views", "12K subscribers", "3.4M"
func parseCountText(s string) int64 {
	t := strings.ToLower(strings.TrimSpace(s))
	// keep only the first number token
	re := regexp.MustCompile(`([0-9]+(?:\.[0-9]+)?)([kmb])?`)
	if m := re.FindStringSubmatch(t); len(m) >= 2 {
		numStr := m[1]
		suf := ""
		if len(m) >= 3 {
			suf = m[2]
		}
		f, err := strconv.ParseFloat(numStr, 64)
		if err != nil {
			return 0
		}
		switch suf {
		case "k":
			f *= 1_000
		case "m":
			f *= 1_000_000
		case "b":
			f *= 1_000_000_000
		}
		return int64(f)
	}
	// Fallback: strip non-digits and parse
	digits := regexp.MustCompile(`[^0-9]`).ReplaceAllString(t, "")
	if digits == "" {
		return 0
	}
	v, _ := strconv.ParseInt(digits, 10, 64)
	return v
}

func channelVideosHandler(w http.ResponseWriter, r *http.Request) {
	channel := r.URL.Query().Get("channel")
	if channel == "" {
		log.Println("Missing channel parameter")
		http.Error(w, "Missing channel parameter. Provide a handle like @FCBizoniUH, FCBBizoniUH, or a full channel URL.", http.StatusBadRequest)
		return
	}

	res, err := fetchChannelVideos(channel)
	if err != nil {
		log.Printf("Failed to fetch channel videos for %s: %v", channel, err)
		http.Error(w, "Failed to fetch channel videos", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(res)
}

// CORS Middleware
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Set CORS headers
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		// Handle preflight requests
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func rootHandler(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	response := map[string]interface{}{
		"status":  "ok",
		"service": "YouTube Scraper",
		"version": "1.0.0",
		"endpoints": map[string]string{
			"channel_videos": "/channel_videos?channel={handle_or_url}",
		},
	}
	json.NewEncoder(w).Encode(response)
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "7857"
	}

	mux := http.NewServeMux()

	// Create a new mux with CORS middleware
	handlerWithCORS := corsMiddleware(mux)

	// Register routes on the original mux
	mux.HandleFunc("/", rootHandler)
	mux.HandleFunc("/channel_videos", channelVideosHandler)

	log.Printf("YouTube Scraper starting on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, handlerWithCORS))
}
