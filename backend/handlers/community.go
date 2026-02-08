package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/trackeep/backend/models"
	"gorm.io/gorm"
)

type CommunityHandler struct {
	db *gorm.DB
}

func NewCommunityHandler(db *gorm.DB) *CommunityHandler {
	return &CommunityHandler{db: db}
}

// === CHALLENGE HANDLERS ===

// GetChallenges returns all challenges with filtering
func (h *CommunityHandler) GetChallenges(c *gin.Context) {
	var challenges []models.Challenge
	query := h.db.Preload("Creator").Preload("Tags")

	// Filter by status
	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	} else {
		// Default to active challenges for public view
		query = query.Where("status = ? AND is_public = ?", "active", true)
	}

	// Filter by category
	if category := c.Query("category"); category != "" {
		query = query.Where("category = ?", category)
	}

	// Filter by difficulty
	if difficulty := c.Query("difficulty"); difficulty != "" {
		query = query.Where("difficulty = ?", difficulty)
	}

	// Filter by featured
	if featured := c.Query("featured"); featured == "true" {
		query = query.Where("is_featured = ?", true)
	}

	// Search by title or description
	if search := c.Query("search"); search != "" {
		query = query.Where("title ILIKE ? OR description ILIKE ?", "%"+search+"%", "%"+search+"%")
	}

	// Sort by
	sortBy := c.DefaultQuery("sort", "created_at")
	switch sortBy {
	case "participants":
		query = query.Order("participant_count DESC")
	case "completion_rate":
		query = query.Order("completion_rate DESC")
	case "start_date":
		query = query.Order("start_date ASC")
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
	query.Model(&models.Challenge{}).Count(&total)

	if err := query.Offset(offset).Limit(limit).Find(&challenges).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch challenges"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"challenges": challenges,
		"pagination": gin.H{
			"page":  page,
			"limit": limit,
			"total": total,
			"pages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}

// GetChallenge returns a specific challenge
func (h *CommunityHandler) GetChallenge(c *gin.Context) {
	id := c.Param("id")
	var challenge models.Challenge

	if err := h.db.Preload("Creator").Preload("Tags").Preload("Milestones").Preload("Resources").First(&challenge, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Challenge not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch challenge"})
		return
	}

	c.JSON(http.StatusOK, challenge)
}

// CreateChallenge creates a new challenge
func (h *CommunityHandler) CreateChallenge(c *gin.Context) {
	userID := c.GetUint("user_id")
	var challenge models.Challenge

	if err := c.ShouldBindJSON(&challenge); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	challenge.CreatorID = userID

	if err := h.db.Create(&challenge).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create challenge"})
		return
	}

	c.JSON(http.StatusCreated, challenge)
}

// JoinChallenge allows a user to join a challenge
func (h *CommunityHandler) JoinChallenge(c *gin.Context) {
	userID := c.GetUint("user_id")
	challengeID := c.Param("id")

	// Check if challenge exists and is active
	var challenge models.Challenge
	if err := h.db.First(&challenge, challengeID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Challenge not found"})
		return
	}

	if challenge.Status != "active" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Challenge is not active"})
		return
	}

	// Check if user is already a participant
	var existingParticipant models.ChallengeParticipant
	if err := h.db.Where("challenge_id = ? AND user_id = ?", challengeID, userID).First(&existingParticipant).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "You are already participating in this challenge"})
		return
	}

	// Check if challenge has max participants limit
	if challenge.MaxParticipants != nil {
		var participantCount int64
		h.db.Model(&models.ChallengeParticipant{}).Where("challenge_id = ?", challengeID).Count(&participantCount)
		if participantCount >= int64(*challenge.MaxParticipants) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Challenge has reached maximum participants"})
			return
		}
	}

	// Create participant
	participant := models.ChallengeParticipant{
		ChallengeID: challenge.ID,
		UserID:      userID,
		Status:      "joined",
		StartedAt:   &time.Time{},
	}
	*participant.StartedAt = time.Now()

	if err := h.db.Create(&participant).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to join challenge"})
		return
	}

	// Update challenge participant count
	h.db.Model(&challenge).UpdateColumn("participant_count", gorm.Expr("participant_count + 1"))

	c.JSON(http.StatusCreated, participant)
}

// GetMyChallenges returns current user's challenge participations
func (h *CommunityHandler) GetMyChallenges(c *gin.Context) {
	userID := c.GetUint("user_id")
	var participations []models.ChallengeParticipant

	if err := h.db.Preload("Challenge").Preload("Challenge.Creator").Where("user_id = ?", userID).Find(&participations).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch your challenges"})
		return
	}

	c.JSON(http.StatusOK, participations)
}

// UpdateChallengeProgress updates a user's progress in a challenge
func (h *CommunityHandler) UpdateChallengeProgress(c *gin.Context) {
	userID := c.GetUint("user_id")
	challengeID := c.Param("id")

	var req struct {
		Progress float64 `json:"progress" binding:"required,min=0,max=100"`
		Notes    string  `json:"notes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var participant models.ChallengeParticipant
	if err := h.db.Where("challenge_id = ? AND user_id = ?", challengeID, userID).First(&participant).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Challenge participation not found"})
		return
	}

	// Update progress
	participant.Progress = req.Progress
	participant.Notes = req.Notes
	participant.LastActivityAt = &time.Time{}
	*participant.LastActivityAt = time.Now()

	// Update status based on progress
	if req.Progress >= 100 && participant.Status != "completed" {
		participant.Status = "completed"
		participant.CompletedAt = &time.Time{}
		*participant.CompletedAt = time.Now()
	} else if req.Progress > 0 && participant.Status == "joined" {
		participant.Status = "in_progress"
	}

	if err := h.db.Save(&participant).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update progress"})
		return
	}

	// Update challenge completion count and rate
	h.db.Model(&models.Challenge{}).Where("id = ?", challengeID).UpdateColumn("completion_count", 
		gorm.Expr("(SELECT COUNT(*) FROM challenge_participants WHERE challenge_id = ? AND status = 'completed')", challengeID))

	c.JSON(http.StatusOK, participant)
}

// === MENTORSHIP HANDLERS ===

// GetMentorshipRequests returns mentorship requests for the current user
func (h *CommunityHandler) GetMentorshipRequests(c *gin.Context) {
	userID := c.GetUint("user_id")
	role := c.Query("role") // sent, received

	var requests []models.MentorshipRequest
	query := h.db.Preload("FromUser").Preload("ToUser")

	if role == "sent" {
		query = query.Where("from_user_id = ?", userID)
	} else if role == "received" {
		query = query.Where("to_user_id = ?", userID)
	} else {
		query = query.Where("from_user_id = ? OR to_user_id = ?", userID, userID)
	}

	if err := query.Order("created_at DESC").Find(&requests).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch mentorship requests"})
		return
	}

	c.JSON(http.StatusOK, requests)
}

// CreateMentorshipRequest creates a new mentorship request
func (h *CommunityHandler) CreateMentorshipRequest(c *gin.Context) {
	userID := c.GetUint("user_id")
	var request models.MentorshipRequest

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	request.FromUserID = userID

	// Calculate match score (simplified version)
	request.MatchScore = calculateMatchScore(request)

	if err := h.db.Create(&request).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create mentorship request"})
		return
	}

	c.JSON(http.StatusCreated, request)
}

// RespondToMentorshipRequest responds to a mentorship request
func (h *CommunityHandler) RespondToMentorshipRequest(c *gin.Context) {
	userID := c.GetUint("user_id")
	requestID := c.Param("id")

	var req struct {
		Status   string `json:"status" binding:"required"` // accepted, rejected
		Response string `json:"response"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var request models.MentorshipRequest
	if err := h.db.First(&request, requestID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Mentorship request not found"})
		return
	}

	// Check if user is the recipient
	if request.ToUserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "You can only respond to requests sent to you"})
		return
	}

	if request.Status != "pending" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Request has already been responded to"})
		return
	}

	// Update request
	request.Status = req.Status
	request.Response = req.Response
	request.RespondedAt = &time.Time{}
	*request.RespondedAt = time.Now()

	if err := h.db.Save(&request).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to respond to request"})
		return
	}

	// If accepted, create mentorship
	if req.Status == "accepted" {
		mentorship := models.Mentorship{
			MentorID:     request.FromUserID,
			MenteeID:     request.ToUserID,
			Category:     request.Category,
			Description:  request.Description,
			Goals:        request.Goals,
			StartDate:    time.Now(),
			Status:       "active",
			IsPaid:       request.IsPaid,
			Rate:         request.Rate,
			Currency:     request.Currency,
			SessionLimit: request.Duration,
		}

		if err := h.db.Create(&mentorship).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create mentorship"})
			return
		}
	}

	c.JSON(http.StatusOK, request)
}

// GetMyMentorships returns current user's mentorships
func (h *CommunityHandler) GetMyMentorships(c *gin.Context) {
	userID := c.GetUint("user_id")
	role := c.Query("role") // mentor, mentee

	var mentorships []models.Mentorship
	query := h.db.Preload("Mentor").Preload("Mentee")

	if role == "mentor" {
		query = query.Where("mentor_id = ?", userID)
	} else if role == "mentee" {
		query = query.Where("mentee_id = ?", userID)
	} else {
		query = query.Where("mentor_id = ? OR mentee_id = ?", userID, userID)
	}

	if err := query.Order("created_at DESC").Find(&mentorships).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch mentorships"})
		return
	}

	c.JSON(http.StatusOK, mentorships)
}

// CreateMentorshipSession creates a new mentoring session
func (h *CommunityHandler) CreateMentorshipSession(c *gin.Context) {
	userID := c.GetUint("user_id")
	mentorshipID := c.Param("id")

	// Check if user is part of this mentorship
	var mentorship models.Mentorship
	if err := h.db.First(&mentorship, mentorshipID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Mentorship not found"})
		return
	}

	if mentorship.MentorID != userID && mentorship.MenteeID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "You are not part of this mentorship"})
		return
	}

	var session models.MentorshipSession
	if err := c.ShouldBindJSON(&session); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	session.MentorshipID = mentorship.ID

	if err := h.db.Create(&session).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create session"})
		return
	}

	c.JSON(http.StatusCreated, session)
}

// GetMentorshipSessions returns sessions for a mentorship
func (h *CommunityHandler) GetMentorshipSessions(c *gin.Context) {
	userID := c.GetUint("user_id")
	mentorshipID := c.Param("id")

	// Check if user is part of this mentorship
	var mentorship models.Mentorship
	if err := h.db.First(&mentorship, mentorshipID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Mentorship not found"})
		return
	}

	if mentorship.MentorID != userID && mentorship.MenteeID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "You are not part of this mentorship"})
		return
	}

	var sessions []models.MentorshipSession
	if err := h.db.Where("mentorship_id = ?", mentorshipID).Order("scheduled_for DESC").Find(&sessions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch sessions"})
		return
	}

	c.JSON(http.StatusOK, sessions)
}

// GetCommunityStats returns community statistics
func (h *CommunityHandler) GetCommunityStats(c *gin.Context) {
	var stats struct {
		ActiveChallenges     int64 `json:"active_challenges"`
		TotalParticipants    int64 `json:"total_participants"`
		ActiveMentorships   int64 `json:"active_mentorships"`
		TotalMentorshipHours float64 `json:"total_mentorship_hours"`
		PendingRequests     int64 `json:"pending_requests"`
		CompletedChallenges int64 `json:"completed_challenges"`
	}

	h.db.Model(&models.Challenge{}).Where("status = ?", "active").Count(&stats.ActiveChallenges)
	h.db.Model(&models.ChallengeParticipant{}).Count(&stats.TotalParticipants)
	h.db.Model(&models.Mentorship{}).Where("status = ?", "active").Count(&stats.ActiveMentorships)
	h.db.Model(&models.Mentorship{}).Select("COALESCE(SUM(total_hours), 0)").Row().Scan(&stats.TotalMentorshipHours)
	h.db.Model(&models.MentorshipRequest{}).Where("status = ?", "pending").Count(&stats.PendingRequests)
	h.db.Model(&models.ChallengeParticipant{}).Where("status = ?", "completed").Count(&stats.CompletedChallenges)

	c.JSON(http.StatusOK, stats)
}

// Helper function to calculate match score (simplified version)
func calculateMatchScore(request models.MentorshipRequest) float64 {
	// This is a simplified version - in production, you'd use more sophisticated matching
	// based on skills, experience, availability, preferences, etc.
	score := 0.5 // Base score
	
	// Add points for detailed description
	if len(request.Description) > 100 {
		score += 0.1
	}
	
	// Add points for clear goals
	if len(request.Goals) > 50 {
		score += 0.1
	}
	
	// Add points for specified duration
	if request.Duration > 0 {
		score += 0.1
	}
	
	// Add points for availability
	if len(request.Availability) > 20 {
		score += 0.1
	}
	
	if score > 1.0 {
		score = 1.0
	}
	
	return score
}
