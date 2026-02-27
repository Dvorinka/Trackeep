package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/trackeep/backend/models"
	"github.com/trackeep/backend/services"
	"github.com/trackeep/backend/utils"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var messageURLRegex = regexp.MustCompile(`https?://[^\s]+`)

var messagesWSUpgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type CreateConversationRequest struct {
	Type    string `json:"type" binding:"required"`
	Name    string `json:"name"`
	Topic   string `json:"topic"`
	TeamID  *uint  `json:"team_id"`
	UserIDs []uint `json:"user_ids"`
}

type AddConversationMemberRequest struct {
	UserID uint   `json:"user_id" binding:"required"`
	Role   string `json:"role"`
}

type AttachmentInput struct {
	Kind   string `json:"kind"`
	FileID *uint  `json:"file_id"`
	URL    string `json:"url"`
	Title  string `json:"title"`
}

type CreateMessageRequest struct {
	Body        string                 `json:"body"`
	Attachments []AttachmentInput      `json:"attachments"`
	Metadata    map[string]interface{} `json:"metadata"`
}

type UpdateMessageRequest struct {
	Body string `json:"body" binding:"required"`
}

type CreateReactionRequest struct {
	Emoji string `json:"emoji" binding:"required"`
}

type MessageSearchRequest struct {
	Query           string     `json:"query"`
	ConversationIDs []uint     `json:"conversation_ids"`
	SenderID        *uint      `json:"sender_id"`
	DateFrom        *time.Time `json:"date_from"`
	DateTo          *time.Time `json:"date_to"`
	AttachmentKinds []string   `json:"attachment_kinds"`
	ReferenceTypes  []string   `json:"reference_types"`
	HasLinks        *bool      `json:"has_links"`
	HasAttachments  *bool      `json:"has_attachments"`
	HasSuggestions  *bool      `json:"has_suggestions"`
	MentionOnly     bool       `json:"mention_only"`
	Limit           int        `json:"limit"`
	Offset          int        `json:"offset"`
}

type SuggestionActionRequest struct {
	RedactOriginal bool `json:"redact_original"`
}

type CreateVaultItemRequest struct {
	Label           string `json:"label" binding:"required"`
	Secret          string `json:"secret" binding:"required"`
	Notes           string `json:"notes"`
	SourceMessageID *uint  `json:"source_message_id"`
}

type ShareVaultItemRequest struct {
	TargetConversationID uint       `json:"target_conversation_id" binding:"required"`
	ExpiresAt            *time.Time `json:"expires_at"`
	AllowReveal          bool       `json:"allow_reveal"`
}

type UnshareVaultItemRequest struct {
	TargetConversationID uint `json:"target_conversation_id"`
}

type conversationListItem struct {
	Conversation models.Conversation `json:"conversation"`
	Role         string              `json:"role"`
	UnreadCount  int64               `json:"unread_count"`
	LastMessage  *models.Message     `json:"last_message,omitempty"`
}

// GetConversations lists all conversations for the current user.
func GetConversations(c *gin.Context) {
	userID := getAuthUserID(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	if err := ensureMessagingDefaults(models.DB, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to initialize messaging defaults"})
		return
	}

	var conversations []models.Conversation
	if err := models.DB.
		Joins("JOIN conversation_members cm ON cm.conversation_id = conversations.id").
		Where("cm.user_id = ? AND cm.deleted_at IS NULL AND cm.is_hidden = false", userID).
		Preload("Members").
		Order("COALESCE(conversations.last_message_at, conversations.updated_at) DESC").
		Find(&conversations).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch conversations"})
		return
	}

	items := make([]conversationListItem, 0, len(conversations))
	for _, conv := range conversations {
		var membership models.ConversationMember
		if err := models.DB.Where("conversation_id = ? AND user_id = ?", conv.ID, userID).First(&membership).Error; err != nil {
			continue
		}

		var unreadCount int64
		unreadQuery := models.DB.Model(&models.Message{}).
			Where("conversation_id = ? AND deleted_at IS NULL AND sender_id <> ?", conv.ID, userID)
		if membership.LastReadMessageID != nil {
			unreadQuery = unreadQuery.Where("id > ?", *membership.LastReadMessageID)
		}
		unreadQuery.Count(&unreadCount)

		var lastMessage models.Message
		var lastMessagePtr *models.Message
		if err := models.DB.Where("conversation_id = ? AND deleted_at IS NULL", conv.ID).
			Order("id DESC").Limit(1).
			Preload("Sender").
			First(&lastMessage).Error; err == nil {
			lastMessagePtr = &lastMessage
		}

		items = append(items, conversationListItem{
			Conversation: conv,
			Role:         string(membership.Role),
			UnreadCount:  unreadCount,
			LastMessage:  lastMessagePtr,
		})
	}

	c.JSON(http.StatusOK, gin.H{"conversations": items})
}

// CreateConversation creates a new conversation (dm/group/team).
func CreateConversation(c *gin.Context) {
	userID := getAuthUserID(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var req CreateConversationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	convType := models.ConversationType(req.Type)
	switch convType {
	case models.ConversationTypeDM, models.ConversationTypeGroup, models.ConversationTypeTeam:
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Only dm, group, and team conversations can be created explicitly"})
		return
	}

	if err := ensureMessagingDefaults(models.DB, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to initialize messaging defaults"})
		return
	}

	// Direct message conversations are unique per user pair.
	if convType == models.ConversationTypeDM {
		if len(req.UserIDs) != 1 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "DM conversation requires exactly one target user_id"})
			return
		}

		targetUserID := req.UserIDs[0]
		if targetUserID == userID {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot create DM with yourself; use self conversation"})
			return
		}

		var target models.User
		if err := models.DB.First(&target, targetUserID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Target user not found"})
			return
		}

		if existing := findExistingDM(models.DB, userID, targetUserID); existing != nil {
			c.JSON(http.StatusOK, gin.H{"conversation": existing})
			return
		}

		conv := models.Conversation{
			Type:      models.ConversationTypeDM,
			Name:      req.Name,
			Topic:     req.Topic,
			CreatedBy: userID,
		}
		if conv.Name == "" {
			conv.Name = "Direct Message"
		}

		if err := models.DB.Create(&conv).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create conversation"})
			return
		}

		members := []models.ConversationMember{
			{
				ConversationID: conv.ID,
				UserID:         userID,
				Role:           models.ConversationMemberRoleMember,
				JoinedAt:       time.Now(),
			},
			{
				ConversationID: conv.ID,
				UserID:         targetUserID,
				Role:           models.ConversationMemberRoleMember,
				JoinedAt:       time.Now(),
			},
		}
		if err := models.DB.Create(&members).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add members"})
			return
		}

		models.DB.Preload("Members").First(&conv, conv.ID)
		c.JSON(http.StatusCreated, gin.H{"conversation": conv})
		return
	}

	if strings.TrimSpace(req.Name) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Conversation name is required"})
		return
	}

	conv := models.Conversation{
		Type:      convType,
		Name:      strings.TrimSpace(req.Name),
		Topic:     req.Topic,
		CreatedBy: userID,
	}

	memberIDs := make(map[uint]struct{})
	memberIDs[userID] = struct{}{}

	if convType == models.ConversationTypeTeam {
		if req.TeamID == nil || *req.TeamID == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "team_id is required for team conversations"})
			return
		}

		var teamMemberCount int64
		models.DB.Model(&models.TeamMember{}).Where("team_id = ? AND user_id = ?", *req.TeamID, userID).Count(&teamMemberCount)
		if teamMemberCount == 0 {
			c.JSON(http.StatusForbidden, gin.H{"error": "You must be a team member to create a team conversation"})
			return
		}

		conv.TeamID = req.TeamID

		var teamMembers []models.TeamMember
		models.DB.Where("team_id = ?", *req.TeamID).Find(&teamMembers)
		for _, tm := range teamMembers {
			memberIDs[tm.UserID] = struct{}{}
		}
	} else {
		for _, uid := range req.UserIDs {
			if uid == 0 {
				continue
			}
			memberIDs[uid] = struct{}{}
		}
	}

	memberSlice := make([]uint, 0, len(memberIDs))
	for uid := range memberIDs {
		memberSlice = append(memberSlice, uid)
	}
	if !usersExist(models.DB, memberSlice) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "One or more users do not exist"})
		return
	}

	if err := models.DB.Create(&conv).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create conversation"})
		return
	}

	members := make([]models.ConversationMember, 0, len(memberSlice))
	for _, uid := range memberSlice {
		role := models.ConversationMemberRoleMember
		if uid == userID {
			role = models.ConversationMemberRoleOwner
		}
		members = append(members, models.ConversationMember{
			ConversationID: conv.ID,
			UserID:         uid,
			Role:           role,
			JoinedAt:       time.Now(),
		})
	}
	if err := models.DB.Create(&members).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add conversation members"})
		return
	}

	models.DB.Preload("Members").First(&conv, conv.ID)
	services.GetMessagesHub().Broadcast(conv.ID, "conversation.updated", gin.H{"conversation_id": conv.ID})
	c.JSON(http.StatusCreated, gin.H{"conversation": conv})
}

// GetConversation retrieves a specific conversation if user has access.
func GetConversation(c *gin.Context) {
	userID := getAuthUserID(c)
	conversationID, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid conversation id"})
		return
	}

	conv, member, err := getConversationWithMembership(models.DB, conversationID, userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Conversation not found"})
			return
		}
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	var members []models.ConversationMember
	models.DB.Where("conversation_id = ?", conversationID).
		Preload("User").
		Find(&members)

	c.JSON(http.StatusOK, gin.H{
		"conversation": conv,
		"membership":   member,
		"members":      members,
	})
}

// UpdateConversation updates mutable conversation fields.
func UpdateConversation(c *gin.Context) {
	userID := getAuthUserID(c)
	conversationID, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid conversation id"})
		return
	}

	conv, member, err := getConversationWithMembership(models.DB, conversationID, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Conversation not found"})
		return
	}
	if !isConversationAdmin(member.Role) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Insufficient permissions"})
		return
	}

	if conv.Type == models.ConversationTypeSelf || conv.Type == models.ConversationTypePasswordVault {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot mutate this conversation"})
		return
	}

	var req struct {
		Name       *string `json:"name"`
		Topic      *string `json:"topic"`
		IsArchived *bool   `json:"is_archived"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates := map[string]interface{}{}
	if req.Name != nil {
		updates["name"] = strings.TrimSpace(*req.Name)
	}
	if req.Topic != nil {
		updates["topic"] = *req.Topic
	}
	if req.IsArchived != nil {
		updates["is_archived"] = *req.IsArchived
	}

	if len(updates) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No updates provided"})
		return
	}

	if err := models.DB.Model(&conv).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update conversation"})
		return
	}

	models.DB.First(&conv, conv.ID)
	services.GetMessagesHub().Broadcast(conv.ID, "conversation.updated", gin.H{"conversation_id": conv.ID})
	c.JSON(http.StatusOK, gin.H{"conversation": conv})
}

// AddConversationMember adds a user to an existing conversation.
func AddConversationMember(c *gin.Context) {
	userID := getAuthUserID(c)
	conversationID, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid conversation id"})
		return
	}

	conv, member, err := getConversationWithMembership(models.DB, conversationID, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Conversation not found"})
		return
	}

	if !isConversationAdmin(member.Role) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Insufficient permissions"})
		return
	}
	if conv.Type == models.ConversationTypeDM || conv.Type == models.ConversationTypeSelf || conv.Type == models.ConversationTypePasswordVault || conv.Type == models.ConversationTypeGlobal {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot add members to this conversation type"})
		return
	}

	var req AddConversationMemberRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var target models.User
	if err := models.DB.First(&target, req.UserID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	if conv.Type == models.ConversationTypeTeam && conv.TeamID != nil {
		var teamMemberCount int64
		models.DB.Model(&models.TeamMember{}).Where("team_id = ? AND user_id = ?", *conv.TeamID, req.UserID).Count(&teamMemberCount)
		if teamMemberCount == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "User is not part of this team"})
			return
		}
	}

	role := models.ConversationMemberRoleMember
	if req.Role != "" {
		role = models.ConversationMemberRole(req.Role)
	}

	memberRow := models.ConversationMember{
		ConversationID: conversationID,
		UserID:         req.UserID,
		Role:           role,
		JoinedAt:       time.Now(),
	}

	if err := models.DB.Clauses(clause.OnConflict{DoNothing: true}).Create(&memberRow).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add member"})
		return
	}

	services.GetMessagesHub().Broadcast(conversationID, "conversation.updated", gin.H{"conversation_id": conversationID})
	c.JSON(http.StatusOK, gin.H{"message": "Member added"})
}

// RemoveConversationMember removes a user from a conversation.
func RemoveConversationMember(c *gin.Context) {
	userID := getAuthUserID(c)
	conversationID, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid conversation id"})
		return
	}
	targetUserID, err := parseUintParam(c, "userId")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid target user id"})
		return
	}

	conv, member, err := getConversationWithMembership(models.DB, conversationID, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Conversation not found"})
		return
	}

	if conv.Type == models.ConversationTypeSelf || conv.Type == models.ConversationTypePasswordVault || conv.Type == models.ConversationTypeGlobal {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot remove members from this conversation type"})
		return
	}

	if targetUserID != userID && !isConversationAdmin(member.Role) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Insufficient permissions"})
		return
	}

	if err := models.DB.Where("conversation_id = ? AND user_id = ?", conversationID, targetUserID).Delete(&models.ConversationMember{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove member"})
		return
	}

	services.GetMessagesHub().Broadcast(conversationID, "conversation.updated", gin.H{"conversation_id": conversationID})
	c.JSON(http.StatusOK, gin.H{"message": "Member removed"})
}

// GetConversationMessages fetches messages with cursor-based pagination.
func GetConversationMessages(c *gin.Context) {
	userID := getAuthUserID(c)
	conversationID, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid conversation id"})
		return
	}

	if _, member, err := getConversationWithMembership(models.DB, conversationID, userID); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	} else if member.Role == models.ConversationMemberRoleViewer {
		// Viewers can read messages.
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	if limit <= 0 {
		limit = 50
	}
	if limit > 100 {
		limit = 100
	}

	cursor, _ := strconv.ParseUint(c.DefaultQuery("cursor", "0"), 10, 64)

	query := models.DB.Where("conversation_id = ?", conversationID).
		Preload("Sender").
		Preload("Attachments").
		Preload("References").
		Preload("Suggestions").
		Preload("Reactions").
		Order("id DESC").
		Limit(limit)

	if cursor > 0 {
		query = query.Where("id < ?", cursor)
	}

	var messages []models.Message
	if err := query.Find(&messages).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch messages"})
		return
	}

	// Reverse to ascending for timeline rendering.
	for i, j := 0, len(messages)-1; i < j; i, j = i+1, j-1 {
		messages[i], messages[j] = messages[j], messages[i]
	}

	var nextCursor uint
	if len(messages) > 0 {
		nextCursor = messages[0].ID
	}

	// Update read marker only when this is latest-page fetch.
	if cursor == 0 && len(messages) > 0 {
		lastID := messages[len(messages)-1].ID
		now := time.Now()
		models.DB.Model(&models.ConversationMember{}).
			Where("conversation_id = ? AND user_id = ?", conversationID, userID).
			Updates(map[string]interface{}{
				"last_read_message_id": lastID,
				"last_read_at":         &now,
			})
		services.GetMessagesHub().Broadcast(conversationID, "read.updated", gin.H{
			"user_id":              userID,
			"conversation_id":      conversationID,
			"last_read_message_id": lastID,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"messages":    messages,
		"next_cursor": nextCursor,
	})
}

// CreateConversationMessage posts a new message to a conversation.
func CreateConversationMessage(c *gin.Context) {
	userID := getAuthUserID(c)
	conversationID, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid conversation id"})
		return
	}

	conv, member, err := getConversationWithMembership(models.DB, conversationID, userID)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}
	if !canWriteMessage(member.Role) {
		c.JSON(http.StatusForbidden, gin.H{"error": "You do not have write access in this conversation"})
		return
	}
	if conv.IsArchived {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Conversation is archived"})
		return
	}

	var req CreateMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	trimmedBody := strings.TrimSpace(req.Body)
	if trimmedBody == "" && len(req.Attachments) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Message body or attachments are required"})
		return
	}

	attachmentRows := make([]models.MessageAttachment, 0, len(req.Attachments))
	for _, a := range req.Attachments {
		attachmentRows = append(attachmentRows, models.MessageAttachment{
			Kind:   normalizeAttachmentKind(a.Kind),
			FileID: a.FileID,
			URL:    a.URL,
			Title:  a.Title,
		})
	}

	suggestions, inferredAttachments, isSensitive := services.DetectMessageContent(trimmedBody)
	for _, inferred := range inferredAttachments {
		if hasAttachment(attachmentRows, inferred.Kind, inferred.URL) {
			continue
		}
		previewJSON := "{}"
		if raw, err := json.Marshal(inferred.PreviewMap); err == nil {
			previewJSON = string(raw)
		}
		attachmentRows = append(attachmentRows, models.MessageAttachment{
			Kind:        normalizeAttachmentKind(inferred.Kind),
			URL:         inferred.URL,
			Title:       inferred.Title,
			PreviewJSON: previewJSON,
		})
	}

	metadataMap := map[string]interface{}{}
	for k, v := range req.Metadata {
		metadataMap[k] = v
	}

	storedBody := trimmedBody
	if isSensitive && (conv.Type == models.ConversationTypeDM || conv.Type == models.ConversationTypeSelf) && trimmedBody != "" {
		ciphertext, err := utils.Encrypt(trimmedBody)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to encrypt sensitive message"})
			return
		}
		storedBody = maskSensitiveBody(trimmedBody)
		metadataMap["sensitive_payload"] = map[string]interface{}{
			"version":     "v1",
			"ciphertext":  ciphertext,
			"masked_body": storedBody,
			"scope":       string(conv.Type),
		}
	}

	metadataJSON := "{}"
	if len(metadataMap) > 0 {
		if raw, err := json.Marshal(metadataMap); err == nil {
			metadataJSON = string(raw)
		}
	}

	message := models.Message{
		ConversationID: conversationID,
		SenderID:       userID,
		Body:           storedBody,
		MetadataJSON:   metadataJSON,
	}
	if err := models.DB.Create(&message).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create message"})
		return
	}

	for i := range attachmentRows {
		attachmentRows[i].MessageID = message.ID
	}
	if len(attachmentRows) > 0 {
		models.DB.Create(&attachmentRows)
	}

	if len(suggestions) > 0 {
		suggestionRows := make([]models.MessageSuggestion, 0, len(suggestions))
		for _, s := range suggestions {
			payloadJSON := "{}"
			if raw, err := json.Marshal(s.Payload); err == nil {
				payloadJSON = string(raw)
			}
			suggestionRows = append(suggestionRows, models.MessageSuggestion{
				MessageID:   message.ID,
				Type:        s.Type,
				PayloadJSON: payloadJSON,
				Status:      models.SuggestionStatusPending,
			})
		}
		models.DB.Create(&suggestionRows)
	}

	if isSensitive {
		models.DB.Model(&message).Update("is_sensitive", true)
	}

	now := time.Now()
	models.DB.Model(&models.Conversation{}).Where("id = ?", conversationID).Update("last_message_at", &now)

	var freshMessage models.Message
	models.DB.
		Preload("Sender").
		Preload("Attachments").
		Preload("References").
		Preload("Suggestions").
		Preload("Reactions").
		First(&freshMessage, message.ID)

	services.GetMessagesHub().Broadcast(conversationID, "message.created", freshMessage)

	response := gin.H{"message": freshMessage}
	if isSensitive {
		response["warning"] = "Sensitive data detected. We recommend a dedicated password manager like Proton Pass (not affiliated)."
	}
	c.JSON(http.StatusCreated, response)
}

// UpdateMessage edits an existing message.
func UpdateMessage(c *gin.Context) {
	userID := getAuthUserID(c)
	messageID, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid message id"})
		return
	}

	var req UpdateMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var msg models.Message
	if err := models.DB.First(&msg, messageID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Message not found"})
		return
	}

	_, member, err := getConversationWithMembership(models.DB, msg.ConversationID, userID)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	if msg.SenderID != userID && !isConversationAdmin(member.Role) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Insufficient permissions"})
		return
	}
	if msg.DeletedAt != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Deleted messages cannot be edited"})
		return
	}

	now := time.Now()
	if err := models.DB.Model(&msg).Updates(map[string]interface{}{
		"body":      strings.TrimSpace(req.Body),
		"edited_at": &now,
	}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update message"})
		return
	}

	models.DB.
		Preload("Sender").
		Preload("Attachments").
		Preload("References").
		Preload("Suggestions").
		Preload("Reactions").
		First(&msg, msg.ID)

	services.GetMessagesHub().Broadcast(msg.ConversationID, "message.updated", msg)
	c.JSON(http.StatusOK, gin.H{"message": msg})
}

// DeleteMessage marks a message as deleted.
func DeleteMessage(c *gin.Context) {
	userID := getAuthUserID(c)
	messageID, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid message id"})
		return
	}

	var msg models.Message
	if err := models.DB.First(&msg, messageID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Message not found"})
		return
	}

	_, member, err := getConversationWithMembership(models.DB, msg.ConversationID, userID)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	if msg.SenderID != userID && !isConversationAdmin(member.Role) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Insufficient permissions"})
		return
	}

	now := time.Now()
	if err := models.DB.Model(&msg).Updates(map[string]interface{}{
		"deleted_at": &now,
		"body":       "[deleted]",
		"edited_at":  &now,
	}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete message"})
		return
	}

	services.GetMessagesHub().Broadcast(msg.ConversationID, "message.deleted", gin.H{
		"message_id":      msg.ID,
		"conversation_id": msg.ConversationID,
	})
	c.JSON(http.StatusOK, gin.H{"message": "Message deleted"})
}

// AddMessageReaction adds an emoji reaction to a message.
func AddMessageReaction(c *gin.Context) {
	userID := getAuthUserID(c)
	messageID, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid message id"})
		return
	}

	var req CreateReactionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	emoji := strings.TrimSpace(req.Emoji)
	if emoji == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Emoji is required"})
		return
	}

	var msg models.Message
	if err := models.DB.First(&msg, messageID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Message not found"})
		return
	}
	if _, _, err := getConversationWithMembership(models.DB, msg.ConversationID, userID); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	reaction := models.MessageReaction{
		MessageID: messageID,
		UserID:    userID,
		Emoji:     emoji,
	}
	if err := models.DB.Clauses(clause.OnConflict{DoNothing: true}).Create(&reaction).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add reaction"})
		return
	}

	models.DB.Where("message_id = ? AND user_id = ? AND emoji = ?", messageID, userID, emoji).First(&reaction)
	services.GetMessagesHub().Broadcast(msg.ConversationID, "reaction.added", reaction)
	c.JSON(http.StatusOK, gin.H{"reaction": reaction})
}

// RemoveMessageReaction removes the current user's reaction from a message.
func RemoveMessageReaction(c *gin.Context) {
	userID := getAuthUserID(c)
	messageID, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid message id"})
		return
	}
	emoji := strings.TrimSpace(c.Param("emoji"))
	if emoji == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Emoji is required"})
		return
	}

	var msg models.Message
	if err := models.DB.First(&msg, messageID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Message not found"})
		return
	}
	if _, _, err := getConversationWithMembership(models.DB, msg.ConversationID, userID); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	if err := models.DB.Where("message_id = ? AND user_id = ? AND emoji = ?", messageID, userID, emoji).Delete(&models.MessageReaction{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove reaction"})
		return
	}

	services.GetMessagesHub().Broadcast(msg.ConversationID, "reaction.removed", gin.H{
		"message_id": messageID,
		"user_id":    userID,
		"emoji":      emoji,
	})
	c.JSON(http.StatusOK, gin.H{"message": "Reaction removed"})
}

// SearchMessages performs filtered search over messages (excluding password vault).
func SearchMessages(c *gin.Context) {
	userID := getAuthUserID(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var req MessageSearchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.Limit <= 0 {
		req.Limit = 50
	}
	if req.Limit > 100 {
		req.Limit = 100
	}
	if req.Offset < 0 {
		req.Offset = 0
	}

	baseQuery := models.DB.Model(&models.Message{}).
		Joins("JOIN conversations ON conversations.id = messages.conversation_id").
		Joins("JOIN conversation_members cm ON cm.conversation_id = messages.conversation_id").
		Where("cm.user_id = ? AND cm.deleted_at IS NULL", userID).
		Where("conversations.type <> ?", models.ConversationTypePasswordVault).
		Where("messages.deleted_at IS NULL")

	if strings.TrimSpace(req.Query) != "" {
		like := "%" + strings.ToLower(strings.TrimSpace(req.Query)) + "%"
		baseQuery = baseQuery.Where("LOWER(messages.body) LIKE ?", like)
	}
	if len(req.ConversationIDs) > 0 {
		baseQuery = baseQuery.Where("messages.conversation_id IN ?", req.ConversationIDs)
	}
	if req.SenderID != nil {
		baseQuery = baseQuery.Where("messages.sender_id = ?", *req.SenderID)
	}
	if req.DateFrom != nil {
		baseQuery = baseQuery.Where("messages.created_at >= ?", *req.DateFrom)
	}
	if req.DateTo != nil {
		baseQuery = baseQuery.Where("messages.created_at <= ?", *req.DateTo)
	}
	if req.MentionOnly {
		var user models.User
		if err := models.DB.First(&user, userID).Error; err == nil {
			mentionNeedle := "%@" + strings.ToLower(user.Username) + "%"
			baseQuery = baseQuery.Where("LOWER(messages.body) LIKE ?", mentionNeedle)
		}
	}

	if req.HasAttachments != nil {
		if *req.HasAttachments {
			baseQuery = baseQuery.Joins("JOIN message_attachments ma_any ON ma_any.message_id = messages.id")
		} else {
			baseQuery = baseQuery.Where("NOT EXISTS (SELECT 1 FROM message_attachments ma WHERE ma.message_id = messages.id)")
		}
	}

	if req.HasLinks != nil {
		if *req.HasLinks {
			baseQuery = baseQuery.Joins("JOIN message_attachments ma_links ON ma_links.message_id = messages.id AND ma_links.url <> ''")
		} else {
			baseQuery = baseQuery.Where("NOT EXISTS (SELECT 1 FROM message_attachments ma WHERE ma.message_id = messages.id AND ma.url <> '')")
		}
	}

	if req.HasSuggestions != nil {
		if *req.HasSuggestions {
			baseQuery = baseQuery.Joins("JOIN message_suggestions ms_any ON ms_any.message_id = messages.id")
		} else {
			baseQuery = baseQuery.Where("NOT EXISTS (SELECT 1 FROM message_suggestions ms WHERE ms.message_id = messages.id)")
		}
	}

	if len(req.AttachmentKinds) > 0 {
		baseQuery = baseQuery.Joins("JOIN message_attachments ma_kind ON ma_kind.message_id = messages.id AND ma_kind.kind IN ?", req.AttachmentKinds)
	}

	if len(req.ReferenceTypes) > 0 {
		baseQuery = baseQuery.Joins("JOIN message_references mr_type ON mr_type.message_id = messages.id AND mr_type.entity_type IN ?", req.ReferenceTypes)
	}

	var total int64
	if err := baseQuery.Session(&gorm.Session{}).Distinct("messages.id").Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count messages"})
		return
	}

	var messageIDs []uint
	if err := baseQuery.Session(&gorm.Session{}).
		Distinct("messages.id").
		Order("messages.created_at DESC").
		Offset(req.Offset).
		Limit(req.Limit).
		Pluck("messages.id", &messageIDs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to search messages"})
		return
	}

	if len(messageIDs) == 0 {
		c.JSON(http.StatusOK, gin.H{
			"results": []models.Message{},
			"total":   total,
			"limit":   req.Limit,
			"offset":  req.Offset,
		})
		return
	}

	var messages []models.Message
	if err := models.DB.
		Where("id IN ?", messageIDs).
		Preload("Sender").
		Preload("Attachments").
		Preload("References").
		Preload("Suggestions").
		Preload("Reactions").
		Find(&messages).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to search messages"})
		return
	}

	order := make(map[uint]int, len(messageIDs))
	for i, id := range messageIDs {
		order[id] = i
	}
	sort.Slice(messages, func(i, j int) bool {
		return order[messages[i].ID] < order[messages[j].ID]
	})

	c.JSON(http.StatusOK, gin.H{
		"results": messages,
		"total":   total,
		"limit":   req.Limit,
		"offset":  req.Offset,
	})
}

// GetMessageSuggestions returns suggestions for a specific message.
func GetMessageSuggestions(c *gin.Context) {
	userID := getAuthUserID(c)
	messageID, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid message id"})
		return
	}

	var msg models.Message
	if err := models.DB.First(&msg, messageID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Message not found"})
		return
	}
	if _, _, err := getConversationWithMembership(models.DB, msg.ConversationID, userID); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	var suggestions []models.MessageSuggestion
	if err := models.DB.Where("message_id = ?", messageID).Order("id ASC").Find(&suggestions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch suggestions"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"suggestions": suggestions})
}

// AcceptMessageSuggestion applies a suggestion action and marks it accepted.
func AcceptMessageSuggestion(c *gin.Context) {
	userID := getAuthUserID(c)
	messageID, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid message id"})
		return
	}
	suggestionID, err := parseUintParam(c, "suggestionId")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid suggestion id"})
		return
	}

	var req SuggestionActionRequest
	_ = c.ShouldBindJSON(&req)

	var msg models.Message
	if err := models.DB.First(&msg, messageID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Message not found"})
		return
	}
	if _, _, err := getConversationWithMembership(models.DB, msg.ConversationID, userID); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	var suggestion models.MessageSuggestion
	if err := models.DB.Where("id = ? AND message_id = ?", suggestionID, messageID).First(&suggestion).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Suggestion not found"})
		return
	}

	if suggestion.Status != models.SuggestionStatusPending {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Suggestion is not pending"})
		return
	}

	result, err := applySuggestionAction(models.DB, userID, &msg, &suggestion, req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	suggestion.Status = models.SuggestionStatusAccepted
	models.DB.Save(&suggestion)

	services.GetMessagesHub().Broadcast(msg.ConversationID, "conversation.updated", gin.H{
		"message_id":    msg.ID,
		"suggestion_id": suggestion.ID,
		"status":        suggestion.Status,
	})

	c.JSON(http.StatusOK, gin.H{
		"message":    "Suggestion accepted",
		"result":     result,
		"suggestion": suggestion,
	})
}

// DismissMessageSuggestion marks a suggestion dismissed.
func DismissMessageSuggestion(c *gin.Context) {
	userID := getAuthUserID(c)
	messageID, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid message id"})
		return
	}
	suggestionID, err := parseUintParam(c, "suggestionId")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid suggestion id"})
		return
	}

	var msg models.Message
	if err := models.DB.First(&msg, messageID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Message not found"})
		return
	}
	if _, _, err := getConversationWithMembership(models.DB, msg.ConversationID, userID); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	var suggestion models.MessageSuggestion
	if err := models.DB.Where("id = ? AND message_id = ?", suggestionID, messageID).First(&suggestion).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Suggestion not found"})
		return
	}

	suggestion.Status = models.SuggestionStatusDismissed
	if err := models.DB.Save(&suggestion).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to dismiss suggestion"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"suggestion": suggestion})
}

// RevealSensitiveMessage decrypts and returns sensitive message plaintext for authorized members.
func RevealSensitiveMessage(c *gin.Context) {
	userID := getAuthUserID(c)
	messageID, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid message id"})
		return
	}

	var msg models.Message
	if err := models.DB.First(&msg, messageID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Message not found"})
		return
	}
	if _, _, err := getConversationWithMembership(models.DB, msg.ConversationID, userID); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	plaintext, ok := extractSensitivePlaintext(msg.MetadataJSON)
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": "Sensitive payload not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message_id": msg.ID,
		"plaintext":  plaintext,
	})
}

// GetPasswordVaultItems returns owned and explicitly shared vault items.
func GetPasswordVaultItems(c *gin.Context) {
	userID := getAuthUserID(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	type vaultItemResponse struct {
		ID                   uint       `json:"id"`
		Label                string     `json:"label"`
		OwnerUserID          uint       `json:"owner_user_id"`
		SourceMessageID      *uint      `json:"source_message_id,omitempty"`
		LastAccessedAt       *time.Time `json:"last_accessed_at,omitempty"`
		Shared               bool       `json:"shared"`
		AllowReveal          bool       `json:"allow_reveal"`
		ExpiresAt            *time.Time `json:"expires_at,omitempty"`
		TargetConversationID *uint      `json:"target_conversation_id,omitempty"`
	}

	results := make([]vaultItemResponse, 0, 32)

	var owned []models.PasswordVaultItem
	models.DB.Where("owner_user_id = ?", userID).Find(&owned)
	for _, item := range owned {
		results = append(results, vaultItemResponse{
			ID:              item.ID,
			Label:           item.Label,
			OwnerUserID:     item.OwnerUserID,
			SourceMessageID: item.SourceMessageID,
			LastAccessedAt:  item.LastAccessedAt,
			Shared:          false,
			AllowReveal:     true,
		})
	}

	var shares []models.PasswordVaultShare
	models.DB.
		Joins("JOIN conversation_members cm ON cm.conversation_id = password_vault_shares.target_conversation_id").
		Where("cm.user_id = ? AND cm.deleted_at IS NULL", userID).
		Where("password_vault_shares.expires_at IS NULL OR password_vault_shares.expires_at > ?", time.Now()).
		Preload("VaultItem").
		Find(&shares)

	seen := map[uint]bool{}
	for _, ownedItem := range owned {
		seen[ownedItem.ID] = true
	}

	for _, share := range shares {
		item := share.VaultItem
		if seen[item.ID] {
			continue
		}
		seen[item.ID] = true
		targetID := share.TargetConversationID
		results = append(results, vaultItemResponse{
			ID:                   item.ID,
			Label:                item.Label,
			OwnerUserID:          item.OwnerUserID,
			SourceMessageID:      item.SourceMessageID,
			LastAccessedAt:       item.LastAccessedAt,
			Shared:               true,
			AllowReveal:          share.AllowReveal,
			ExpiresAt:            share.ExpiresAt,
			TargetConversationID: &targetID,
		})
	}

	c.JSON(http.StatusOK, gin.H{"items": results})
}

// CreatePasswordVaultItem creates a new encrypted vault item.
func CreatePasswordVaultItem(c *gin.Context) {
	userID := getAuthUserID(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var req CreateVaultItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	encryptedSecret, err := utils.Encrypt(req.Secret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to encrypt secret"})
		return
	}
	encryptedNotes := ""
	if strings.TrimSpace(req.Notes) != "" {
		encryptedNotes, err = utils.Encrypt(req.Notes)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to encrypt notes"})
			return
		}
	}

	item := models.PasswordVaultItem{
		OwnerUserID:     userID,
		Label:           strings.TrimSpace(req.Label),
		EncryptedSecret: encryptedSecret,
		EncryptedNotes:  encryptedNotes,
		SourceMessageID: req.SourceMessageID,
		CreatedBy:       userID,
	}
	if err := models.DB.Create(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create vault item"})
		return
	}

	if req.SourceMessageID != nil && *req.SourceMessageID > 0 {
		models.DB.Model(&models.Message{}).Where("id = ?", *req.SourceMessageID).Update("is_sensitive", true)
	}

	c.JSON(http.StatusCreated, gin.H{
		"item": gin.H{
			"id":                item.ID,
			"label":             item.Label,
			"owner_user_id":     item.OwnerUserID,
			"source_message_id": item.SourceMessageID,
		},
	})
}

// SharePasswordVaultItem shares an item to a selected conversation.
func SharePasswordVaultItem(c *gin.Context) {
	userID := getAuthUserID(c)
	itemID, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid vault item id"})
		return
	}

	var req ShareVaultItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var item models.PasswordVaultItem
	if err := models.DB.First(&item, itemID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Vault item not found"})
		return
	}
	if item.OwnerUserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only owner can share vault items"})
		return
	}

	if _, _, err := getConversationWithMembership(models.DB, req.TargetConversationID, userID); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "You are not a member of target conversation"})
		return
	}

	var share models.PasswordVaultShare
	err = models.DB.Where("vault_item_id = ? AND target_conversation_id = ?", itemID, req.TargetConversationID).First(&share).Error
	if err == nil {
		share.ExpiresAt = req.ExpiresAt
		share.AllowReveal = req.AllowReveal
		share.SharedByUserID = userID
		models.DB.Save(&share)
	} else {
		share = models.PasswordVaultShare{
			VaultItemID:          itemID,
			SharedByUserID:       userID,
			TargetConversationID: req.TargetConversationID,
			ExpiresAt:            req.ExpiresAt,
			AllowReveal:          req.AllowReveal,
		}
		if err := models.DB.Create(&share).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to share vault item"})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"share": share})
}

// RevealPasswordVaultItem decrypts and returns a vault item secret if allowed.
func RevealPasswordVaultItem(c *gin.Context) {
	userID := getAuthUserID(c)
	itemID, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid vault item id"})
		return
	}

	var item models.PasswordVaultItem
	if err := models.DB.First(&item, itemID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Vault item not found"})
		return
	}

	allowed := item.OwnerUserID == userID
	if !allowed {
		var share models.PasswordVaultShare
		err := models.DB.
			Joins("JOIN conversation_members cm ON cm.conversation_id = password_vault_shares.target_conversation_id").
			Where("password_vault_shares.vault_item_id = ? AND cm.user_id = ? AND cm.deleted_at IS NULL", itemID, userID).
			Where("password_vault_shares.allow_reveal = true").
			Where("password_vault_shares.expires_at IS NULL OR password_vault_shares.expires_at > ?", time.Now()).
			First(&share).Error
		if err == nil {
			allowed = true
		}
	}

	if !allowed {
		c.JSON(http.StatusForbidden, gin.H{"error": "You are not allowed to reveal this vault item"})
		return
	}

	secret, err := utils.Decrypt(item.EncryptedSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decrypt secret"})
		return
	}
	notes := ""
	if strings.TrimSpace(item.EncryptedNotes) != "" {
		notes, _ = utils.Decrypt(item.EncryptedNotes)
	}

	now := time.Now()
	models.DB.Model(&item).Update("last_accessed_at", &now)

	c.JSON(http.StatusOK, gin.H{
		"id":      item.ID,
		"label":   item.Label,
		"secret":  secret,
		"notes":   notes,
		"warning": "Use a dedicated password manager like Proton Pass (not affiliated) for best security hygiene.",
	})
}

// UnsharePasswordVaultItem revokes one or all shares for an item.
func UnsharePasswordVaultItem(c *gin.Context) {
	userID := getAuthUserID(c)
	itemID, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid vault item id"})
		return
	}

	var req UnshareVaultItemRequest
	_ = c.ShouldBindJSON(&req)

	var item models.PasswordVaultItem
	if err := models.DB.First(&item, itemID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Vault item not found"})
		return
	}
	if item.OwnerUserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only owner can unshare vault items"})
		return
	}

	query := models.DB.Where("vault_item_id = ? AND shared_by_user_id = ?", itemID, userID)
	if req.TargetConversationID > 0 {
		query = query.Where("target_conversation_id = ?", req.TargetConversationID)
	}
	if err := query.Delete(&models.PasswordVaultShare{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to unshare vault item"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Vault share removed"})
}

// MessagesWebSocket upgrades to websocket and handles realtime messaging events.
func MessagesWebSocket(c *gin.Context) {
	userID := getAuthUserID(c)
	if userID == 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	conn, err := messagesWSUpgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}

	hub := services.GetMessagesHub()
	client := services.NewWSClient(userID, conn)

	// Subscribe to all conversations this user is a member of.
	var memberships []models.ConversationMember
	models.DB.Where("user_id = ?", userID).Find(&memberships)
	for _, m := range memberships {
		hub.AddClientToConversation(client, m.ConversationID)
	}

	// Writer loop
	go func() {
		ticker := time.NewTicker(25 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case raw, ok := <-client.Send:
				if !ok {
					_ = conn.WriteMessage(websocket.CloseMessage, []byte{})
					return
				}
				if err := conn.WriteMessage(websocket.TextMessage, raw); err != nil {
					return
				}
			case <-ticker.C:
				if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
					return
				}
			}
		}
	}()

	// Reader loop
	for {
		var incoming map[string]interface{}
		if err := conn.ReadJSON(&incoming); err != nil {
			break
		}

		eventType, _ := incoming["type"].(string)
		conversationID := parseUintAny(incoming["conversation_id"])

		switch eventType {
		case "subscribe":
			if conversationID > 0 && isConversationMember(models.DB, conversationID, userID) {
				hub.AddClientToConversation(client, conversationID)
			}
		case "unsubscribe":
			if conversationID > 0 {
				hub.RemoveClientFromConversation(client, conversationID)
			}
		case "typing.started", "typing.stopped":
			if conversationID > 0 && isConversationMember(models.DB, conversationID, userID) {
				hub.Broadcast(conversationID, eventType, gin.H{
					"user_id":         userID,
					"conversation_id": conversationID,
				})
			}
		case "call.offer", "call.answer", "call.ice":
			targetUserID := parseUintAny(incoming["target_user_id"])
			if conversationID > 0 && targetUserID > 0 && isConversationMember(models.DB, conversationID, userID) && isConversationMember(models.DB, conversationID, targetUserID) {
				payload := gin.H{
					"conversation_id": conversationID,
					"sender_id":       userID,
					"target_user_id":  targetUserID,
				}
				if sdp, exists := incoming["sdp"]; exists {
					payload["sdp"] = sdp
				}
				if candidate, exists := incoming["candidate"]; exists {
					payload["candidate"] = candidate
				}
				if callID, exists := incoming["call_id"]; exists {
					payload["call_id"] = callID
				}
				hub.SendToUser(conversationID, targetUserID, eventType, payload)
			}
		case "call.hangup":
			if conversationID > 0 && isConversationMember(models.DB, conversationID, userID) {
				payload := gin.H{
					"conversation_id": conversationID,
					"user_id":         userID,
				}
				if callID, exists := incoming["call_id"]; exists {
					payload["call_id"] = callID
				}
				hub.Broadcast(conversationID, "call.hangup", payload)
			}
		case "read.updated":
			if conversationID > 0 && isConversationMember(models.DB, conversationID, userID) {
				lastReadID := parseUintAny(incoming["last_read_message_id"])
				now := time.Now()
				models.DB.Model(&models.ConversationMember{}).
					Where("conversation_id = ? AND user_id = ?", conversationID, userID).
					Updates(map[string]interface{}{
						"last_read_message_id": lastReadID,
						"last_read_at":         &now,
					})
				hub.Broadcast(conversationID, "read.updated", gin.H{
					"user_id":              userID,
					"conversation_id":      conversationID,
					"last_read_message_id": lastReadID,
				})
			}
		}
	}

	hub.RemoveClient(client)
	_ = conn.Close()
}

func applySuggestionAction(db *gorm.DB, userID uint, message *models.Message, suggestion *models.MessageSuggestion, req SuggestionActionRequest) (interface{}, error) {
	payload := map[string]interface{}{}
	if strings.TrimSpace(suggestion.PayloadJSON) != "" {
		_ = json.Unmarshal([]byte(suggestion.PayloadJSON), &payload)
	}

	switch suggestion.Type {
	case "create_task":
		title := asString(payload["title"])
		if strings.TrimSpace(title) == "" {
			title = compactMessageTitle(message.Body, 80)
		}
		task := models.Task{
			UserID:      userID,
			Title:       title,
			Description: message.Body,
			Status:      models.TaskStatusPending,
			Priority:    models.TaskPriorityMedium,
		}
		if err := db.Create(&task).Error; err != nil {
			return nil, err
		}
		ref := models.MessageReference{
			MessageID:  message.ID,
			EntityType: "task",
			EntityID:   task.ID,
			DeepLink:   "/app/tasks?id=" + strconv.Itoa(int(task.ID)),
		}
		db.Create(&ref)
		return gin.H{"task": task, "deep_link": ref.DeepLink}, nil

	case "create_event":
		title := asString(payload["title"])
		if strings.TrimSpace(title) == "" {
			title = compactMessageTitle(message.Body, 80)
		}
		start := time.Now().Add(1 * time.Hour)
		end := start.Add(1 * time.Hour)
		event := models.CalendarEvent{
			UserID:          userID,
			Title:           title,
			Description:     message.Body,
			StartTime:       start,
			EndTime:         end,
			Type:            "reminder",
			Priority:        "medium",
			Source:          "trackeep",
			ReminderMinutes: 15,
		}
		if err := db.Create(&event).Error; err != nil {
			return nil, err
		}
		ref := models.MessageReference{
			MessageID:  message.ID,
			EntityType: "calendar_event",
			EntityID:   event.ID,
			DeepLink:   "/app/calendar?eventId=" + strconv.Itoa(int(event.ID)),
		}
		db.Create(&ref)
		return gin.H{"event": event, "deep_link": ref.DeepLink}, nil

	case "save_bookmark":
		url := asString(payload["url"])
		if strings.TrimSpace(url) == "" {
			url = firstURLFromText(message.Body)
		}
		if strings.TrimSpace(url) == "" {
			return nil, errors.New("no URL available for bookmark suggestion")
		}
		title := asString(payload["title"])
		if strings.TrimSpace(title) == "" {
			title = url
		}
		bookmark := models.Bookmark{
			UserID:      userID,
			Title:       title,
			URL:         url,
			Description: "Created from chat suggestion",
		}
		if err := db.Create(&bookmark).Error; err != nil {
			return nil, err
		}
		ref := models.MessageReference{
			MessageID:  message.ID,
			EntityType: "bookmark",
			EntityID:   bookmark.ID,
			DeepLink:   "/app/bookmarks?id=" + strconv.Itoa(int(bookmark.ID)),
		}
		db.Create(&ref)
		return gin.H{"bookmark": bookmark, "deep_link": ref.DeepLink}, nil

	case "save_youtube":
		url := asString(payload["url"])
		if strings.TrimSpace(url) == "" {
			url = firstURLFromText(message.Body)
		}
		videoID := extractYouTubeVideoID(url)
		if videoID == "" {
			return nil, errors.New("no valid YouTube URL found")
		}

		recordVideoID := videoID
		var existing models.VideoBookmark
		if err := db.Where("video_id = ?", recordVideoID).First(&existing).Error; err == nil && existing.UserID != userID {
			recordVideoID = videoID + "-" + strconv.Itoa(int(userID))
		}

		video := models.VideoBookmark{
			UserID:      userID,
			VideoID:     recordVideoID,
			Title:       compactMessageTitle(message.Body, 80),
			Channel:     "Unknown",
			Thumbnail:   "https://img.youtube.com/vi/" + videoID + "/hqdefault.jpg",
			URL:         url,
			Description: "Saved from chat suggestion",
		}
		if err := db.Create(&video).Error; err != nil {
			return nil, err
		}
		ref := models.MessageReference{
			MessageID:  message.ID,
			EntityType: "youtube_video",
			EntityID:   video.ID,
			DeepLink:   "/app/youtube?video=" + videoID,
		}
		db.Create(&ref)
		return gin.H{"video": video, "deep_link": ref.DeepLink}, nil

	case "save_search":
		queryText := asString(payload["query"])
		if strings.TrimSpace(queryText) == "" {
			queryText = message.Body
		}
		saved := models.SavedSearch{
			UserID:      userID,
			Name:        compactMessageTitle(queryText, 50),
			Query:       queryText,
			Filters:     "{}",
			Alert:       false,
			Description: "Saved from chat suggestion",
		}
		if err := db.Create(&saved).Error; err != nil {
			return nil, err
		}
		ref := models.MessageReference{
			MessageID:  message.ID,
			EntityType: "saved_search",
			EntityID:   saved.ID,
			DeepLink:   "/app/search?savedId=" + strconv.Itoa(int(saved.ID)),
		}
		db.Create(&ref)
		return gin.H{"saved_search": saved, "deep_link": ref.DeepLink}, nil

	case "link_github":
		url := asString(payload["url"])
		if strings.TrimSpace(url) == "" {
			url = firstURLFromText(message.Body)
		}
		ref := models.MessageReference{
			MessageID:  message.ID,
			EntityType: "github",
			EntityID:   0,
			DeepLink:   "/app/github",
		}
		db.Create(&ref)
		return gin.H{"github_url": url, "deep_link": ref.DeepLink}, nil

	case "link_learning_path":
		ref := models.MessageReference{
			MessageID:  message.ID,
			EntityType: "learning_path",
			EntityID:   0,
			DeepLink:   "/app/learning-paths",
		}
		db.Create(&ref)
		return gin.H{"deep_link": ref.DeepLink}, nil

	case "move_to_password_vault":
		secretSource := message.Body
		if sensitivePlaintext, ok := extractSensitivePlaintext(message.MetadataJSON); ok {
			secretSource = sensitivePlaintext
		}
		label := "Imported from chat"
		if compact := compactMessageTitle(secretSource, 50); compact != "" {
			label = compact
		}
		encryptedSecret, err := utils.Encrypt(secretSource)
		if err != nil {
			return nil, err
		}
		encryptedNotes, _ := utils.Encrypt("Imported from message #" + strconv.Itoa(int(message.ID)))
		item := models.PasswordVaultItem{
			OwnerUserID:     userID,
			Label:           label,
			EncryptedSecret: encryptedSecret,
			EncryptedNotes:  encryptedNotes,
			SourceMessageID: &message.ID,
			CreatedBy:       userID,
		}
		if err := db.Create(&item).Error; err != nil {
			return nil, err
		}

		redactOriginal := req.RedactOriginal
		if req.RedactOriginal == false {
			// Default to redacting when vault action is accepted.
			redactOriginal = true
		}
		if redactOriginal {
			now := time.Now()
			db.Model(&models.Message{}).Where("id = ?", message.ID).Updates(map[string]interface{}{
				"body":         "[moved to vault]",
				"is_sensitive": true,
				"edited_at":    &now,
			})
		}

		ref := models.MessageReference{
			MessageID:  message.ID,
			EntityType: "password_vault_item",
			EntityID:   item.ID,
			DeepLink:   "/app/messages?vaultItem=" + strconv.Itoa(int(item.ID)),
		}
		db.Create(&ref)
		return gin.H{"vault_item_id": item.ID, "deep_link": ref.DeepLink}, nil

	case "password_warning":
		return gin.H{
			"warning": "Sensitive content detected. We recommend Proton Pass (not affiliated).",
		}, nil
	}

	return nil, errors.New("unsupported suggestion type")
}

func ensureMessagingDefaults(db *gorm.DB, userID uint) error {
	globals, err := ensureGlobalConversations(db, userID)
	if err != nil {
		return err
	}

	// Ensure the current user is in all global channels.
	for _, conv := range globals {
		member := models.ConversationMember{
			ConversationID: conv.ID,
			UserID:         userID,
			Role:           models.ConversationMemberRoleMember,
			JoinedAt:       time.Now(),
		}
		if err := db.Clauses(clause.OnConflict{DoNothing: true}).Create(&member).Error; err != nil {
			return err
		}
	}

	if _, err := ensureUserConversation(db, userID, models.ConversationTypeSelf, "Notes to Self", true); err != nil {
		return err
	}
	if _, err := ensureUserConversation(db, userID, models.ConversationTypePasswordVault, "Password Vault", true); err != nil {
		return err
	}

	return nil
}

func ensureGlobalConversations(db *gorm.DB, userID uint) ([]models.Conversation, error) {
	defaults := []string{"#general", "#announcements"}
	out := make([]models.Conversation, 0, len(defaults))

	for _, name := range defaults {
		var conv models.Conversation
		err := db.Where("type = ? AND name = ?", models.ConversationTypeGlobal, name).First(&conv).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			conv = models.Conversation{
				Type:      models.ConversationTypeGlobal,
				Name:      name,
				IsDefault: true,
				CreatedBy: userID,
			}
			if err := db.Create(&conv).Error; err != nil {
				return nil, err
			}
		} else if err != nil {
			return nil, err
		}
		out = append(out, conv)
	}

	// Backfill global membership for all users.
	var users []models.User
	if err := db.Find(&users).Error; err != nil {
		return nil, err
	}
	rows := make([]models.ConversationMember, 0, len(users)*len(out))
	for _, conv := range out {
		for _, user := range users {
			rows = append(rows, models.ConversationMember{
				ConversationID: conv.ID,
				UserID:         user.ID,
				Role:           models.ConversationMemberRoleMember,
				JoinedAt:       time.Now(),
			})
		}
	}
	if len(rows) > 0 {
		if err := db.Clauses(clause.OnConflict{DoNothing: true}).Create(&rows).Error; err != nil {
			return nil, err
		}
	}

	return out, nil
}

func ensureUserConversation(db *gorm.DB, userID uint, conversationType models.ConversationType, name string, isDefault bool) (*models.Conversation, error) {
	var conv models.Conversation
	err := db.
		Where("type = ? AND created_by = ?", conversationType, userID).
		First(&conv).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		conv = models.Conversation{
			Type:      conversationType,
			Name:      name,
			IsDefault: isDefault,
			CreatedBy: userID,
		}
		if err := db.Create(&conv).Error; err != nil {
			return nil, err
		}
	} else if err != nil {
		return nil, err
	}

	member := models.ConversationMember{
		ConversationID: conv.ID,
		UserID:         userID,
		Role:           models.ConversationMemberRoleOwner,
		JoinedAt:       time.Now(),
	}
	if err := db.Clauses(clause.OnConflict{DoNothing: true}).Create(&member).Error; err != nil {
		return nil, err
	}

	return &conv, nil
}

func getConversationWithMembership(db *gorm.DB, conversationID, userID uint) (*models.Conversation, *models.ConversationMember, error) {
	var conv models.Conversation
	if err := db.First(&conv, conversationID).Error; err != nil {
		return nil, nil, err
	}

	var member models.ConversationMember
	if err := db.Where("conversation_id = ? AND user_id = ?", conversationID, userID).First(&member).Error; err != nil {
		return nil, nil, err
	}
	return &conv, &member, nil
}

func isConversationAdmin(role models.ConversationMemberRole) bool {
	return role == models.ConversationMemberRoleOwner || role == models.ConversationMemberRoleAdmin
}

func canWriteMessage(role models.ConversationMemberRole) bool {
	return role == models.ConversationMemberRoleOwner ||
		role == models.ConversationMemberRoleAdmin ||
		role == models.ConversationMemberRoleMember
}

func getAuthUserID(c *gin.Context) uint {
	if uid := c.GetUint("user_id"); uid != 0 {
		return uid
	}
	if uid := c.GetUint("userID"); uid != 0 {
		return uid
	}
	return 0
}

func parseUintParam(c *gin.Context, key string) (uint, error) {
	raw := c.Param(key)
	parsed, err := strconv.ParseUint(raw, 10, 32)
	if err != nil {
		return 0, err
	}
	return uint(parsed), nil
}

func parseUintAny(v interface{}) uint {
	switch t := v.(type) {
	case float64:
		return uint(t)
	case int:
		return uint(t)
	case uint:
		return t
	case string:
		p, _ := strconv.ParseUint(t, 10, 32)
		return uint(p)
	default:
		return 0
	}
}

func findExistingDM(db *gorm.DB, userA, userB uint) *models.Conversation {
	var candidates []models.Conversation
	db.Joins("JOIN conversation_members cm ON cm.conversation_id = conversations.id").
		Where("conversations.type = ? AND cm.user_id = ?", models.ConversationTypeDM, userA).
		Find(&candidates)

	for _, conv := range candidates {
		var members []models.ConversationMember
		db.Where("conversation_id = ?", conv.ID).Find(&members)
		if len(members) != 2 {
			continue
		}
		foundA, foundB := false, false
		for _, m := range members {
			if m.UserID == userA {
				foundA = true
			}
			if m.UserID == userB {
				foundB = true
			}
		}
		if foundA && foundB {
			return &conv
		}
	}
	return nil
}

func usersExist(db *gorm.DB, userIDs []uint) bool {
	if len(userIDs) == 0 {
		return true
	}
	var count int64
	db.Model(&models.User{}).Where("id IN ?", userIDs).Count(&count)
	return int(count) == len(userIDs)
}

func hasAttachment(rows []models.MessageAttachment, kind, url string) bool {
	for _, row := range rows {
		if strings.EqualFold(row.Kind, kind) && strings.EqualFold(strings.TrimSpace(row.URL), strings.TrimSpace(url)) {
			return true
		}
	}
	return false
}

func maskSensitiveBody(text string) string {
	trimmed := strings.TrimSpace(text)
	if trimmed == "" {
		return "[sensitive content hidden]"
	}

	parts := strings.Fields(trimmed)
	if len(parts) == 0 {
		return "[sensitive content hidden]"
	}

	maskedParts := make([]string, 0, len(parts))
	for _, part := range parts {
		runes := []rune(part)
		if len(runes) <= 2 {
			maskedParts = append(maskedParts, "**")
			continue
		}
		maskedParts = append(maskedParts, strings.Repeat("*", len(runes)))
	}
	return strings.Join(maskedParts, " ")
}

func extractSensitivePlaintext(metadataJSON string) (string, bool) {
	payload := extractSensitivePayload(metadataJSON)
	if payload == nil {
		return "", false
	}

	ciphertext := asString(payload["ciphertext"])
	if ciphertext == "" {
		return "", false
	}

	plaintext, err := utils.Decrypt(ciphertext)
	if err != nil {
		return "", false
	}
	return plaintext, true
}

func extractSensitivePayload(metadataJSON string) map[string]interface{} {
	trimmed := strings.TrimSpace(metadataJSON)
	if trimmed == "" || trimmed == "{}" {
		return nil
	}

	metadata := map[string]interface{}{}
	if err := json.Unmarshal([]byte(trimmed), &metadata); err != nil {
		return nil
	}

	rawPayload, ok := metadata["sensitive_payload"]
	if !ok || rawPayload == nil {
		return nil
	}

	payload, ok := rawPayload.(map[string]interface{})
	if !ok {
		return nil
	}
	return payload
}

func normalizeAttachmentKind(kind string) string {
	k := strings.ToLower(strings.TrimSpace(kind))
	switch k {
	case "file", "image", "youtube", "github", "website", "bookmark", "task", "event", "calendar", "activity", "learning_path", "saved_search", "voice_note":
		return k
	default:
		return "website"
	}
}

func compactMessageTitle(text string, limit int) string {
	trimmed := strings.TrimSpace(text)
	if len(trimmed) <= limit {
		return trimmed
	}
	if limit < 4 {
		return trimmed
	}
	return strings.TrimSpace(trimmed[:limit-3]) + "..."
}

func firstURLFromText(text string) string {
	matches := messageURLRegex.FindAllString(text, -1)
	if len(matches) == 0 {
		return ""
	}
	return matches[0]
}

func extractYouTubeVideoID(rawURL string) string {
	if strings.Contains(rawURL, "youtu.be/") {
		parts := strings.Split(rawURL, "youtu.be/")
		if len(parts) > 1 {
			idPart := parts[1]
			if idx := strings.IndexAny(idPart, "?&/"); idx > -1 {
				idPart = idPart[:idx]
			}
			return idPart
		}
	}
	if strings.Contains(rawURL, "youtube.com/watch?v=") {
		parts := strings.Split(rawURL, "watch?v=")
		if len(parts) > 1 {
			idPart := parts[1]
			if idx := strings.IndexAny(idPart, "&/"); idx > -1 {
				idPart = idPart[:idx]
			}
			return idPart
		}
	}
	return ""
}

func asString(v interface{}) string {
	if s, ok := v.(string); ok {
		return strings.TrimSpace(s)
	}
	return ""
}

func isConversationMember(db *gorm.DB, conversationID, userID uint) bool {
	var count int64
	db.Model(&models.ConversationMember{}).Where("conversation_id = ? AND user_id = ?", conversationID, userID).Count(&count)
	return count > 0
}
