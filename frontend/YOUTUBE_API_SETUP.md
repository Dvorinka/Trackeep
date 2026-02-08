# YouTube Scraping Service Setup Instructions

The YouTube functionality now uses a scraping service instead of the YouTube Data API. This avoids API quotas and provides real YouTube data.

## Setup:

### 1. Start the YouTube Scraping Service

The scraping service is a Go application that scrapes YouTube data without using YouTube API:

```bash
# Navigate to the backend directory
cd /path/to/trackeep/backend

# Run the YouTube scraper (you already have the code)
go run youtube_scraper.go
```

The scraper will start on `http://localhost:7857`

### 2. Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` if needed (default values should work):
```
VITE_YOUTUBE_SCRAPER_URL=http://localhost:7857
```

### 3. Restart Development Server

Stop and restart the frontend development server:
```bash
npm run dev
```

## Features Available with Scraping Service:

✅ **Real Channel Videos**: Latest videos from featured channels
✅ **No API Quotas**: Unlimited scraping without YouTube API limits
✅ **Accurate Metadata**: Real view counts, durations, publish dates
✅ **Channel Info**: Subscriber counts and channel details
✅ **Live Data**: Real-time YouTube data

## Scraping Service Endpoints:

- `GET /channel_videos?channel={handle_or_url}` - Get videos from a channel
- `GET /` - API documentation (opens in browser)

## Supported Channel Formats:

- Handles: `@Fireship`, `Fireship`
- Full URLs: `https://www.youtube.com/@Fireship/videos`
- Channel tabs: `/videos`, `/shorts`, `/streams`

## Fallback:

If the scraping service is not running, the app will fall back to demo mode with sample data.

## Troubleshooting:

1. **Scraper not running**: Start the Go scraper with `go run youtube_scraper.go`
2. **Port conflict**: The scraper uses port 7857 by default
3. **CORS issues**: The scraper includes CORS middleware for web applications
4. **Network issues**: Ensure the scraper can access YouTube

## Benefits Over YouTube API:

- ✅ No API key required
- ✅ No quota limits
- ✅ Real-time data
- ✅ No billing costs
- ✅ Works with any YouTube channel
