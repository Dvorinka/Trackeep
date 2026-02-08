package models

import (
	"time"

	"gorm.io/gorm"
)

// MarketplaceItem represents an item in the knowledge marketplace
type MarketplaceItem struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	// Creator information
	SellerID uint `json:"seller_id" gorm:"not null;index"`
	Seller   User `json:"seller,omitempty" gorm:"foreignKey:SellerID"`

	// Basic information
	Title       string `json:"title" gorm:"not null"`
	Description string `json:"description" gorm:"type:text"`
	Category    string `json:"category" gorm:"not null"` // course, template, tool, guide, resource

	// Content type and reference
	ContentType   string `json:"content_type" gorm:"not null"` // bookmark_collection, note_template, course, learning_path, tool
	ContentID     *uint  `json:"content_id,omitempty"`         // Reference to actual content
	ContentURL    string `json:"content_url"`                  // Download/access URL
	PreviewURL    string `json:"preview_url"`                  // Preview/demo URL
	Thumbnail     string `json:"thumbnail"`                    // Item thumbnail

	// Pricing
	Price         float64 `json:"price" gorm:"default:0"`         // Price in USD
	Currency      string  `json:"currency" gorm:"default:USD"`  // Currency code
	IsFree        bool    `json:"is_free" gorm:"default:false"`  // Free item
	Subscription  bool    `json:"subscription" gorm:"default:false"` // Subscription-based
	SubscriptionPrice float64 `json:"subscription_price" gorm:"default:0"` // Monthly subscription price

	// Ratings and reviews
	Rating       float64 `json:"rating" gorm:"default:0"`       // Average rating (1-5)
	ReviewCount  int     `json:"review_count" gorm:"default:0"` // Number of reviews
	DownloadCount int    `json:"download_count" gorm:"default:0"` // Number of downloads

	// Status and visibility
	Status       string `json:"status" gorm:"default:draft"` // draft, published, suspended, removed
	IsFeatured   bool   `json:"is_featured" gorm:"default:false"` // Featured item
	IsApproved   bool   `json:"is_approved" gorm:"default:false"` // Admin approved
	ApprovedAt   *time.Time `json:"approved_at,omitempty"`
	ApprovedBy   *uint  `json:"approved_by,omitempty"`
	Approver     *User  `json:"approver,omitempty" gorm:"foreignKey:ApprovedBy"`

	// Tags and metadata
	Tags        []MarketplaceTag `json:"tags,omitempty" gorm:"many2many:marketplace_item_tags;"`
	License     string           `json:"license" gorm:"default:standard"` // License type
	Version     string           `json:"version" gorm:"default:1.0"`     // Version
	LastUpdated *time.Time       `json:"last_updated,omitempty"`

	// Analytics
	ViewCount    int       `json:"view_count" gorm:"default:0"`
	LastViewedAt *time.Time `json:"last_viewed_at,omitempty"`

	// Relationships
	Reviews     []MarketplaceReview     `json:"reviews,omitempty" gorm:"foreignKey:ItemID"`
	Purchases   []MarketplacePurchase   `json:"purchases,omitempty" gorm:"foreignKey:ItemID"`
}

// MarketplaceTag represents tags for marketplace items
type MarketplaceTag struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	Name        string `json:"name" gorm:"uniqueIndex;not null"`
	Description string `json:"description"`
	Color       string `json:"color" gorm:"default:#6366f1"` // Tag color
	UsageCount  int    `json:"usage_count" gorm:"default:0"`
}

// MarketplaceReview represents a review for a marketplace item
type MarketplaceReview struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	// Review information
	ItemID     uint  `json:"item_id" gorm:"not null;index"`
	Item       MarketplaceItem `json:"item,omitempty" gorm:"foreignKey:ItemID"`
	ReviewerID uint  `json:"reviewer_id" gorm:"not null;index"`
	Reviewer   User  `json:"reviewer,omitempty" gorm:"foreignKey:ReviewerID"`

	// Review content
	Rating  int    `json:"rating" gorm:"not null;check:rating >= 1 AND rating <= 5"` // 1-5 stars
	Title   string `json:"title"`
	Content string `json:"content" gorm:"type:text"`

	// Review metadata
	HelpfulCount int       `json:"helpful_count" gorm:"default:0"`
	IsVerified   bool      `json:"is_verified" gorm:"default:false"` // Verified purchase
	PurchaseID   *uint     `json:"purchase_id,omitempty"`
	ReviewedAt   time.Time `json:"reviewed_at"`

	// Status
	Status string `json:"status" gorm:"default:published"` // published, hidden, removed
}

// MarketplacePurchase represents a purchase from the marketplace
type MarketplacePurchase struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	// Purchase information
	ItemID    uint `json:"item_id" gorm:"not null;index"`
	Item      MarketplaceItem `json:"item,omitempty" gorm:"foreignKey:ItemID"`
	BuyerID   uint `json:"buyer_id" gorm:"not null;index"`
	Buyer     User `json:"buyer,omitempty" gorm:"foreignKey:BuyerID"`

	// Purchase details
	Price        float64 `json:"price" gorm:"not null"`
	Currency     string  `json:"currency" gorm:"default:USD"`
	PaymentMethod string `json:"payment_method"` // stripe, paypal, crypto
	TransactionID string `json:"transaction_id" gorm:"uniqueIndex"`

	// License and access
	LicenseType  string    `json:"license_type" gorm:"default:personal"` // personal, commercial, enterprise
	AccessGranted bool     `json:"access_granted" gorm:"default:true"`
	ExpiresAt    *time.Time `json:"expires_at,omitempty"` // For subscriptions

	// Status
	Status string `json:"status" gorm:"default:completed"` // pending, completed, refunded, cancelled
	RefundedAt *time.Time `json:"refunded_at,omitempty"`
	RefundReason string `json:"refund_reason,omitempty"`

	// Analytics
	DownloadCount int       `json:"download_count" gorm:"default:0"`
	LastDownloadAt *time.Time `json:"last_download_at,omitempty"`
}

// ContentShare represents shared content links
type ContentShare struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	// Owner information
	OwnerID uint `json:"owner_id" gorm:"not null;index"`
	Owner   User `json:"owner,omitempty" gorm:"foreignKey:OwnerID"`

	// Content information
	ContentType string `json:"content_type" gorm:"not null"` // bookmark, note, file, task, goal
	ContentID   uint   `json:"content_id" gorm:"not null"`

	// Share settings
	ShareToken   string `json:"share_token" gorm:"uniqueIndex;not null"`
	ShareURL     string `json:"share_url"`
	Title        string `json:"title"`
	Description  string `json:"description"`
	Password     string `json:"-" gorm:"column:password"` // Optional password protection
	ExpiresAt    *time.Time `json:"expires_at,omitempty"`

	// Access control
	AllowDownload bool `json:"allow_download" gorm:"default:true"`
	AllowComment  bool `json:"allow_comment" gorm:"default:false"`
	AllowEdit     bool `json:"allow_edit" gorm:"default:false"`

	// Analytics
	ViewCount    int       `json:"view_count" gorm:"default:0"`
	DownloadCount int      `json:"download_count" gorm:"default:0"`
	LastAccessedAt *time.Time `json:"last_accessed_at,omitempty"`

	// Status
	IsActive bool `json:"is_active" gorm:"default:true"`
}

// BeforeCreate hooks
func (m *MarketplaceItem) BeforeCreate(tx *gorm.DB) error {
	if m.Status == "" {
		m.Status = "draft"
	}
	if m.Currency == "" {
		m.Currency = "USD"
	}
	if m.Version == "" {
		m.Version = "1.0"
	}
	if m.License == "" {
		m.License = "standard"
	}
	return nil
}

func (r *MarketplaceReview) BeforeCreate(tx *gorm.DB) error {
	if r.Status == "" {
		r.Status = "published"
	}
	r.ReviewedAt = time.Now()
	return nil
}

func (p *MarketplacePurchase) BeforeCreate(tx *gorm.DB) error {
	if p.Status == "" {
		p.Status = "completed"
	}
	if p.Currency == "" {
		p.Currency = "USD"
	}
	if p.LicenseType == "" {
		p.LicenseType = "personal"
	}
	return nil
}

func (s *ContentShare) BeforeCreate(tx *gorm.DB) error {
	if s.ShareToken == "" {
		// Generate a unique share token
		s.ShareToken = generateShareToken()
	}
	return nil
}

// Helper function to generate share tokens
func generateShareToken() string {
	// This should generate a cryptographically secure random token
	// For now, using a simple implementation
	return "share_" + time.Now().Format("20060102150405")
}
