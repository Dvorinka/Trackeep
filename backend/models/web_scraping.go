package models

import (
	"time"

	"gorm.io/gorm"
)

// ScrapedContent represents content extracted from web pages
type ScrapedContent struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	UserID uint `json:"user_id" gorm:"not null;index"`
	User   User `json:"user,omitempty" gorm:"foreignKey:UserID"`

	// Source information
	URL           string `json:"url" gorm:"not null"`
	Domain        string `json:"domain"`
	Title         string `json:"title"`
	Description   string `json:"description"`
	Author        string `json:"author"`
	PublishedDate *time.Time `json:"published_date"`
	LastScraped   time.Time `json:"last_scraped"`

	// Extracted content
	Content       string `json:"content" gorm:"type:text"`
	Summary       string `json:"summary" gorm:"type:text"`
	Keywords      []string `json:"keywords" gorm:"serializer:json"`
	Tags          []Tag `json:"tags,omitempty" gorm:"many2many:scraped_content_tags;"`
	Images        []ScrapedImage `json:"images,omitempty" gorm:"foreignKey:ScrapedContentID"`
	Links         []ScrapedLink `json:"links,omitempty" gorm:"foreignKey:ScrapedContentID"`
	Videos        []ScrapedVideo `json:"videos,omitempty" gorm:"foreignKey:ScrapedContentID"`

	// Content analysis
	ContentType   string  `json:"content_type"` // article, blog, news, tutorial, documentation
	WordCount     int     `json:"word_count"`
	ReadingTime   int     `json:"reading_time"` // estimated minutes
	Difficulty    string  `json:"difficulty"`  // beginner, intermediate, advanced
	QualityScore  float64 `json:"quality_score"` // 0-100

	// Processing status
	Status        string `json:"status" gorm:"default:pending"` // pending, processing, completed, failed
	ErrorMessage  string `json:"error_message"`
	ProcessingLog string `json:"processing_log" gorm:"type:text"`

	// Relationships
	BookmarkID    *uint    `json:"bookmark_id,omitempty"`
	Bookmark      *Bookmark `json:"bookmark,omitempty" gorm:"foreignKey:BookmarkID"`
	NoteID        *uint    `json:"note_id,omitempty"`
	Note          *Note    `json:"note,omitempty" gorm:"foreignKey:NoteID"`
}

// ScrapedImage represents images extracted from web pages
type ScrapedImage struct {
	ID               uint           `json:"id" gorm:"primaryKey"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        gorm.DeletedAt `json:"-" gorm:"index"`

	ScrapedContentID uint           `json:"scraped_content_id" gorm:"not null;index"`
	ScrapedContent   ScrapedContent `json:"scraped_content,omitempty" gorm:"foreignKey:ScrapedContentID"`

	URL          string `json:"url"`
	AltText      string `json:"alt_text"`
	Title        string `json:"title"`
	Width        int    `json:"width"`
	Height       int    `json:"height"`
	Format       string `json:"format"` // jpg, png, gif, svg, webp
	Size         int64  `json:"size"`   // bytes in bytes
	IsMainImage  bool   `json:"is_main_image" gorm:"default:false"`
	LocalPath    string `json:"local_path"` // if downloaded
	ThumbnailPath string `json:"thumbnail_path"` // if thumbnail generated
}

// ScrapedLink represents links extracted from web pages
type ScrapedLink struct {
	ID               uint           `json:"id" gorm:"primaryKey"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        gorm.DeletedAt `json:"-" gorm:"index"`

	ScrapedContentID uint           `json:"scraped_content_id" gorm:"not null;index"`
	ScrapedContent   ScrapedContent `json:"scraped_content,omitempty" gorm:"foreignKey:ScrapedContentID"`

	URL         string `json:"url"`
	Text        string `json:"text"`
	Title       string `json:"title"`
	LinkType    string `json:"link_type"` // internal, external, download, email
	IsNoFollow  bool   `json:"is_no_follow"`
	IsSponsored bool   `json:"is_sponsored"`
	Domain      string `json:"domain"`
}

// ScrapedVideo represents videos extracted from web pages
type ScrapedVideo struct {
	ID               uint           `json:"id" gorm:"primaryKey"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        gorm.DeletedAt `json:"-" gorm:"index"`

	ScrapedContentID uint           `json:"scraped_content_id" gorm:"not null;index"`
	ScrapedContent   ScrapedContent `json:"scraped_content,omitempty" gorm:"foreignKey:ScrapedContentID"`

	URL          string `json:"url"`
	Title        string `json:"title"`
	Description  string `json:"description"`
	Duration     string `json:"duration"` // in format "HH:MM:SS"
	Thumbnail    string `json:"thumbnail"`
	Platform     string `json:"platform"` // youtube, vimeo, twitch, etc.
	VideoID      string `json:"video_id"` // platform-specific ID
	IsEmbeddable bool   `json:"is_embeddable"`
}

// ScrapingJob represents a web scraping job
type ScrapingJob struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	UserID uint `json:"user_id" gorm:"not null;index"`
	User   User `json:"user,omitempty" gorm:"foreignKey:UserID"`

	// Job details
	URL           string `json:"url" gorm:"not null"`
	JobType       string `json:"job_type" gorm:"default:full_scrape"` // full_scrape, content_only, images_only, links_only
	Priority      string `json:"priority" gorm:"default:normal"` // low, normal, high, urgent
	Status        string `json:"status" gorm:"default:pending"` // pending, processing, completed, failed, cancelled

	// Processing options
	ExtractImages    bool `json:"extract_images" gorm:"default:true"`
	ExtractLinks     bool `json:"extract_links" gorm:"default:true"`
	ExtractVideos    bool `json:"extract_videos" gorm:"default:true"`
	GenerateSummary  bool `json:"generate_summary" gorm:"default:true"`
	DownloadImages   bool `json:"download_images" gorm:"default:false"`
	ExtractMetadata  bool `json:"extract_metadata" gorm:"default:true"`

	// Timing and results
	StartedAt   *time.Time `json:"started_at,omitempty"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`
	Progress    float64    `json:"progress" gorm:"default:0"` // 0-100
	ErrorMessage string    `json:"error_message"`

	// Relationships
	ScrapedContentID *uint          `json:"scraped_content_id,omitempty"`
	ScrapedContent   *ScrapedContent `json:"scraped_content,omitempty" gorm:"foreignKey:ScrapedContentID"`
}

// BeforeCreate hooks
func (s *ScrapedContent) BeforeCreate(tx *gorm.DB) error {
	if s.Status == "" {
		s.Status = "pending"
	}
	if s.LastScraped.IsZero() {
		s.LastScraped = time.Now()
	}
	return nil
}

func (j *ScrapingJob) BeforeCreate(tx *gorm.DB) error {
	if j.Status == "" {
		j.Status = "pending"
	}
	if j.Priority == "" {
		j.Priority = "normal"
	}
	if j.JobType == "" {
		j.JobType = "full_scrape"
	}
	return nil
}
