package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/trackeep/backend/models"
	"gorm.io/gorm"
)

type SocialHandler struct {
	db *gorm.DB
}

func NewSocialHandler(db *gorm.DB) *SocialHandler {
	return &SocialHandler{db: db}
}

// GetProfile retrieves a user's public profile
func (h *SocialHandler) GetProfile(c *gin.Context) {
	userID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var user models.User
	if err := h.db.Preload("Skills").Preload("Projects.Tags").Preload("SocialLinks").
		First(&user, userID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch profile"})
		return
	}

	// Check privacy settings
	if user.ProfileVisibility == "private" {
		// Only allow profile owner to see private profile
		currentUserID, exists := c.Get("user_id")
		if !exists || uint(currentUserID.(uint)) != user.ID {
			c.JSON(http.StatusForbidden, gin.H{"error": "Profile is private"})
			return
		}
	}

	// Prepare response based on visibility
	profileResponse := gin.H{
		"id":               user.ID,
		"username":         user.Username,
		"full_name":        user.FullName,
		"avatar_url":       user.AvatarURL,
		"bio":              user.Bio,
		"location":         user.Location,
		"website":          user.Website,
		"company":          user.Company,
		"job_title":        user.JobTitle,
		"skills":           user.Skills,
		"projects":         user.Projects,
		"social_links":     user.SocialLinks,
		"followers_count":  user.FollowersCount,
		"following_count":  user.FollowingCount,
		"public_bookmarks": user.PublicBookmarks,
		"public_notes":     user.PublicNotes,
		"created_at":       user.CreatedAt,
	}

	// Only show email if user allows it
	if user.ShowEmail {
		profileResponse["email"] = user.Email
	}

	c.JSON(http.StatusOK, profileResponse)
}

// UpdateProfile updates the current user's profile
func (h *SocialHandler) UpdateProfile(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var req struct {
		Bio               string              `json:"bio"`
		Location          string              `json:"location"`
		Website           string              `json:"website"`
		Company           string              `json:"company"`
		JobTitle          string              `json:"job_title"`
		ProfileVisibility string              `json:"profile_visibility"`
		ShowEmail         bool                `json:"show_email"`
		ShowActivity      bool                `json:"show_activity"`
		AllowMessages     bool                `json:"allow_messages"`
		Skills            []models.Skill      `json:"skills"`
		SocialLinks       []models.SocialLink `json:"social_links"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update user profile
	user := models.User{}
	if err := h.db.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	user.Bio = req.Bio
	user.Location = req.Location
	user.Website = req.Website
	user.Company = req.Company
	user.JobTitle = req.JobTitle
	user.ProfileVisibility = req.ProfileVisibility
	user.ShowEmail = req.ShowEmail
	user.ShowActivity = req.ShowActivity
	user.AllowMessages = req.AllowMessages

	// Start transaction
	tx := h.db.Begin()

	// Update user
	if err := tx.Save(&user).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update profile"})
		return
	}

	// Update skills - delete existing and create new
	if err := tx.Where("user_id = ?", user.ID).Delete(&models.Skill{}).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update skills"})
		return
	}

	for _, skill := range req.Skills {
		skill.UserID = user.ID
		if err := tx.Create(&skill).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create skills"})
			return
		}
	}

	// Update social links - delete existing and create new
	if err := tx.Where("user_id = ?", user.ID).Delete(&models.SocialLink{}).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update social links"})
		return
	}

	for _, link := range req.SocialLinks {
		link.UserID = user.ID
		if err := tx.Create(&link).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create social links"})
			return
		}
	}

	tx.Commit()

	c.JSON(http.StatusOK, gin.H{"message": "Profile updated successfully"})
}

// FollowUser follows or unfollows a user
func (h *SocialHandler) FollowUser(c *gin.Context) {
	currentUserID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	targetUserID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	// Can't follow yourself
	if uint(currentUserID.(uint)) == uint(targetUserID) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot follow yourself"})
		return
	}

	// Check if already following
	var existingFollow models.Follow
	err = h.db.Where("follower_id = ? AND following_id = ?", currentUserID, targetUserID).First(&existingFollow).Error

	if err == nil {
		// Already following, unfollow
		h.db.Delete(&existingFollow)

		// Update counts
		h.db.Model(&models.User{}).Where("id = ?", currentUserID).Update("following_count", gorm.Expr("following_count - 1"))
		h.db.Model(&models.User{}).Where("id = ?", targetUserID).Update("followers_count", gorm.Expr("followers_count - 1"))

		c.JSON(http.StatusOK, gin.H{"message": "Unfollowed successfully", "following": false})
	} else if err == gorm.ErrRecordNotFound {
		// Not following, follow
		newFollow := models.Follow{
			FollowerID:  uint(currentUserID.(uint)),
			FollowingID: uint(targetUserID),
		}

		if err := h.db.Create(&newFollow).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to follow user"})
			return
		}

		// Update counts
		h.db.Model(&models.User{}).Where("id = ?", currentUserID).Update("following_count", gorm.Expr("following_count + 1"))
		h.db.Model(&models.User{}).Where("id = ?", targetUserID).Update("followers_count", gorm.Expr("followers_count + 1"))

		c.JSON(http.StatusOK, gin.H{"message": "Followed successfully", "following": true})
	} else {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check follow status"})
	}
}

// GetFollowers retrieves a user's followers
func (h *SocialHandler) GetFollowers(c *gin.Context) {
	userID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset := (page - 1) * limit

	var follows []models.Follow
	if err := h.db.Preload("Follower").Where("following_id = ?", userID).
		Offset(offset).Limit(limit).Find(&follows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch followers"})
		return
	}

	var followers []gin.H
	for _, follow := range follows {
		followers = append(followers, gin.H{
			"id":          follow.Follower.ID,
			"username":    follow.Follower.Username,
			"full_name":   follow.Follower.FullName,
			"avatar_url":  follow.Follower.AvatarURL,
			"followed_at": follow.CreatedAt,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"followers": followers,
		"page":      page,
		"limit":     limit,
	})
}

// GetFollowing retrieves who a user is following
func (h *SocialHandler) GetFollowing(c *gin.Context) {
	userID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset := (page - 1) * limit

	var follows []models.Follow
	if err := h.db.Preload("Following").Where("follower_id = ?", userID).
		Offset(offset).Limit(limit).Find(&follows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch following"})
		return
	}

	var following []gin.H
	for _, follow := range follows {
		following = append(following, gin.H{
			"id":          follow.Following.ID,
			"username":    follow.Following.Username,
			"full_name":   follow.Following.FullName,
			"avatar_url":  follow.Following.AvatarURL,
			"followed_at": follow.CreatedAt,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"following": following,
		"page":      page,
		"limit":     limit,
	})
}

// SearchUsers searches for users by username, name, or skills
func (h *SocialHandler) SearchUsers(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Search query is required"})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset := (page - 1) * limit

	searchTerm := "%" + strings.ToLower(query) + "%"

	var users []models.User
	if err := h.db.Where("LOWER(username) LIKE ? OR LOWER(full_name) LIKE ? OR LOWER(bio) LIKE ?",
		searchTerm, searchTerm, searchTerm).
		Where("profile_visibility = ?", "public").
		Offset(offset).Limit(limit).Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to search users"})
		return
	}

	var results []gin.H
	for _, user := range users {
		results = append(results, gin.H{
			"id":               user.ID,
			"username":         user.Username,
			"full_name":        user.FullName,
			"avatar_url":       user.AvatarURL,
			"bio":              user.Bio,
			"followers_count":  user.FollowersCount,
			"following_count":  user.FollowingCount,
			"public_bookmarks": user.PublicBookmarks,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"users": results,
		"page":  page,
		"limit": limit,
	})
}
