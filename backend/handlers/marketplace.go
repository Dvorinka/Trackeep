package handlers

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/trackeep/backend/models"
	"gorm.io/gorm"
)

type MarketplaceHandler struct {
	db *gorm.DB
}

func NewMarketplaceHandler(db *gorm.DB) *MarketplaceHandler {
	return &MarketplaceHandler{db: db}
}

// GetMarketplaceItems returns all marketplace items with filtering
func (h *MarketplaceHandler) GetMarketplaceItems(c *gin.Context) {
	var items []models.MarketplaceItem
	query := h.db.Preload("Seller").Preload("Tags")

	// Filter by category
	if category := c.Query("category"); category != "" {
		query = query.Where("category = ?", category)
	}

	// Filter by content type
	if contentType := c.Query("content_type"); contentType != "" {
		query = query.Where("content_type = ?", contentType)
	}

	// Filter by price range
	if minPrice := c.Query("min_price"); minPrice != "" {
		if price, err := strconv.ParseFloat(minPrice, 64); err == nil {
			query = query.Where("price >= ?", price)
		}
	}
	if maxPrice := c.Query("max_price"); maxPrice != "" {
		if price, err := strconv.ParseFloat(maxPrice, 64); err == nil {
			query = query.Where("price <= ?", price)
		}
	}

	// Filter by free items
	if isFree := c.Query("is_free"); isFree == "true" {
		query = query.Where("is_free = ?", true)
	}

	// Filter by featured items
	if featured := c.Query("featured"); featured == "true" {
		query = query.Where("is_featured = ?", true)
	}

	// Filter by status (only show published items for public)
	query = query.Where("status = ? AND is_approved = ?", "published", true)

	// Search by title or description
	if search := c.Query("search"); search != "" {
		// Escape special SQL characters to prevent SQL injection
		escapedSearch := strings.ReplaceAll(search, "%", "\\%")
		escapedSearch = strings.ReplaceAll(escapedSearch, "_", "\\_")
		query = query.Where("title ILIKE ? OR description ILIKE ?", "%"+escapedSearch+"%", "%"+escapedSearch+"%")
	}

	// Sort by
	sortBy := c.DefaultQuery("sort", "created_at")
	switch sortBy {
	case "rating":
		query = query.Order("rating DESC, review_count DESC")
	case "downloads":
		query = query.Order("download_count DESC")
	case "price_low":
		query = query.Order("price ASC")
	case "price_high":
		query = query.Order("price DESC")
	case "views":
		query = query.Order("view_count DESC")
	case "created_at":
		query = query.Order("created_at DESC")
	default:
		query = query.Order("created_at DESC")
	}

	// Pagination
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset := (page - 1) * limit

	var total int64
	query.Model(&models.MarketplaceItem{}).Count(&total)

	if err := query.Offset(offset).Limit(limit).Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch marketplace items"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"items": items,
		"pagination": gin.H{
			"page":  page,
			"limit": limit,
			"total": total,
			"pages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}

// GetMarketplaceItem returns a specific marketplace item
func (h *MarketplaceHandler) GetMarketplaceItem(c *gin.Context) {
	id := c.Param("id")
	var item models.MarketplaceItem

	if err := h.db.Preload("Seller").Preload("Tags").Preload("Reviews").Preload("Reviews.Reviewer").First(&item, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Marketplace item not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch marketplace item"})
		return
	}

	// Increment view count
	h.db.Model(&item).UpdateColumn("view_count", gorm.Expr("view_count + 1"))
	h.db.Model(&item).Update("last_viewed_at", time.Now())

	c.JSON(http.StatusOK, item)
}

// CreateMarketplaceItem creates a new marketplace item
func (h *MarketplaceHandler) CreateMarketplaceItem(c *gin.Context) {
	userID := c.GetUint("user_id")
	var item models.MarketplaceItem

	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	item.SellerID = userID
	item.Status = "draft" // Items start as draft and need approval

	if err := h.db.Create(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create marketplace item"})
		return
	}

	c.JSON(http.StatusCreated, item)
}

// UpdateMarketplaceItem updates an existing marketplace item
func (h *MarketplaceHandler) UpdateMarketplaceItem(c *gin.Context) {
	id := c.Param("id")
	userID := c.GetUint("user_id")
	var item models.MarketplaceItem

	if err := h.db.First(&item, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Marketplace item not found"})
		return
	}

	// Check if user is the seller
	if item.SellerID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "You can only update your own items"})
		return
	}

	var updateData models.MarketplaceItem
	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update allowed fields
	item.Title = updateData.Title
	item.Description = updateData.Description
	item.Category = updateData.Category
	item.ContentType = updateData.ContentType
	item.ContentURL = updateData.ContentURL
	item.PreviewURL = updateData.PreviewURL
	item.Thumbnail = updateData.Thumbnail
	item.Price = updateData.Price
	item.Currency = updateData.Currency
	item.IsFree = updateData.IsFree
	item.Subscription = updateData.Subscription
	item.SubscriptionPrice = updateData.SubscriptionPrice
	item.License = updateData.License
	item.Version = updateData.Version
	item.LastUpdated = &time.Time{}
	*item.LastUpdated = time.Now()

	if err := h.db.Save(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update marketplace item"})
		return
	}

	c.JSON(http.StatusOK, item)
}

// DeleteMarketplaceItem deletes a marketplace item
func (h *MarketplaceHandler) DeleteMarketplaceItem(c *gin.Context) {
	id := c.Param("id")
	userID := c.GetUint("user_id")
	var item models.MarketplaceItem

	if err := h.db.First(&item, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Marketplace item not found"})
		return
	}

	// Check if user is the seller
	if item.SellerID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "You can only delete your own items"})
		return
	}

	if err := h.db.Delete(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete marketplace item"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Marketplace item deleted successfully"})
}

// GetMyMarketplaceItems returns current user's marketplace items
func (h *MarketplaceHandler) GetMyMarketplaceItems(c *gin.Context) {
	userID := c.GetUint("user_id")
	var items []models.MarketplaceItem

	if err := h.db.Preload("Tags").Where("seller_id = ?", userID).Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch your marketplace items"})
		return
	}

	c.JSON(http.StatusOK, items)
}

// CreateMarketplaceReview creates a new review for a marketplace item
func (h *MarketplaceHandler) CreateMarketplaceReview(c *gin.Context) {
	userID := c.GetUint("user_id")
	itemID := c.Param("id")

	var review models.MarketplaceReview
	if err := c.ShouldBindJSON(&review); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if item exists
	var item models.MarketplaceItem
	if err := h.db.First(&item, itemID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Marketplace item not found"})
		return
	}

	// Check if user already reviewed this item
	var existingReview models.MarketplaceReview
	if err := h.db.Where("item_id = ? AND reviewer_id = ?", itemID, userID).First(&existingReview).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "You have already reviewed this item"})
		return
	}

	review.ItemID = item.ID
	review.ReviewerID = userID

	// Start transaction
	tx := h.db.Begin()

	// Create review
	if err := tx.Create(&review).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create review"})
		return
	}

	// Update item rating
	var avgRating float64
	var reviewCount int64
	tx.Model(&models.MarketplaceReview{}).Where("item_id = ? AND status = ?", itemID, "published").Select("AVG(rating)").Scan(&avgRating)
	tx.Model(&models.MarketplaceReview{}).Where("item_id = ? AND status = ?", itemID, "published").Count(&reviewCount)

	tx.Model(&item).Updates(map[string]interface{}{
		"rating":       avgRating,
		"review_count": reviewCount,
	})

	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create review"})
		return
	}

	c.JSON(http.StatusCreated, review)
}

// GetMarketplaceReviews returns reviews for a marketplace item
func (h *MarketplaceHandler) GetMarketplaceReviews(c *gin.Context) {
	itemID := c.Param("id")
	var reviews []models.MarketplaceReview

	if err := h.db.Preload("Reviewer").Where("item_id = ? AND status = ?", itemID, "published").Find(&reviews).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch reviews"})
		return
	}

	c.JSON(http.StatusOK, reviews)
}

// CreateContentShare creates a new content share link
func (h *MarketplaceHandler) CreateContentShare(c *gin.Context) {
	userID := c.GetUint("user_id")
	var share models.ContentShare

	if err := c.ShouldBindJSON(&share); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	share.OwnerID = userID
	share.ShareURL = "/shared/" + share.ShareToken

	if err := h.db.Create(&share).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create content share"})
		return
	}

	c.JSON(http.StatusCreated, share)
}

// GetContentShare returns a shared content by token
func (h *MarketplaceHandler) GetContentShare(c *gin.Context) {
	token := c.Param("token")
	var share models.ContentShare

	if err := h.db.Preload("Owner").Where("share_token = ? AND is_active = ?", token, true).First(&share).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Shared content not found"})
		return
	}

	// Check if share has expired
	if share.ExpiresAt != nil && share.ExpiresAt.Before(time.Now()) {
		c.JSON(http.StatusGone, gin.H{"error": "Shared content has expired"})
		return
	}

	// Increment view count
	h.db.Model(&share).UpdateColumn("view_count", gorm.Expr("view_count + 1"))
	h.db.Model(&share).Update("last_accessed_at", time.Now())

	// Get the actual content based on content type
	var content interface{}
	switch share.ContentType {
	case "bookmark":
		var bookmark models.Bookmark
		if err := h.db.Where("id = ? AND user_id = ?", share.ContentID, share.OwnerID).First(&bookmark).Error; err == nil {
			content = bookmark
		}
	case "note":
		var note models.Note
		if err := h.db.Where("id = ? AND user_id = ?", share.ContentID, share.OwnerID).First(&note).Error; err == nil {
			content = note
		}
	case "file":
		var file models.File
		if err := h.db.Where("id = ? AND user_id = ?", share.ContentID, share.OwnerID).First(&file).Error; err == nil {
			content = file
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"share":   share,
		"content": content,
	})
}

// GetMyContentShares returns current user's content shares
func (h *MarketplaceHandler) GetMyContentShares(c *gin.Context) {
	userID := c.GetUint("user_id")
	var shares []models.ContentShare

	if err := h.db.Where("owner_id = ?", userID).Find(&shares).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch your content shares"})
		return
	}

	c.JSON(http.StatusOK, shares)
}

// DeleteContentShare deletes a content share
func (h *MarketplaceHandler) DeleteContentShare(c *gin.Context) {
	id := c.Param("id")
	userID := c.GetUint("user_id")
	var share models.ContentShare

	if err := h.db.First(&share, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Content share not found"})
		return
	}

	// Check if user is the owner
	if share.OwnerID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "You can only delete your own shares"})
		return
	}

	if err := h.db.Delete(&share).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete content share"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Content share deleted successfully"})
}

// GetMarketplaceStats returns marketplace statistics
func (h *MarketplaceHandler) GetMarketplaceStats(c *gin.Context) {
	var stats struct {
		TotalItems     int64   `json:"total_items"`
		TotalSellers   int64   `json:"total_sellers"`
		TotalBuyers    int64   `json:"total_buyers"`
		TotalRevenue   float64 `json:"total_revenue"`
		AverageRating  float64 `json:"average_rating"`
		TotalReviews   int64   `json:"total_reviews"`
		TotalDownloads int64   `json:"total_downloads"`
	}

	h.db.Model(&models.MarketplaceItem{}).Where("status = ? AND is_approved = ?", "published", true).Count(&stats.TotalItems)
	h.db.Model(&models.MarketplaceItem{}).Select("COUNT(DISTINCT seller_id)").Row().Scan(&stats.TotalSellers)
	h.db.Model(&models.MarketplacePurchase{}).Select("COUNT(DISTINCT buyer_id)").Row().Scan(&stats.TotalBuyers)
	h.db.Model(&models.MarketplacePurchase{}).Where("status = ?", "completed").Select("COALESCE(SUM(price), 0)").Row().Scan(&stats.TotalRevenue)
	h.db.Model(&models.MarketplaceItem{}).Where("status = ? AND is_approved = ?", "published", true).Select("COALESCE(AVG(rating), 0)").Row().Scan(&stats.AverageRating)
	h.db.Model(&models.MarketplaceReview{}).Where("status = ?", "published").Count(&stats.TotalReviews)
	h.db.Model(&models.MarketplaceItem{}).Select("COALESCE(SUM(download_count), 0)").Row().Scan(&stats.TotalDownloads)

	c.JSON(http.StatusOK, stats)
}
