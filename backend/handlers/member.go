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

// MemberHandler handles member-related requests
type MemberHandler struct {
	db *gorm.DB
}

// NewMemberHandler creates a new member handler
func NewMemberHandler(db *gorm.DB) *MemberHandler {
	return &MemberHandler{db: db}
}

// GetMembers returns all members
func (h *MemberHandler) GetMembers(c *gin.Context) {
	var users []models.User

	// Get pagination parameters
	page, _ := strconv.Atoi(c.Query("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(c.Query("limit"))
	if limit < 1 {
		limit = 50
	}
	offset := (page - 1) * limit

	// Count total users
	var total int64
	h.db.Model(&models.User{}).Count(&total)

	// Get users with pagination
	if err := h.db.Offset(offset).Limit(limit).Order("created_at DESC").Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch members"})
		return
	}

	// Transform users to member response format
	members := make([]map[string]interface{}, len(users))
	for i, user := range users {
		members[i] = map[string]interface{}{
			"id":       user.ID,
			"name":     user.FullName,
			"email":    user.Email,
			"username": user.Username,
			"role":     "Member", // Default role, you might want to add role field to User model
			"avatar":   getInitials(user.FullName),
			"joinedAt": formatTime(user.CreatedAt),
			"theme":    user.Theme,
			"language": user.Language,
		}
	}

	response := map[string]interface{}{
		"members": members,
		"total":   total,
		"page":    page,
		"limit":   limit,
	}

	c.JSON(http.StatusOK, response)
}

// GetMemberStats returns member statistics
func (h *MemberHandler) GetMemberStats(c *gin.Context) {
	var totalUsers int64
	var activeUsers int64 // Users who joined in last 30 days
	var newUsersThisMonth int64

	// Total users
	h.db.Model(&models.User{}).Count(&totalUsers)

	// Active users (last 30 days)
	thirtyDaysAgo := time.Now().AddDate(0, 0, -30)
	h.db.Model(&models.User{}).Where("updated_at >= ?", thirtyDaysAgo).Count(&activeUsers)

	// New users this month
	now := time.Now()
	startOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	h.db.Model(&models.User{}).Where("created_at >= ?", startOfMonth).Count(&newUsersThisMonth)

	stats := map[string]interface{}{
		"totalUsers":        totalUsers,
		"activeUsers":       activeUsers,
		"newUsersThisMonth": newUsersThisMonth,
	}

	c.JSON(http.StatusOK, stats)
}

// Helper functions
func getInitials(name string) string {
	if name == "" {
		return "U"
	}

	// Simple initials extraction - you might want to improve this
	parts := strings.Fields(name)
	if len(parts) >= 2 {
		return strings.ToUpper(string(parts[0][0]) + string(parts[1][0]))
	}
	return strings.ToUpper(string(name[0]))
}

func formatTime(t time.Time) string {
	duration := time.Since(t)
	days := int(duration.Hours() / 24)

	if days == 0 {
		return "Today"
	} else if days == 1 {
		return "Yesterday"
	} else if days < 7 {
		return strconv.Itoa(days) + " days ago"
	} else if days < 30 {
		weeks := days / 7
		return strconv.Itoa(weeks) + " week" + pluralS(weeks) + " ago"
	} else if days < 365 {
		months := days / 30
		return strconv.Itoa(months) + " month" + pluralS(months) + " ago"
	} else {
		years := days / 365
		return strconv.Itoa(years) + " year" + pluralS(years) + " ago"
	}
}

func pluralS(n int) string {
	if n == 1 {
		return ""
	}
	return "s"
}
