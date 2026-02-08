package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/trackeep/backend/models"
	"gorm.io/gorm"
)

type TeamsHandler struct {
	db *gorm.DB
}

func NewTeamsHandler(db *gorm.DB) *TeamsHandler {
	return &TeamsHandler{db: db}
}

// generateInvitationToken generates a unique token for team invitations
func generateInvitationToken() string {
	bytes := make([]byte, 32)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}

// GetTeams retrieves teams for the current user
func (h *TeamsHandler) GetTeams(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset := (page - 1) * limit

	var teams []models.Team
	if err := h.db.Preload("Owner").Preload("Members.User").
		Joins("JOIN team_members ON team_members.team_id = teams.id").
		Where("team_members.user_id = ?", userID).
		Offset(offset).Limit(limit).Find(&teams).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch teams"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"teams": teams,
		"page":  page,
		"limit": limit,
	})
}

// CreateTeam creates a new team
func (h *TeamsHandler) CreateTeam(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var req struct {
		Name        string `json:"name" binding:"required"`
		Description string `json:"description"`
		Avatar      string `json:"avatar"`
		IsPublic    bool   `json:"is_public"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Start transaction
	tx := h.db.Begin()

	// Create team
	team := models.Team{
		Name:        req.Name,
		Description: req.Description,
		Avatar:      req.Avatar,
		IsPublic:    req.IsPublic,
		IsActive:    true,
		OwnerID:     uint(userID.(uint)),
	}

	if err := tx.Create(&team).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create team"})
		return
	}

	// Add owner as team member
	member := models.TeamMember{
		TeamID:   team.ID,
		UserID:   uint(userID.(uint)),
		Role:     "owner",
		JoinedAt: time.Now(),
	}

	if err := tx.Create(&member).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add owner to team"})
		return
	}

	// Log activity
	activity := models.TeamActivity{
		TeamID:     team.ID,
		UserID:     uint(userID.(uint)),
		Action:     "created",
		EntityType: "team",
		EntityID:   team.ID,
		Details:    `{"action": "team_created"}`,
	}

	tx.Create(&activity)

	tx.Commit()

	c.JSON(http.StatusCreated, gin.H{"message": "Team created successfully", "team": team})
}

// GetTeam retrieves a specific team
func (h *TeamsHandler) GetTeam(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	teamID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid team ID"})
		return
	}

	// Check if user is a member of the team
	var member models.TeamMember
	if err := h.db.Where("team_id = ? AND user_id = ?", teamID, userID).First(&member).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check membership"})
		return
	}

	var team models.Team
	if err := h.db.Preload("Owner").Preload("Members.User").Preload("Projects.Tags").
		First(&team, teamID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Team not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch team"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"team": team})
}

// UpdateTeam updates a team (only owner or admin)
func (h *TeamsHandler) UpdateTeam(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	teamID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid team ID"})
		return
	}

	// Check if user is owner or admin
	var member models.TeamMember
	if err := h.db.Where("team_id = ? AND user_id = ? AND role IN ?", teamID, userID, []string{"owner", "admin"}).
		First(&member).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Insufficient permissions"})
		return
	}

	var req struct {
		Name        string `json:"name"`
		Description string `json:"description"`
		Avatar      string `json:"avatar"`
		IsPublic    bool   `json:"is_public"`
		IsActive    bool   `json:"is_active"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	team := models.Team{}
	if err := h.db.First(&team, teamID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Team not found"})
		return
	}

	team.Name = req.Name
	team.Description = req.Description
	team.Avatar = req.Avatar
	team.IsPublic = req.IsPublic
	team.IsActive = req.IsActive

	if err := h.db.Save(&team).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update team"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Team updated successfully", "team": team})
}

// DeleteTeam deletes a team (only owner)
func (h *TeamsHandler) DeleteTeam(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	teamID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid team ID"})
		return
	}

	// Check if user is owner
	var member models.TeamMember
	if err := h.db.Where("team_id = ? AND user_id = ? AND role = ?", teamID, userID, "owner").
		First(&member).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only team owner can delete team"})
		return
	}

	// Soft delete team
	if err := h.db.Delete(&models.Team{}, teamID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete team"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Team deleted successfully"})
}

// InviteMember invites a user to join a team
func (h *TeamsHandler) InviteMember(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	teamID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid team ID"})
		return
	}

	// Check if user is owner or admin
	var member models.TeamMember
	if err := h.db.Where("team_id = ? AND user_id = ? AND role IN ?", teamID, userID, []string{"owner", "admin"}).
		First(&member).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Insufficient permissions"})
		return
	}

	var req struct {
		Email string `json:"email" binding:"required,email"`
		Role  string `json:"role" binding:"required,oneof=member admin viewer"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if user is already a member
	var existingMember models.TeamMember
	if err := h.db.Joins("JOIN users ON users.id = team_members.user_id").
		Where("team_members.team_id = ? AND users.email = ?", teamID, req.Email).First(&existingMember).Error; err == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "User is already a team member"})
		return
	}

	// Check if there's already a pending invitation
	var existingInvitation models.TeamInvitation
	if err := h.db.Where("team_id = ? AND email = ? AND status = ?", teamID, req.Email, "pending").
		First(&existingInvitation).Error; err == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invitation already sent"})
		return
	}

	// Find user by email (if registered)
	var targetUser models.User
	h.db.Where("email = ?", req.Email).First(&targetUser)

	// Create invitation
	invitation := models.TeamInvitation{
		TeamID:    uint(teamID),
		UserID:    targetUser.ID,
		Email:     req.Email,
		Role:      req.Role,
		Token:     generateInvitationToken(),
		Status:    "pending",
		ExpiresAt: time.Now().Add(7 * 24 * time.Hour), // 7 days
		InvitedBy: uint(userID.(uint)),
	}

	if err := h.db.Create(&invitation).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create invitation"})
		return
	}

	// Log activity
	activity := models.TeamActivity{
		TeamID:     uint(teamID),
		UserID:     uint(userID.(uint)),
		Action:     "invited",
		EntityType: "invitation",
		EntityID:   invitation.ID,
		Details:    `{"email": "` + req.Email + `", "role": "` + req.Role + `"}`,
	}

	h.db.Create(&activity)

	c.JSON(http.StatusCreated, gin.H{"message": "Invitation sent successfully", "invitation": invitation})
}

// AcceptInvitation accepts a team invitation
func (h *TeamsHandler) AcceptInvitation(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	token := c.Param("token")
	if token == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invitation token is required"})
		return
	}

	var invitation models.TeamInvitation
	if err := h.db.Preload("Team").Where("token = ? AND status = ?", token, "pending").
		First(&invitation).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Invalid or expired invitation"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch invitation"})
		return
	}

	// Check if invitation has expired
	if time.Now().After(invitation.ExpiresAt) {
		h.db.Model(&invitation).Update("status", "expired")
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invitation has expired"})
		return
	}

	// Start transaction
	tx := h.db.Begin()

	// Update invitation status
	if err := tx.Model(&invitation).Update("status", "accepted").Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update invitation"})
		return
	}

	// Add user to team
	member := models.TeamMember{
		TeamID:   invitation.TeamID,
		UserID:   uint(userID.(uint)),
		Role:     invitation.Role,
		JoinedAt: time.Now(),
	}

	if err := tx.Create(&member).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add user to team"})
		return
	}

	// Log activity
	activity := models.TeamActivity{
		TeamID:     invitation.TeamID,
		UserID:     uint(userID.(uint)),
		Action:     "joined",
		EntityType: "team",
		EntityID:   invitation.TeamID,
		Details:    `{"action": "joined_team"}`,
	}

	tx.Create(&activity)

	tx.Commit()

	c.JSON(http.StatusOK, gin.H{"message": "Successfully joined team", "team": invitation.Team})
}

// GetTeamMembers retrieves members of a team
func (h *TeamsHandler) GetTeamMembers(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	teamID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid team ID"})
		return
	}

	// Check if user is a member of the team
	var member models.TeamMember
	if err := h.db.Where("team_id = ? AND user_id = ?", teamID, userID).First(&member).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	var members []models.TeamMember
	if err := h.db.Preload("User").Where("team_id = ?", teamID).Find(&members).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch team members"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"members": members})
}

// RemoveMember removes a member from a team
func (h *TeamsHandler) RemoveMember(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	teamID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid team ID"})
		return
	}

	memberID, err := strconv.ParseUint(c.Param("memberId"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid member ID"})
		return
	}

	// Check if current user is owner or admin
	var currentMember models.TeamMember
	if err := h.db.Where("team_id = ? AND user_id = ? AND role IN ?", teamID, userID, []string{"owner", "admin"}).
		First(&currentMember).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Insufficient permissions"})
		return
	}

	// Cannot remove the owner
	var targetMember models.TeamMember
	if err := h.db.Where("team_id = ? AND user_id = ? AND role = ?", teamID, memberID, "owner").
		First(&targetMember).Error; err == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot remove team owner"})
		return
	}

	// Remove member
	if err := h.db.Where("team_id = ? AND user_id = ?", teamID, memberID).Delete(&models.TeamMember{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove member"})
		return
	}

	// Log activity
	activity := models.TeamActivity{
		TeamID:     uint(teamID),
		UserID:     uint(userID.(uint)),
		Action:     "removed",
		EntityType: "member",
		EntityID:   uint(memberID),
		Details:    `{"action": "member_removed"}`,
	}

	h.db.Create(&activity)

	c.JSON(http.StatusOK, gin.H{"message": "Member removed successfully"})
}

// GetTeamActivity retrieves activity logs for a team
func (h *TeamsHandler) GetTeamActivity(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	teamID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid team ID"})
		return
	}

	// Check if user is a member of the team
	var member models.TeamMember
	if err := h.db.Where("team_id = ? AND user_id = ?", teamID, userID).First(&member).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset := (page - 1) * limit

	var activities []models.TeamActivity
	if err := h.db.Preload("User").Where("team_id = ?", teamID).
		Order("created_at DESC").Offset(offset).Limit(limit).Find(&activities).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch team activity"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"activities": activities,
		"page":       page,
		"limit":      limit,
	})
}

// GetTeamStats retrieves statistics for a team
func (h *TeamsHandler) GetTeamStats(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	teamID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid team ID"})
		return
	}

	// Check if user is a member of the team
	var member models.TeamMember
	if err := h.db.Where("team_id = ? AND user_id = ?", teamID, userID).First(&member).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	stats := models.TeamStats{TeamID: uint(teamID)}

	// Count members
	h.db.Model(&models.TeamMember{}).Where("team_id = ?", teamID).Count(&stats.MembersCount)

	// Count projects
	h.db.Model(&models.TeamProject{}).Where("team_id = ?", teamID).Count(&stats.ProjectsCount)

	// Count bookmarks
	h.db.Model(&models.TeamBookmark{}).Where("team_id = ?", teamID).Count(&stats.BookmarksCount)

	// Count notes
	h.db.Model(&models.TeamNote{}).Where("team_id = ?", teamID).Count(&stats.NotesCount)

	// Count tasks
	h.db.Model(&models.TeamTask{}).Where("team_id = ?", teamID).Count(&stats.TasksCount)

	// Count files
	h.db.Model(&models.TeamFile{}).Where("team_id = ?", teamID).Count(&stats.FilesCount)

	// Count recent activity (last 7 days)
	sevenDaysAgo := time.Now().Add(-7 * 24 * time.Hour)
	h.db.Model(&models.TeamActivity{}).Where("team_id = ? AND created_at >= ?", teamID, sevenDaysAgo).
		Count(&stats.RecentActivity)

	c.JSON(http.StatusOK, gin.H{"stats": stats})
}
