package models

import (
	"regexp"
	"strings"
	"time"

	"gorm.io/gorm"
)

// WikiPage represents a page in the knowledge base/wiki
type WikiPage struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	UserID uint `json:"user_id" gorm:"not null;index"`
	User   User `json:"user,omitempty" gorm:"foreignKey:UserID"`

	// Basic page information
	Title   string `json:"title" gorm:"not null"`
	Slug    string `json:"slug" gorm:"not null;uniqueIndex"`
	Content string `json:"content" gorm:"type:text"`
	Summary string `json:"summary" gorm:"type:text"`
	Status  string `json:"status" gorm:"default:draft"` // draft, published, archived

	// Organization
	CategoryID *uint      `json:"category_id,omitempty"`
	Category   *Category  `json:"category,omitempty" gorm:"foreignKey:CategoryID"`
	ParentID   *uint      `json:"parent_id,omitempty"`
	Parent     *WikiPage  `json:"parent,omitempty" gorm:"foreignKey:ParentID"`
	Children   []WikiPage `json:"children,omitempty" gorm:"foreignKey:ParentID"`

	// Metadata
	Tags         []Tag      `json:"tags,omitempty" gorm:"many2many:wiki_page_tags;"`
	Keywords     []string   `json:"keywords" gorm:"serializer:json"`
	ReadingTime  int        `json:"reading_time"` // estimated minutes
	WordCount    int        `json:"word_count"`
	ViewCount    int        `json:"view_count" gorm:"default:0"`
	LastViewedAt *time.Time `json:"last_viewed_at,omitempty"`
	IsPublic     bool       `json:"is_public" gorm:"default:false"`
	IsTemplate   bool       `json:"is_template" gorm:"default:false"`
	TemplateID   *uint      `json:"template_id,omitempty"`
	Template     *WikiPage  `json:"template,omitempty" gorm:"foreignKey:TemplateID"`

	// Collaboration
	IsCollaborative bool   `json:"is_collaborative" gorm:"default:false"`
	Collaborators   []User `json:"collaborators,omitempty" gorm:"many2many:wiki_collaborators;"`
	LastEditedBy    *uint  `json:"last_edited_by,omitempty"`
	LastEditedUser  *User  `json:"last_edited_user,omitempty" gorm:"foreignKey:LastEditedBy"`
	EditCount       int    `json:"edit_count" gorm:"default:0"`

	// Relationships
	Versions    []WikiVersion    `json:"versions,omitempty" gorm:"foreignKey:WikiPageID"`
	Backlinks   []WikiBacklink   `json:"backlinks,omitempty" gorm:"foreignKey:TargetPageID"`
	Attachments []WikiAttachment `json:"attachments,omitempty" gorm:"foreignKey:WikiPageID"`
	Bookmarks   []Bookmark       `json:"bookmarks,omitempty" gorm:"foreignKey:WikiPageID"`
	Notes       []Note           `json:"notes,omitempty" gorm:"foreignKey:WikiPageID"`
}

// Category represents a category for organizing wiki pages
type Category struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	UserID uint `json:"user_id" gorm:"not null;index"`
	User   User `json:"user,omitempty" gorm:"foreignKey:UserID"`

	Name        string     `json:"name" gorm:"not null"`
	Slug        string     `json:"slug" gorm:"not null;uniqueIndex"`
	Description string     `json:"description"`
	Color       string     `json:"color" gorm:"default:#6366f1"`
	Icon        string     `json:"icon"`
	ParentID    *uint      `json:"parent_id,omitempty"`
	Parent      *Category  `json:"parent,omitempty" gorm:"foreignKey:ParentID"`
	Children    []Category `json:"children,omitempty" gorm:"foreignKey:ParentID"`
	IsPublic    bool       `json:"is_public" gorm:"default:false"`
	SortOrder   int        `json:"sort_order" gorm:"default:0"`

	// Relationships
	Pages []WikiPage `json:"pages,omitempty" gorm:"foreignKey:CategoryID"`
}

// WikiVersion represents a version history of a wiki page
type WikiVersion struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	WikiPageID uint     `json:"wiki_page_id" gorm:"not null;index"`
	WikiPage   WikiPage `json:"wiki_page,omitempty" gorm:"foreignKey:WikiPageID"`

	VersionNumber int    `json:"version_number" gorm:"not null"`
	Title         string `json:"title" gorm:"not null"`
	Content       string `json:"content" gorm:"type:text"`
	Summary       string `json:"summary" gorm:"type:text"`
	ChangeLog     string `json:"change_log" gorm:"type:text"`

	// Author information
	AuthorID uint `json:"author_id" gorm:"not null"`
	Author   User `json:"author,omitempty" gorm:"foreignKey:AuthorID"`

	// Version metadata
	WordCount         int  `json:"word_count"`
	CharactersAdded   int  `json:"characters_added"`
	CharactersRemoved int  `json:"characters_removed"`
	IsMinorChange     bool `json:"is_minor_change" gorm:"default:false"`
}

// WikiBacklink represents a link between wiki pages
type WikiBacklink struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	SourcePageID uint     `json:"source_page_id" gorm:"not null;index"`
	SourcePage   WikiPage `json:"source_page,omitempty" gorm:"foreignKey:SourcePageID"`
	TargetPageID uint     `json:"target_page_id" gorm:"not null;index"`
	TargetPage   WikiPage `json:"target_page,omitempty" gorm:"foreignKey:TargetPageID"`

	LinkText string `json:"link_text"`
	Context  string `json:"context" gorm:"type:text"` // Surrounding text where the link appears
}

// WikiAttachment represents files attached to wiki pages
type WikiAttachment struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	WikiPageID uint     `json:"wiki_page_id" gorm:"not null;index"`
	WikiPage   WikiPage `json:"wiki_page,omitempty" gorm:"foreignKey:WikiPageID"`

	FileName     string `json:"file_name" gorm:"not null"`
	OriginalName string `json:"original_name" gorm:"not null"`
	FilePath     string `json:"file_path" gorm:"not null"`
	FileSize     int64  `json:"file_size"`
	MimeType     string `json:"mime_type"`
	Width        int    `json:"width"`  // For images
	Height       int    `json:"height"` // For images
	Thumbnail    string `json:"thumbnail"`
	Description  string `json:"description"`
	IsPublic     bool   `json:"is_public" gorm:"default:false"`
}

// Template represents reusable page templates
type Template struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	UserID uint `json:"user_id" gorm:"not null;index"`
	User   User `json:"user,omitempty" gorm:"foreignKey:UserID"`

	Name        string `json:"name" gorm:"not null"`
	Slug        string `json:"slug" gorm:"not null;uniqueIndex"`
	Description string `json:"description"`
	Content     string `json:"content" gorm:"type:text"`
	Category    string `json:"category"` // meeting, project, documentation, etc.
	IsPublic    bool   `json:"is_public" gorm:"default:false"`
	UsageCount  int    `json:"usage_count" gorm:"default:0"`

	// Template variables
	Variables []TemplateVariable `json:"variables,omitempty" gorm:"foreignKey:TemplateID"`
}

// TemplateVariable represents variables in templates
type TemplateVariable struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	TemplateID uint     `json:"template_id" gorm:"not null;index"`
	Template   Template `json:"template,omitempty" gorm:"foreignKey:TemplateID"`

	Name         string `json:"name" gorm:"not null"`
	Type         string `json:"type" gorm:"not null"` // text, number, date, select
	DefaultValue string `json:"default_value"`
	Required     bool   `json:"required" gorm:"default:false"`
	Description  string `json:"description"`
	Options      string `json:"options" gorm:"serializer:json"` // For select type
}

// BeforeCreate hooks
func (w *WikiPage) BeforeCreate(tx *gorm.DB) error {
	if w.Status == "" {
		w.Status = "draft"
	}
	if w.Slug == "" && w.Title != "" {
		w.Slug = generateSlug(w.Title)
	}
	return nil
}

func (c *Category) BeforeCreate(tx *gorm.DB) error {
	if c.Slug == "" && c.Name != "" {
		c.Slug = generateSlug(c.Name)
	}
	return nil
}

func (t *Template) BeforeCreate(tx *gorm.DB) error {
	if t.Slug == "" && t.Name != "" {
		t.Slug = generateSlug(t.Name)
	}
	return nil
}

// BeforeUpdate hooks
func (w *WikiPage) BeforeUpdate(tx *gorm.DB) error {
	if w.Title != "" {
		w.Slug = generateSlug(w.Title)
	}
	if w.Content != "" {
		w.WordCount = len(strings.Fields(w.Content))
		w.ReadingTime = estimateReadingTime(w.WordCount)
	}
	return nil
}

// Helper functions
func generateSlug(title string) string {
	// Simple slug generation - in production, you'd want more sophisticated handling
	slug := strings.ToLower(title)
	slug = strings.ReplaceAll(slug, " ", "-")
	slug = regexp.MustCompile(`[^a-z0-9-]`).ReplaceAllString(slug, "")
	slug = regexp.MustCompile(`-+`).ReplaceAllString(slug, "-")
	slug = strings.Trim(slug, "-")
	return slug
}

func estimateReadingTime(wordCount int) int {
	readingSpeed := 225 // words per minute
	readingTime := wordCount / readingSpeed
	if readingTime < 1 {
		readingTime = 1
	}
	return readingTime
}
