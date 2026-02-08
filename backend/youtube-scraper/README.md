# YouTube Scraper Service

A standalone microservice for scraping YouTube video data. This service runs independently from the main Trackeep application.

## Features

- **Mock YouTube Data**: Provides mock YouTube video data for development and testing
- **Channel Videos**: Fetch videos from specific YouTube channels
- **Search**: Search through YouTube video metadata
- **REST API**: Simple REST endpoints for integration

## API Endpoints

### Health Check
```
GET /
```
Returns service status and information.

### Get Channel Videos
```
GET /channel_videos?channel={channel_name}
```
Fetches videos for a specific YouTube channel.

**Parameters:**
- `channel`: YouTube channel name (e.g., "@Fireship", "@NetworkChuck")

### Search Videos
```
GET /search?q={query}
```
Searches through video titles, descriptions, and channel names.

**Parameters:**
- `q`: Search query

## Running the Service

### Development
```bash
cd youtube-scraper
go run .
```

### Production
```bash
cd youtube-scraper
go build -o youtube-scraper .
./youtube-scraper
```

### Docker
```bash
docker build -f ../Dockerfile.youtube-scraper -t youtube-scraper ..
docker run -p 7857:7857 youtube-scraper
```

## Environment Variables

- `PORT`: Service port (default: 7857)

## Mock Data

The service includes mock data for popular tech YouTube channels:
- @Fireship
- @NetworkChuck
- @beyondfireship
- @LinusTechTips
- @Mrwhosetheboss
- @JerryRigEverything
- @JeffGeerling
- @mkbhd

## Integration

This service is designed to be called by the main Trackeep application via HTTP requests. The main app can be configured to use this service for YouTube-related features.
